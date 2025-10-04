/**
 * @file routes/payment.js
 * @description Rotas para processamento de pagamentos utilizando a API do Stripe.
 * Este módulo gerencia a criação de intenções de pagamento, confirmações e o tratamento de webhooks.
 * 
 * @author Manus AI
 * @date Oct 01, 2025
 */

// ===================================================================
// IMPORTAÇÕES DE MÓDULOS
// ===================================================================

// Importa o módulo `express` para criar e gerenciar rotas.
const express = require("express");

// Importa `body` e `validationResult` do `express-validator` para validação de dados de entrada.
const { body, validationResult } = require("express-validator");

// Importa `rateLimit` do `express-rate-limit` para proteção contra abuso de endpoints.
const rateLimit = require("express-rate-limit");

// Importa os middlewares de autenticação JWT (obrigatório e opcional).
const { authenticateJWT, optionalAuth } = require("../config/passport");

// Cria uma nova instância de roteador Express.
const router = express.Router();

// ===================================================================
// CONFIGURAÇÃO DO STRIPE
// ===================================================================

/**
 * @global stripe
 * @description Instância do cliente Stripe, inicializada com a chave secreta.
 * Esta chave é carregada de `process.env.STRIPE_SECRET_KEY`.
 * É crucial usar chaves de teste durante o desenvolvimento e chaves de produção em ambiente real.
 */
let stripe;
try {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn("⚠️ STRIPE_SECRET_KEY não configurada. Pagamentos Stripe não funcionarão.");
  } else {
    stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    console.log("✅ Stripe inicializado com sucesso.");
  }
} catch (error) {
  console.error("❌ Erro ao inicializar Stripe:", error);
}

// ===================================================================
// SIMULAÇÃO DE BANCO DE DADOS PARA PAGAMENTOS
// ===================================================================

/**
 * @private
 * @type {Array<Object>}
 * @description Array que simula uma coleção de pagamentos em um banco de dados.
 * Em uma aplicação real, isso seria substituído por um modelo de ORM/ODM (e.g., Mongoose, Sequelize).
 */
let payments = [];

/**
 * @private
 * @type {number}
 * @description Contador para gerar IDs únicos para novos registros de pagamento locais.
 */
let nextPaymentId = 1;

/**
 * @class Payment
 * @description Classe que representa o modelo de pagamento e suas operações simuladas.
 * Gerencia o estado dos pagamentos localmente, associando-os às intenções de pagamento do Stripe.
 */
class Payment {
  /**
   * @constructor
   * @description Construtor para criar uma nova instância de pagamento.
   * @param {object} data - Objeto contendo os dados do pagamento.
   * @param {number} [data.id] - ID local do pagamento.
   * @param {number} [data.userId] - ID do usuário que realizou o pagamento.
   * @param {string} data.stripePaymentIntentId - ID da intenção de pagamento do Stripe.
   * @param {number} data.amount - Valor do pagamento em centavos.
   * @param {string} [data.currency=\'brl\'] - Moeda do pagamento (e.g., 'brl', 'usd').
   * @param {string} [data.status=\'pending\'] - Status atual do pagamento (e.g., 'pending', 'succeeded', 'failed').
   * @param {string} [data.description] - Descrição do pagamento.
   * @param {object} [data.metadata] - Metadados adicionais associados ao pagamento.
   */
  constructor(data) {
    this.id = data.id || nextPaymentId++;
    this.userId = data.userId || null;
    this.stripePaymentIntentId = data.stripePaymentIntentId;
    this.amount = data.amount; // Valor em centavos
    this.currency = data.currency || "brl";
    this.status = data.status || "pending"; // pending, succeeded, failed, canceled
    this.description = data.description;
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * @static
   * @function create
   * @description Cria um novo registro de pagamento local e o adiciona à coleção.
   * @param {object} data - Dados do novo pagamento.
   * @returns {Payment} O objeto de pagamento criado.
   */
  static create(data) {
    const payment = new Payment(data);
    payments.push(payment);
    return payment;
  }

  /**
   * @static
   * @function findById
   * @description Encontra um pagamento pelo seu ID local.
   * @param {number} id - O ID local do pagamento.
   * @returns {Payment|undefined} O objeto de pagamento ou `undefined` se não encontrado.
   */
  static findById(id) {
    return payments.find((p) => p.id === parseInt(id));
  }

  /**
   * @static
   * @function findByStripeId
   * @description Encontra um pagamento pelo ID da intenção de pagamento do Stripe.
   * @param {string} stripeId - O ID da intenção de pagamento do Stripe.
   * @returns {Payment|undefined} O objeto de pagamento ou `undefined` se não encontrado.
   */
  static findByStripeId(stripeId) {
    return payments.find((p) => p.stripePaymentIntentId === stripeId);
  }

  /**
   * @static
   * @function updateStatus
   * @description Atualiza o status de um pagamento local.
   * @param {number} id - O ID local do pagamento a ser atualizado.
   * @param {string} status - O novo status do pagamento.
   * @returns {Payment|undefined} O objeto de pagamento atualizado ou `undefined` se não encontrado.
   */
  static updateStatus(id, status) {
    const payment = this.findById(id);
    if (payment) {
      payment.status = status;
      payment.updatedAt = new Date();
    }
    return payment;
  }
}

// ===================================================================
// RATE LIMITING PARA PAGAMENTOS
// ===================================================================

/**
 * @constant paymentLimiter
 * @description Middleware de rate limiting para rotas de pagamento.
 * Ajuda a prevenir tentativas fraudulentas e abuso de endpoints de pagamento.
 */
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Limite de 10 tentativas de pagamento por IP a cada 15 minutos
  message: {
    error: "Muitas tentativas de pagamento. Tente novamente em 15 minutos.",
    code: "PAYMENT_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true, // Retorna informações de rate limit nos cabeçalhos
  legacyHeaders: false, // Desabilita cabeçalhos legados
  // A função `skip` permite ignorar o rate limit para certas rotas.
  // Neste caso, webhooks e consultas de status não são afetados.
  skip: (req) => {
    return req.path === "/webhook" || req.path.startsWith("/payment-status");
  },
});

// Aplica o middleware de rate limiting a todas as rotas definidas neste roteador.
router.use(paymentLimiter);

// ===================================================================
// VALIDADORES DE ENTRADA
// ===================================================================

/**
 * @constant createPaymentValidators
 * @description Array de middlewares de validação para a rota de criação de PaymentIntent.
 * Garante que o valor (`amount`) e a moeda (`currency`) sejam válidos.
 */
const createPaymentValidators = [
  body("amount")
    .isInt({ min: 50 }) // Valor mínimo de 50 centavos (R$ 0,50 ou $0.50)
    .withMessage("Valor deve ser pelo menos 50 centavos."),

  body("currency")
    .optional()
    .isIn(["brl", "usd", "eur"])
    .withMessage("Moeda deve ser BRL, USD ou EUR."),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Descrição deve ter no máximo 200 caracteres."),

  body("metadata")
    .optional()
    .isObject()
    .withMessage("Metadata deve ser um objeto."),
];

// ===================================================================
// MIDDLEWARE DE VERIFICAÇÃO DO STRIPE
// ===================================================================

/**
 * @function requireStripe
 * @description Middleware que verifica se o cliente Stripe foi inicializado com sucesso.
 * Impede que as rotas de pagamento sejam acessadas se a chave secreta do Stripe não estiver configurada.
 * 
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 * @param {function} next - Função para passar o controle para o próximo middleware.
 */
function requireStripe(req, res, next) {
  if (!stripe) {
    return res.status(500).json({
      error: "Stripe não configurado. Verifique STRIPE_SECRET_KEY no .env.",
      code: "STRIPE_NOT_CONFIGURED",
    });
  }
  next();
}

// ===================================================================
// ROTA: CRIAR PAYMENT INTENT
// ===================================================================

/**
 * @route POST /api/payment/create-payment-intent
 * @description Endpoint para criar uma intenção de pagamento (PaymentIntent) no Stripe.
 * O PaymentIntent é um objeto que representa a intenção de coletar um pagamento de um cliente.
 * 
 * @param {number} req.body.amount - O valor do pagamento em centavos (e.g., 1000 para R$ 10,00).
 * @param {string} [req.body.currency=\'brl\'] - A moeda do pagamento (e.g., 'brl', 'usd').
 * @param {string} [req.body.description=\'Pagamento via sistema\'] - Uma descrição para o pagamento.
 * @param {object} [req.body.metadata={}] - Metadados adicionais para associar ao PaymentIntent.
 * @returns {object} 200 - Objeto PaymentIntent do Stripe e registro local do pagamento.
 * @returns {object} 400 - Erros de validação de entrada ou requisição inválida ao Stripe.
 * @returns {object} 500 - Erro interno do servidor ou erro de processamento do Stripe.
 */
router.post(
  "/create-payment-intent",
  requireStripe,
  optionalAuth,
  createPaymentValidators,
  async (req, res) => {
    try {
      console.log("💳 Criando PaymentIntent...");

      // Verifica se há erros de validação dos dados de entrada.
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log("❌ Dados de pagamento inválidos:", errors.array());
        return res.status(400).json({
          error: "Dados inválidos.",
          code: "VALIDATION_ERROR",
          details: errors.array(),
        });
      }

      const {
        amount,
        currency = "brl",
        description = "Pagamento via sistema",
        metadata = {},
      } = req.body;

      // Adiciona informações do usuário autenticado aos metadados do pagamento.
      const paymentMetadata = {
        ...metadata,
        userId: req.user?.id || "anonymous",
        userEmail: req.user?.email || "not-provided",
        timestamp: new Date().toISOString(),
        ip: req.ip,
      };

      console.log(`💰 Valor: ${amount} centavos (${currency.toUpperCase()})`);

      // Cria o PaymentIntent na API do Stripe.
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: currency,
        description: description,
        metadata: paymentMetadata,

        // Habilita métodos de pagamento automáticos, permitindo que o Stripe gerencie os métodos disponíveis.
        automatic_payment_methods: {
          enabled: true,
        },

        // Configurações específicas para a moeda BRL (Brasil).
        ...(currency === "brl" && {
          payment_method_types: ["card"], // Para BRL, geralmente apenas cartão é suportado diretamente.
        }),
      });

      console.log("✅ PaymentIntent criado no Stripe:", paymentIntent.id);

      // Salva um registro do pagamento no nosso "banco de dados" local.
      const payment = Payment.create({
        userId: req.user?.id,
        stripePaymentIntentId: paymentIntent.id,
        amount: amount,
        currency: currency,
        description: description,
        metadata: paymentMetadata,
        status: "pending", // O status inicial é pendente.
      });

      console.log("💾 Pagamento salvo no banco local:", payment.id);

      // Retorna os detalhes do PaymentIntent e do registro local.
      res.json({
        message: "PaymentIntent criado com sucesso.",
        paymentIntent: {
          id: paymentIntent.id,
          clientSecret: paymentIntent.client_secret, // O client_secret é usado pelo frontend para confirmar o pagamento.
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
        },
        payment: {
          id: payment.id,
          status: payment.status,
          createdAt: payment.createdAt,
        },
      });
    } catch (error) {
      console.error("❌ Erro ao criar PaymentIntent:", error);

      // Trata diferentes tipos de erros do Stripe para feedback mais específico.
      if (error.type === "StripeCardError") {
        return res.status(400).json({
          error: "Erro no cartão: " + error.message,
          code: "STRIPE_CARD_ERROR",
        });
      } else if (error.type === "StripeInvalidRequestError") {
        return res.status(400).json({
          error: "Requisição inválida ao Stripe: " + error.message,
          code: "STRIPE_INVALID_REQUEST",
        });
      } else {
        return res.status(500).json({
          error: "Erro interno no processamento do pagamento.",
          code: "PAYMENT_PROCESSING_ERROR",
        });
      }
    }
  }
);

// ===================================================================
// ROTA: CONFIRMAR PAGAMENTO
// ===================================================================

/**
 * @route POST /api/payment/confirm-payment
 * @description Endpoint para confirmar um PaymentIntent no Stripe.
 * Em muitos casos, a confirmação pode ser feita diretamente no frontend usando o `client_secret`.
 * Esta rota é útil para cenários onde a confirmação precisa ser iniciada pelo backend.
 * 
 * @param {string} req.body.paymentIntentId - O ID do PaymentIntent a ser confirmado.
 * @param {string} [req.body.paymentMethodId] - O ID do método de pagamento (e.g., `pm_card_visa`).
 * @returns {object} 200 - Status atualizado do PaymentIntent.
 * @returns {object} 400 - PaymentIntent ID ausente.
 * @returns {object} 500 - Erro interno do servidor ou erro de confirmação do Stripe.
 */
router.post("/confirm-payment", requireStripe, optionalAuth, async (req, res) => {
  try {
    console.log("✅ Confirmando pagamento...");

    const { paymentIntentId, paymentMethodId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        error: "PaymentIntent ID é obrigatório.",
        code: "MISSING_PAYMENT_INTENT_ID",
      });
    }

    // Recupera o PaymentIntent do Stripe para verificar seu status atual.
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    console.log("📋 Status atual do PaymentIntent:", paymentIntent.status);

    // Se o pagamento já foi bem-sucedido, não há necessidade de confirmar novamente.
    if (paymentIntent.status === "succeeded") {
      // Atualiza o status no banco de dados local, se necessário.
      const payment = Payment.findByStripeId(paymentIntentId);
      if (payment) {
        Payment.updateStatus(payment.id, "succeeded");
      }

      return res.json({
        message: "Pagamento já foi processado com sucesso.",
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        },
      });
    }

    // Se o PaymentIntent requer confirmação, procede com a confirmação.
    if (paymentIntent.status === "requires_confirmation") {
      const confirmedPayment = await stripe.paymentIntents.confirm(
        paymentIntentId,
        paymentMethodId ? { payment_method: paymentMethodId } : {}
      );

      console.log("✅ Pagamento confirmado no Stripe:", confirmedPayment.status);

      // Atualiza o status no banco de dados local.
      const payment = Payment.findByStripeId(paymentIntentId);
      if (payment) {
        Payment.updateStatus(payment.id, confirmedPayment.status);
      }

      return res.json({
        message: "Pagamento confirmado.",
        paymentIntent: {
          id: confirmedPayment.id,
          status: confirmedPayment.status,
          amount: confirmedPayment.amount,
          currency: confirmedPayment.currency,
        },
      });
    }

    // Para outros status (e.g., `requires_action`), retorna o status atual para o frontend lidar.
    res.json({
      message: "Status do pagamento obtido.",
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao confirmar pagamento:", error);

    res.status(500).json({
      error: "Erro ao confirmar pagamento.",
      code: "PAYMENT_CONFIRMATION_ERROR",
    });
  }
});

// ===================================================================
// ROTA: STATUS DO PAGAMENTO
// ===================================================================

/**
 * @route GET /api/payment/payment-status/:id
 * @description Endpoint para consultar o status de um pagamento, tanto localmente quanto no Stripe.
 * 
 * @param {string} req.params.id - O ID local do pagamento ou o ID do PaymentIntent do Stripe.
 * @returns {object} 200 - Detalhes do pagamento e seu status atualizado.
 * @returns {object} 404 - Pagamento não encontrado.
 * @returns {object} 500 - Erro interno do servidor ao consultar o status.
 */
router.get("/payment-status/:id", requireStripe, optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    console.log("🔍 Consultando status do pagamento:", id);

    // Tenta encontrar o pagamento pelo ID local primeiro.
    let payment = Payment.findById(id);

    // Se não encontrado pelo ID local, tenta encontrar pelo ID do PaymentIntent do Stripe.
    if (!payment) {
      payment = Payment.findByStripeId(id);
    }

    if (!payment) {
      return res.status(404).json({
        error: "Pagamento não encontrado.",
        code: "PAYMENT_NOT_FOUND",
      });
    }

    // Recupera o status mais recente do PaymentIntent diretamente do Stripe.
    const paymentIntent = await stripe.paymentIntents.retrieve(
      payment.stripePaymentIntentId
    );

    // Atualiza o status do pagamento no banco de dados local se houver divergência.
    if (payment.status !== paymentIntent.status) {
      Payment.updateStatus(payment.id, paymentIntent.status);
      payment.status = paymentIntent.status; // Garante que o objeto retornado tenha o status mais recente.
    }

    console.log("📊 Status do pagamento atualizado:", paymentIntent.status);

    // Retorna os detalhes do pagamento local e os dados do Stripe.
    res.json({
      payment: {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        description: payment.description,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      },
      stripeData: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        created: new Date(paymentIntent.created * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Erro ao consultar status do pagamento:", error);

    res.status(500).json({
      error: "Erro ao consultar status do pagamento.",
      code: "PAYMENT_STATUS_ERROR",
    });
  }
});

// ===================================================================
// ROTA: WEBHOOK DO STRIPE
// ===================================================================

/**
 * @route POST /api/payment/webhook
 * @description Endpoint para receber eventos de webhook do Stripe.
 * Webhooks são essenciais para lidar com eventos assíncronos do Stripe (e.g., pagamentos bem-sucedidos,
 * falhas, reembolsos). O Stripe envia notificações para este endpoint.
 * 
 * @param {object} req.body - O corpo do evento de webhook do Stripe.
 * @returns {object} 200 - Confirmação de recebimento do evento.
 * @returns {object} 400 - Erro de validação da assinatura do webhook.
 * @returns {object} 500 - Erro interno do servidor ao processar o evento.
 * 
 * @note É CRÍTICO validar a assinatura do webhook para garantir que o evento veio do Stripe e não foi adulterado.
 *       A chave `STRIPE_WEBHOOK_SECRET` deve ser configurada no `.env`.
 */
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    // Constrói o evento do Stripe, verificando a assinatura.
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log("✅ Webhook do Stripe recebido e verificado:", event.type);
  } catch (err) {
    console.error("❌ Erro na verificação da assinatura do webhook:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Lida com os diferentes tipos de eventos do Stripe.
  switch (event.type) {
    case "payment_intent.succeeded":
      const paymentIntentSucceeded = event.data.object;
      console.log("💰 PaymentIntent bem-sucedido:", paymentIntentSucceeded.id);
      // Atualiza o status do pagamento no banco de dados local.
      Payment.updateStatus(
        Payment.findByStripeId(paymentIntentSucceeded.id)?.id,
        "succeeded"
      );
      // Aqui você pode disparar ações como: enviar e-mail de confirmação, liberar acesso ao produto, etc.
      break;
    case "payment_intent.payment_failed":
      const paymentIntentFailed = event.data.object;
      console.log("❌ PaymentIntent falhou:", paymentIntentFailed.id);
      // Atualiza o status do pagamento no banco de dados local.
      Payment.updateStatus(
        Payment.findByStripeId(paymentIntentFailed.id)?.id,
        "failed"
      );
      // Notificar o usuário sobre a falha, tentar novamente, etc.
      break;
    case "payment_intent.canceled":
      const paymentIntentCanceled = event.data.object;
      console.log("🚫 PaymentIntent cancelado:", paymentIntentCanceled.id);
      // Atualiza o status do pagamento no banco de dados local.
      Payment.updateStatus(
        Payment.findByStripeId(paymentIntentCanceled.id)?.id,
        "canceled"
      );
      break;
    // Outros tipos de eventos podem ser adicionados aqui conforme a necessidade.
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Retorna um status 200 para o Stripe para indicar que o evento foi recebido com sucesso.
  res.json({ received: true });
});

// ===================================================================
// EXPORTAÇÃO DO ROUTER
// ===================================================================

module.exports = router;

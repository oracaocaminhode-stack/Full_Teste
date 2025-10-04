/**
 * @file routes/email.js
 * @description Rotas para o serviço de envio de e-mails.
 * Este módulo simula o envio de e-mails, que em uma aplicação real seria feito
 * através de um serviço como Nodemailer, SendGrid, Mailgun, etc.
 * 
 * @author Manus AI
 * @date Oct 01, 2025
 */

// ===================================================================
// IMPORTAÇÕES DE MÓDULOS
// ===================================================================

// Importa o módulo `express` para criar e gerenciar rotas.
const express = require("express");

// Importa `nodemailer` para configurar e enviar e-mails.
const nodemailer = require("nodemailer");

// Importa `body` e `validationResult` do `express-validator` para validação de dados de entrada.
const { body, validationResult } = require("express-validator");

// Importa `rateLimit` do `express-rate-limit` para proteção contra spam.
const rateLimit = require("express-rate-limit");

// Importa os middlewares de autenticação JWT (opcional e obrigatório).
const { authenticateJWT, optionalAuth } = require("../config/passport");

// Cria uma nova instância de roteador Express.
const router = express.Router();

// ===================================================================
// RATE LIMITING PARA EMAILS
// ===================================================================

/**
 * @constant emailLimiter
 * @description Middleware de rate limiting para rotas de envio de e-mails.
 * Ajuda a prevenir spam e abuso do serviço de e-mail, limitando o número de envios por IP.
 */
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // Limite de 10 e-mails por IP por hora
  message: {
    error: "Muitos e-mails enviados. Tente novamente em 1 hora.",
    code: "EMAIL_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true, // Retorna informações de rate limit nos cabeçalhos
  legacyHeaders: false, // Desabilita cabeçalhos legados
});

// Aplica o middleware de rate limiting a todas as rotas definidas neste roteador.
router.use(emailLimiter);

// ===================================================================
// CONFIGURAÇÃO DO NODEMAILER
// ===================================================================

/**
 * @function createEmailTransporter
 * @description Cria e configura um objeto `transporter` do Nodemailer.
 * Este transporter é responsável por enviar e-mails usando as credenciais SMTP configuradas.
 * 
 * @returns {object} Um objeto `transporter` configurado para envio de e-mails.
 * @throws {Error} Se as variáveis de ambiente `EMAIL_USER` ou `EMAIL_PASS` não estiverem configuradas.
 * 
 * @note Para usar o Gmail, é necessário ativar a autenticação de 2 fatores e gerar uma "senha de aplicativo".
 *       A senha de aplicativo deve ser usada como `EMAIL_PASS`, não a senha normal da conta.
 *       Mais informações: https://support.google.com/accounts/answer/185833
 */
function createEmailTransporter() {
  try {
    console.log("📧 Configurando transporter de e-mail...");

    // Verifica se as credenciais de e-mail estão configuradas nas variáveis de ambiente.
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error("Variáveis de ambiente EMAIL_USER ou EMAIL_PASS não configuradas.");
    }

    // Cria o transporter com as configurações SMTP.
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com", // Host SMTP (padrão Gmail)
      port: parseInt(process.env.EMAIL_PORT) || 587, // Porta SMTP (587 para TLS, 465 para SSL)
      secure: false, // `true` para porta 465 (SSL), `false` para outras (TLS)

      // Credenciais de autenticação SMTP.
      auth: {
        user: process.env.EMAIL_USER, // Seu endereço de e-mail (e.g., Gmail)
        pass: process.env.EMAIL_PASS, // Sua senha de aplicativo (para Gmail) ou senha normal.
      },

      // Configurações adicionais para TLS. `rejectUnauthorized: false` é útil em desenvolvimento
      // para ignorar certificados autoassinados, mas deve ser `true` em produção.
      tls: {
        rejectUnauthorized: false,
      },
    });

    console.log("✅ Transporter de e-mail configurado.");
    return transporter;
  } catch (error) {
    console.error("❌ Erro ao configurar transporter de e-mail:", error);
    throw error;
  }
}

/**
 * @function verifyEmailConnection
 * @description Verifica a conexão com o servidor SMTP configurado.
 * Útil para diagnosticar problemas de configuração de e-mail na inicialização ou em testes.
 * 
 * @returns {Promise<boolean>} `true` se a conexão for bem-sucedida, `false` caso contrário.
 */
async function verifyEmailConnection() {
  try {
    const transporter = createEmailTransporter();
    await transporter.verify(); // Tenta verificar a conexão com o servidor SMTP.
    console.log("✅ Conexão com servidor de e-mail verificada com sucesso.");
    return true;
  } catch (error) {
    console.error("❌ Erro na conexão com servidor de e-mail:", error);
    return false;
  }
}

// ===================================================================
// VALIDADORES DE ENTRADA
// ===================================================================

/**
 * @constant sendEmailValidators
 * @description Array de middlewares de validação para a rota de envio de e-mail simples.
 * Garante que os campos `to`, `subject` e `message` estejam presentes e formatados corretamente.
 */
const sendEmailValidators = [
  body("to")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Email de destino deve ter formato válido."),

  body("subject")
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Assunto deve ter entre 1 e 200 caracteres."),

  body("message")
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage("Mensagem deve ter entre 1 e 5000 caracteres."),

  body("senderName")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Nome do remetente deve ter no máximo 100 caracteres."),

  body("senderEmail")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Email do remetente deve ter formato válido."),
];

/**
 * @constant contactValidators
 * @description Array de middlewares de validação para a rota de formulário de contato.
 * Garante que os campos `name`, `email`, `subject` e `message` estejam presentes e formatados corretamente.
 */
const contactValidators = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Nome deve ter entre 2 e 100 caracteres.")
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
    .withMessage("Nome deve conter apenas letras e espaços."),

  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Email deve ter formato válido."),

  body("subject")
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage("Assunto deve ter entre 5 e 200 caracteres."),

  body("message")
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage("Mensagem deve ter entre 10 e 5000 caracteres."),

  body("phone")
    .optional()
    .trim()
    .matches(/^[\d\s\-\(\)\+]+$/)
    .withMessage("Telefone deve conter apenas números e símbolos válidos."),
];

// ===================================================================
// ROTA: ENVIAR EMAIL SIMPLES
// ===================================================================

/**
 * @route POST /api/email/send
 * @description Endpoint para enviar um e-mail simples.
 * Esta rota pode ser acessada por usuários autenticados ou não (usando `optionalAuth`).
 * O e-mail é enviado usando o transporter Nodemailer configurado.
 * 
 * @param {string} [req.body.to] - O endereço de e-mail do destinatário. Se não fornecido, usa `process.env.EMAIL_TO`.
 * @param {string} req.body.subject - O assunto do e-mail.
 * @param {string} req.body.message - O corpo da mensagem do e-mail (texto puro).
 * @param {string} [req.body.senderName] - O nome do remetente. Se não fornecido, usa o nome do usuário logado ou "Sistema".
 * @param {string} [req.body.senderEmail] - O e-mail do remetente. Se não fornecido, usa o e-mail do usuário logado ou `process.env.EMAIL_USER`.
 * @returns {object} 200 - Mensagem de sucesso e detalhes do e-mail enviado.
 * @returns {object} 400 - Erros de validação ou e-mail de destino não configurado.
 * @returns {object} 500 - Erro interno do servidor durante o envio do e-mail.
 */
router.post("/send", optionalAuth, sendEmailValidators, async (req, res) => {
  try {
    console.log("📧 Tentativa de envio de e-mail.");

    // Verifica se há erros de validação dos dados de entrada.
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("❌ Dados de e-mail inválidos:", errors.array());
      return res.status(400).json({
        error: "Dados inválidos para envio de e-mail.",
        code: "VALIDATION_ERROR",
        details: errors.array(),
      });
    }

    const { to, subject, message, senderName, senderEmail } = req.body;

    // Define o e-mail do destinatário, priorizando o fornecido na requisição ou a variável de ambiente.
    const recipientEmail = to || process.env.EMAIL_TO;

    if (!recipientEmail) {
      return res.status(400).json({
        error: "Email de destino não configurado. Forneça 'to' ou configure EMAIL_TO no .env.",
        code: "NO_RECIPIENT_EMAIL",
      });
    }

    // Cria o transporter de e-mail.
    const transporter = createEmailTransporter();

    // Define o nome e e-mail do remetente, usando dados do usuário logado se disponível.
    const fromName = senderName || req.user?.name || "Sistema";
    const fromEmail = senderEmail || req.user?.email || process.env.EMAIL_USER;

    // Configura as opções do e-mail a ser enviado.
    const mailOptions = {
      from: `"${fromName}" <${process.env.EMAIL_USER}>`, // O remetente real (EMAIL_USER) é usado para autenticação SMTP.
      to: recipientEmail,
      subject: subject,
      text: message, // Versão em texto puro do e-mail.
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Nova Mensagem</h2>
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>De:</strong> ${fromName} (${fromEmail})</p>
                        <p><strong>Assunto:</strong> ${subject}</p>
                        <p><strong>Data:</strong> ${new Date().toLocaleString("pt-BR")}</p>
                    </div>
                    <div style="background: white; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                        <h3>Mensagem:</h3>
                        <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
                    </div>
                    <div style="margin-top: 20px; padding: 10px; background: #f0f0f0; border-radius: 5px; font-size: 12px; color: #666;">
                        <p>Esta mensagem foi enviada através do sistema de contato do site.</p>
                        ${req.user ? `<p>Usuário autenticado: ${req.user.email}</p>` : "<p>Usuário não autenticado</p>"}
                    </div>
                </div>
            `, // Versão em HTML do e-mail.

      // Cabeçalhos adicionais para rastreamento ou informações.
      headers: {
        "X-Sender-IP": req.ip,
        "X-User-Agent": req.get("User-Agent"),
      },
    };

    // Se um e-mail de remetente diferente for fornecido, adiciona-o como `Reply-To`.
    if (senderEmail && senderEmail !== process.env.EMAIL_USER) {
      mailOptions.replyTo = `"${fromName}" <${senderEmail}>`;
    }

    console.log("📤 Enviando e-mail para:", recipientEmail);

    // Envia o e-mail usando o transporter.
    const info = await transporter.sendMail(mailOptions);

    console.log("✅ E-mail enviado com sucesso. Message ID:", info.messageId);

    // Retorna uma resposta de sucesso.
    res.json({
      message: "E-mail enviado com sucesso.",
      messageId: info.messageId,
      recipient: recipientEmail,
      subject: subject,
    });
  } catch (error) {
    console.error("❌ Erro ao enviar e-mail:", error);

    // Trata diferentes tipos de erros de e-mail para feedback mais específico.
    if (error.code === "EAUTH") {
      return res.status(500).json({
        error: "Erro de autenticação do e-mail. Verifique as credenciais SMTP.",
        code: "EMAIL_AUTH_ERROR",
      });
    } else if (error.code === "ECONNECTION") {
      return res.status(500).json({
        error: "Erro de conexão com o servidor de e-mail. Verifique a rede ou as configurações do host/porta.",
        code: "EMAIL_CONNECTION_ERROR",
      });
    } else {
      return res.status(500).json({
        error: "Erro interno ao enviar e-mail.",
        code: "EMAIL_SEND_ERROR",
      });
    }
  }
});

// ===================================================================
// ROTA: FORMULÁRIO DE CONTATO
// ===================================================================

/**
 * @route POST /api/email/contact
 * @description Endpoint para processar envios de formulários de contato do site.
 * Valida os dados do formulário e envia um e-mail para o administrador (definido em `EMAIL_TO`).
 * 
 * @param {string} req.body.name - O nome do remetente do formulário.
 * @param {string} req.body.email - O e-mail do remetente do formulário.
 * @param {string} req.body.subject - O assunto da mensagem do formulário.
 * @param {string} req.body.message - O corpo da mensagem do formulário.
 * @param {string} [req.body.phone] - O número de telefone do remetente (opcional).
 * @returns {object} 200 - Mensagem de sucesso e detalhes do e-mail enviado.
 * @returns {object} 400 - Erros de validação de entrada.
 * @returns {object} 500 - Erro interno do servidor durante o envio do e-mail.
 */
router.post("/contact", contactValidators, async (req, res) => {
  try {
    console.log("📞 Novo formulário de contato de:", req.body.email);

    // Verifica se há erros de validação dos dados de entrada.
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("❌ Dados de contato inválidos:", errors.array());
      return res.status(400).json({
        error: "Dados inválidos para o formulário de contato.",
        code: "VALIDATION_ERROR",
        details: errors.array(),
      });
    }

    const { name, email, subject, message, phone } = req.body;

    // Cria o transporter de e-mail.
    const transporter = createEmailTransporter();

    // O e-mail de destino para mensagens de contato (geralmente o administrador).
    const recipientEmail = process.env.EMAIL_TO;

    if (!recipientEmail) {
      return res.status(500).json({
        error: "Email de destino para contato (EMAIL_TO) não configurado no .env.",
        code: "NO_RECIPIENT_EMAIL_CONFIGURED",
      });
    }

    // Configura as opções do e-mail para o formulário de contato.
    const mailOptions = {
      from: `"Sistema de Contato" <${process.env.EMAIL_USER}>`, // Remetente do sistema.
      to: recipientEmail, // Destinatário é o administrador.
      replyTo: `"${name}" <${email}>`, // Permite responder diretamente ao remetente do formulário.
      subject: `[CONTATO] ${subject}`, // Assunto com prefixo para fácil identificação.
      text: `
Nome: ${name}
Email: ${email}
${phone ? `Telefone: ${phone}` : ""}
Assunto: ${subject}

Mensagem:
${message}

---
Enviado em: ${new Date().toLocaleString("pt-BR")}
IP: ${req.ip}
            `, // Versão em texto puro.
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0; font-size: 24px;">📞 Nova Mensagem de Contato</h1>
                    </div>
                    
                    <div style="background: white; padding: 30px; border: 1px solid #ddd; border-top: none;">
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                            <h2 style="color: #333; margin-top: 0;">Informações do Contato</h2>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #555;">Nome:</td>
                                    <td style="padding: 8px 0;">${name}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #555;">Email:</td>
                                    <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #667eea;">${email}</a></td>
                                </tr>
                                ${phone ? `
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #555;">Telefone:</td>
                                    <td style="padding: 8px 0;">${phone}</td>
                                </tr>
                                ` : ""}
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #555;">Assunto:</td>
                                    <td style="padding: 8px 0;">${subject}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #555;">Data:</td>
                                    <td style="padding: 8px 0;">${new Date().toLocaleString("pt-BR")}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <div style="background: #fff; padding: 20px; border: 2px solid #e9ecef; border-radius: 8px;">
                            <h3 style="color: #333; margin-top: 0;">Mensagem:</h3>
                            <p style="white-space: pre-wrap; line-height: 1.6; color: #555; font-size: 16px;">${message}</p>
                        </div>
                        
                        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea;">
                            <p style="margin: 0; font-size: 14px; color: #666;">
                                <strong>💡 Dica:</strong> Você pode responder diretamente a este e-mail para entrar em contato com ${name}.
                            </p>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; padding: 20px; font-size: 12px; color: #999;">
                        <p>&copy; ${new Date().getFullYear()} Seu Projeto. Todos os direitos reservados.</p>
                        <p>Esta mensagem foi enviada automaticamente pelo sistema de contato.</p>
                    </div>
                </div>
            `, // Versão em HTML.
    };

    console.log("📤 Enviando e-mail de contato para:", recipientEmail);

    // Envia o e-mail usando o transporter.
    const info = await transporter.sendMail(mailOptions);

    console.log("✅ E-mail de contato enviado com sucesso. Message ID:", info.messageId);

    // Retorna uma resposta de sucesso.
    res.json({
      message: "Mensagem de contato enviada com sucesso.",
      messageId: info.messageId,
    });
  } catch (error) {
    console.error("❌ Erro ao processar formulário de contato:", error);

    // Trata erros de e-mail de forma semelhante à rota `/send`.
    if (error.code === "EAUTH") {
      return res.status(500).json({
        error: "Erro de autenticação do e-mail. Verifique as credenciais SMTP.",
        code: "EMAIL_AUTH_ERROR",
      });
    } else if (error.code === "ECONNECTION") {
      return res.status(500).json({
        error: "Erro de conexão com o servidor de e-mail. Verifique a rede ou as configurações do host/porta.",
        code: "EMAIL_CONNECTION_ERROR",
      });
    } else {
      return res.status(500).json({
        error: "Erro interno ao enviar e-mail de contato.",
        code: "EMAIL_SEND_ERROR",
      });
    }
  }
});

// ===================================================================
// EXPORTAÇÃO DO ROUTER
// ===================================================================

module.exports = router;

/**
 * @file routes/auth.js
 * @description Rotas de autenticação para o sistema, incluindo registro, login, Google OAuth, perfil e renovação de token.
 * Este módulo gerencia o fluxo de autenticação de usuários, garantindo a segurança e a integridade dos dados.
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

// Importa `rateLimit` do `express-rate-limit` para proteção contra ataques de força bruta.
const rateLimit = require("express-rate-limit");

// Importa o modelo de usuário (simulado em memória).
const User = require("../models/User");

// Importa funções utilitárias para JWT (geração e validação de tokens).
const { generateTokenPair, validateToken } = require("../utils/jwt");

// Importa os middlewares de autenticação do Passport.js.
const { authenticateJWT } = require("../config/passport");
const passport = require("passport");

// Cria uma nova instância de roteador Express.
const router = express.Router();

// ===================================================================
// RATE LIMITING ESPECÍFICO PARA AUTENTICAÇÃO
// ===================================================================

/**
 * @constant authLimiter
 * @description Middleware de rate limiting para rotas de autenticação.
 * Ajuda a prevenir ataques de força bruta e abuso de endpoints de login/registro.
 * Limita o número de requisições por IP em um determinado período.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Limite de 5 requisições por IP a cada 15 minutos
  message: {
    error: "Muitas tentativas de autenticação. Tente novamente em 15 minutos.",
    code: "AUTH_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true, // Retorna informações de rate limit nos cabeçalhos (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset)
  legacyHeaders: false, // Desabilita os cabeçalhos X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
  // A função `skip` permite ignorar o rate limit para certas rotas.
  // Neste caso, rotas de perfil e logout não são afetadas.
  skip: (req) => {
    return req.path === "/profile" || req.path === "/logout";
  },
});

// Aplica o middleware de rate limiting a todas as rotas definidas neste roteador.
router.use(authLimiter);

// ===================================================================
// VALIDADORES DE ENTRADA
// ===================================================================

/**
 * @constant registerValidators
 * @description Array de middlewares de validação para a rota de registro.
 * Garante que os dados fornecidos pelo usuário atendam aos requisitos de formato e segurança.
 */
const registerValidators = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Email deve ter um formato válido."),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Senha deve ter pelo menos 6 caracteres.")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula e 1 número."
    ),

  body("name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Nome deve ter entre 2 e 100 caracteres.")
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
    .withMessage("Nome deve conter apenas letras e espaços."),
];

/**
 * @constant loginValidators
 * @description Array de middlewares de validação para a rota de login.
 * Garante que os campos essenciais (email e senha) não estejam vazios e tenham formato válido.
 */
const loginValidators = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Email deve ter um formato válido."),

  body("password").notEmpty().withMessage("Senha é obrigatória."),
];

// ===================================================================
// ROTA: CADASTRO DE USUÁRIO
// ===================================================================

/**
 * @route POST /api/auth/register
 * @description Endpoint para registrar um novo usuário com e-mail e senha.
 * Valida os dados de entrada, verifica a existência do e-mail e cria um novo usuário.
 * Em caso de sucesso, retorna os dados do usuário e tokens de autenticação.
 * 
 * @param {string} req.body.email - O e-mail do novo usuário.
 * @param {string} req.body.password - A senha do novo usuário.
 * @param {string} req.body.name - O nome do novo usuário.
 * @returns {object} 201 - Usuário criado com sucesso e tokens JWT.
 * @returns {object} 400 - Erros de validação de entrada.
 * @returns {object} 409 - E-mail já registrado.
 * @returns {object} 500 - Erro interno do servidor.
 */
router.post("/register", registerValidators, async (req, res) => {
  try {
    console.log("📝 Tentativa de cadastro para:", req.body.email);

    // Verifica se há erros de validação dos dados de entrada.
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("❌ Dados de cadastro inválidos:", errors.array());
      return res.status(400).json({
        error: "Dados inválidos.",
        code: "VALIDATION_ERROR",
        details: errors.array(),
      });
    }

    const { email, password, name } = req.body;

    // Verifica se já existe um usuário com o e-mail fornecido.
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      console.log("❌ Tentativa de cadastro com e-mail existente:", email);
      return res.status(409).json({
        error: "E-mail já está em uso.",
        code: "EMAIL_ALREADY_EXISTS",
      });
    }

    // Cria um novo usuário no sistema.
    const newUser = await User.create({
      email,
      password,
      name,
      authProvider: "local",
      isEmailVerified: false, // Em uma aplicação real, um processo de verificação de e-mail seria iniciado aqui.
    });

    // Gera um par de tokens (acesso e refresh) para o novo usuário.
    const tokens = generateTokenPair(newUser);

    console.log("✅ Usuário cadastrado com sucesso:", newUser.id);

    // Retorna os dados do usuário (sem a senha) e os tokens.
    res.status(201).json({
      message: "Usuário cadastrado com sucesso.",
      user: newUser.toJSON(),
      ...tokens,
    });
  } catch (error) {
    console.error("❌ Erro no cadastro:", error);
    res.status(500).json({
      error: "Erro interno do servidor.",
      code: "INTERNAL_ERROR",
    });
  }
});

// ===================================================================
// ROTA: LOGIN DE USUÁRIO
// ===================================================================

/**
 * @route POST /api/auth/login
 * @description Endpoint para autenticar um usuário com e-mail e senha.
 * Valida as credenciais e, se corretas, retorna os dados do usuário e tokens de autenticação.
 * 
 * @param {string} req.body.email - O e-mail do usuário.
 * @param {string} req.body.password - A senha do usuário.
 * @returns {object} 200 - Login bem-sucedido e tokens JWT.
 * @returns {object} 400 - Erros de validação de entrada.
 * @returns {object} 401 - Credenciais incorretas ou conta OAuth.
 * @returns {object} 500 - Erro interno do servidor.
 */
router.post("/login", loginValidators, async (req, res) => {
  try {
    console.log("🔐 Tentativa de login para:", req.body.email);

    // Verifica se há erros de validação dos dados de entrada.
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("❌ Dados de login inválidos:", errors.array());
      return res.status(400).json({
        error: "Dados inválidos.",
        code: "VALIDATION_ERROR",
        details: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Busca o usuário pelo e-mail fornecido.
    const user = await User.findByEmail(email);
    if (!user) {
      console.log("❌ Tentativa de login com e-mail inexistente:", email);
      return res.status(401).json({
        error: "Email ou senha incorretos.",
        code: "INVALID_CREDENTIALS",
      });
    }

    // Verifica se a conta foi criada via OAuth (não possui senha local).
    if (!user.password) {
      console.log("❌ Tentativa de login com senha em conta OAuth:", email);
      return res.status(401).json({
        error: "Esta conta foi criada com Google. Use \"Entrar com Google\".",
        code: "OAUTH_ACCOUNT",
      });
    }

    // Valida a senha fornecida com a senha hashed armazenada.
    const isPasswordValid = await User.comparePassword(password, user.password);
    if (!isPasswordValid) {
      console.log("❌ Senha incorreta para:", email);
      return res.status(401).json({
        error: "Email ou senha incorretos.",
        code: "INVALID_CREDENTIALS",
      });
    }

    // Gera um par de tokens (acesso e refresh) para o usuário autenticado.
    const tokens = generateTokenPair(user);

    console.log("✅ Login bem-sucedido para:", user.email);

    // Retorna os dados do usuário (sem a senha) e os tokens.
    res.json({
      message: "Login realizado com sucesso.",
      user: user.toJSON(),
      ...tokens,
    });
  } catch (error) {
    console.error("❌ Erro no login:", error);
    res.status(500).json({
      error: "Erro interno do servidor.",
      code: "INTERNAL_ERROR",
    });
  }
});

// ===================================================================
// ROTA: INICIAR LOGIN COM GOOGLE
// ===================================================================

/**
 * @route GET /api/auth/google
 * @description Inicia o fluxo de autenticação com o Google OAuth.
 * Redireciona o usuário para a página de consentimento do Google.
 * 
 * @flow
 * 1. O usuário é redirecionado para o Google para autenticação.
 * 2. Após a autorização do usuário, o Google redireciona para `/api/auth/google/callback`.
 * 
 * @param {array} scope - Define as permissões solicitadas ao Google (e.g., `profile`, `email`).
 * @param {boolean} session - `false` para indicar que não usaremos sessões baseadas em cookies (usamos JWT).
 */
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false, // Não usar sessões, pois estamos usando autenticação baseada em token (JWT)
  })
);

// ===================================================================
// ROTA: CALLBACK DO GOOGLE OAUTH
// ===================================================================

/**
 * @route GET /api/auth/google/callback
 * @description Endpoint de callback para o Google OAuth.
 * O Google redireciona para esta rota após o usuário autorizar a aplicação.
 * Processa a resposta do Google, autentica o usuário e gera tokens JWT.
 * 
 * @flow
 * 1. O Google redireciona para esta URL com um código de autorização.
 * 2. O Passport.js troca este código por um token de acesso do Google e dados do perfil.
 * 3. A estratégia `GoogleStrategy` (definida em `config/passport.js`) é executada para criar ou encontrar o usuário.
 * 4. Se bem-sucedido, gera tokens JWT e redireciona para o frontend (ou retorna JSON).
 * 
 * @param {boolean} session - `false` para não usar sessões.
 * @param {string} failureRedirect - URL para redirecionar em caso de falha na autenticação Google.
 * @returns {object} 200 - Login com Google bem-sucedido e tokens JWT.
 * @returns {object} 500 - Erro interno do servidor durante o processo de callback.
 */
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login?error=google_auth_failed", // Redireciona para o login com erro em caso de falha
  }),
  async (req, res) => {
    try {
      console.log("✅ Callback do Google OAuth bem-sucedido para:", req.user.email);

      // O objeto `req.user` é populado pelo Passport.js com os dados do usuário autenticado.
      const tokens = generateTokenPair(req.user);

      // Em um cenário de produção, você geralmente redirecionaria o usuário para o frontend
      // com os tokens na URL ou em cookies seguros.
      // Exemplo: res.redirect(`${process.env.FRONTEND_URL}/dashboard?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`);
      
      // Para fins didáticos, retornamos os tokens e o usuário como JSON.
      res.json({
        message: "Login com Google realizado com sucesso.",
        user: req.user.toJSON(),
        ...tokens,
      });
    } catch (error) {
      console.error("❌ Erro no callback do Google:", error);
      res.status(500).json({
        error: "Erro no login com Google.",
        code: "GOOGLE_AUTH_ERROR",
      });
    }
  }
);

// ===================================================================
// ROTA: PERFIL DO USUÁRIO (PROTEGIDA)
// ===================================================================

/**
 * @route GET /api/auth/profile
 * @description Endpoint protegido que retorna os dados do perfil do usuário autenticado.
 * Requer um token JWT válido no cabeçalho `Authorization`.
 * 
 * @param {string} req.headers.authorization - Token JWT no formato `Bearer <token>`.
 * @returns {object} 200 - Dados do perfil do usuário.
 * @returns {object} 401 - Token inválido ou expirado (não autorizado).
 * @returns {object} 500 - Erro interno do servidor.
 */
router.get("/profile", authenticateJWT, async (req, res) => {
  try {
    console.log("👤 Solicitação de perfil para usuário:", req.user.email);

    // O objeto `req.user` é populado pelo middleware `authenticateJWT` (Passport.js)
    // com os dados do usuário autenticado, tornando-o diretamente acessível aqui.
    res.json({
      message: "Perfil obtido com sucesso.",
      user: req.user.toJSON(), // Retorna o objeto do usuário sem a senha
    });
  } catch (error) {
    console.error("❌ Erro ao obter perfil:", error);
    res.status(500).json({
      error: "Erro interno do servidor.",
      code: "INTERNAL_ERROR",
    });
  }
});

// ===================================================================
// ROTA: RENOVAR TOKEN
// ===================================================================

/**
 * @route POST /api/auth/refresh
 * @description Endpoint para renovar o token de acesso usando um refresh token válido.
 * Permite que os usuários mantenham a sessão ativa sem precisar fazer login novamente.
 * 
 * @param {string} req.body.refreshToken - O refresh token fornecido pelo cliente.
 * @returns {object} 200 - Novo token de acesso e refresh token.
 * @returns {object} 400 - Refresh token ausente.
 * @returns {object} 401 - Refresh token inválido, expirado ou tipo incorreto.
 * @returns {object} 500 - Erro interno do servidor.
 */
router.post("/refresh", async (req, res) => {
  try {
    console.log("🔄 Tentativa de renovação de token.");

    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: "Refresh token é obrigatório.",
        code: "MISSING_REFRESH_TOKEN",
      });
    }

    // Valida o refresh token. Se for inválido ou expirado, `validateToken` lançará um erro.
    const decoded = validateToken(refreshToken);

    // Verifica se o token decodificado é realmente um refresh token.
    if (decoded.type !== "refresh") {
      return res.status(401).json({
        error: "Token inválido: Não é um refresh token.",
        code: "INVALID_TOKEN_TYPE",
      });
    }

    // Busca o usuário associado ao refresh token.
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        error: "Usuário não encontrado para o refresh token.",
        code: "USER_NOT_FOUND",
      });
    }

    // Gera um novo par de tokens (acesso e refresh).
    const tokens = generateTokenPair(user);

    console.log("✅ Token renovado com sucesso para:", user.email);

    // Retorna os novos tokens.
    res.json({
      message: "Token renovado com sucesso.",
      ...tokens,
    });
  } catch (error) {
    console.error("❌ Erro ao renovar token:", error);

    // Trata erros específicos de JWT para dar feedback mais preciso ao cliente.
    if (error.message.includes("Token")) {
      return res.status(401).json({
        error: "Refresh token inválido ou expirado.",
        code: "INVALID_REFRESH_TOKEN",
      });
    }

    res.status(500).json({
      error: "Erro interno do servidor.",
      code: "INTERNAL_ERROR",
    });
  }
});

// ===================================================================
// ROTA: LOGOUT
// ===================================================================

/**
 * @route POST /api/auth/logout
 * @description Endpoint para realizar o logout do usuário.
 * Em um sistema baseado em JWT, o "logout" é principalmente uma ação do lado do cliente
 * (remover os tokens armazenados). Esta rota pode ser usada para invalidação de tokens
 * no lado do servidor (e.g., adicionando tokens a uma blacklist ou invalidando refresh tokens).
 * 
 * @param {string} req.headers.authorization - Token JWT no formato `Bearer <token>`.
 * @returns {object} 200 - Mensagem de logout bem-sucedido.
 * @returns {object} 500 - Erro interno do servidor.
 */
router.post("/logout", authenticateJWT, async (req, res) => {
  try {
    console.log("👋 Logout para usuário:", req.user.email);

    // Em uma implementação mais robusta, aqui você poderia:
    // 1. Adicionar o token de acesso atual a uma blacklist para invalidá-lo imediatamente.
    // 2. Invalidar o refresh token associado no banco de dados (se estiver armazenado).
    // 3. Registrar o evento de logout para fins de auditoria.

    res.json({
      message: "Logout realizado com sucesso.",
    });
  } catch (error) {
    console.error("❌ Erro no logout:", error);
    res.status(500).json({
      error: "Erro interno do servidor.",
      code: "INTERNAL_ERROR",
    });
  }
});

// ===================================================================
// ROTA: VERIFICAR STATUS DE AUTENTICAÇÃO
// ===================================================================

/**
 * @route GET /api/auth/status
 * @description Endpoint para verificar o status de autenticação do usuário.
 * Pode ser usado pelo frontend para verificar se o usuário ainda está logado.
 * 
 * @param {string} [req.headers.authorization] - Token JWT opcional no formato `Bearer <token>`.
 * @returns {object} 200 - Objeto indicando se o usuário está autenticado e, se sim, seus dados.
 */
router.get("/status", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // Se não há token ou o formato é inválido, o usuário não está autenticado.
    return res.json({
      authenticated: false,
      message: "Token não fornecido ou formato inválido.",
    });
  }

  const token = authHeader.substring(7);

  try {
    // Tenta validar o token. Se for válido, o usuário está autenticado.
    const decoded = validateToken(token);
    // Em um cenário real, você buscaria o usuário no banco de dados para garantir que ele ainda existe.
    // Para este exemplo, apenas a validação do token é suficiente para o status.
    res.json({
      authenticated: true,
      message: "Usuário autenticado.",
      userId: decoded.userId,
      email: decoded.email,
    });
  } catch (error) {
    // Se o token for inválido ou expirado, o usuário não está autenticado.
    res.json({
      authenticated: false,
      message: `Token inválido ou expirado: ${error.message}`,
    });
  }
});

// ===================================================================
// EXPORTAÇÃO DO ROUTER
// ===================================================================

module.exports = router;

/**
 * @file utils/jwt.js
 * @description Módulo para manipulação de JSON Web Tokens (JWTs).
 * Contém funções para gerar, validar, decodificar e extrair JWTs, essenciais para a autenticação baseada em token.
 * 
 * @author Manus AI
 * @date Oct 01, 2025
 */

// ===================================================================
// IMPORTAÇÕES DE MÓDULOS
// ===================================================================

// Importa a biblioteca `jsonwebtoken` para trabalhar com JWTs.
const jwt = require("jsonwebtoken");

// ===================================================================
// CONFIGURAÇÕES JWT
// ===================================================================

/**
 * @constant JWT_CONFIG
 * @description Objeto de configuração para os JWTs.
 * As configurações são carregadas de variáveis de ambiente para flexibilidade e segurança.
 * Valores padrão são fornecidos para desenvolvimento, mas DEVEM ser substituídos em produção.
 */
const JWT_CONFIG = {
  // Chave secreta usada para assinar e verificar os tokens. CRÍTICA para a segurança.
  // Deve ser uma string longa e aleatória, armazenada de forma segura (e.g., variáveis de ambiente).
  secret: process.env.JWT_SECRET || "sua_chave_secreta_super_forte_e_aleatoria",

  // Tempo de expiração para o token de acesso (e.g., "15m", "1h", "24h").
  // Tokens de acesso devem ter um tempo de vida curto para minimizar o risco de roubo.
  expiresIn: process.env.JWT_EXPIRES_IN || "24h",

  // Tempo de expiração para o refresh token (e.g., "7d", "30d").
  // Refresh tokens têm um tempo de vida mais longo e são usados para obter novos tokens de acesso.
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",

  // Algoritmo de assinatura usado (e.g., "HS256", "RS256").
  algorithm: "HS256",

  // Emissor do token (identifica quem emitiu o JWT).
  issuer: process.env.JWT_ISSUER || "fullstack-project-api",

  // Audiência do token (identifica para quem o JWT se destina).
  audience: process.env.JWT_AUDIENCE || "fullstack-project-users",
};

// ===================================================================
// FUNÇÕES DE GERAÇÃO DE TOKENS
// ===================================================================

/**
 * @function generateAccessToken
 * @description Gera um JSON Web Token (JWT) de acesso para um usuário.
 * Este token é usado para autorizar requisições a recursos protegidos da API.
 * 
 * @param {object} user - O objeto de usuário contendo `id`, `email` e `name`.
 * @param {number} user.id - O ID único do usuário.
 * @param {string} user.email - O endereço de e-mail do usuário.
 * @param {string} [user.name] - O nome do usuário (opcional).
 * @returns {string} O token de acesso JWT assinado.
 * @throws {Error} Se houver um erro durante a geração do token.
 */
function generateAccessToken(user) {
  try {
    console.log("🔐 Gerando token de acesso para usuário:", user.email);

    // O payload (corpo) do token. Contém informações não sensíveis sobre o usuário.
    // EVITE incluir dados sensíveis como senhas ou informações financeiras aqui.
    const payload = {
      userId: user.id, // ID do usuário é crucial para identificar o usuário no backend
      email: user.email,
      name: user.name,
    };

    // Opções de assinatura do token, incluindo tempo de expiração, emissor e audiência.
    const options = {
      expiresIn: JWT_CONFIG.expiresIn,
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
      algorithm: JWT_CONFIG.algorithm,
    };

    // Assina o token com o payload, a chave secreta e as opções.
    const token = jwt.sign(payload, JWT_CONFIG.secret, options);

    console.log("✅ Token de acesso gerado com sucesso.");
    console.log(`⏰ Expira em: ${JWT_CONFIG.expiresIn}`);

    return token;
  } catch (error) {
    console.error("❌ Erro ao gerar token de acesso:", error);
    throw new Error("Erro ao gerar token de autenticação.");
  }
}

/**
 * @function generateRefreshToken
 * @description Gera um refresh token para um usuário.
 * Refresh tokens são usados para obter novos tokens de acesso quando o token atual expira,
 * sem exigir que o usuário faça login novamente. Eles geralmente têm um tempo de vida mais longo.
 * 
 * @param {object} user - O objeto de usuário contendo `id` e `email`.
 * @param {number} user.id - O ID único do usuário.
 * @param {string} user.email - O endereço de e-mail do usuário.
 * @returns {string} O refresh token JWT assinado.
 * @throws {Error} Se houver um erro durante a geração do token.
 */
function generateRefreshToken(user) {
  try {
    console.log("🔄 Gerando refresh token para usuário:", user.email);

    // Payload simplificado para o refresh token.
    const payload = {
      userId: user.id,
      type: "refresh", // Indica que este é um refresh token
    };

    // Opções de assinatura para o refresh token.
    const options = {
      expiresIn: JWT_CONFIG.refreshExpiresIn,
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
      algorithm: JWT_CONFIG.algorithm,
    };

    // Assina o refresh token.
    const refreshToken = jwt.sign(payload, JWT_CONFIG.secret, options);

    console.log("✅ Refresh token gerado com sucesso.");
    console.log(`⏰ Expira em: ${JWT_CONFIG.refreshExpiresIn}`);

    return refreshToken;
  } catch (error) {
    console.error("❌ Erro ao gerar refresh token:", error);
    throw new Error("Erro ao gerar refresh token.");
  }
}

// ===================================================================
// FUNÇÕES DE VALIDAÇÃO DE TOKENS
// ===================================================================

/**
 * @function validateToken
 * @description Valida e decodifica um JSON Web Token (JWT).
 * Verifica a assinatura, a expiração e outros metadados do token.
 * 
 * @param {string} token - O token JWT a ser validado.
 * @returns {object} O payload decodificado do token se for válido.
 * @throws {Error} Se o token for inválido, expirado ou houver qualquer erro de validação.
 */
function validateToken(token) {
  try {
    console.log("🔍 Validando token JWT...");

    // Opções de verificação que devem corresponder às opções de assinatura.
    const options = {
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
      algorithms: [JWT_CONFIG.algorithm], // Garante que o algoritmo esperado seja usado
    };

    // Verifica e decodifica o token. Lança um erro se a validação falhar.
    const decoded = jwt.verify(token, JWT_CONFIG.secret, options);

    console.log("✅ Token válido para usuário:", decoded.email);
    console.log(`⏰ Expira em: ${new Date(decoded.exp * 1000).toLocaleString()}`);

    return decoded;
  } catch (error) {
    console.error("❌ Erro ao validar token:", error.message);

    // Trata diferentes tipos de erros de JWT para fornecer mensagens mais específicas.
    if (error.name === "TokenExpiredError") {
      throw new Error("Token expirado.");
    } else if (error.name === "JsonWebTokenError") {
      throw new Error("Token inválido.");
    } else if (error.name === "NotBeforeError") {
      throw new Error("Token ainda não é válido.");
    } else {
      throw new Error("Erro ao validar token.");
    }
  }
}

/**
 * @function decodeToken
 * @description Decodifica um JSON Web Token (JWT) sem realizar validação de assinatura ou expiração.
 * Útil para inspecionar o conteúdo de um token para fins de depuração ou para extrair informações
 * antes de uma validação completa (e.g., para verificar o tipo de token).
 * 
 * @param {string} token - O token JWT a ser decodificado.
 * @returns {object|null} O payload decodificado do token, ou `null` se o token for malformado.
 */
function decodeToken(token) {
  try {
    console.log("🔍 Decodificando token (sem validação)...");

    // Decodifica o token. `complete: true` retorna o header, payload e signature.
    const decoded = jwt.decode(token, { complete: true });

    if (decoded) {
      console.log("📋 Token decodificado:", {
        header: decoded.header,
        payload: {
          userId: decoded.payload.userId,
          email: decoded.payload.email,
          exp: new Date(decoded.payload.exp * 1000).toLocaleString(),
        },
      });
    }

    return decoded;
  } catch (error) {
    console.error("❌ Erro ao decodificar token:", error);
    return null;
  }
}

// ===================================================================
// FUNÇÕES UTILITÁRIAS DE TOKEN
// ===================================================================

/**
 * @function extractTokenFromHeader
 * @description Extrai o token JWT de uma string de cabeçalho `Authorization`.
 * Espera o formato `Bearer <token>`.
 * 
 * @param {string} authHeader - A string completa do cabeçalho `Authorization`.
 * @returns {string|null} O token JWT extraído, ou `null` se o cabeçalho for inválido ou ausente.
 */
function extractTokenFromHeader(authHeader) {
  try {
    if (!authHeader) {
      console.log("❌ Cabeçalho Authorization não fornecido.");
      return null;
    }

    // Verifica se o cabeçalho começa com "Bearer "
    if (!authHeader.startsWith("Bearer ")) {
      console.log("❌ Formato do cabeçalho Authorization inválido. Esperado: 'Bearer <token>'.");
      return null;
    }

    // Extrai o token removendo "Bearer " (7 caracteres)
    const token = authHeader.substring(7);

    if (!token) {
      console.log("❌ Token não encontrado no cabeçalho Authorization.");
      return null;
    }

    console.log("✅ Token extraído do cabeçalho com sucesso.");
    return token;
  } catch (error) {
    console.error("❌ Erro ao extrair token do cabeçalho:", error);
    return null;
  }
}

/**
 * @function isTokenNearExpiry
 * @description Verifica se um token JWT está próximo de expirar dentro de um determinado limite de tempo.
 * Útil para implementar a renovação automática de tokens (refresh token).
 * 
 * @param {string} token - O token JWT a ser verificado.
 * @param {number} [thresholdMinutes=30] - O limite de tempo em minutos antes da expiração para considerar o token "próximo".
 * @returns {boolean} `true` se o token estiver próximo de expirar, `false` caso contrário.
 */
function isTokenNearExpiry(token, thresholdMinutes = 30) {
  try {
    const decoded = decodeToken(token);

    // Se não puder decodificar ou não tiver tempo de expiração, considera como próximo de expirar.
    if (!decoded || !decoded.payload || !decoded.payload.exp) {
      return true;
    }

    const expirationTime = decoded.payload.exp * 1000; // Converte segundos para milissegundos
    const currentTime = Date.now();
    const thresholdTime = thresholdMinutes * 60 * 1000; // Converte minutos para milissegundos

    const timeUntilExpiry = expirationTime - currentTime;
    const isNearExpiry = timeUntilExpiry <= thresholdTime;

    if (isNearExpiry) {
      console.log(
        `⚠️ Token próximo do vencimento: ${Math.round(
          timeUntilExpiry / 60000
        )} minutos restantes.`
      );
    }

    return isNearExpiry;
  } catch (error) {
    console.error("❌ Erro ao verificar vencimento do token:", error);
    return true; // Em caso de erro, assume que está próximo para forçar a renovação.
  }
}

/**
 * @function generateTokenPair
 * @description Gera um par de tokens: um token de acesso e um refresh token.
 * 
 * @param {object} user - O objeto de usuário para o qual os tokens serão gerados.
 * @returns {object} Um objeto contendo `accessToken`, `refreshToken`, `tokenType` e `expiresIn`.
 * @throws {Error} Se houver um erro durante a geração de qualquer um dos tokens.
 */
function generateTokenPair(user) {
  try {
    console.log("🔐 Gerando par de tokens para usuário:", user.email);

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    console.log("✅ Par de tokens gerado com sucesso.");

    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresIn: JWT_CONFIG.expiresIn,
    };
  } catch (error) {
    console.error("❌ Erro ao gerar par de tokens:", error);
    throw error;
  }
}

// ===================================================================
// EXPORTAÇÕES
// ===================================================================

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  validateToken,
  generateTokenPair,
  decodeToken,
  extractTokenFromHeader,
  isTokenNearExpiry,
  JWT_CONFIG, // Exporta as configurações para facilitar testes ou acesso externo (com cautela)
};

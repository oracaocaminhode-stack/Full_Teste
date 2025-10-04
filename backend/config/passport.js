/**
 * @file config/passport.js
 * @description Configuração das estratégias de autenticação para o Passport.js.
 * Este arquivo define como o Passport.js irá autenticar usuários usando JWT e Google OAuth.
 * 
 * @author Manus AI
 * @date Oct 01, 2025
 */

// ===================================================================
// IMPORTAÇÕES DE MÓDULOS
// ===================================================================

// Importa a biblioteca Passport.js
const passport = require("passport");

// Importa a estratégia JWT do Passport para autenticação baseada em token
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;

// Importa a estratégia Google OAuth 2.0 do Passport para login social
const GoogleStrategy = require("passport-google-oauth20").Strategy;

// Importa o modelo de usuário (simulado em memória para este projeto)
// Em uma aplicação real, este seria um modelo de banco de dados (e.g., Mongoose, Sequelize)
const User = require("../models/User");

// ===================================================================
// ESTRATÉGIA JWT (JSON Web Token)
// ===================================================================

/**
 * @description Configura a estratégia JWT para validar tokens em rotas protegidas.
 * Esta estratégia é fundamental para um sistema de autenticação stateless, onde cada requisição
 * autenticada carrega um token que é verificado pelo servidor.
 * 
 * @flow
 * 1. O cliente envia um token JWT no cabeçalho `Authorization` (formato `Bearer <token>`).
 * 2. `ExtractJwt.fromAuthHeaderAsBearerToken()` extrai este token da requisição.
 * 3. A `JwtStrategy` usa `process.env.JWT_SECRET` para verificar a assinatura do token.
 * 4. Se o token for válido e não expirado, o `payload` (dados do usuário) é decodificado.
 * 5. A função `async (payload, done)` é executada, buscando o usuário no banco de dados
 *    com base no `userId` contido no `payload`.
 * 6. Se o usuário for encontrado, `done(null, user)` é chamado, indicando sucesso e anexando
 *    o objeto `user` ao `req.user` para uso nas rotas subsequentes.
 * 7. Se o usuário não for encontrado ou o token for inválido/expirado, `done(null, false)` é chamado.
 */
passport.use(
  new JwtStrategy(
    {
      // Extrai o token JWT do cabeçalho de autorização como um token Bearer
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // A chave secreta usada para assinar e verificar o JWT. ESSENCIAL para segurança.
      secretOrKey: process.env.JWT_SECRET,
      // Não ignora a expiração do token. Tokens expirados serão rejeitados.
      ignoreExpiration: false,
    },
    async (payload, done) => {
      try {
        console.log("🔍 Validando token JWT para userId:", payload.userId);
        // Busca o usuário no modelo (simulado) usando o ID do payload do JWT
        const user = await User.findById(payload.userId);

        if (user) {
          console.log("✅ Token JWT válido, usuário encontrado:", user.email);
          // Autenticação bem-sucedida: retorna o usuário
          return done(null, user);
        } else {
          console.log("❌ Token JWT válido, mas usuário não encontrado no sistema.");
          // Usuário não encontrado (e.g., foi excluído após a emissão do token)
          return done(null, false);
        }
      } catch (error) {
        console.error("❌ Erro na estratégia JWT:", error);
        // Em caso de erro inesperado durante a busca do usuário
        return done(error, false);
      }
    }
  )
);

// ===================================================================
// ESTRATÉGIA GOOGLE OAUTH 2.0
// ===================================================================

/**
 * @description Configura a estratégia Google OAuth 2.0 para permitir login via contas Google.
 * Isso oferece uma forma conveniente para os usuários se autenticarem sem criar uma nova senha.
 * 
 * @flow
 * 1. O usuário clica em "Login com Google" no frontend.
 * 2. O frontend redireciona para o endpoint `/api/auth/google` no backend.
 * 3. O backend, usando `passport.authenticate('google')`, redireciona o usuário para a página de login do Google.
 * 4. Após o usuário autorizar, o Google redireciona de volta para `callbackURL` (`/api/auth/google/callback`).
 * 5. A `GoogleStrategy` é ativada, recebendo `accessToken`, `refreshToken` e `profile` do Google.
 * 6. A função `async (accessToken, refreshToken, profile, done)` é executada.
 * 7. O sistema verifica se já existe um usuário com o `googleId` ou `email` fornecido pelo Google.
 * 8. Se o usuário existe, ele é retornado. Se não, um novo usuário é criado com os dados do Google.
 * 9. `done(null, user)` é chamado, autenticando o usuário no sistema.
 */
passport.use(
  new GoogleStrategy(
    {
      // ID do cliente Google, obtido no Google Cloud Console.
      clientID: process.env.GOOGLE_CLIENT_ID,
      // Segredo do cliente Google, obtido no Google Cloud Console. Mantenha-o seguro.
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // URL de redirecionamento após a autenticação no Google. Deve ser configurada no Google Cloud Console.
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("🔍 Processando login Google para:", profile.emails[0].value);
        
        // Extrai dados relevantes do perfil do Google
        const googleData = {
          googleId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName,
          picture: profile.photos[0].value,
          emailVerified: profile.emails[0].verified,
        };

        // Tenta encontrar um usuário existente pelo googleId ou email
        let user = await User.findByGoogleId(googleData.googleId);

        if (user) {
          console.log("✅ Login Google bem-sucedido para usuário existente:", user.email);
          // Se o usuário já existe, retorna-o.
          return done(null, user);
        } else {
          // Se não encontrou pelo googleId, tenta encontrar pelo email
          user = await User.findByEmail(googleData.email);
          if (user) {
            console.log("📝 Vinculando conta existente (email) ao Google ID.");
            // Se encontrou pelo email, atualiza o googleId para vincular a conta
            user = await User.updateGoogleData(user.id, {
              googleId: googleData.googleId,
              picture: googleData.picture,
              provider: "google",
            });
            return done(null, user);
          } else {
            console.log("👤 Criando novo usuário via Google OAuth.");
            // Se o usuário não existe, cria um novo com os dados do Google
            const newUser = await User.create({
              email: googleData.email,
              name: googleData.name,
              googleId: googleData.googleId,
              picture: googleData.picture,
              // O email do Google já é considerado verificado
              isEmailVerified: true,
              authProvider: "google",
            });
            console.log("✅ Novo usuário criado via Google OAuth.");
            return done(null, newUser);
          }
        }
      } catch (error) {
        console.error("❌ Erro na estratégia Google OAuth:", error);
        return done(error, null);
      }
    }
  )
);

// ===================================================================
// SERIALIZAÇÃO E DESSERIALIZAÇÃO DO USUÁRIO (PARA SESSÕES)
// ===================================================================

/**
 * @function passport.serializeUser
 * @description Serializa o usuário para armazenar na sessão.
 * Em um sistema stateless como o que usa JWT, a sessão não é usada para manter o estado
 * de autenticação. No entanto, o Passport.js exige que estas funções sejam definidas.
 * Aqui, apenas armazenamos o ID do usuário na sessão.
 * @param {object} user - O objeto de usuário a ser serializado.
 * @param {function} done - Callback para indicar o resultado da serialização.
 */
passport.serializeUser((user, done) => {
  console.log("📦 Serializando usuário (apenas ID para sessão):");
  done(null, user.id);
});

/**
 * @function passport.deserializeUser
 * @description Desserializa o usuário da sessão.
 * Recupera o objeto de usuário completo a partir do ID armazenado na sessão.
 * Assim como `serializeUser`, é mais relevante para autenticação baseada em sessão.
 * @param {string} id - O ID do usuário armazenado na sessão.
 * @param {function} done - Callback para indicar o resultado da desserialização.
 */
passport.deserializeUser(async (id, done) => {
  try {
    console.log("📦 Desserializando usuário (buscando pelo ID):");
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    console.error("❌ Erro ao desserializar usuário:", error);
    done(error, null);
  }
});

// ===================================================================
// MIDDLEWARES DE AUTENTICAÇÃO PERSONALIZADOS
// ===================================================================

/**
 * @function authenticateJWT
 * @description Middleware para proteger rotas que exigem autenticação JWT.
 * Se o token for válido, `req.user` será populado com os dados do usuário.
 * Se o token for inválido ou ausente, a requisição será respondida com status 401 (Unauthorized).
 * 
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 * @param {function} next - Função para passar o controle para o próximo middleware.
 */
const authenticateJWT = (req, res, next) => {
  // Usa a estratégia 'jwt' do Passport.js. `session: false` indica que não usaremos sessões.
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err) {
      console.error("❌ Erro interno na autenticação JWT:", err);
      return res.status(500).json({
        error: "Erro interno de autenticação.",
        code: "AUTH_ERROR",
      });
    }

    if (!user) {
      console.log("❌ Autenticação JWT falhou: Token inválido ou expirado.");
      // Se nenhum usuário for retornado, o token é inválido ou ausente.
      return res.status(401).json({
        error: "Não autorizado: Token inválido ou expirado.",
        code: "INVALID_TOKEN",
      });
    }

    // Se a autenticação for bem-sucedida, anexa o usuário ao objeto de requisição
    req.user = user;
    console.log("✅ Usuário autenticado via JWT:", user.email);
    next(); // Passa o controle para o próximo middleware/rota
  })(req, res, next); // Chama o middleware de autenticação do Passport
};

/**
 * @function optionalAuth
 * @description Middleware que tenta autenticar o usuário via JWT, mas não falha a requisição
 * se a autenticação não for bem-sucedida. `req.user` será `null` se não autenticado.
 * Útil para rotas que podem ser acessadas tanto por usuários autenticados quanto anônimos.
 * 
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 * @param {function} next - Função para passar o controle para o próximo middleware.
 */
const optionalAuth = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err) {
      console.warn("⚠️ Erro na autenticação opcional (ignorado):", err);
      // Erros internos são logados, mas não impedem o fluxo da requisição
    }
    // Anexa o usuário ao objeto de requisição se autenticado, caso contrário, é null
    req.user = user || null;
    console.log("ℹ️ Autenticação opcional: Usuário", user ? user.email : "não autenticado");
    next(); // Passa o controle para o próximo middleware/rota
  })(req, res, next); // Chama o middleware de autenticação do Passport
};

// ===================================================================
// EXPORTAÇÕES
// ===================================================================

// Exporta a instância do Passport configurada e os middlewares de autenticação
module.exports = {
  passport,
  authenticateJWT,
  optionalAuth,
};

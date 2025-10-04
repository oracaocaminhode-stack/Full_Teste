/**
 * ===================================================================
 * SERVIDOR PRINCIPAL - BACKEND FULL-STACK DIDÁTICO
 * ===================================================================
 * 
 * Este arquivo é o ponto de entrada do nosso backend. Aqui configuramos:
 * - Express server
 * - Middlewares de segurança
 * - Conexão com banco de dados (simulado em memória)
 * - Rotas da aplicação
 * - Tratamento de erros
 * 
 * FLUXO DE EXECUÇÃO:
 * 1. Carrega variáveis de ambiente (.env)
 * 2. Configura o Express e middlewares
 * 3. Configura autenticação (Passport)
 * 4. Define rotas da API
 * 5. Serve arquivos estáticos do frontend
 * 6. Inicia o servidor
 */

// ===================================================================
// IMPORTAÇÕES E CONFIGURAÇÕES INICIAIS
// ===================================================================

// Carrega as variáveis de ambiente do arquivo .env
// IMPORTANTE: Deve ser a primeira linha para garantir que as variáveis
// estejam disponíveis para todos os outros módulos
require('dotenv').config();

// Importações dos módulos principais
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Importações das configurações locais
const passport = require('./config/passport');

// Importações das rotas
const authRoutes = require('./routes/auth');
const emailRoutes = require('./routes/email');
const paymentRoutes = require('./routes/payment');

// ===================================================================
// CONFIGURAÇÃO DO EXPRESS
// ===================================================================

// Cria a instância do Express
const app = express();

// Define a porta do servidor (usa variável de ambiente ou 3000 como padrão)
const PORT = process.env.PORT || 3000;

// ===================================================================
// MIDDLEWARES DE SEGURANÇA
// ===================================================================

// Helmet: Adiciona headers de segurança HTTP
// Protege contra ataques comuns como XSS, clickjacking, etc.
app.use(helmet({
    // Permite que o frontend carregue recursos do mesmo domínio
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "https://js.stripe.com"],
            frameSrc: ["https://js.stripe.com"]
        }
    }
}));

// CORS: Permite requisições do frontend
// Em produção, especifique apenas os domínios autorizados
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true, // Permite cookies e headers de autenticação
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting: Limita o número de requisições por IP
// Previne ataques de força bruta e DDoS
const limiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // máximo de requisições por hora
    message: {
        error: 'Muitas tentativas. Tente novamente em 1 hora.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true, // Retorna info do rate limit nos headers
    legacyHeaders: false
});
app.use(limiter);

// ===================================================================
// MIDDLEWARES DE PARSING
// ===================================================================

// Parse de JSON: Permite receber dados JSON no body das requisições
app.use(express.json({ 
    limit: '10mb' // Limita o tamanho do payload para segurança
}));

// Parse de URL encoded: Permite receber dados de formulários
app.use(express.urlencoded({ 
    extended: true,
    limit: '10mb'
}));

// ===================================================================
// CONFIGURAÇÃO DO PASSPORT (AUTENTICAÇÃO)
// ===================================================================

// Inicializa o Passport para autenticação
app.use(passport.initialize());

// ===================================================================
// ROTAS DA API
// ===================================================================

// Rota de teste para verificar se o servidor está funcionando
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Servidor funcionando corretamente!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Rotas de autenticação (cadastro, login, Google OAuth)
app.use('/api/auth', authRoutes);

// Rotas de envio de email
app.use('/api/email', emailRoutes);

// Rotas de pagamento (Stripe)
app.use('/api/payment', paymentRoutes);

// ===================================================================
// SERVIR ARQUIVOS ESTÁTICOS DO FRONTEND
// ===================================================================

// Serve os arquivos estáticos do frontend (HTML, CSS, JS, imagens)
// Isso permite que o backend sirva o frontend na mesma porta
app.use(express.static(path.join(__dirname, '../frontend')));

// Rota catch-all: Redireciona todas as rotas não-API para o index.html
// Isso é necessário para SPAs (Single Page Applications)
app.get('*', (req, res) => {
    // Se a rota começar com /api, retorna erro 404
    if (req.path.startsWith('/api')) {
        return res.status(404).json({
            error: 'Rota da API não encontrada',
            path: req.path
        });
    }
    
    // Caso contrário, serve o index.html do frontend
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ===================================================================
// MIDDLEWARE DE TRATAMENTO DE ERROS
// ===================================================================

// Middleware global para capturar e tratar erros
app.use((err, req, res, next) => {
    console.error('Erro capturado:', err);
    
    // Se o erro já tem um status, usa ele
    const status = err.status || err.statusCode || 500;
    
    // Resposta de erro padronizada
    res.status(status).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'Erro interno do servidor' 
            : err.message,
        code: err.code || 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

// ===================================================================
// INICIALIZAÇÃO DO SERVIDOR
// ===================================================================

// Inicia o servidor na porta especificada
app.listen(PORT, () => {
    console.log('🚀 ===================================');
    console.log('🚀 SERVIDOR INICIADO COM SUCESSO!');
    console.log('🚀 ===================================');
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📁 Frontend: http://localhost:${PORT}`);
    console.log(`🔌 API: http://localhost:${PORT}/api`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🔒 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log('🚀 ===================================');
    
    // Verifica se as variáveis de ambiente essenciais estão configuradas
    const requiredEnvVars = ['JWT_SECRET'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        console.warn('⚠️  ATENÇÃO: Variáveis de ambiente não configuradas:');
        missingVars.forEach(varName => {
            console.warn(`   - ${varName}`);
        });
        console.warn('   Configure o arquivo .env para funcionalidade completa.');
    }
});

// Exporta o app para testes (opcional)
module.exports = app;

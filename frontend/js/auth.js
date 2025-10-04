/**
 * @file auth.js
 * @description Este arquivo JavaScript gerencia toda a lógica de autenticação do frontend,
 * incluindo login, logout, verificação de sessão, gerenciamento de tokens, redirecionamentos
 * e integração com Google OAuth.
 * 
 * @author Manus AI
 * @date Oct 01, 2025
 */

// ===================================================================
// 1. CONFIGURAÇÕES DE AUTENTICAÇÃO
// ===================================================================

/**
 * Objeto de configuração para as rotas e endpoints relacionados à autenticação.
 * Centraliza URLs para facilitar a manutenção.
 */
const AUTH_CONFIG = {
    // URLs das páginas do frontend.
    LOGIN_PAGE: '/',
    DASHBOARD_PAGE: '/dashboard.html',
    REGISTER_PAGE: '/register.html',
    
    // Endpoints da API para operações de autenticação.
    ENDPOINTS: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        PROFILE: '/auth/profile',
        LOGOUT: '/auth/logout',
        GOOGLE_AUTH: '/auth/google',
        AUTH_STATUS: '/auth/status'
    },
    
    // Intervalo de tempo (em milissegundos) para verificar periodicamente a validade do token.
    TOKEN_CHECK_INTERVAL: 5 * 60 * 1000, // 5 minutos
    
    // Lista de páginas que não exigem autenticação para serem acessadas.
    PUBLIC_PAGES: ['/', '/index.html', '/register.html']
};

// ===================================================================
// 2. ESTADO DE AUTENTICAÇÃO
// ===================================================================

/**
 * Objeto que mantém o estado atual da autenticação do usuário.
 * Contém informações sobre se o usuário está autenticado, seus dados e o token.
 */
let authState = {
    isAuthenticated: false, // Indica se o usuário está logado.
    user: null,             // Objeto com os dados do usuário logado.
    token: null,            // Token de autenticação (JWT).
    lastCheck: null         // Timestamp da última verificação de autenticação.
};

// ===================================================================
// 3. VERIFICAÇÃO E PROTEÇÃO DE ROTAS
// ===================================================================

/**
 * Verifica o status de autenticação do usuário, validando o token existente.
 * Se o token for válido, atualiza o estado de autenticação; caso contrário, realiza o logout.
 * @returns {Promise<boolean>} `true` se o usuário estiver autenticado e o token for válido, `false` caso contrário.
 */
async function checkAuthentication() {
    try {
        console.log('🔍 Verificando autenticação...');
        
        const token = getAuthToken(); // Obtém o token do armazenamento local.
        if (!token) {
            console.log('❌ Token não encontrado.');
            authState.isAuthenticated = false;
            return false;
        }
        
        // Faz uma requisição à API para verificar a validade do token.
        const response = await apiGet(AUTH_CONFIG.ENDPOINTS.AUTH_STATUS);
        
        if (response.authenticated) {
            console.log('✅ Usuário autenticado:', response.user.email);
            
            // Atualiza o estado de autenticação com os dados recebidos.
            authState.isAuthenticated = true;
            authState.user = response.user;
            authState.token = token;
            authState.lastCheck = new Date();
            
            // Salva os dados do usuário no armazenamento local.
            setUserData(response.user);
            
            return true;
        } else {
            console.log('❌ Token inválido ou expirado.');
            await logout(false); // Realiza logout silencioso se o token for inválido.
            return false;
        }
        
    } catch (error) {
        console.error('❌ Erro ao verificar autenticação:', error);
        
        // Se o erro for 401 (Não Autorizado), limpa os dados de autenticação.
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            await logout(false);
        }
        
        authState.isAuthenticated = false;
        return false;
    }
}

/**
 * Determina se a página atual requer autenticação.
 * @returns {boolean} `true` se a página não estiver na lista de páginas públicas, `false` caso contrário.
 */
function requiresAuthentication() {
    const currentPath = window.location.pathname;
    // Verifica se o caminho atual (sem a barra inicial) está na lista de páginas públicas.
    return !AUTH_CONFIG.PUBLIC_PAGES.includes(currentPath);
}

/**
 * Protege a página atual, redirecionando para a página de login se o usuário não estiver autenticado.
 * Esta função deve ser chamada no carregamento de páginas que exigem autenticação.
 */
async function protectPage() {
    if (!requiresAuthentication()) {
        console.log('📄 Página pública, não precisa de autenticação.');
        return;
    }
    
    console.log('🛡️ Protegendo página...');
    
    const isAuthenticated = await checkAuthentication();
    
    if (!isAuthenticated) {
        console.log('🚫 Usuário não autenticado, redirecionando para login.');
        redirectToLogin();
    } else {
        console.log('✅ Usuário autenticado, acesso permitido.');
    }
}

/**
 * Redireciona o usuário para a página de login.
 * Pode incluir um parâmetro `return` na URL para redirecionar de volta após o login.
 */
function redirectToLogin() {
    const currentPath = window.location.pathname;
    // Se a página atual não for a de login, armazena-a como URL de retorno.
    const returnUrl = currentPath !== AUTH_CONFIG.LOGIN_PAGE ? currentPath : '';
    
    let loginUrl = AUTH_CONFIG.LOGIN_PAGE;
    if (returnUrl) {
        loginUrl += `?return=${encodeURIComponent(returnUrl)}`;
    }
    
    window.location.href = loginUrl;
}

/**
 * Redireciona o usuário para a página do dashboard ou para uma URL de retorno específica.
 */
function redirectToDashboard() {
    // Verifica se há uma URL de retorno nos parâmetros da URL.
    const urlParams = new URLSearchParams(window.location.search);
    const returnUrl = urlParams.get('return');
    
    if (returnUrl && returnUrl !== AUTH_CONFIG.LOGIN_PAGE) {
        window.location.href = returnUrl;
    } else {
        window.location.href = AUTH_CONFIG.DASHBOARD_PAGE;
    }
}

// ===================================================================
// 4. LOGIN E LOGOUT
// ===================================================================

/**
 * Realiza o processo de login do usuário com e-mail e senha.
 * @param {string} email - O e-mail do usuário.
 * @param {string} password - A senha do usuário.
 * @param {boolean} [remember=false] - Indica se o usuário deseja ser lembrado (manter sessão).
 * @returns {Promise<Object>} Um objeto com `success`, `user` e `message` ou `error`.
 */
async function login(email, password, remember = false) {
    try {
        console.log('🔐 Tentando fazer login para:', email);
        
        // Envia as credenciais para o endpoint de login da API.
        const response = await apiPost(AUTH_CONFIG.ENDPOINTS.LOGIN, {
            email,
            password
        });
        
        console.log('✅ Login bem-sucedido.');
        
        // Salva o token de acesso e os dados do usuário no armazenamento local.
        setAuthToken(response.accessToken);
        setUserData(response.user);
        
        // Atualiza o estado de autenticação global.
        authState.isAuthenticated = true;
        authState.user = response.user;
        authState.token = response.accessToken;
        authState.lastCheck = new Date();
        
        // Se 'lembrar de mim' estiver ativado, salva a preferência.
        if (remember) {
            localStorage.setItem('remember_me', 'true');
        } else {
            localStorage.removeItem('remember_me');
        }
        
        return {
            success: true,
            user: response.user,
            message: response.message
        };
        
    } catch (error) {
        console.error('❌ Erro no login:', error);
        
        return {
            success: false,
            error: error.message || 'Erro ao fazer login'
        };
    }
}

/**
 * Realiza o processo de cadastro de um novo usuário.
 * @param {Object} userData - Objeto contendo `name`, `email` e `password` do novo usuário.
 * @returns {Promise<Object>} Um objeto com `success`, `user` e `message` ou `error`.
 */
async function register(userData) {
    try {
        console.log('📝 Tentando cadastrar usuário:', userData.email);
        
        // Envia os dados do novo usuário para o endpoint de registro da API.
        const response = await apiPost(AUTH_CONFIG.ENDPOINTS.REGISTER, userData);
        
        console.log('✅ Cadastro bem-sucedido.');
        
        // Após o cadastro, o usuário é automaticamente logado, então salva os dados de autenticação.
        setAuthToken(response.accessToken);
        setUserData(response.user);
        
        // Atualiza o estado de autenticação global.
        authState.isAuthenticated = true;
        authState.user = response.user;
        authState.token = response.accessToken;
        authState.lastCheck = new Date();
        
        return {
            success: true,
            user: response.user,
            message: response.message
        };
        
    } catch (error) {
        console.error('❌ Erro no cadastro:', error);
        
        return {
            success: false,
            error: error.message || 'Erro ao cadastrar usuário'
        };
    }
}

/**
 * Realiza o logout do usuário, limpando os dados de autenticação e redirecionando para a página de login.
 * @param {boolean} [showMessage=true] - Indica se uma mensagem de sucesso deve ser exibida ao usuário.
 */
async function logout(showMessage = true) {
    try {
        console.log('🚪 Fazendo logout...');
        
        // Tenta notificar o servidor sobre o logout (para invalidar o token no backend).
        const token = getAuthToken();
        if (token) {
            try {
                await apiPost(AUTH_CONFIG.ENDPOINTS.LOGOUT);
            } catch (error) {
                console.warn('⚠️ Erro ao notificar logout no servidor (pode ser token já expirado):', error);
            }
        }
        
        // Limpa todos os dados de autenticação do armazenamento local.
        clearAuthData();
        localStorage.removeItem('remember_me'); // Remove a preferência 'lembrar de mim'.
        
        // Reseta o estado de autenticação global.
        authState.isAuthenticated = false;
        authState.user = null;
        authState.token = null;
        authState.lastCheck = null;
        
        console.log('✅ Logout realizado.');
        
        if (showMessage) {
            showGlobalMessage('Logout realizado com sucesso!', 'success');
        }
        
        // Redireciona para a página de login após um breve atraso (se a mensagem for exibida).
        setTimeout(() => {
            window.location.href = AUTH_CONFIG.LOGIN_PAGE;
        }, showMessage ? 1000 : 0);
        
    } catch (error) {
        console.error('❌ Erro no logout:', error);
        
        // Em caso de erro, ainda assim garante que os dados locais sejam limpos.
        clearAuthData();
        authState.isAuthenticated = false;
        authState.user = null;
        authState.token = null;
        
        // Redireciona para a página de login mesmo em caso de erro.
        window.location.href = AUTH_CONFIG.LOGIN_PAGE;
    }
}

// ===================================================================
// 5. GOOGLE OAUTH
// ===================================================================

/**
 * Inicia o fluxo de autenticação com o Google OAuth.
 * Redireciona o navegador para o endpoint de autenticação do Google no backend.
 */
function loginWithGoogle() {
    try {
        console.log('🔍 Iniciando login com Google...');
        
        // Constrói a URL de autenticação do Google usando o endpoint da API.
        const googleAuthUrl = `${APP_CONFIG.API_BASE_URL}${AUTH_CONFIG.ENDPOINTS.GOOGLE_AUTH}`;
        window.location.href = googleAuthUrl; // Redireciona o usuário.
        
    } catch (error) {
        console.error('❌ Erro ao iniciar login com Google:', error);
        showGlobalMessage('Erro ao conectar com Google. Tente novamente.', 'error');
    }
}

/**
 * Processa o callback do Google OAuth após o usuário ser redirecionado de volta à aplicação.
 * Extrai o token da URL e o armazena, redirecionando para o dashboard.
 */
function handleGoogleCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');
    
    if (error) {
        console.error('❌ Erro no Google OAuth:', error);
        showGlobalMessage('Erro na autenticação com Google.', 'error');
        return;
    }
    
    if (token) {
        console.log('✅ Token recebido do Google OAuth.');
        
        // Salva o token e redireciona para o dashboard.
        setAuthToken(token);
        redirectToDashboard();
    }
}

// ===================================================================
// 6. PERFIL DO USUÁRIO
// ===================================================================

/**
 * Carrega os dados do perfil do usuário a partir da API.
 * @returns {Promise<Object>} Um objeto com `success` e `user` ou `error`.
 */
async function loadUserProfile() {
    try {
        console.log('👤 Carregando perfil do usuário...');
        
        const response = await apiGet(AUTH_CONFIG.ENDPOINTS.PROFILE);
        
        console.log('✅ Perfil carregado.');
        
        // Atualiza os dados do usuário no estado global e no armazenamento local.
        setUserData(response.user);
        authState.user = response.user;
        
        return {
            success: true,
            user: response.user
        };
        
    } catch (error) {
        console.error('❌ Erro ao carregar perfil:', error);
        
        return {
            success: false,
            error: error.message || 'Erro ao carregar perfil'
        };
    }
}

/**
 * Retorna os dados do usuário atualmente logado.
 * Tenta obter do estado global ou do armazenamento local.
 * @returns {Object|null} O objeto do usuário ou `null` se não houver usuário logado.
 */
function getCurrentUser() {
    return authState.user || getUserData();
}

/**
 * Verifica se o usuário está logado com base no estado de autenticação e na presença do token.
 * @returns {boolean} `true` se o usuário estiver logado, `false` caso contrário.
 */
function isLoggedIn() {
    return authState.isAuthenticated && !!authState.token;
}

// ===================================================================
// 7. MONITORAMENTO DE SESSÃO
// ===================================================================

/**
 * Inicia o monitoramento da sessão do usuário.
 * Inclui verificação periódica do token e monitoramento de inatividade.
 */
function startSessionMonitoring() {
    // Verifica a validade do token periodicamente.
    setInterval(async () => {
        // Apenas verifica se o usuário está autenticado e a página requer autenticação.
        if (authState.isAuthenticated && requiresAuthentication()) {
            const isValid = await checkAuthentication();
            if (!isValid) {
                console.log('🔄 Sessão expirada, redirecionando...');
                showGlobalMessage('Sua sessão expirou. Faça login novamente.', 'warning');
                setTimeout(() => redirectToLogin(), 2000);
            }
        }
    }, AUTH_CONFIG.TOKEN_CHECK_INTERVAL);
    
    // Monitora a atividade do usuário para detectar inatividade.
    let lastActivity = Date.now();
    
    // Adiciona listeners para eventos de interação do usuário.
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, () => {
            lastActivity = Date.now(); // Atualiza o timestamp da última atividade.
        }, true);
    });
    
    // Verifica a inatividade do usuário em intervalos regulares (opcional).
    setInterval(() => {
        const inactiveTime = Date.now() - lastActivity;
        const maxInactiveTime = 30 * 60 * 1000; // 30 minutos de inatividade.
        
        if (inactiveTime > maxInactiveTime && authState.isAuthenticated) {
            console.log('⏰ Usuário inativo por muito tempo.');
            // Implementar logout automático ou aviso aqui, se desejado.
        }
    }, 60000); // Verifica a cada minuto.
}

// ===================================================================
// 8. HELPERS DE UI (INTERFACE DO USUÁRIO)
// ===================================================================

/**
 * Atualiza elementos da interface do usuário com os dados do usuário logado.
 * @param {Object} user - O objeto de dados do usuário.
 */
function updateUserUI(user) {
    if (!user) return;
    
    // Seleciona todos os elementos que devem exibir o nome, e-mail e avatar do usuário.
    const userNameElements = $$('[data-user="name"], #user-name, .user-name');
    const userEmailElements = $$('[data-user="email"], #user-email, .user-email');
    const userAvatarElements = $$('[data-user="avatar"], #user-avatar, .user-avatar');
    
    userNameElements.forEach(el => {
        if (el) el.textContent = user.name || 'Usuário';
    });
    
    userEmailElements.forEach(el => {
        if (el) el.textContent = user.email || '';
    });
    
    userAvatarElements.forEach(el => {
        if (el) {
            // Define a URL do avatar, usando um serviço de avatares se não houver imagem.
            el.src = user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=667eea&color=fff`;
            el.alt = user.name || 'Avatar do usuário';
        }
    });
}

/**
 * Atualiza a visibilidade de elementos da interface do usuário com base no estado de autenticação.
 * Elementos com `data-auth="true"` ou classe `auth-only` são mostrados apenas se logado.
 * Elementos com `data-auth="false"` ou classe `guest-only` são mostrados apenas se não logado.
 */
function updateAuthUI() {
    const isAuth = isLoggedIn();
    
    // Elementos que só aparecem quando o usuário está logado.
    const authElements = $$('[data-auth="true"], .auth-only');
    authElements.forEach(el => {
        if (isAuth) {
            showElement(el);
        } else {
            hideElement(el);
        }
    });

    // Elementos que só aparecem quando o usuário NÃO está logado (convidado).
    const guestElements = $$('[data-auth="false"], .guest-only');
    guestElements.forEach(el => {
        if (!isAuth) {
            showElement(el);
        } else {
            hideElement(el);
        }
    });
}

// ===================================================================
// 9. INICIALIZAÇÃO
// ===================================================================

/**
 * Função de inicialização que é executada quando o DOM é completamente carregado.
 * Responsável por proteger a página, iniciar o monitoramento de sessão e atualizar a UI.
 */
onDOMContentLoaded(async () => {
    // Verifica e protege a página, redirecionando se necessário.
    await protectPage();
    
    // Inicia o monitoramento da sessão para manter o estado de autenticação atualizado.
    startSessionMonitoring();
    
    // Atualiza a interface do usuário com base no estado de autenticação e dados do usuário.
    updateAuthUI();
    updateUserUI(getCurrentUser());
});


/**
 * @file login.js
 * @description Este arquivo JavaScript gerencia a lógica específica da página de login do frontend.
 * Inclui manipulação do formulário de login, validações, interações de UI, modais e redirecionamentos.
 * 
 * @author Manus AI
 * @date Oct 01, 2025
 */

// ===================================================================
// 1. ELEMENTOS DO DOM
// ===================================================================

/**
 * Objeto para armazenar referências aos elementos do DOM da página de login.
 * Isso evita a necessidade de buscar os elementos repetidamente no DOM.
 */
let loginElements = {};

/**
 * Inicializa as referências aos elementos do DOM.
 * Esta função deve ser chamada após o carregamento completo do DOM.
 */
function initLoginElements() {
    loginElements = {
        // Formulário e campos de entrada.
        form: $("#login-form"),
        emailField: $("#email"),
        passwordField: $("#password"),
        rememberField: $("#remember-me"),
        
        // Botões de ação.
        loginBtn: $("#login-btn"),
        googleLoginBtn: $("#google-login-btn"),
        togglePasswordBtn: $("#toggle-password"),
        
        // Áreas de mensagem para feedback ao usuário.
        messageArea: $("#message-area"),
        messageContent: $("#message-content"),
        
        // Modais (caixas de diálogo flutuantes).
        forgotPasswordModal: $("#forgot-password-modal"),
        
        // Links de navegação.
        forgotPasswordLink: $(".forgot-password"),
        registerLink: $("a[href=\"register.html\"]"),
    };
    
    console.log("📋 Elementos do login inicializados.");
}

// ===================================================================
// 2. VALIDAÇÕES DO FORMULÁRIO
// ===================================================================

/**
 * Valida o campo de e-mail em tempo real ou no blur.
 * Exibe uma mensagem de erro se o e-mail for inválido ou vazio.
 * @returns {boolean} `true` se o campo for válido, `false` caso contrário.
 */
function validateEmailField() {
    const email = loginElements.emailField.value.trim();
    
    clearFieldError(loginElements.emailField);
    
    if (!email) {
        showFieldError(loginElements.emailField, "Email é obrigatório.");
        return false;
    }
    
    if (!isValidEmail(email)) {
        showFieldError(loginElements.emailField, "Email inválido.");
        return false;
    }
    
    return true;
}

/**
 * Valida o campo de senha em tempo real ou no blur.
 * Exibe uma mensagem de erro se a senha for muito curta ou vazia.
 * @returns {boolean} `true` se o campo for válido, `false` caso contrário.
 */
function validatePasswordField() {
    const password = loginElements.passwordField.value;
    
    clearFieldError(loginElements.passwordField);
    
    if (!password) {
        showFieldError(loginElements.passwordField, "Senha é obrigatória.");
        return false;
    }
    
    // Reutiliza a função de validação de senha do `utils.js` para consistência.
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
        showFieldError(loginElements.passwordField, passwordValidation.errors[0]);
        return false;
    }
    
    return true;
}

/**
 * Valida o formulário de login completo, chamando as validações individuais dos campos.
 * @returns {boolean} `true` se todos os campos forem válidos, `false` caso contrário.
 */
function validateLoginForm() {
    const emailValid = validateEmailField();
    const passwordValid = validatePasswordField();
    
    return emailValid && passwordValid;
}

// ===================================================================
// 3. MANIPULAÇÃO DO FORMULÁRIO
// ===================================================================

/**
 * Manipula o evento de submissão do formulário de login.
 * Realiza validações, chama a API de login e gerencia o estado de carregamento do botão.
 * @param {Event} event - O objeto de evento de submissão.
 */
async function handleLoginSubmit(event) {
    event.preventDefault(); // Previne o comportamento padrão de recarregar a página.
    
    console.log("📝 Processando formulário de login...");
    
    // Oculta mensagens de feedback anteriores.
    hideElement(loginElements.messageArea);
    
    // Valida o formulário antes de enviar os dados.
    if (!validateLoginForm()) {
        showGlobalMessage("Por favor, corrija os erros no formulário.", "error", "message-area");
        return;
    }
    
    // Coleta os dados dos campos do formulário.
    const formData = {
        email: loginElements.emailField.value.trim(),
        password: loginElements.passwordField.value,
        remember: loginElements.rememberField.checked,
    };
    
    // Exibe o estado de carregamento no botão de login.
    toggleButtonLoading(loginElements.loginBtn, true);
    
    try {
        // Tenta realizar o login através da função `login` do `auth.js`.
        const result = await login(formData.email, formData.password, formData.remember);
        
        if (result.success) {
            showGlobalMessage("Login realizado com sucesso! Redirecionando...", "success", "message-area");
            
            // Redireciona para o dashboard após um pequeno atraso.
            setTimeout(() => {
                redirectToDashboard();
            }, 1500);
            
        } else {
            // Exibe a mensagem de erro retornada pela API ou uma mensagem genérica.
            showGlobalMessage(result.error || "Erro ao fazer login. Tente novamente.", "error", "message-area");
        }
        
    } catch (error) {
        console.error("❌ Erro no login:", error);
        showGlobalMessage("Erro inesperado. Tente novamente.", "error", "message-area");
        
    } finally {
        // Remove o estado de carregamento do botão, independentemente do sucesso ou falha.
        toggleButtonLoading(loginElements.loginBtn, false);
    }
}

/**
 * Limpa todos os campos do formulário de login e as mensagens de erro.
 */
function clearLoginForm() {
    loginElements.form.reset(); // Reseta os valores dos campos do formulário.
    
    // Limpa as mensagens de erro de cada campo.
    clearFieldError(loginElements.emailField);
    clearFieldError(loginElements.passwordField);
    
    // Oculta a área de mensagens global.
    hideElement(loginElements.messageArea);
    
    // Coloca o foco no campo de e-mail para facilitar a próxima entrada.
    loginElements.emailField.focus();
}

// ===================================================================
// 4. INTERAÇÕES DE UI
// ===================================================================

/**
 * Alterna a visibilidade do campo de senha (texto ou asteriscos).
 * Altera o ícone do botão de toggle de acordo.
 */
function togglePasswordVisibility() {
    const passwordField = loginElements.passwordField;
    const toggleBtn = loginElements.togglePasswordBtn;
    
    if (passwordField.type === "password") {
        passwordField.type = "text";
        toggleBtn.textContent = "🙈"; // Ícone de olho fechado.
        toggleBtn.setAttribute("aria-label", "Ocultar senha");
    } else {
        passwordField.type = "password";
        toggleBtn.textContent = "👁️"; // Ícone de olho aberto.
        toggleBtn.setAttribute("aria-label", "Mostrar senha");
    }
}

/**
 * Preenche o formulário de login com credenciais de exemplo.
 * Útil para desenvolvimento e testes, ativado por atalho de teclado.
 */
function fillExampleCredentials() {
    // Verifica se o ambiente é de desenvolvimento para evitar preenchimento em produção.
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        loginElements.emailField.value = "admin@exemplo.com";
        loginElements.passwordField.value = "admin123";
        
        showGlobalMessage("Credenciais de exemplo preenchidas!", "info", "message-area");
    }
}

/**
 * Verifica os parâmetros da URL para exibir mensagens de erro/sucesso ou pré-preencher campos.
 * Limpa os parâmetros da URL após o processamento para evitar reexibição.
 */
function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Verifica se há uma mensagem de erro na URL.
    const error = urlParams.get("error");
    if (error) {
        let errorMessage = "Erro na autenticação.";
        
        switch (error) {
            case "google_auth_failed":
                errorMessage = "Erro na autenticação com Google. Tente novamente.";
                break;
            case "session_expired":
                errorMessage = "Sua sessão expirou. Faça login novamente.";
                break;
            case "access_denied":
                errorMessage = "Acesso negado. Você precisa estar logado.";
                break;
        }
        
        showGlobalMessage(errorMessage, "error", "message-area");
    }
    
    // Verifica se há uma mensagem de sucesso na URL.
    const success = urlParams.get("success");
    if (success) {
        let successMessage = "Operação realizada com sucesso!";
        
        switch (success) {
            case "registered":
                successMessage = "Cadastro realizado com sucesso! Faça login para continuar.";
                break;
            case "logout":
                successMessage = "Logout realizado com sucesso!";
                break;
        }
        
        showGlobalMessage(successMessage, "success", "message-area");
    }
    
    // Verifica se há um e-mail para pré-preencher o campo de e-mail.
    const email = urlParams.get("email");
    if (email && isValidEmail(email)) {
        loginElements.emailField.value = email;
        loginElements.passwordField.focus(); // Coloca o foco no campo de senha.
    }
    
    // Limpa os parâmetros da URL para evitar que a mensagem seja exibida novamente ao recarregar.
    if (error || success || email) {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
    }
}

// ===================================================================
// 5. MODAL DE "ESQUECEU SENHA"
// ===================================================================

/**
 * Exibe o modal de "Esqueceu a Senha".
 * Adiciona listeners para fechar o modal com a tecla ESC ou clicando fora.
 */
function showForgotPassword() {
    const modal = loginElements.forgotPasswordModal;
    if (modal) {
        showElement(modal);
        addClass(modal, "visible"); // Adiciona classe para transição CSS.
        
        // Adiciona listener para fechar com a tecla ESC.
        document.addEventListener("keydown", handleForgotPasswordEsc);
        
        // Adiciona listener para fechar clicando fora do conteúdo do modal.
        modal.addEventListener("click", handleForgotPasswordOutsideClick);
    }
}

/**
 * Oculta o modal de "Esqueceu a Senha".
 * Remove os listeners de evento adicionados para fechar o modal.
 */
function closeForgotPassword() {
    const modal = loginElements.forgotPasswordModal;
    if (modal) {
        removeClass(modal, "visible"); // Remove classe para transição CSS.
        // Aguarda a transição terminar antes de ocultar completamente.
        setTimeout(() => hideElement(modal), 300);
        
        // Remove os listeners de evento para evitar vazamento de memória.
        document.removeEventListener("keydown", handleForgotPasswordEsc);
        modal.removeEventListener("click", handleForgotPasswordOutsideClick);
    }
}

/**
 * Manipulador de evento para fechar o modal de "Esqueceu a Senha" com a tecla ESC.
 * @param {KeyboardEvent} event - O objeto de evento de teclado.
 */
function handleForgotPasswordEsc(event) {
    if (event.key === "Escape") {
        closeForgotPassword();
    }
}

/**
 * Manipulador de evento para fechar o modal de "Esqueceu a Senha" clicando fora do conteúdo.
 * @param {MouseEvent} event - O objeto de evento de mouse.
 */
function handleForgotPasswordOutsideClick(event) {
    // Verifica se o clique foi diretamente no overlay do modal, e não em seu conteúdo.
    if (event.target === loginElements.forgotPasswordModal) {
        closeForgotPassword();
    }
}

// ===================================================================
// 6. VERIFICAÇÕES DE ESTADO
// ===================================================================

/**
 * Verifica se o usuário já está logado ao carregar a página.
 * Se estiver, redireciona para o dashboard.
 * @returns {Promise<boolean>} `true` se o usuário já estiver logado e for redirecionado, `false` caso contrário.
 */
async function checkIfAlreadyLoggedIn() {
    const isAuthenticated = await checkAuthentication();
    
    if (isAuthenticated) {
        console.log("✅ Usuário já está logado, redirecionando...");
        showGlobalMessage("Você já está logado! Redirecionando...", "info", "message-area");
        
        setTimeout(() => {
            redirectToDashboard();
        }, 1000);
        
        return true;
    }
    
    return false;
}

/**
 * Verifica a preferência "Lembrar de mim" no armazenamento local.
 * Se ativada, pré-preenche o campo de e-mail com os dados do último usuário logado.
 */
function checkRememberMe() {
    const rememberMe = localStorage.getItem("remember_me");
    
    if (rememberMe === "true" && loginElements.rememberField) {
        loginElements.rememberField.checked = true;
        
        // Se havia dados de usuário salvos, tenta pré-preencher o e-mail.
        const savedUser = getUserData();
        if (savedUser && savedUser.email) {
            loginElements.emailField.value = savedUser.email;
            loginElements.passwordField.focus(); // Coloca o foco no campo de senha.
        }
    }
}

// ===================================================================
// 7. EVENT LISTENERS
// ===================================================================

/**
 * Adiciona todos os event listeners necessários para a página de login.
 */
function addLoginEventListeners() {
    // Listener para a submissão do formulário de login.
    if (loginElements.form) {
        loginElements.form.addEventListener("submit", handleLoginSubmit);
    }
    
    // Listeners para validação em tempo real dos campos de e-mail e senha.
    if (loginElements.emailField) {
        loginElements.emailField.addEventListener("input", validateEmailField);
        loginElements.emailField.addEventListener("blur", validateEmailField);
    }
    
    if (loginElements.passwordField) {
        loginElements.passwordField.addEventListener("input", validatePasswordField);
        loginElements.passwordField.addEventListener("blur", validatePasswordField);
    }
    
    // Listener para o botão de alternar visibilidade da senha.
    if (loginElements.togglePasswordBtn) {
        loginElements.togglePasswordBtn.addEventListener("click", togglePasswordVisibility);
    }
    
    // Listener para o botão de login com Google.
    if (loginElements.googleLoginBtn) {
        loginElements.googleLoginBtn.addEventListener("click", loginWithGoogle);
    }

    // Listener para o link "Esqueceu a senha?".
    if (loginElements.forgotPasswordLink) {
        loginElements.forgotPasswordLink.addEventListener("click", (e) => {
            e.preventDefault(); // Previne o comportamento padrão do link.
            showForgotPassword();
        });
    }
    
    // Listeners para atalhos de teclado.
    document.addEventListener("keydown", (e) => {
        // Ctrl+Enter para submeter o formulário de login.
        if (e.ctrlKey && e.key === "Enter") {
            e.preventDefault();
            if (loginElements.form) {
                loginElements.form.dispatchEvent(new Event("submit"));
            }
        }
        
        // Ctrl+Shift+E para preencher credenciais de exemplo (apenas em desenvolvimento).
        if (e.ctrlKey && e.shiftKey && e.key === "E") {
            e.preventDefault();
            fillExampleCredentials();
        }
    });
    
    // Auto-foco no primeiro campo vazio ao carregar a página.
    setTimeout(() => {
        if (loginElements.emailField && !loginElements.emailField.value) {
            loginElements.emailField.focus();
        } else if (loginElements.passwordField && !loginElements.passwordField.value) {
            loginElements.passwordField.focus();
        }
    }, 100);
}

// ===================================================================
// 8. INICIALIZAÇÃO
// ===================================================================

/**
 * Função principal de inicialização da página de login.
 * Chamada quando o DOM estiver completamente carregado.
 */
async function initLoginPage() {
    console.log("🚀 Inicializando página de login...");
    
    // Inicializa as referências aos elementos do DOM.
    initLoginElements();
    
    // Adiciona todos os event listeners.
    addLoginEventListeners();
    
    // Verifica se o usuário já está logado e redireciona, se necessário.
    const loggedIn = await checkIfAlreadyLoggedIn();
    if (loggedIn) return; // Se já logado, não continua a inicialização da página de login.
    
    // Verifica e pré-preenche o campo de e-mail se a opção "Lembrar de mim" estiver ativa.
    checkRememberMe();
    
    // Processa parâmetros da URL (mensagens de erro/sucesso, pré-preenchimento de e-mail).
    checkUrlParameters();
    
    console.log("✅ Página de login inicializada.");
}

// ===================================================================
// 9. FUNÇÕES GLOBAIS (PARA USO EM HTML)
// ===================================================================

/**
 * Expõe funções para serem acessíveis diretamente do HTML (onclick, etc.).
 */
window.showForgotPassword = showForgotPassword;
window.closeForgotPassword = closeForgotPassword;
window.fillExampleCredentials = fillExampleCredentials;

// ===================================================================
// 10. INICIALIZAÇÃO AUTOMÁTICA
// ===================================================================

// Garante que a função de inicialização seja chamada quando o DOM estiver pronto.
onDOMContentLoaded(initLoginPage);


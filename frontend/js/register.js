/**
 * @file register.js
 * @description Este arquivo JavaScript gerencia a lógica específica da página de cadastro do frontend.
 * Inclui manipulação do formulário de cadastro, validações avançadas, indicador de força da senha,
 * confirmação de senha e modais de termos de uso e política de privacidade.
 * 
 * @author Manus AI
 * @date Oct 01, 2025
 */

// ===================================================================
// 1. ELEMENTOS DO DOM
// ===================================================================

/**
 * Objeto para armazenar referências aos elementos do DOM da página de cadastro.
 * Isso evita a necessidade de buscar os elementos repetidamente no DOM.
 */
let registerElements = {};

/**
 * Inicializa as referências aos elementos do DOM.
 * Esta função deve ser chamada após o carregamento completo do DOM.
 */
function initRegisterElements() {
    registerElements = {
        // Formulário e campos de entrada.
        form: $("#register-form"),
        nameField: $("#name"),
        emailField: $("#email"),
        passwordField: $("#password"),
        confirmPasswordField: $("#confirm-password"),
        termsField: $("#terms"),
        newsletterField: $("#newsletter"),
        
        // Botões de ação.
        registerBtn: $("#register-btn"),
        googleRegisterBtn: $("#google-register-btn"),
        togglePasswordBtn: $("#toggle-password"),
        toggleConfirmPasswordBtn: $("#toggle-confirm-password"),
        
        // Áreas de mensagem para feedback ao usuário.
        messageArea: $("#message-area"),
        messageContent: $("#message-content"),
        
        // Indicadores visuais para a força da senha e correspondência.
        strengthBar: $(".strength-bar"),
        strengthFill: $("#strength-fill"),
        strengthText: $("#strength-text"),
        passwordMatch: $("#password-match"),
        
        // Modais (caixas de diálogo flutuantes).
        termsModal: $("#terms-modal"),
        privacyModal: $("#privacy-modal"),
        
        // Links de navegação.
        loginLink: $("a[href=\"index.html\"]"),
    };
    
    console.log("📋 Elementos do cadastro inicializados.");
}

// ===================================================================
// 2. VALIDAÇÕES DO FORMULÁRIO
// ===================================================================

/**
 * Valida o campo de nome em tempo real ou no blur.
 * Exibe uma mensagem de erro se o nome for inválido ou vazio.
 * @returns {boolean} `true` se o campo for válido, `false` caso contrário.
 */
function validateNameField() {
    const name = registerElements.nameField.value.trim();
    
    clearFieldError(registerElements.nameField);
    
    if (!name) {
        showFieldError(registerElements.nameField, "Nome é obrigatório.");
        return false;
    }
    
    // Reutiliza a função de validação de nome do `utils.js`.
    const nameValidation = validateName(name);
    
    if (!nameValidation.isValid) {
        showFieldError(registerElements.nameField, nameValidation.errors[0]);
        return false;
    }
    
    return true;
}

/**
 * Valida o campo de e-mail em tempo real ou no blur.
 * Exibe uma mensagem de erro se o e-mail for inválido ou vazio.
 * @returns {boolean} `true` se o campo for válido, `false` caso contrário.
 */
function validateEmailField() {
    const email = registerElements.emailField.value.trim();
    
    clearFieldError(registerElements.emailField);
    
    if (!email) {
        showFieldError(registerElements.emailField, "Email é obrigatório.");
        return false;
    }
    
    // Reutiliza a função de validação de e-mail do `utils.js`.
    if (!isValidEmail(email)) {
        showFieldError(registerElements.emailField, "Email inválido.");
        return false;
    }
    
    return true;
}

/**
 * Valida o campo de senha e atualiza o indicador de força da senha.
 * Exibe mensagens de erro se a senha não atender aos requisitos.
 * @returns {boolean} `true` se o campo for válido, `false` caso contrário.
 */
function validatePasswordField() {
    const password = registerElements.passwordField.value;
    
    clearFieldError(registerElements.passwordField);
    
    if (!password) {
        // Se a senha estiver vazia, reseta o indicador de força.
        updatePasswordStrength("", registerElements.strengthFill, registerElements.strengthText);
        return false;
    }
    
    // Reutiliza a função de validação de senha do `utils.js`.
    const passwordValidation = validatePassword(password);
    
    // Atualiza o indicador visual de força da senha.
    updatePasswordStrength(passwordValidation.strength, registerElements.strengthFill, registerElements.strengthText);
    
    if (!passwordValidation.isValid) {
        showFieldError(registerElements.passwordField, passwordValidation.errors[0]);
        return false;
    }
    
    // Se a confirmação de senha já foi preenchida, revalida-a para garantir consistência.
    if (registerElements.confirmPasswordField.value) {
        validateConfirmPasswordField();
    }
    
    return true;
}

/**
 * Valida o campo de confirmação de senha.
 * Verifica se a senha de confirmação coincide com a senha original.
 * @returns {boolean} `true` se as senhas coincidem, `false` caso contrário.
 */
function validateConfirmPasswordField() {
    const password = registerElements.passwordField.value;
    const confirmPassword = registerElements.confirmPasswordField.value;
    
    clearFieldError(registerElements.confirmPasswordField);
    
    if (!confirmPassword) {
        // Se a confirmação estiver vazia, reseta o indicador de correspondência.
        updatePasswordMatch("", "");
        return false;
    }
    
    if (password !== confirmPassword) {
        showFieldError(registerElements.confirmPasswordField, "Senhas não coincidem.");
        updatePasswordMatch("❌ Senhas não coincidem", "error");
        return false;
    }
    
    updatePasswordMatch("✅ Senhas coincidem", "success");
    return true;
}

/**
 * Valida o campo de aceitação dos termos de uso.
 * @returns {boolean} `true` se os termos forem aceitos, `false` caso contrário.
 */
function validateTermsField() {
    const termsAccepted = registerElements.termsField.checked;
    
    clearFieldError(registerElements.termsField);
    
    if (!termsAccepted) {
        showFieldError(registerElements.termsField, "Você deve aceitar os termos de uso.");
        return false;
    }
    
    return true;
}

/**
 * Valida o formulário de cadastro completo, chamando as validações individuais dos campos.
 * @returns {boolean} `true` se todos os campos forem válidos, `false` caso contrário.
 */
function validateRegisterForm() {
    const nameValid = validateNameField();
    const emailValid = validateEmailField();
    const passwordValid = validatePasswordField();
    const confirmPasswordValid = validateConfirmPasswordField();
    const termsValid = validateTermsField();
    
    return nameValid && emailValid && passwordValid && confirmPasswordValid && termsValid;
}

// ===================================================================
// 3. INDICADORES VISUAIS
// ===================================================================

/**
 * Atualiza o indicador visual de força da senha (barra e texto).
 * @param {string} strength - O nível de força da senha (
 *   `weak`, `fair`, `good`, `strong`).
 * @param {Element} strengthFillElement - O elemento que representa o preenchimento da barra de força.
 * @param {Element} strengthTextElement - O elemento de texto que exibe a descrição da força.
 */
function updatePasswordStrength(strength, strengthFillElement, strengthTextElement) {
    // Remove classes de força anteriores para resetar o estilo.
    strengthFillElement.classList.remove("strength-weak", "strength-fair", "strength-good", "strength-strong");
    strengthTextElement.classList.remove("strength-weak", "strength-fair", "strength-good", "strength-strong");

    // Adiciona a classe de força atual para aplicar o estilo correto.
    if (strength) {
        addClass(strengthFillElement, `strength-${strength}`);
        addClass(strengthTextElement, `strength-${strength}`);
    }

    // Atualiza o texto descritivo da força da senha.
    switch (strength) {
        case "weak":
            strengthTextElement.textContent = "Fraca";
            break;
        case "fair":
            strengthTextElement.textContent = "Média";
            break;
        case "good":
            strengthTextElement.textContent = "Boa";
            break;
        case "strong":
            strengthTextElement.textContent = "Forte";
            break;
        default:
            strengthTextElement.textContent = "Digite uma senha";
            break;
    }
}

/**
 * Atualiza o indicador visual de correspondência entre as senhas.
 * @param {string} text - O texto a ser exibido (ex: "Senhas coincidem").
 * @param {string} type - O tipo de mensagem para estilização (`success`, `error`).
 */
function updatePasswordMatch(text, type = "") {
    if (!registerElements.passwordMatch) {
        return;
    }
    
    registerElements.passwordMatch.textContent = text;
    
    // Remove classes de tipo anteriores.
    registerElements.passwordMatch.className = "field-help";
    
    // Adiciona a classe de tipo atual para estilização.
    if (type) {
        addClass(registerElements.passwordMatch, `text-${type}`);
    }
}

// ===================================================================
// 4. MANIPULAÇÃO DO FORMULÁRIO
// ===================================================================

/**
 * Manipula o evento de submissão do formulário de cadastro.
 * Realiza validações, chama a API de registro e gerencia o estado de carregamento do botão.
 * @param {Event} event - O objeto de evento de submissão.
 */
async function handleRegisterSubmit(event) {
    event.preventDefault(); // Previne o comportamento padrão de recarregar a página.
    
    console.log("📝 Processando formulário de cadastro...");
    
    // Oculta mensagens de feedback anteriores.
    hideElement(registerElements.messageArea);
    
    // Valida o formulário antes de enviar os dados.
    if (!validateRegisterForm()) {
        showGlobalMessage("Por favor, corrija os erros no formulário.", "error", "message-area");
        return;
    }
    
    // Coleta os dados dos campos do formulário.
    const formData = {
        name: registerElements.nameField.value.trim(),
        email: registerElements.emailField.value.trim(),
        password: registerElements.passwordField.value,
        newsletter: registerElements.newsletterField.checked,
    };
    
    // Exibe o estado de carregamento no botão de registro.
    toggleButtonLoading(registerElements.registerBtn, true);
    
    try {
        // Tenta realizar o cadastro através da função `register` do `auth.js`.
        const result = await register(formData);
        
        if (result.success) {
            showGlobalMessage("Cadastro realizado com sucesso! Redirecionando...", "success", "message-area");
            
            // Redireciona para o dashboard após um pequeno atraso.
            setTimeout(() => {
                redirectToDashboard();
            }, 1500);
            
        } else {
            // Exibe a mensagem de erro retornada pela API ou uma mensagem genérica.
            showGlobalMessage(result.error || "Erro ao cadastrar usuário. Tente novamente.", "error", "message-area");
        }
        
    } catch (error) {
        console.error("❌ Erro no cadastro:", error);
        showGlobalMessage("Erro inesperado. Tente novamente.", "error", "message-area");
        
    } finally {
        // Remove o estado de carregamento do botão, independentemente do sucesso ou falha.
        toggleButtonLoading(registerElements.registerBtn, false);
    }
}

/**
 * Limpa todos os campos do formulário de cadastro e as mensagens de erro.
 */
function clearRegisterForm() {
    registerElements.form.reset(); // Reseta os valores dos campos do formulário.
    
    // Limpa as mensagens de erro de cada campo.
    clearFieldError(registerElements.nameField);
    clearFieldError(registerElements.emailField);
    clearFieldError(registerElements.passwordField);
    clearFieldError(registerElements.confirmPasswordField);
    clearFieldError(registerElements.termsField);
    
    // Reseta os indicadores visuais de senha.
    updatePasswordStrength("", registerElements.strengthFill, registerElements.strengthText);
    updatePasswordMatch("", "");
    
    // Oculta a área de mensagens global.
    hideElement(registerElements.messageArea);
    
    // Coloca o foco no campo de nome para facilitar a próxima entrada.
    registerElements.nameField.focus();
}

// ===================================================================
// 5. INTERAÇÕES DE UI
// ===================================================================

/**
 * Alterna a visibilidade do campo de senha (texto ou asteriscos).
 * Altera o ícone do botão de toggle de acordo.
 */
function togglePasswordVisibility() {
    const passwordField = registerElements.passwordField;
    const toggleBtn = registerElements.togglePasswordBtn;
    
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
 * Alterna a visibilidade do campo de confirmação de senha.
 * Altera o ícone do botão de toggle de acordo.
 */
function toggleConfirmPasswordVisibility() {
    const confirmPasswordField = registerElements.confirmPasswordField;
    const toggleBtn = registerElements.toggleConfirmPasswordBtn;
    
    if (confirmPasswordField.type === "password") {
        confirmPasswordField.type = "text";
        toggleBtn.textContent = "🙈"; // Ícone de olho fechado.
        toggleBtn.setAttribute("aria-label", "Ocultar confirmação de senha");
    } else {
        confirmPasswordField.type = "password";
        toggleBtn.textContent = "👁️"; // Ícone de olho aberto.
        toggleBtn.setAttribute("aria-label", "Mostrar confirmação de senha");
    }
}

/**
 * Preenche o formulário de cadastro com dados de exemplo.
 * Útil para desenvolvimento e testes, ativado por atalho de teclado.
 */
function fillExampleData() {
    // Verifica se o ambiente é de desenvolvimento para evitar preenchimento em produção.
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        registerElements.nameField.value = "Usuário Teste";
        registerElements.emailField.value = "teste@exemplo.com";
        registerElements.passwordField.value = "Teste123!"; // Senha mais forte para teste.
        registerElements.confirmPasswordField.value = "Teste123!";
        registerElements.termsField.checked = true;
        
        // Atualiza as validações e indicadores visuais após preencher os dados.
        validateNameField();
        validateEmailField();
        validatePasswordField();
        validateConfirmPasswordField();
        validateTermsField();
        
        showGlobalMessage("Dados de exemplo preenchidos!", "info", "message-area");
    }
}

// ===================================================================
// 6. MODAIS DE TERMOS E PRIVACIDADE
// ===================================================================

/**
 * Exibe o modal de Termos de Uso.
 * Adiciona listeners para fechar o modal com a tecla ESC ou clicando fora.
 */
function showTerms() {
    const modal = registerElements.termsModal;
    if (modal) {
        showElement(modal);
        addClass(modal, "visible");
        addModalEventListeners(modal, closeTerms);
    }
}

/**
 * Oculta o modal de Termos de Uso.
 * Remove os listeners de evento adicionados para fechar o modal.
 */
function closeTerms() {
    const modal = registerElements.termsModal;
    if (modal) {
        removeClass(modal, "visible");
        setTimeout(() => hideElement(modal), 300);
        removeModalEventListeners(modal, closeTerms);
    }
}

/**
 * Exibe o modal de Política de Privacidade.
 * Adiciona listeners para fechar o modal com a tecla ESC ou clicando fora.
 */
function showPrivacy() {
    const modal = registerElements.privacyModal;
    if (modal) {
        showElement(modal);
        addClass(modal, "visible");
        addModalEventListeners(modal, closePrivacy);
    }
}

/**
 * Oculta o modal de Política de Privacidade.
 * Remove os listeners de evento adicionados para fechar o modal.
 */
function closePrivacy() {
    const modal = registerElements.privacyModal;
    if (modal) {
        removeClass(modal, "visible");
        setTimeout(() => hideElement(modal), 300);
        removeModalEventListeners(modal, closePrivacy);
    }
}

/**
 * Adiciona event listeners genéricos para modais (fechar com ESC ou clique fora).
 * @param {Element} modal - O elemento do modal.
 * @param {Function} closeFunction - A função específica para fechar este modal.
 */
function addModalEventListeners(modal, closeFunction) {
    // Listener para fechar com a tecla ESC.
    const escHandler = (e) => {
        if (e.key === "Escape") closeFunction();
    };
    document.addEventListener("keydown", escHandler);
    modal._escHandler = escHandler; // Armazena o handler para poder removê-lo depois.
    
    // Listener para fechar clicando fora do conteúdo do modal.
    const outsideClickHandler = (e) => {
        if (e.target === modal) closeFunction();
    };
    modal.addEventListener("click", outsideClickHandler);
    modal._outsideClickHandler = outsideClickHandler; // Armazena o handler.
}

/**
 * Remove event listeners genéricos de modais.
 * @param {Element} modal - O elemento do modal.
 * @param {Function} closeFunction - A função específica para fechar este modal.
 */
function removeModalEventListeners(modal, closeFunction) {
    if (modal._escHandler) {
        document.removeEventListener("keydown", modal._escHandler);
        delete modal._escHandler;
    }
    if (modal._outsideClickHandler) {
        modal.removeEventListener("click", modal._outsideClickHandler);
        delete modal._outsideClickHandler;
    }
}

// ===================================================================
// 7. EVENT LISTENERS
// ===================================================================

/**
 * Adiciona todos os event listeners necessários para a página de cadastro.
 */
function addRegisterEventListeners() {
    // Listener para a submissão do formulário de cadastro.
    if (registerElements.form) {
        registerElements.form.addEventListener("submit", handleRegisterSubmit);
    }
    
    // Listeners para validação em tempo real dos campos.
    if (registerElements.nameField) {
        registerElements.nameField.addEventListener("input", validateNameField);
        registerElements.nameField.addEventListener("blur", validateNameField);
    }
    
    if (registerElements.emailField) {
        registerElements.emailField.addEventListener("input", validateEmailField);
        registerElements.emailField.addEventListener("blur", validateEmailField);
    }
    
    if (registerElements.passwordField) {
        registerElements.passwordField.addEventListener("input", validatePasswordField);
        registerElements.passwordField.addEventListener("blur", validatePasswordField);
    }
    
    if (registerElements.confirmPasswordField) {
        registerElements.confirmPasswordField.addEventListener("input", validateConfirmPasswordField);
        registerElements.confirmPasswordField.addEventListener("blur", validateConfirmPasswordField);
    }
    
    if (registerElements.termsField) {
        registerElements.termsField.addEventListener("change", validateTermsField);
    }
    
    // Listeners para os botões de alternar visibilidade da senha.
    if (registerElements.togglePasswordBtn) {
        registerElements.togglePasswordBtn.addEventListener("click", togglePasswordVisibility);
    }
    
    if (registerElements.toggleConfirmPasswordBtn) {
        registerElements.toggleConfirmPasswordBtn.addEventListener("click", toggleConfirmPasswordVisibility);
    }
    
    // Listener para o botão de cadastro com Google.
    if (registerElements.googleRegisterBtn) {
        registerElements.googleRegisterBtn.addEventListener("click", loginWithGoogle);
    }

    // Listeners para atalhos de teclado.
    document.addEventListener("keydown", (e) => {
        // Ctrl+Enter para submeter o formulário de cadastro.
        if (e.ctrlKey && e.key === "Enter") {
            e.preventDefault();
            if (registerElements.form) {
                registerElements.form.dispatchEvent(new Event("submit"));
            }
        }
        
        // Ctrl+Shift+E para preencher dados de exemplo (apenas em desenvolvimento).
        if (e.ctrlKey && e.shiftKey && e.key === "E") {
            e.preventDefault();
            fillExampleData();
        }
    });
    
    // Auto-foco no campo de nome ao carregar a página.
    setTimeout(() => {
        if (registerElements.nameField) {
            registerElements.nameField.focus();
        }
    }, 100);
}

// ===================================================================
// 8. INICIALIZAÇÃO
// ===================================================================

/**
 * Função principal de inicialização da página de cadastro.
 * Chamada quando o DOM estiver completamente carregado.
 */
async function initRegisterPage() {
    console.log("📝 Inicializando página de cadastro...");
    
    // Inicializa as referências aos elementos do DOM.
    initRegisterElements();
    
    // Adiciona todos os event listeners.
    addRegisterEventListeners();
    
    console.log("✅ Página de cadastro inicializada.");
}

// ===================================================================
// 9. FUNÇÕES GLOBAIS (PARA USO EM HTML)
// ===================================================================

/**
 * Expõe funções para serem acessíveis diretamente do HTML (onclick, etc.).
 */
window.showTerms = showTerms;
window.closeTerms = closeTerms;
window.showPrivacy = showPrivacy;
window.closePrivacy = closePrivacy;
window.fillExampleData = fillExampleData;

// ===================================================================
// 10. INICIALIZAÇÃO AUTOMÁTICA
// ===================================================================

// Garante que a função de inicialização seja chamada quando o DOM estiver pronto.
onDOMContentLoaded(initRegisterPage);


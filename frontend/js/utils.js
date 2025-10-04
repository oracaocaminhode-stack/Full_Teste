/**
 * @file utils.js
 * @description Este arquivo contém funções utilitárias JavaScript reutilizáveis para manipulação de DOM,
 * validações, formatação de dados, helpers para API, gerenciamento de estado e utilitários de UI.
 * 
 * @author Manus AI
 * @date Oct 01, 2025
 */

// ===================================================================
// 1. CONFIGURAÇÕES GLOBAIS
// ===================================================================

/**
 * Objeto de configuração global para a aplicação.
 * Contém URLs da API, chaves de armazenamento e parâmetros de validação.
 */
const APP_CONFIG = {
    // URL base da API. Ajusta-se automaticamente para o domínio atual.
    API_BASE_URL: window.location.origin + '/api',
    
    // Tempo limite padrão para requisições de rede (em milissegundos).
    DEFAULT_TIMEOUT: 30000,
    
    // Chave usada para armazenar o token de autenticação no localStorage.
    TOKEN_STORAGE_KEY: 'auth_token',
    
    // Chave usada para armazenar os dados do usuário no localStorage.
    USER_STORAGE_KEY: 'user_data',
    
    // Configurações para validação de campos.
    VALIDATION: {
        MIN_PASSWORD_LENGTH: 6,
        MAX_NAME_LENGTH: 100,
        MAX_EMAIL_LENGTH: 255,
        MAX_MESSAGE_LENGTH: 5000
    }
};

/**
 * Objeto contendo mensagens padrão para exibição ao usuário.
 * Facilita a padronização de mensagens de feedback.
 */
const MESSAGES = {
    LOADING: 'Carregando...',
    SUCCESS: 'Operação realizada com sucesso!',
    ERROR: 'Ocorreu um erro. Tente novamente.',
    NETWORK_ERROR: 'Erro de conexão. Verifique sua internet.',
    UNAUTHORIZED: 'Sessão expirada. Faça login novamente.',
    VALIDATION_ERROR: 'Por favor, corrija os erros no formulário.',
    CONFIRM_DELETE: 'Tem certeza que deseja excluir?',
    CONFIRM_LOGOUT: 'Tem certeza que deseja sair?'
};

// ===================================================================
// 2. MANIPULAÇÃO DE DOM
// ===================================================================

/**
 * Função auxiliar para selecionar um único elemento do DOM.
 * Equivalente a `document.querySelector()`.
 * @param {string} selector - O seletor CSS do elemento a ser selecionado.
 * @returns {Element|null} O primeiro elemento que corresponde ao seletor, ou `null` se nenhum for encontrado.
 */
function $(selector) {
    return document.querySelector(selector);
}

/**
 * Função auxiliar para selecionar múltiplos elementos do DOM.
 * Equivalente a `document.querySelectorAll()`.
 * @param {string} selector - O seletor CSS dos elementos a serem selecionados.
 * @returns {NodeList} Uma `NodeList` contendo todos os elementos que correspondem ao seletor.
 */
function $$(selector) {
    return document.querySelectorAll(selector);
}

/**
 * Cria um novo elemento HTML com atributos e conteúdo opcionais.
 * @param {string} tag - A tag HTML do elemento a ser criado (ex: 'div', 'p').
 * @param {Object} [attributes={}] - Um objeto contendo os atributos a serem definidos no elemento.
 * @param {string} [content=''] - O conteúdo de texto a ser adicionado ao elemento.
 * @returns {Element} O elemento HTML recém-criado.
 */
function createElement(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);
    
    // Itera sobre os atributos fornecidos e os define no elemento.
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'innerHTML') {
            element.innerHTML = value;
        } else {
            element.setAttribute(key, value);
        }
    });
    
    // Adiciona o conteúdo de texto, se fornecido.
    if (content) {
        element.textContent = content;
    }
    
    return element;
}

/**
 * Adiciona uma classe CSS a um elemento do DOM.
 * @param {Element} element - O elemento ao qual a classe será adicionada.
 * @param {string} className - O nome da classe a ser adicionada.
 */
function addClass(element, className) {
    if (element && className) {
        element.classList.add(className);
    }
}

/**
 * Remove uma classe CSS de um elemento do DOM.
 * @param {Element} element - O elemento do qual a classe será removida.
 * @param {string} className - O nome da classe a ser removida.
 */
function removeClass(element, className) {
    if (element && className) {
        element.classList.remove(className);
    }
}

/**
 * Alterna a presença de uma classe CSS em um elemento do DOM.
 * Se a classe estiver presente, ela é removida; caso contrário, é adicionada.
 * @param {Element} element - O elemento no qual a classe será alternada.
 * @param {string} className - O nome da classe a ser alternada.
 */
function toggleClass(element, className) {
    if (element && className) {
        element.classList.toggle(className);
    }
}

/**
 * Verifica se um elemento do DOM possui uma classe CSS específica.
 * @param {Element} element - O elemento a ser verificado.
 * @param {string} className - O nome da classe a ser procurada.
 * @returns {boolean} `true` se o elemento possuir a classe, `false` caso contrário.
 */
function hasClass(element, className) {
    return element && className && element.classList.contains(className);
}

/**
 * Exibe um elemento do DOM, removendo a classe 'hidden' e restaurando seu estilo de exibição padrão.
 * @param {Element} element - O elemento a ser exibido.
 */
function showElement(element) {
    if (element) {
        removeClass(element, 'hidden');
        element.style.display = ''; // Remove o display: none, restaurando o padrão.
    }
}

/**
 * Oculta um elemento do DOM, adicionando a classe 'hidden'.
 * @param {Element} element - O elemento a ser ocultado.
 */
function hideElement(element) {
    if (element) {
        addClass(element, 'hidden');
    }
}

/**
 * Alterna a visibilidade de um elemento do DOM.
 * Se estiver oculto, exibe; se estiver visível, oculta.
 * @param {Element} element - O elemento cuja visibilidade será alternada.
 */
function toggleElement(element) {
    if (element) {
        if (hasClass(element, 'hidden')) {
            showElement(element);
        } else {
            hideElement(element);
        }
    }
}

/**
 * Exibe uma mensagem de erro abaixo de um campo de formulário.
 * @param {Element} inputElement - O elemento de input/textarea associado ao erro.
 * @param {string} message - A mensagem de erro a ser exibida.
 */
function showFieldError(inputElement, message) {
    const errorElement = inputElement.parentNode.querySelector('.field-error');
    if (errorElement) {
        errorElement.textContent = message;
        showElement(errorElement);
        addClass(inputElement, 'is-invalid'); // Adiciona classe para estilização de erro
    }
}

/**
 * Limpa a mensagem de erro de um campo de formulário.
 * @param {Element} inputElement - O elemento de input/textarea.
 */
function clearFieldError(inputElement) {
    const errorElement = inputElement.parentNode.querySelector('.field-error');
    if (errorElement) {
        errorElement.textContent = '';
        hideElement(errorElement);
        removeClass(inputElement, 'is-invalid');
    }
}

/**
 * Exibe uma mensagem global na área de mensagens da página.
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} type - O tipo da mensagem ('success', 'error', 'info').
 * @param {string} [areaId='message-area'] - O ID da área de mensagens onde a mensagem será exibida.
 */
function showGlobalMessage(message, type, areaId = 'message-area') {
    const messageArea = $(`#${areaId}`);
    const messageContent = $(`#${areaId} .message-content`);

    if (messageArea && messageContent) {
        messageContent.textContent = message;
        messageArea.className = `message-area ${type}`;
        showElement(messageArea);
        
        // Oculta a mensagem após 5 segundos
        setTimeout(() => {
            hideElement(messageArea);
        }, 5000);
    }
}

/**
 * Limpa todas as mensagens de erro de um formulário.
 * @param {HTMLFormElement} form - O formulário a ser limpo.
 */
function clearFormErrors(form) {
    const errorElements = form.querySelectorAll('.field-error');
    errorElements.forEach(el => {
        el.textContent = '';
        hideElement(el);
    });
    const invalidInputs = form.querySelectorAll('.is-invalid');
    invalidInputs.forEach(el => removeClass(el, 'is-invalid'));
}

// ===================================================================
// 3. VALIDAÇÕES
// ===================================================================

/**
 * Valida se uma string é um endereço de e-mail válido.
 * @param {string} email - O endereço de e-mail a ser validado.
 * @returns {boolean} `true` se o e-mail for válido, `false` caso contrário.
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Valida a força de uma senha e retorna erros, se houver.
 * @param {string} password - A senha a ser validada.
 * @returns {Object} Um objeto contendo `isValid` (boolean), `strength` ('weak', 'fair', 'good', 'strong') e `errors` (array de strings).
 */
function validatePassword(password) {
    const result = {
        isValid: false,
        strength: 'weak',
        errors: []
    };
    
    if (!password) {
        result.errors.push('Senha é obrigatória');
        return result;
    }
    
    if (password.length < APP_CONFIG.VALIDATION.MIN_PASSWORD_LENGTH) {
        result.errors.push(`Senha deve ter pelo menos ${APP_CONFIG.VALIDATION.MIN_PASSWORD_LENGTH} caracteres`);
    }
    
    if (!/[a-z]/.test(password)) {
        result.errors.push('Senha deve conter pelo menos uma letra minúscula');
    }
    
    if (!/[A-Z]/.test(password)) {
        result.errors.push('Senha deve conter pelo menos uma letra maiúscula');
    }
    
    if (!/\d/.test(password)) {
        result.errors.push('Senha deve conter pelo menos um número');
    }
    
    // Calcula a força da senha com base em critérios.
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++; // Caractere especial
    
    if (strength <= 2) result.strength = 'weak';
    else if (strength === 3) result.strength = 'fair';
    else if (strength === 4) result.strength = 'good';
    else result.strength = 'strong';
    
    result.isValid = result.errors.length === 0;
    return result;
}

/**
 * Valida se uma string é um nome válido.
 * @param {string} name - O nome a ser validado.
 * @returns {Object} Um objeto contendo `isValid` (boolean) e `errors` (array de strings).
 */
function validateName(name) {
    const result = {
        isValid: false,
        errors: []
    };
    
    if (!name || !name.trim()) {
        result.errors.push('Nome é obrigatório');
        return result;
    }
    
    const trimmedName = name.trim();
    
    if (trimmedName.length < 2) {
        result.errors.push('Nome deve ter pelo menos 2 caracteres');
    }
    
    if (trimmedName.length > APP_CONFIG.VALIDATION.MAX_NAME_LENGTH) {
        result.errors.push(`Nome deve ter no máximo ${APP_CONFIG.VALIDATION.MAX_NAME_LENGTH} caracteres`);
    }
    
    // Permite apenas letras (incluindo acentuadas) e espaços.
    if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(trimmedName)) {
        result.errors.push('Nome deve conter apenas letras e espaços');
    }
    
    result.isValid = result.errors.length === 0;
    return result;
}

/**
 * Valida um formulário HTML, verificando campos obrigatórios e tipos específicos.
 * Exibe mensagens de erro diretamente no DOM.
 * @param {HTMLFormElement} form - O elemento do formulário a ser validado.
 * @returns {Object} Um objeto contendo `isValid` (boolean) e `errors` (objeto com erros por campo).
 */
function validateForm(form) {
    const result = {
        isValid: true,
        errors: {}
    };
    
    // Seleciona todos os inputs e textareas que são obrigatórios.
    const inputs = form.querySelectorAll('input[required], textarea[required]');
    
    inputs.forEach(input => {
        const value = input.value.trim();
        const name = input.name || input.id; // Usa 'name' ou 'id' como identificador.
        const type = input.type;
        
        // Limpa erros anteriores para este campo.
        clearFieldError(input);
        
        // Validação básica de campo obrigatório.
        if (!value) {
            result.errors[name] = 'Este campo é obrigatório';
            showFieldError(input, result.errors[name]);
            result.isValid = false;
            return; // Pula para o próximo input.
        }
        
        // Validações específicas por tipo de campo.
        if (type === 'email' && !isValidEmail(value)) {
            result.errors[name] = 'Email inválido';
            showFieldError(input, result.errors[name]);
            result.isValid = false;
        }
        
        if (type === 'password') {
            const passwordValidation = validatePassword(value);
            if (!passwordValidation.isValid) {
                result.errors[name] = passwordValidation.errors[0]; // Exibe apenas o primeiro erro.
                showFieldError(input, result.errors[name]);
                result.isValid = false;
            }
        }
        
        if (name === 'name') {
            const nameValidation = validateName(value);
            if (!nameValidation.isValid) {
                result.errors[name] = nameValidation.errors[0];
                showFieldError(input, result.errors[name]);
                result.isValid = false;
            }
        }

        // Validação para checkbox de termos de uso
        if (input.id === 'terms' && !input.checked) {
            result.errors[name] = 'Você deve aceitar os termos de uso.';
            showFieldError(input, result.errors[name]);
            result.isValid = false;
        }
    });
    
    return result;
}

// ===================================================================
// 4. FORMATAÇÃO
// ===================================================================

/**
 * Formata um valor numérico como moeda brasileira (BRL).
 * @param {number} value - O valor em centavos (ex: 1000 para R$ 10,00).
 * @param {string} [currency='BRL'] - O código da moeda (padrão: 'BRL').
 * @returns {string} O valor formatado como string de moeda.
 */
function formatCurrency(value, currency = 'BRL') {
    const amount = value / 100; // Converte centavos para a unidade monetária principal.
    
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

/**
 * Formata uma data para o formato brasileiro.
 * @param {string|Date} date - A data a ser formatada (pode ser string ISO ou objeto Date).
 * @param {Object} [options={}] - Opções de formatação para `Intl.DateTimeFormat`.
 * @returns {string} A data formatada como string.
 */
function formatDate(date, options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    const formatOptions = { ...defaultOptions, ...options };
    
    return new Intl.DateTimeFormat('pt-BR', formatOptions).format(new Date(date));
}

/**
 * Formata um número de telefone para o padrão brasileiro (XX) XXXXX-XXXX ou (XX) XXXX-XXXX.
 * @param {string} phone - O número de telefone (apenas dígitos).
 * @returns {string} O número de telefone formatado.
 */
function formatPhone(phone) {
    const cleaned = phone.replace(/\D/g, ''); // Remove caracteres não numéricos.
    
    if (cleaned.length === 11) {
        return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3'); // (DD) 9XXXX-XXXX
    } else if (cleaned.length === 10) {
        return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3'); // (DD) XXXX-XXXX
    }
    
    return phone; // Retorna o original se não puder formatar.
}

/**
 * Trunca um texto para um comprimento máximo, adicionando reticências se necessário.
 * @param {string} text - O texto a ser truncado.
 * @param {number} maxLength - O comprimento máximo desejado para o texto.
 * @returns {string} O texto truncado ou o texto original se for menor que `maxLength`.
 */
function truncateText(text, maxLength) {
    if (text.length <= maxLength) {
        return text;
    }
    
    return text.substring(0, maxLength - 3) + '...';
}

// ===================================================================
// 5. API HELPERS
// ===================================================================

/**
 * Realiza uma requisição HTTP para a API, com tratamento de erros e autenticação.
 * @param {string} endpoint - O endpoint da API (ex: '/auth/login').
 * @param {Object} [options={}] - Opções de configuração para a requisição `fetch`.
 * @returns {Promise<Object>} Uma Promise que resolve com os dados da resposta da API.
 * @throws {Error} Lança um erro em caso de falha na requisição ou resposta não-OK.
 */
async function apiRequest(endpoint, options = {}) {
    const url = APP_CONFIG.API_BASE_URL + endpoint;
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
        timeout: APP_CONFIG.DEFAULT_TIMEOUT
    };
    
    // Adiciona o token de autenticação (JWT) ao cabeçalho Authorization, se disponível.
    const token = getAuthToken();
    if (token) {
        defaultOptions.headers.Authorization = `Bearer ${token}`;
    }
    
    // Mescla as opções padrão com as opções fornecidas, priorizando as fornecidas.
    const finalOptions = { ...defaultOptions, ...options };
    
    // Garante que os cabeçalhos sejam mesclados corretamente.
    if (options.headers) {
        finalOptions.headers = { ...defaultOptions.headers, ...options.headers };
    }
    
    try {
        console.log(`🌐 API Request: ${finalOptions.method} ${url}`);
        
        // Cria um AbortController para implementar o timeout.
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), finalOptions.timeout);
        finalOptions.signal = controller.signal;

        const response = await fetch(url, finalOptions);
        clearTimeout(id); // Limpa o timeout se a requisição for concluída antes.
        
        console.log(`📡 API Response: ${response.status} ${response.statusText}`);
        
        // Verifica o tipo de conteúdo da resposta para parsear corretamente.
        const contentType = response.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');
        
        let data;
        if (isJson) {
            data = await response.json();
        } else {
            data = await response.text();
        }
        
        // Lança um erro se a resposta HTTP não for bem-sucedida (status 2xx).
        if (!response.ok) {
            // Se o status for 401 (Não Autorizado), limpa os dados de autenticação e redireciona.
            if (response.status === 401) {
                clearAuthData();
                if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
                    window.location.href = '/'; // Redireciona para a página de login.
                }
            }
            
            throw new Error(data.error || data.message || `HTTP ${response.status}`);
        }
        
        return data;
        
    } catch (error) {
        console.error('❌ API Error:', error);
        
        // Trata erros de rede (ex: sem conexão).
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error(MESSAGES.NETWORK_ERROR);
        }
        // Trata erros de timeout.
        if (error.name === 'AbortError') {
            throw new Error('A requisição excedeu o tempo limite.');
        }
        
        throw error; // Re-lança o erro para ser tratado pelo chamador.
    }
}

/**
 * Realiza uma requisição GET para a API.
 * @param {string} endpoint - O endpoint da API.
 * @param {Object} [options={}] - Opções adicionais para a requisição.
 * @returns {Promise<Object>} Uma Promise que resolve com os dados da resposta.
 */
async function apiGet(endpoint, options = {}) {
    return apiRequest(endpoint, { ...options, method: 'GET' });
}

/**
 * Realiza uma requisição POST para a API.
 * @param {string} endpoint - O endpoint da API.
 * @param {Object} data - Os dados a serem enviados no corpo da requisição.
 * @param {Object} [options={}] - Opções adicionais para a requisição.
 * @returns {Promise<Object>} Uma Promise que resolve com os dados da resposta.
 */
async function apiPost(endpoint, data, options = {}) {
    return apiRequest(endpoint, { 
        ...options, 
        method: 'POST', 
        body: JSON.stringify(data) 
    });
}

/**
 * Realiza uma requisição PUT para a API.
 * @param {string} endpoint - O endpoint da API.
 * @param {Object} data - Os dados a serem enviados no corpo da requisição.
 * @param {Object} [options={}] - Opções adicionais para a requisição.
 * @returns {Promise<Object>} Uma Promise que resolve com os dados da resposta.
 */
async function apiPut(endpoint, data, options = {}) {
    return apiRequest(endpoint, { 
        ...options, 
        method: 'PUT', 
        body: JSON.stringify(data) 
    });
}

/**
 * Realiza uma requisição DELETE para a API.
 * @param {string} endpoint - O endpoint da API.
 * @param {Object} [options={}] - Opções adicionais para a requisição.
 * @returns {Promise<Object>} Uma Promise que resolve com os dados da resposta.
 */
async function apiDelete(endpoint, options = {}) {
    return apiRequest(endpoint, { ...options, method: 'DELETE' });
}

// ===================================================================
// 6. UI UTILITIES (UTILITÁRIOS DE INTERFACE DO USUÁRIO)
// ===================================================================

/**
 * Exibe ou oculta um spinner de carregamento em um botão.
 * @param {Element} button - O elemento do botão.
 * @param {boolean} isLoading - `true` para mostrar o spinner, `false` para ocultar.
 */
function toggleButtonLoading(button, isLoading) {
    if (!button) return;

    const btnText = button.querySelector('.btn-text');
    const btnLoading = button.querySelector('.btn-loading');

    if (isLoading) {
        if (btnText) hideElement(btnText);
        if (btnLoading) showElement(btnLoading);
        button.disabled = true;
    } else {
        if (btnText) showElement(btnText);
        if (btnLoading) hideElement(btnLoading);
        button.disabled = false;
    }
}

/**
 * Alterna a visibilidade de um modal.
 * @param {string} modalId - O ID do elemento modal.
 * @param {boolean} show - `true` para mostrar, `false` para ocultar.
 */
function toggleModal(modalId, show) {
    const modal = $(`#${modalId}`);
    if (modal) {
        if (show) {
            addClass(modal, 'visible');
        } else {
            removeClass(modal, 'visible');
        }
    }
}

/**
 * Atualiza o contador de caracteres de um textarea.
 * @param {HTMLTextAreaElement} textarea - O elemento textarea.
 * @param {Element} counterElement - O elemento onde o contador será exibido.
 * @param {number} maxLength - O comprimento máximo permitido.
 */
function updateCharCounter(textarea, counterElement, maxLength) {
    if (textarea && counterElement) {
        const currentLength = textarea.value.length;
        counterElement.textContent = `${currentLength}`;
        if (currentLength > maxLength) {
            counterElement.style.color = 'var(--error-color)';
        } else {
            counterElement.style.color = ''; // Reseta para a cor padrão
        }
    }
}

/**
 * Atualiza a barra de força da senha e o texto indicativo.
 * @param {string} password - A senha atual.
 * @param {Element} strengthFillElement - O elemento da barra de preenchimento da força.
 * @param {Element} strengthTextElement - O elemento de texto da força.
 */
function updatePasswordStrength(password, strengthFillElement, strengthTextElement) {
    const validation = validatePassword(password);
    const strength = validation.strength;

    // Remove classes de força anteriores
    strengthFillElement.classList.remove('strength-weak','strength-fair','strength-good','strength-strong');
    strengthTextElement.classList.remove('strength-weak','strength-fair','strength-good','strength-strong');

    // Adiciona a classe de força atual
    addClass(strengthFillElement, `strength-${strength}`);
    addClass(strengthTextElement, `strength-${strength}`);

    // Atualiza o texto da força
    switch (strength) {
        case 'weak':
            strengthTextElement.textContent = 'Fraca';
            break;
        case 'fair':
            strengthTextElement.textContent = 'Média';
            break;
        case 'good':
            strengthTextElement.textContent = 'Boa';
            break;
        case 'strong':
            strengthTextElement.textContent = 'Forte';
            break;
        default:
            strengthTextElement.textContent = 'Digite uma senha';
            break;
    }
}

// ===================================================================
// 7. STORAGE HELPERS (AJUDANTES DE ARMAZENAMENTO LOCAL)
// ===================================================================

/**
 * Armazena um token de autenticação no localStorage.
 * @param {string} token - O token JWT a ser armazenado.
 */
function setAuthToken(token) {
    localStorage.setItem(APP_CONFIG.TOKEN_STORAGE_KEY, token);
}

/**
 * Recupera o token de autenticação do localStorage.
 * @returns {string|null} O token JWT ou `null` se não encontrado.
 */
function getAuthToken() {
    return localStorage.getItem(APP_CONFIG.TOKEN_STORAGE_KEY);
}

/**
 * Armazena os dados do usuário no localStorage.
 * @param {Object} userData - O objeto com os dados do usuário.
 */
function setUserData(userData) {
    localStorage.setItem(APP_CONFIG.USER_STORAGE_KEY, JSON.stringify(userData));
}

/**
 * Recupera os dados do usuário do localStorage.
 * @returns {Object|null} O objeto com os dados do usuário ou `null` se não encontrado.
 */
function getUserData() {
    const data = localStorage.getItem(APP_CONFIG.USER_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
}

/**
 * Limpa todos os dados de autenticação (token e dados do usuário) do localStorage.
 */
function clearAuthData() {
    localStorage.removeItem(APP_CONFIG.TOKEN_STORAGE_KEY);
    localStorage.removeItem(APP_CONFIG.USER_STORAGE_KEY);
}

// ===================================================================
// 8. EVENT HELPERS (AJUDANTES DE EVENTOS)
// ===================================================================

/**
 * Adiciona um ouvinte de evento a um elemento.
 * @param {Element} element - O elemento ao qual o ouvinte será adicionado.
 * @param {string} eventType - O tipo de evento (ex: 'click', 'submit').
 * @param {Function} handler - A função de callback a ser executada quando o evento ocorrer.
 */
function addEventListener(element, eventType, handler) {
    if (element) {
        element.addEventListener(eventType, handler);
    }
}

/**
 * Remove um ouvinte de evento de um elemento.
 * @param {Element} element - O elemento do qual o ouvinte será removido.
 * @param {string} eventType - O tipo de evento.
 * @param {Function} handler - A função de callback a ser removida.
 */
function removeEventListener(element, eventType, handler) {
    if (element) {
        element.removeEventListener(eventType, handler);
    }
}

/**
 * Adiciona um ouvinte de evento para o carregamento completo do DOM.
 * @param {Function} callback - A função a ser executada quando o DOM estiver pronto.
 */
function onDOMContentLoaded(callback) {
    document.addEventListener('DOMContentLoaded', callback);
}

/**
 * Previne o comportamento padrão de um evento (ex: submissão de formulário).
 * @param {Event} event - O objeto de evento.
 */
function preventDefault(event) {
    event.preventDefault();
}

/**
 * Interrompe a propagação de um evento.
 * @param {Event} event - O objeto de evento.
 */
function stopPropagation(event) {
    event.stopPropagation();
}

/**
 * Simula um clique em um elemento.
 * @param {Element} element - O elemento a ser clicado.
 */
function simulateClick(element) {
    if (element) {
        element.click();
    }
}


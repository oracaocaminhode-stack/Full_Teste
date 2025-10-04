/**
 * @file dashboard.js
 * @description Este arquivo JavaScript gerencia todas as funcionalidades interativas do dashboard do frontend.
 * Inclui navegação entre seções, gerenciamento de perfil, sistema de envio de e-mails, processamento de pagamentos
 * com Stripe, formulário de contato e responsividade da sidebar.
 * 
 * @author Manus AI
 * @date Oct 01, 2025
 */

// ===================================================================
// 1. ELEMENTOS DO DOM E ESTADO
// ===================================================================

/**
 * Objeto para armazenar referências aos elementos do DOM da página do dashboard.
 * Isso evita a necessidade de buscar os elementos repetidamente no DOM.
 */
let dashboardElements = {};

/**
 * Objeto para armazenar o estado global do dashboard.
 * Inclui a seção atual, instâncias de bibliotecas externas (Stripe) e outras variáveis de controle.
 */
let dashboardState = {
    currentSection: 'overview', // A seção atualmente visível no dashboard.
    stripe: null,                // Instância do objeto Stripe.
    cardElement: null,           // Elemento de UI do cartão de crédito do Stripe.
    selectedProduct: null,       // O produto selecionado para pagamento.
    sidebarCollapsed: false      // Estado da sidebar (recolhida ou expandida).
};

/**
 * Inicializa as referências aos elementos do DOM do dashboard.
 * Esta função deve ser chamada após o carregamento completo do DOM.
 */
function initDashboardElements() {
    dashboardElements = {
        // Elementos relacionados à sidebar e navegação.
        sidebar: $('.sidebar'),
        sidebarToggle: $('#sidebar-toggle'),
        navLinks: $$('.nav-link'),
        
        // Elementos relacionados às seções do dashboard.
        sections: $$('.dashboard-section'),
        pageTitle: $('#page-title'),
        
        // Elementos da seção de perfil do usuário.
        profileAvatar: $('#profile-avatar'),
        profileName: $('#profile-name'),
        profileEmail: $('#profile-email'),
        profileProvider: $('#profile-provider'),
        profileId: $('#profile-id'),
        profileCreated: $('#profile-created'),
        profileUpdated: $('#profile-updated'),
        profileVerified: $('#profile-verified'),
        
        // Elementos da seção de envio de e-mail.
        emailForm: $('#email-form'),
        emailTo: $('#email-to'),
        emailSubject: $('#email-subject'),
        emailMessage: $('#email-message'),
        messageCounter: $('#message-counter'),
        sendEmailBtn: $('#send-email-btn'),
        
        // Elementos da seção de pagamentos.
        productCards: $$('.product-card'),
        selectProductBtns: $$('.select-product-btn'),
        paymentFormContainer: $('#payment-form-container'),
        paymentForm: $('#payment-form'),
        selectedProductName: $('#selected-product-name'),
        selectedProductPrice: $('#selected-product-price'),
        cardElementContainer: $('#card-element'), // Renomeado para evitar conflito com dashboardState.cardElement
        cardErrors: $('#card-errors'),
        payBtn: $('#pay-btn'),
        paymentsList: $('#payments-list'),
        
        // Elementos da seção de contato.
        contactForm: $('#contact-form'),
        contactName: $('#contact-name'),
        contactEmail: $('#contact-email'),
        contactPhone: $('#contact-phone'),
        contactSubject: $('#contact-subject'),
        contactMessage: $('#contact-message'),
        sendContactBtn: $('#send-contact-btn'),
        
        // Modais.
        deleteAccountModal: $('#delete-account-modal'),
        
        // Indicadores de status.
        emailStatus: $('#email-status'),
        paymentStatus: $('#payment-status')
    };
    
    console.log('📋 Elementos do dashboard inicializados.');
}

// ===================================================================
// 2. NAVEGAÇÃO E SIDEBAR
// ===================================================================

/**
 * Exibe uma seção específica do dashboard e oculta as outras.
 * Atualiza o título da página e o link ativo na navegação.
 * @param {string} sectionName - O nome da seção a ser exibida (ex: 'overview', 'profile').
 */
function showSection(sectionName) {
    console.log(`📄 Mostrando seção: ${sectionName}`);
    
    // Oculta todas as seções do dashboard.
    dashboardElements.sections.forEach(section => {
        removeClass(section, 'active');
    });
    
    // Remove a classe 'active' de todos os links de navegação.
    dashboardElements.navLinks.forEach(link => {
        removeClass(link, 'active');
    });
    
    // Exibe a seção selecionada adicionando a classe 'active'.
    const targetSection = $(`#${sectionName}-section`);
    if (targetSection) {
        addClass(targetSection, 'active');
    }
    
    // Ativa o link de navegação correspondente à seção atual.
    const targetLink = $(`.nav-link[data-section="${sectionName}"]`);
    if (targetLink) {
        addClass(targetLink, 'active');
    }
    
    // Atualiza o título exibido no cabeçalho do dashboard.
    const sectionTitles = {
        overview: 'Visão Geral',
        profile: 'Meu Perfil',
        email: 'Enviar Email',
        payment: 'Pagamentos',
        contact: 'Contato'
    };
    
    if (dashboardElements.pageTitle) {
        dashboardElements.pageTitle.textContent = sectionTitles[sectionName] || 'Dashboard';
    }
    
    // Atualiza o estado da seção atual.
    dashboardState.currentSection = sectionName;
    
    // Executa funções específicas da seção recém-ativada.
    onSectionChange(sectionName);
    
    // Em dispositivos móveis, recolhe a sidebar após a navegação.
    if (window.innerWidth <= 768) {
        collapseSidebar();
    }
}

/**
 * Executa ações específicas quando a seção do dashboard é alterada.
 * @param {string} sectionName - O nome da seção que foi ativada.
 */
function onSectionChange(sectionName) {
    switch (sectionName) {
        case 'profile':
            loadProfileData(); // Carrega os dados do perfil.
            break;
        case 'email':
            setupEmailForm(); // Configura o formulário de e-mail.
            break;
        case 'payment':
            setupPaymentForm(); // Configura o formulário de pagamento (Stripe).
            checkPaymentStatus(); // Verifica o status de pagamentos (simulado).
            break;
        case 'contact':
            setupContactForm(); // Configura o formulário de contato.
            break;
        case 'overview':
            checkSystemStatus(); // Verifica o status geral do sistema (simulado).
            break;
    }
}

/**
 * Alterna o estado da sidebar (recolhida/expandida).
 * Usado principalmente em dispositivos móveis.
 */
function toggleSidebar() {
    if (dashboardState.sidebarCollapsed) {
        expandSidebar();
    } else {
        collapseSidebar();
    }
}

/**
 * Recolhe a sidebar, ocultando-a ou diminuindo sua largura.
 */
function collapseSidebar() {
    if (dashboardElements.sidebar) {
        addClass(dashboardElements.sidebar, 'collapsed');
        dashboardState.sidebarCollapsed = true;
    }
}

/**
 * Expande a sidebar, tornando-a totalmente visível.
 */
function expandSidebar() {
    if (dashboardElements.sidebar) {
        removeClass(dashboardElements.sidebar, 'collapsed');
        dashboardState.sidebarCollapsed = false;
    }
}

// ===================================================================
// 3. PERFIL DO USUÁRIO
// ===================================================================

/**
 * Carrega os dados do perfil do usuário a partir da API e atualiza a interface.
 */
async function loadProfileData() {
    try {
        console.log('👤 Carregando dados do perfil...');
        
        const result = await loadUserProfile(); // Chama a função de auth.js
        
        if (result.success) {
            updateProfileUI(result.user);
        } else {
            showGlobalMessage('Erro ao carregar perfil.', 'error', 'global-message-area');
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar perfil:', error);
        showGlobalMessage('Erro ao carregar dados do perfil.', 'error', 'global-message-area');
    }
}

/**
 * Atualiza os elementos da interface do usuário com os dados do perfil do usuário.
 * @param {Object} user - O objeto contendo os dados do usuário.
 */
function updateProfileUI(user) {
    if (!user) return;
    
    // Atualiza a imagem do avatar.
    if (dashboardElements.profileAvatar) {
        dashboardElements.profileAvatar.src = user.picture || 
            `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=667eea&color=fff`;
    }
    
    // Atualiza informações básicas como nome e e-mail.
    if (dashboardElements.profileName) {
        dashboardElements.profileName.textContent = user.name || 'Nome não informado';
    }
    
    if (dashboardElements.profileEmail) {
        dashboardElements.profileEmail.textContent = user.email || 'Email não informado';
    }
    
    // Exibe o provedor de autenticação (e-mail/senha ou Google).
    if (dashboardElements.profileProvider) {
        const provider = user.provider === 'google' ? '🔍 Google' : '📧 Email';
        dashboardElements.profileProvider.textContent = provider;
    }
    
    // Atualiza detalhes adicionais do perfil.
    if (dashboardElements.profileId) {
        dashboardElements.profileId.textContent = user.id || 'N/A';
    }
    
    if (dashboardElements.profileCreated) {
        dashboardElements.profileCreated.textContent = user.createdAt ? 
            formatDate(user.createdAt) : 'N/A';
    }
    
    if (dashboardElements.profileUpdated) {
        dashboardElements.profileUpdated.textContent = user.updatedAt ? 
            formatDate(user.updatedAt) : 'N/A';
    }
    
    if (dashboardElements.profileVerified) {
        const verified = user.emailVerified ? '✅ Verificado' : '❌ Não verificado';
        dashboardElements.profileVerified.textContent = verified;
    }
    
    console.log('✅ UI do perfil atualizada.');
}

/**
 * Atualiza os dados do perfil do usuário, recarregando-os da API.
 */
async function refreshProfile() {
    showGlobalMessage('Atualizando dados do perfil...', 'info', 'global-message-area');
    await loadProfileData();
    showGlobalMessage('Dados do perfil atualizados!', 'success', 'global-message-area');
}

/**
 * Permite ao usuário baixar seus dados de perfil em formato JSON.
 */
function downloadProfileData() {
    const user = getCurrentUser(); // Obtém os dados do usuário logado.
    if (!user) {
        showGlobalMessage('Dados do usuário não encontrados.', 'error', 'global-message-area');
        return;
    }
    
    // Prepara os dados para download.
    const data = {
        nome: user.name,
        email: user.email,
        id: user.id,
        provedor: user.provider,
        criado_em: user.createdAt,
        atualizado_em: user.updatedAt,
        email_verificado: user.emailVerified,
        exportado_em: new Date().toISOString()
    };
    
    // Cria um Blob com os dados JSON e um URL para download.
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Cria um link temporário para iniciar o download.
    const a = document.createElement('a');
    a.href = url;
    a.download = `perfil_${user.email}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url); // Libera o URL do objeto.
    
    showGlobalMessage('Dados do perfil baixados!', 'success', 'global-message-area');
}

/**
 * Exibe o modal de confirmação para exclusão da conta.
 */
function confirmDeleteAccount() {
    if (dashboardElements.deleteAccountModal) {
        showElement(dashboardElements.deleteAccountModal);
        addClass(dashboardElements.deleteAccountModal, 'visible');
    }
}

/**
 * Oculta o modal de confirmação de exclusão da conta.
 */
function closeDeleteModal() {
    if (dashboardElements.deleteAccountModal) {
        removeClass(dashboardElements.deleteAccountModal, 'visible');
        setTimeout(() => hideElement(dashboardElements.deleteAccountModal), 300);
    }
}

/**
 * Simula a exclusão da conta do usuário.
 * Em um ambiente real, faria uma chamada à API para excluir a conta.
 */
async function deleteAccount() {
    try {
        showGlobalMessage('Excluindo conta...', 'info', 'global-message-area');
        
        // TODO: Implementar a chamada real para a API de exclusão de conta.
        // Ex: const result = await apiDelete('/auth/account');
        
        // Simula um atraso para a operação.
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        showGlobalMessage('Conta excluída com sucesso.', 'success', 'global-message-area');
        
        // Limpa os dados de autenticação e redireciona para a página inicial.
        setTimeout(() => {
            clearAuthData();
            window.location.href = '/';
        }, 2000);
        
    } catch (error) {
        console.error('❌ Erro ao excluir conta:', error);
        showGlobalMessage('Erro ao excluir conta. Tente novamente.', 'error', 'global-message-area');
    } finally {
        closeDeleteModal(); // Garante que o modal seja fechado.
    }
}

// ===================================================================
// 4. SISTEMA DE EMAIL
// ===================================================================

/**
 * Configura o formulário de envio de e-mail.
 * Pré-preenche o campo 'De' com o e-mail do usuário logado e configura o contador de caracteres.
 */
function setupEmailForm() {
    // Pré-preenche o campo de e-mail do remetente com o e-mail do usuário logado.
    const user = getCurrentUser();
    if (user && dashboardElements.emailTo) { // Assumindo que 'emailTo' é o campo 'De' para o usuário logado
        dashboardElements.emailTo.value = user.email;
    }
    
    // Configura o contador de caracteres para o campo de mensagem.
    if (dashboardElements.emailMessage && dashboardElements.messageCounter) {
        dashboardElements.emailMessage.addEventListener('input', () => {
            updateCharCounter(
                dashboardElements.emailMessage,
                dashboardElements.messageCounter,
                APP_CONFIG.VALIDATION.MAX_MESSAGE_LENGTH
            );
        });
        // Inicializa o contador com o valor atual.
        updateCharCounter(
            dashboardElements.emailMessage,
            dashboardElements.messageCounter,
            APP_CONFIG.VALIDATION.MAX_MESSAGE_LENGTH
        );
    }
}

/**
 * Manipula o envio do formulário de e-mail.
 * Valida os campos, envia os dados para a API e exibe feedback ao usuário.
 * @param {Event} event - O objeto de evento de submissão.
 */
async function handleEmailSubmit(event) {
    event.preventDefault();
    
    console.log('📧 Enviando email...');
    
    // Valida o formulário antes de enviar.
    const validation = validateForm(dashboardElements.emailForm);
    if (!validation.isValid) {
        showGlobalMessage('Por favor, corrija os erros no formulário.', 'error', 'global-message-area');
        return;
    }
    
    // Coleta os dados do formulário de e-mail.
    const emailData = {
        to: dashboardElements.emailTo.value.trim(),
        subject: dashboardElements.emailSubject.value.trim(),
        message: dashboardElements.emailMessage.value.trim()
    };
    
    // Exibe o estado de carregamento no botão de envio.
    toggleButtonLoading(dashboardElements.sendEmailBtn, true);
    
    try {
        // Envia os dados do e-mail para o endpoint da API.
        const response = await apiPost('/email/send', emailData);
        
        showGlobalMessage('Email enviado com sucesso!', 'success', 'global-message-area');
        clearEmailForm(); // Limpa o formulário após o envio bem-sucedido.
        
    } catch (error) {
        console.error('❌ Erro ao enviar email:', error);
        showGlobalMessage(error.message || 'Erro ao enviar email.', 'error', 'global-message-area');
        
    } finally {
        // Remove o estado de carregamento do botão.
        toggleButtonLoading(dashboardElements.sendEmailBtn, false);
    }
}

/**
 * Limpa todos os campos do formulário de e-mail e reseta o contador de caracteres.
 */
function clearEmailForm() {
    if (dashboardElements.emailForm) {
        dashboardElements.emailForm.reset();
        // Garante que o contador de caracteres seja resetado.
        if (dashboardElements.messageCounter) {
            dashboardElements.messageCounter.textContent = '0';
        }
        // Limpa mensagens de erro específicas do formulário de e-mail.
        clearFormErrors(dashboardElements.emailForm);
    }
}

// ===================================================================
// 5. SISTEMA DE PAGAMENTOS (STRIPE)
// ===================================================================

/**
 * Inicializa o Stripe e configura o elemento de cartão.
 * Esta função é chamada quando a seção de pagamento é ativada.
 */
async function setupPaymentForm() {
    // Verifica se o Stripe já foi inicializado para evitar duplicação.
    if (!dashboardState.stripe) {
        // Obtém a chave pública do Stripe do backend.
        const { publishableKey } = await apiGet('/payment/config');
        dashboardState.stripe = Stripe(publishableKey);
        
        // Cria uma instância do Stripe Elements.
        const elements = dashboardState.stripe.elements();
        
        // Cria um elemento de cartão e o monta no DOM.
        dashboardState.cardElement = elements.create('card', {
            style: {
                base: {
                    fontSize: '16px',
                    color: '#32325d',
                    '::placeholder': {
                        color: '#aab7c4',
                    },
                },
                invalid: {
                    color: '#fa755a',
                    iconColor: '#fa755a',
                },
            },
        });
        
        // Monta o elemento de cartão no contêiner.
        if (dashboardElements.cardElementContainer) {
            dashboardState.cardElement.mount(dashboardElements.cardElementContainer);
            
            // Adiciona um listener para exibir erros de validação do cartão.
            dashboardState.cardElement.addEventListener('change', event => {
                if (dashboardElements.cardErrors) {
                    dashboardElements.cardErrors.textContent = event.error ? event.error.message : '';
                }
            });
        }
    }
    
    // Adiciona listeners para os botões de seleção de produto.
    dashboardElements.selectProductBtns.forEach(button => {
        button.addEventListener('click', selectProduct);
    });
    
    // Adiciona listener para a submissão do formulário de pagamento.
    if (dashboardElements.paymentForm) {
        dashboardElements.paymentForm.addEventListener('submit', handlePaymentSubmit);
    }
    
    // Carrega o histórico de pagamentos.
    loadPaymentHistory();
}

/**
 * Seleciona um produto para pagamento e atualiza a interface.
 * @param {Event} event - O objeto de evento de clique.
 */
function selectProduct(event) {
    const productCard = event.target.closest('.product-card');
    if (!productCard) return;
    
    // Remove a seleção de produtos anteriores.
    $$('.product-card').forEach(card => removeClass(card, 'selected'));
    
    // Marca o produto selecionado.
    addClass(productCard, 'selected');
    
    // Armazena os detalhes do produto selecionado no estado do dashboard.
    dashboardState.selectedProduct = {
        id: productCard.dataset.productId,
        name: productCard.dataset.productName,
        price: parseInt(productCard.dataset.productPrice)
    };
    
    // Atualiza a exibição do produto selecionado no formulário de pagamento.
    if (dashboardElements.selectedProductName) {
        dashboardElements.selectedProductName.textContent = dashboardState.selectedProduct.name;
    }
    if (dashboardElements.selectedProductPrice) {
        dashboardElements.selectedProductPrice.textContent = formatCurrency(dashboardState.selectedProduct.price / 100); // Converte centavos para reais.
    }
    
    // Exibe o formulário de pagamento.
    showElement(dashboardElements.paymentFormContainer);
    
    console.log('🛒 Produto selecionado:', dashboardState.selectedProduct);
}

/**
 * Manipula a submissão do formulário de pagamento.
 * Cria um token de pagamento com Stripe e envia para o backend.
 * @param {Event} event - O objeto de evento de submissão.
 */
async function handlePaymentSubmit(event) {
    event.preventDefault();
    
    if (!dashboardState.stripe || !dashboardState.cardElement || !dashboardState.selectedProduct) {
        showGlobalMessage('Erro: Stripe não inicializado ou produto não selecionado.', 'error', 'global-message-area');
        return;
    }
    
    // Exibe o estado de carregamento no botão de pagamento.
    toggleButtonLoading(dashboardElements.payBtn, true);
    
    try {
        // Cria um método de pagamento com o Stripe.
        const { paymentMethod, error } = await dashboardState.stripe.createPaymentMethod({
            type: 'card',
            card: dashboardState.cardElement,
        });
        
        if (error) {
            if (dashboardElements.cardErrors) {
                dashboardElements.cardErrors.textContent = error.message;
            }
            showGlobalMessage(error.message, 'error', 'global-message-area');
            return;
        }
        
        // Envia o ID do método de pagamento e os detalhes do produto para o backend.
        const response = await apiPost('/payment/charge', {
            paymentMethodId: paymentMethod.id,
            amount: dashboardState.selectedProduct.price, // Valor em centavos.
            currency: 'brl',
            productId: dashboardState.selectedProduct.id,
            productName: dashboardState.selectedProduct.name
        });
        
        if (response.success) {
            showGlobalMessage('Pagamento processado com sucesso!', 'success', 'global-message-area');
            hideElement(dashboardElements.paymentFormContainer); // Oculta o formulário após o sucesso.
            dashboardState.selectedProduct = null; // Limpa o produto selecionado.
            loadPaymentHistory(); // Recarrega o histórico de pagamentos.
            // Remove a seleção visual do produto.
            $$('.product-card').forEach(card => removeClass(card, 'selected'));
        } else {
            showGlobalMessage(response.error || 'Erro ao processar pagamento.', 'error', 'global-message-area');
        }
        
    } catch (error) {
        console.error('❌ Erro no pagamento:', error);
        showGlobalMessage('Erro inesperado ao processar pagamento. Tente novamente.', 'error', 'global-message-area');
        
    } finally {
        toggleButtonLoading(dashboardElements.payBtn, false);
    }
}

/**
 * Carrega e exibe o histórico de pagamentos do usuário.
 */
async function loadPaymentHistory() {
    if (!dashboardElements.paymentsList) return;
    
    dashboardElements.paymentsList.innerHTML = '<li>Carregando histórico de pagamentos...</li>';
    
    try {
        const response = await apiGet('/payment/history');
        
        if (response.success && response.payments.length > 0) {
            dashboardElements.paymentsList.innerHTML = ''; // Limpa a mensagem de carregamento.
            response.payments.forEach(payment => {
                const listItem = document.createElement('li');
                listItem.className = 'payment-item';
                listItem.innerHTML = `
                    <span class="payment-date">${formatDate(payment.date)}</span>
                    <span class="payment-description">${payment.productName}</span>
                    <span class="payment-amount">${formatCurrency(payment.amount / 100)}</span>
                    <span class="payment-status ${payment.status === 'succeeded' ? 'success' : 'failed'}">
                        ${payment.status === 'succeeded' ? '✅ Sucesso' : '❌ Falha'}
                    </span>
                `;
                dashboardElements.paymentsList.appendChild(listItem);
            });
        } else if (response.success && response.payments.length === 0) {
            dashboardElements.paymentsList.innerHTML = '<li>Nenhum pagamento encontrado.</li>';
        } else {
            dashboardElements.paymentsList.innerHTML = '<li>Erro ao carregar histórico.</li>';
            showGlobalMessage(response.error || 'Erro ao carregar histórico de pagamentos.', 'error', 'global-message-area');
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar histórico de pagamentos:', error);
        dashboardElements.paymentsList.innerHTML = '<li>Erro ao carregar histórico.</li>';
        showGlobalMessage('Erro inesperado ao carregar histórico de pagamentos.', 'error', 'global-message-area');
    }
}

/**
 * Simula a verificação do status do sistema de pagamentos.
 */
function checkPaymentStatus() {
    if (dashboardElements.paymentStatus) {
        // Simula uma chamada assíncrona.
        setTimeout(() => {
            dashboardElements.paymentStatus.textContent = '✅ Ativo';
            removeClass(dashboardElements.paymentStatus, 'checking');
            addClass(dashboardElements.paymentStatus, 'success');
        }, 1000);
    }
}

// ===================================================================
// 6. FORMULÁRIO DE CONTATO
// ===================================================================

/**
 * Configura o formulário de contato.
 * Pré-preenche os campos de nome e e-mail com os dados do usuário logado.
 */
function setupContactForm() {
    const user = getCurrentUser();
    if (user) {
        if (dashboardElements.contactName) {
            dashboardElements.contactName.value = user.name || '';
        }
        if (dashboardElements.contactEmail) {
            dashboardElements.contactEmail.value = user.email || '';
        }
    }
    
    // Adiciona listener para a submissão do formulário de contato.
    if (dashboardElements.contactForm) {
        dashboardElements.contactForm.addEventListener('submit', handleContactSubmit);
    }
}

/**
 * Manipula a submissão do formulário de contato.
 * Valida os campos, envia os dados para a API e exibe feedback ao usuário.
 * @param {Event} event - O objeto de evento de submissão.
 */
async function handleContactSubmit(event) {
    event.preventDefault();
    
    console.log('📞 Enviando mensagem de contato...');
    
    // Valida o formulário antes de enviar.
    const validation = validateForm(dashboardElements.contactForm);
    if (!validation.isValid) {
        showGlobalMessage('Por favor, corrija os erros no formulário.', 'error', 'global-message-area');
        return;
    }
    
    // Coleta os dados do formulário de contato.
    const contactData = {
        name: dashboardElements.contactName.value.trim(),
        email: dashboardElements.contactEmail.value.trim(),
        phone: dashboardElements.contactPhone.value.trim(),
        subject: dashboardElements.contactSubject.value.trim(),
        message: dashboardElements.contactMessage.value.trim()
    };
    
    // Exibe o estado de carregamento no botão de envio.
    toggleButtonLoading(dashboardElements.sendContactBtn, true);
    
    try {
        // Envia os dados do contato para o endpoint da API.
        const response = await apiPost('/contact', contactData);
        
        if (response.success) {
            showGlobalMessage('Mensagem de contato enviada com sucesso!', 'success', 'global-message-area');
            clearContactForm(); // Limpa o formulário após o envio bem-sucedido.
        } else {
            showGlobalMessage(response.error || 'Erro ao enviar mensagem de contato.', 'error', 'global-message-area');
        }
        
    } catch (error) {
        console.error('❌ Erro ao enviar mensagem de contato:', error);
        showGlobalMessage('Erro inesperado ao enviar mensagem de contato. Tente novamente.', 'error', 'global-message-area');
        
    } finally {
        // Remove o estado de carregamento do botão.
        toggleButtonLoading(dashboardElements.sendContactBtn, false);
    }
}

/**
 * Limpa todos os campos do formulário de contato.
 */
function clearContactForm() {
    if (dashboardElements.contactForm) {
        dashboardElements.contactForm.reset();
        clearFormErrors(dashboardElements.contactForm);
    }
}

// ===================================================================
// 7. STATUS DO SISTEMA (VISÃO GERAL)
// ===================================================================

/**
 * Simula a verificação do status de diferentes componentes do sistema.
 * Atualiza os indicadores visuais na seção de visão geral.
 */
function checkSystemStatus() {
    // Simula a verificação do status do sistema de e-mail.
    if (dashboardElements.emailStatus) {
        setTimeout(() => {
            dashboardElements.emailStatus.textContent = '✅ Ativo';
            removeClass(dashboardElements.emailStatus, 'checking');
            addClass(dashboardElements.emailStatus, 'success');
        }, 500);
    }
    
    // Simula a verificação do status do sistema de pagamentos.
    if (dashboardElements.paymentStatus) {
        setTimeout(() => {
            dashboardElements.paymentStatus.textContent = '✅ Ativo';
            removeClass(dashboardElements.paymentStatus, 'checking');
            addClass(dashboardElements.paymentStatus, 'success');
        }, 1000);
    }
}

// ===================================================================
// 8. EVENT LISTENERS GERAIS
// ===================================================================

/**
 * Adiciona todos os event listeners necessários para a página do dashboard.
 */
function addDashboardEventListeners() {
    // Listener para o botão de alternar a sidebar.
    if (dashboardElements.sidebarToggle) {
        dashboardElements.sidebarToggle.addEventListener('click', toggleSidebar);
    }
    
    // Listeners para os links de navegação da sidebar.
    dashboardElements.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.closest('.nav-link').dataset.section;
            showSection(section);
        });
    });
    
    // Listener para o botão de logout.
    if (dashboardElements.logoutBtn) {
        dashboardElements.logoutBtn.addEventListener('click', async () => {
            await logout(); // Chama a função de logout do auth.js
            window.location.href = '/'; // Redireciona para a página inicial.
        });
    }
    
    // Listener para o botão de confirmação de exclusão de conta.
    if (dashboardElements.deleteAccountModal) {
        const confirmBtn = $('#confirm-delete-btn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', deleteAccount);
        }
    }

    // Listener para o campo de mensagem de e-mail para o contador de caracteres.
    if (dashboardElements.emailMessage) {
        dashboardElements.emailMessage.addEventListener('input', () => {
            updateCharCounter(
                dashboardElements.emailMessage,
                dashboardElements.messageCounter,
                APP_CONFIG.VALIDATION.MAX_MESSAGE_LENGTH
            );
        });
    }

    // Listeners para os botões de seleção de produto na seção de pagamentos.
    dashboardElements.selectProductBtns.forEach(button => {
        button.addEventListener('click', selectProduct);
    });

    // Listener para a submissão do formulário de e-mail.
    if (dashboardElements.emailForm) {
        dashboardElements.emailForm.addEventListener('submit', handleEmailSubmit);
    }

    // Listener para a submissão do formulário de pagamento.
    if (dashboardElements.paymentForm) {
        dashboardElements.paymentForm.addEventListener('submit', handlePaymentSubmit);
    }

    // Listener para a submissão do formulário de contato.
    if (dashboardElements.contactForm) {
        dashboardElements.contactForm.addEventListener('submit', handleContactSubmit);
    }

    // Adiciona listener para redimensionamento da janela para ajustar a sidebar.
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && dashboardState.sidebarCollapsed) {
            expandSidebar();
        } else if (window.innerWidth <= 768 && !dashboardState.sidebarCollapsed) {
            collapseSidebar();
        }
    });
}

// ===================================================================
// 9. INICIALIZAÇÃO
// ===================================================================

/**
 * Função principal de inicialização da página do dashboard.
 * Chamada quando o DOM estiver completamente carregado.
 */
async function initDashboardPage() {
    console.log('🚀 Inicializando página do dashboard...');
    
    // Verifica se o usuário está autenticado. Se não estiver, redireciona para a página de login.
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) {
        console.log('🚫 Usuário não autenticado, redirecionando para login.');
        redirectToLogin('session_expired');
        return;
    }
    
    // Inicializa as referências aos elementos do DOM.
    initDashboardElements();
    
    // Adiciona todos os event listeners.
    addDashboardEventListeners();
    
    // Carrega os dados do perfil do usuário e atualiza a UI.
    await loadProfileData();
    
    // Exibe a seção inicial (Visão Geral).
    showSection('overview');
    
    // Verifica o status inicial do sistema.
    checkSystemStatus();
    
    console.log('✅ Página do dashboard inicializada.');
}

// ===================================================================
// 10. FUNÇÕES GLOBAIS (PARA USO EM HTML)
// ===================================================================

/**
 * Expõe funções para serem acessíveis diretamente do HTML (onclick, etc.).
 */
window.showSection = showSection;
window.refreshProfile = refreshProfile;
window.downloadProfileData = downloadProfileData;
window.confirmDeleteAccount = confirmDeleteAccount;
window.closeDeleteModal = closeDeleteModal;
window.clearEmailForm = clearEmailForm;
window.clearContactForm = clearContactForm;

// ===================================================================
// 11. INICIALIZAÇÃO AUTOMÁTICA
// ===================================================================

// Garante que a função de inicialização seja chamada quando o DOM estiver pronto.
onDOMContentLoaded(initDashboardPage);


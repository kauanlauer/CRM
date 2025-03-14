// scripts.js - Gerenciamento de interações do usuário

/**
 * Exibe uma notificação toast
 * @param {string} message - Mensagem a ser exibida
 * @param {string} title - Título da notificação
 * @param {string} type - Tipo de notificação (success, danger, warning, info)
 */
function showToast(message, title = 'Notificação', type = 'info') {
    const toast = document.getElementById('toast-notification');
    const toastTitle = document.getElementById('toast-title');
    const toastMessage = document.getElementById('toast-message');
    const toastTime = document.getElementById('toast-time');
    
    // Define os estilos com base no tipo
    toast.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-info', 'text-white');
    
    if (type === 'success') {
      toast.classList.add('bg-success', 'text-white');
    } else if (type === 'danger') {
      toast.classList.add('bg-danger', 'text-white');
    } else if (type === 'warning') {
      toast.classList.add('bg-warning');
    } else {
      toast.classList.add('bg-info', 'text-white');
    }
    
    // Define os conteúdos
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    toastTime.textContent = new Date().toLocaleTimeString();
    
    // Exibe o toast
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
  }
  
  /**
   * Formata um valor como moeda brasileira
   * @param {number} value - Valor a ser formatado
   * @returns {string} - Valor formatado como moeda
   */
  function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }
  
  /**
   * Formata uma data ISO para o formato brasileiro
   * @param {string} dateString - Data em formato ISO
   * @returns {string} - Data formatada (DD/MM/YYYY)
   */
  function formatDate(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  }
  
  /**
   * Calcula a diferença em dias entre duas datas
   * @param {Date} dateStart - Data inicial
   * @param {Date} dateEnd - Data final
   * @returns {number} - Número de dias entre as datas
   */
  function dateDiffInDays(dateStart, dateEnd) {
    const diffTime = Math.abs(dateEnd - dateStart);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  /**
   * Converte um status para um texto amigável
   * @param {string} status - Status (pendente, em_andamento, concluido, cancelado)
   * @returns {string} - Texto formatado
   */
  function formatStatus(status) {
    switch(status) {
      case 'pendente': return 'Pendente';
      case 'em_andamento': return 'Em andamento';
      case 'concluido': return 'Concluído';
      case 'cancelado': return 'Cancelado';
      default: return status || '-';
    }
  }
  
  /**
   * Retorna a classe CSS para o badge de status
   * @param {string} status - Status (pendente, em_andamento, concluido, cancelado)
   * @returns {string} - Classe CSS
   */
  function getStatusBadgeClass(status) {
    switch(status) {
      case 'pendente': return 'bg-info';
      case 'em_andamento': return 'bg-warning text-dark';
      case 'concluido': return 'bg-success';
      case 'cancelado': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }
  
  /**
   * Verifica se o formulário é válido
   * @param {HTMLFormElement} form - Formulário a ser validado
   * @returns {boolean} - Verdadeiro se válido
   */
  function validateForm(form) {
    // Adiciona a classe 'was-validated' para exibir os feedbacks de validação
    form.classList.add('was-validated');
    
    // Verifica se o formulário é válido
    return form.checkValidity();
  }
  
  export {
    showToast,
    formatCurrency,
    formatDate,
    dateDiffInDays,
    formatStatus,
    getStatusBadgeClass,
    validateForm
  };
// app.js - Gerenciamento da navegação e carregamento de conteúdo

import { supabase, getClientes, addCliente, createOrdemServico, getResumoFinanceiro } from './supabase.js';
import { showToast, formatCurrency, formatDate, dateDiffInDays, formatStatus, getStatusBadgeClass, validateForm } from './scripts.js';

// Quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
  // Elementos DOM
  const mainContent = document.getElementById('main-content-area');
  
  // Inicializa os componentes Bootstrap
  initBootstrapComponents();

  // Configura a navegação
  setupNavigation();
  
  // Carrega o dashboard por padrão
  loadSection('dashboard');
  
  // Funções auxiliares
  
  /**
   * Inicializa componentes Bootstrap que precisam ser inicializados manualmente
   */
  function initBootstrapComponents() {
    // Inicializar tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Inicializar popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
      return new bootstrap.Popover(popoverTriggerEl);
    });
  }
  
  /**
   * Configura os eventos de navegação
   */
  function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Remove active class de todos os links
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        
        // Adiciona active class ao link clicado
        this.classList.add('active');
        
        // Carrega o conteúdo da seção
        loadSection(this.id.replace('-link', ''));
      });
    });
  }

  /**
   * Carrega uma seção específica do aplicativo
   * @param {string} sectionName - Nome da seção a ser carregada
   */
  async function loadSection(sectionName) {
    // Mostra indicador de carregamento
    mainContent.innerHTML = `
      <div class="d-flex justify-content-center my-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Carregando...</span>
        </div>
      </div>
    `;
    
    try {
      switch(sectionName) {
        case 'dashboard':
          await loadDashboard();
          break;
        case 'clientes':
          await loadClientes();
          break;
        case 'servicos':
          await loadServicos();
          break;
        case 'ordens':
          await loadOrdens();
          break;
        case 'garantias':
          await loadGarantias();
          break;
        case 'financeiro':
          await loadFinanceiro();
          break;
        default:
          await loadDashboard();
      }
      
      // Reinicializa os componentes Bootstrap após carregar o conteúdo
      initBootstrapComponents();
      
    } catch (error) {
      console.error('Erro ao carregar seção:', error);
      mainContent.innerHTML = `
        <div class="alert alert-danger mt-4" role="alert">
          <h4 class="alert-heading">Erro!</h4>
          <p>Ocorreu um erro ao carregar esta seção. Por favor, tente novamente.</p>
          <hr>
          <p class="mb-0">Detalhes: ${error.message}</p>
        </div>
      `;
      
      // Mostra toast de erro
      showToast(`Erro ao carregar ${sectionName}: ${error.message}`, 'Erro', 'danger');
    }
  }

  // Carrega o Dashboard
  async function loadDashboard() {
    try {
      // Obter dados do dashboard: resumo financeiro, ordens recentes, etc.
      const dataAtual = new Date();
      const mesAtual = {
        mes: dataAtual.getMonth() + 1,
        ano: dataAtual.getFullYear()
      };
      
      const resumoFinanceiro = await getResumoFinanceiro(mesAtual);
      const { data: ordensRecentes, error: ordensError } = await supabase
        .from('ordens_servico')
        .select(`
          id,
          data_criacao,
          status,
          valor_total,
          clientes(nome),
          itens_ordem_servico(servico_id, servicos(nome))
        `)
        .order('data_criacao', { ascending: false })
        .limit(5);
      
      if (ordensError) throw ordensError;
      
      // Renderizar o conteúdo do dashboard
      mainContent.innerHTML = `
        <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
          <h1 class="h2">Dashboard</h1>
          <div class="btn-toolbar mb-2 mb-md-0">
            <div class="btn-group me-2">
              <button type="button" class="btn btn-sm btn-outline-secondary" id="btn-export-dashboard">
                <i class="fas fa-download"></i> Exportar
              </button>
            </div>
            <button type="button" class="btn btn-sm btn-outline-secondary dropdown-toggle">
              <i class="fas fa-calendar"></i> Este Mês
            </button>
          </div>
        </div>
        
        <!-- Stats Cards -->
        <div class="row mb-4">
          <div class="col-md-3">
            <div class="card card-stats card-receitas shadow-sm">
              <div class="card-body">
                <h5 class="card-title text-muted">Receitas do Mês</h5>
                <h3 class="mb-0">${formatCurrency(resumoFinanceiro ? resumoFinanceiro.receitas : 0)}</h3>
                <p class="card-text text-success">
                  <i class="fas fa-arrow-up"></i> Atualizado hoje
                </p>
              </div>
            </div>
          </div>
          
          <div class="col-md-3">
            <div class="card card-stats card-despesas shadow-sm">
              <div class="card-body">
                <h5 class="card-title text-muted">Despesas do Mês</h5>
                <h3 class="mb-0">${formatCurrency(resumoFinanceiro ? resumoFinanceiro.despesas : 0)}</h3>
                <p class="card-text text-danger">
                  <i class="fas fa-arrow-up"></i> Atualizado hoje
                </p>
              </div>
            </div>
          </div>
          
          <div class="col-md-3">
            <div class="card card-stats shadow-sm">
              <div class="card-body">
                <h5 class="card-title text-muted">Ordens Abertas</h5>
                <h3 class="mb-0" id="count-ordens-abertas">...</h3>
                <p class="card-text text-info">
                  <i class="fas fa-clipboard-list"></i> <span id="count-prazo-hoje">...</span> com prazo vencendo hoje
                </p>
              </div>
            </div>
          </div>
          
          <div class="col-md-3">
            <div class="card card-stats shadow-sm">
              <div class="card-body">
                <h5 class="card-title text-muted">Garantias Ativas</h5>
                <h3 class="mb-0" id="count-garantias-ativas">...</h3>
                <p class="card-text text-warning">
                  <i class="fas fa-exclamation-triangle"></i> <span id="count-garantias-vencendo">...</span> vencendo este mês
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Recent Orders Table -->
        <div class="card shadow-sm mb-4">
          <div class="card-header bg-white">
            <h5 class="mb-0">Ordens Recentes</h5>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-hover">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Cliente</th>
                    <th>Serviço</th>
                    <th>Data</th>
                    <th>Status</th>
                    <th>Valor</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody id="tabela-ordens-recentes">
                  ${gerarLinhasOrdens(ordensRecentes)}
                </tbody>
              </table>
            </div>
          </div>
          <div class="card-footer bg-white">
            <a href="#" class="btn btn-sm btn-outline-primary" id="ver-todas-ordens">Ver todas as ordens</a>
          </div>
        </div>
        
        <!-- Gráfico de Faturamento -->
        <div class="card shadow-sm mb-4">
          <div class="card-header bg-white">
            <h5 class="mb-0">Faturamento dos Últimos 6 Meses</h5>
          </div>
          <div class="card-body">
            <canvas id="grafico-faturamento" height="200"></canvas>
          </div>
        </div>
      `;
      
      // Carregar contadores
      carregarContadores();
      
      // Inicializar gráfico
      inicializarGraficoFaturamento();
      
      // Configurar evento para o botão "Ver todas as ordens"
      document.getElementById('ver-todas-ordens').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('ordens-link').click();
      });
      
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      mainContent.innerHTML = `
        <div class="alert alert-danger mt-4">
          Erro ao carregar o dashboard: ${error.message}
        </div>
      `;
      
      // Mostra toast de erro
      showToast(`Erro ao carregar dashboard: ${error.message}`, 'Erro', 'danger');
    }
  }

  // Função para gerar linhas da tabela de ordens
  function gerarLinhasOrdens(ordens) {
    if (!ordens || ordens.length === 0) {
      return `<tr><td colspan="7" class="text-center">Nenhuma ordem encontrada</td></tr>`;
    }
    
    return ordens.map(ordem => {
      // Obter o primeiro serviço da ordem (simplificação)
      const primeiroServico = ordem.itens_ordem_servico && ordem.itens_ordem_servico.length > 0 
        ? ordem.itens_ordem_servico[0].servicos.nome 
        : 'Serviço não especificado';
      
      return `
        <tr>
          <td>OS-${ordem.id.toString().padStart(6, '0')}</td>
          <td>${ordem.clientes ? ordem.clientes.nome : 'Cliente não especificado'}</td>
          <td>${primeiroServico}</td>
          <td>${formatDate(ordem.data_criacao)}</td>
          <td><span class="badge ${getStatusBadgeClass(ordem.status)}">${formatStatus(ordem.status)}</span></td>
          <td>${formatCurrency(ordem.valor_total || 0)}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary btn-view-ordem" data-id="${ordem.id}" data-bs-toggle="tooltip" title="Visualizar">
              <i class="fas fa-eye"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Função para gerar linhas da tabela de clientes
  function gerarLinhasClientes(clientes) {
    if (!clientes || clientes.length === 0) {
      return `<tr><td colspan="5" class="text-center">Nenhum cliente encontrado</td></tr>`;
    }
    
    return clientes.map(cliente => {
      return `
        <tr>
          <td>${cliente.nome}</td>
          <td>${cliente.email || '-'}</td>
          <td>${cliente.telefone || '-'}</td>
          <td>${formatDate(cliente.data_cadastro)}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary btn-view-cliente" data-id="${cliente.id}" data-bs-toggle="tooltip" title="Visualizar">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-sm btn-outline-success btn-edit-cliente" data-id="${cliente.id}" data-bs-toggle="tooltip" title="Editar">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger btn-delete-cliente" data-id="${cliente.id}" data-bs-toggle="tooltip" title="Excluir">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Carregar contadores do dashboard
  async function carregarContadores() {
    try {
      // Contar ordens abertas
      const { count: ordensAbertas, error: ordensError } = await supabase
        .from('ordens_servico')
        .select('*', { count: 'exact', head: true })
        .not('status', 'eq', 'concluido')
        .not('status', 'eq', 'cancelado');
      
      if (ordensError) throw ordensError;
      
      // Contar ordens com prazo vencendo hoje
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);
      
      const { count: ordensVencendoHoje, error: prazoError } = await supabase
        .from('ordens_servico')
        .select('*', { count: 'exact', head: true })
        .not('status', 'eq', 'concluido')
        .not('status', 'eq', 'cancelado')
        .gte('data_criacao', hoje.toISOString())
        .lt('data_criacao', amanha.toISOString());
      
      if (prazoError) throw prazoError;
      
      // Contar garantias ativas
      const { count: garantiasAtivas, error: garantiasError } = await supabase
        .from('ordens_servico')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'concluido')
        .gt('garantia_ate', hoje.toISOString());
      
      if (garantiasError) throw garantiasError;
      
      // Contar garantias vencendo este mês
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      
      const { count: garantiasVencendo, error: garantiasVencendoError } = await supabase
        .from('ordens_servico')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'concluido')
        .gte('garantia_ate', hoje.toISOString())
        .lte('garantia_ate', fimMes.toISOString());
      
      if (garantiasVencendoError) throw garantiasVencendoError;
      
      // Atualizar contadores na interface
      document.getElementById('count-ordens-abertas').textContent = ordensAbertas || 0;
      document.getElementById('count-prazo-hoje').textContent = ordensVencendoHoje || 0;
      document.getElementById('count-garantias-ativas').textContent = garantiasAtivas || 0;
      document.getElementById('count-garantias-vencendo').textContent = garantiasVencendo || 0;
      
    } catch (error) {
      console.error('Erro ao carregar contadores:', error);
      showToast('Erro ao carregar contadores do dashboard', 'Erro', 'warning');
    }
  }

// Inicializar gráfico de faturamento
async function inicializarGraficoFaturamento() {
    try {
      // Obter dados de faturamento dos últimos 6 meses
      const dataAtual = new Date();
      const dados = [];
      const labels = [];
      
      for (let i = 5; i >= 0; i--) {
        const mes = new Date(dataAtual.getFullYear(), dataAtual.getMonth() - i, 1);
        const inicioPeriodo = new Date(mes.getFullYear(), mes.getMonth(), 1).toISOString();
        const fimPeriodo = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).toISOString();
        
        // Obter receitas do mês
        const { data: receitas, error: receitasError } = await supabase
          .from('financeiro')
          .select('valor')
          .eq('tipo', 'receita')
          .gte('data', inicioPeriodo)
          .lte('data', fimPeriodo);
        
        if (receitasError) throw receitasError;
        
        // Somar valores
        const totalReceitas = receitas ? receitas.reduce((sum, item) => sum + (item.valor || 0), 0) : 0;
        
        // Formatar nome do mês
        const nomeMes = mes.toLocaleDateString('pt-BR', { month: 'short' });
        
        labels.push(nomeMes);
        dados.push(totalReceitas);
      }
      
      // Criar gráfico
      const ctx = document.getElementById('grafico-faturamento').getContext('2d');
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Faturamento (R$)',
            data: dados,
            backgroundColor: 'rgba(67, 97, 238, 0.7)',
            borderColor: 'rgba(67, 97, 238, 1)',
            borderWidth: 1
          }]
        },
        options: {
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return 'R$ ' + value.toFixed(2);
                }
              }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  return 'R$ ' + context.raw.toFixed(2);
                }
              }
            }
          }
        }
      });
      
    } catch (error) {
      console.error('Erro ao inicializar gráfico:', error);
      document.getElementById('grafico-faturamento').parentNode.innerHTML = `
        <div class="alert alert-warning">
          Não foi possível carregar o gráfico de faturamento.
        </div>
      `;
    }
  }
  
  // Função para carregar a página de clientes
  async function loadClientes() {
    try {
      // Obter lista de clientes
      const clientes = await getClientes();
      
      // Renderizar conteúdo
      mainContent.innerHTML = `
        <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
          <h1 class="h2">Clientes</h1>
          <div class="btn-toolbar mb-2 mb-md-0">
            <button type="button" class="btn btn-primary" id="btn-novo-cliente">
              <i class="fas fa-plus"></i> Novo Cliente
            </button>
          </div>
        </div>
        
        <!-- Filtro de busca -->
        <div class="card shadow-sm mb-4">
          <div class="card-body">
            <div class="row g-2">
              <div class="col-md-6">
                <input type="text" class="form-control" id="busca-cliente" placeholder="Buscar cliente...">
              </div>
              <div class="col-md-3">
                <button class="btn btn-outline-primary w-100" id="btn-buscar">
                  <i class="fas fa-search"></i> Buscar
                </button>
              </div>
              <div class="col-md-3">
                <button class="btn btn-outline-secondary w-100" id="btn-limpar-busca">
                  <i class="fas fa-times"></i> Limpar
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Tabela de clientes -->
        <div class="card shadow-sm">
          <div class="card-header bg-white">
            <h5 class="mb-0">Lista de Clientes</h5>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-hover">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Telefone</th>
                    <th>Data de Cadastro</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody id="tabela-clientes">
                  ${gerarLinhasClientes(clientes)}
                </tbody>
              </table>
            </div>
          </div>
          <div class="card-footer bg-white">
            <span class="text-muted">Total: ${clientes.length} cliente(s)</span>
          </div>
        </div>
        
        <!-- Modal de Novo Cliente -->
        <div class="modal fade" id="modalNovoCliente" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Novo Cliente</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <form id="form-novo-cliente">
                  <div class="mb-3">
                    <label for="nome" class="form-label">Nome *</label>
                    <input type="text" class="form-control" id="nome" required>
                  </div>
                  <div class="mb-3">
                    <label for="email" class="form-label">Email</label>
                    <input type="email" class="form-control" id="email">
                  </div>
                  <div class="mb-3">
                    <label for="telefone" class="form-label">Telefone</label>
                    <input type="text" class="form-control" id="telefone">
                  </div>
                  <div class="mb-3">
                    <label for="endereco" class="form-label">Endereço</label>
                    <textarea class="form-control" id="endereco" rows="2"></textarea>
                  </div>
                  <div class="mb-3">
                    <label for="observacoes" class="form-label">Observações</label>
                    <textarea class="form-control" id="observacoes" rows="3"></textarea>
                  </div>
                </form>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-primary" id="btn-salvar-cliente">Salvar</button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Inicializar o modal
      const modalNovoCliente = new bootstrap.Modal(document.getElementById('modalNovoCliente'));
      
      // Configurar eventos dos botões
      document.getElementById('btn-novo-cliente').addEventListener('click', () => {
        modalNovoCliente.show();
      });
      
      document.getElementById('btn-salvar-cliente').addEventListener('click', async () => {
        const nome = document.getElementById('nome').value.trim();
        const email = document.getElementById('email').value.trim();
        const telefone = document.getElementById('telefone').value.trim();
        const endereco = document.getElementById('endereco').value.trim();
        const observacoes = document.getElementById('observacoes').value.trim();
        
        if (!nome) {
          alert('Por favor, preencha o nome do cliente.');
          return;
        }
        
        try {
          const novoCliente = await addCliente({
            nome,
            email,
            telefone,
            endereco,
            observacoes
          });
          
          if (novoCliente) {
            modalNovoCliente.hide();
            showToast('Cliente adicionado com sucesso!', 'Sucesso', 'success');
            loadClientes(); // Recarregar a lista de clientes
          } else {
            alert('Erro ao adicionar cliente.');
          }
        } catch (error) {
          console.error('Erro ao salvar cliente:', error);
          alert('Erro ao adicionar cliente: ' + error.message);
        }
      });
      
      // Configurar eventos de busca
      document.getElementById('btn-buscar').addEventListener('click', async () => {
        const termoBusca = document.getElementById('busca-cliente').value.trim().toLowerCase();
        
        if (!termoBusca) {
          await loadClientes();
          return;
        }
        
        try {
          const { data, error } = await supabase
            .from('clientes')
            .select('*')
            .or(`nome.ilike.%${termoBusca}%,email.ilike.%${termoBusca}%,telefone.ilike.%${termoBusca}%`)
            .order('nome');
          
          if (error) throw error;
          
          document.getElementById('tabela-clientes').innerHTML = gerarLinhasClientes(data);
          document.querySelector('.card-footer .text-muted').textContent = `Total: ${data.length} cliente(s)`;
        } catch (error) {
          console.error('Erro ao buscar clientes:', error);
          showToast('Erro ao buscar clientes: ' + error.message, 'Erro', 'danger');
        }
      });
      
      document.getElementById('btn-limpar-busca').addEventListener('click', () => {
        document.getElementById('busca-cliente').value = '';
        loadClientes();
      });
      
      // Configurar eventos para botões de ação
      document.querySelectorAll('.btn-view-cliente').forEach(btn => {
        btn.addEventListener('click', async () => {
          const clienteId = btn.getAttribute('data-id');
          showToast(`Visualizando cliente ${clienteId}`, 'Info', 'info');
          // Aqui você implementaria a visualização detalhada do cliente
        });
      });
      
      document.querySelectorAll('.btn-edit-cliente').forEach(btn => {
        btn.addEventListener('click', async () => {
          const clienteId = btn.getAttribute('data-id');
          showToast(`Editando cliente ${clienteId}`, 'Info', 'info');
          // Aqui você implementaria a edição do cliente
        });
      });
      
      document.querySelectorAll('.btn-delete-cliente').forEach(btn => {
        btn.addEventListener('click', async () => {
          const clienteId = btn.getAttribute('data-id');
          if (confirm('Tem certeza que deseja excluir este cliente?')) {
            showToast(`Excluindo cliente ${clienteId}`, 'Info', 'warning');
            // Aqui você implementaria a exclusão do cliente
          }
        });
      });
      
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      mainContent.innerHTML = `
        <div class="alert alert-danger mt-4">
          Erro ao carregar os clientes: ${error.message}
        </div>
      `;
      showToast('Erro ao carregar clientes', 'Erro', 'danger');
    }
  }
  
  // Função para carregar a página de serviços
  async function loadServicos() {
    try {
      // Obter lista de serviços
      const { data: servicos, error } = await supabase
        .from('servicos')
        .select('*')
        .order('nome');
      
      if (error) throw error;
      
      // Renderizar conteúdo
      mainContent.innerHTML = `
        <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
          <h1 class="h2">Serviços</h1>
          <div class="btn-toolbar mb-2 mb-md-0">
            <button type="button" class="btn btn-primary" id="btn-novo-servico">
              <i class="fas fa-plus"></i> Novo Serviço
            </button>
          </div>
        </div>
        
        <!-- Tabela de serviços -->
        <div class="card shadow-sm">
          <div class="card-header bg-white">
            <h5 class="mb-0">Catálogo de Serviços</h5>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-hover">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Descrição</th>
                    <th>Preço Padrão</th>
                    <th>Garantia (dias)</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody id="tabela-servicos">
                  ${gerarLinhasServicos(servicos)}
                </tbody>
              </table>
            </div>
          </div>
          <div class="card-footer bg-white">
            <span class="text-muted">Total: ${servicos ? servicos.length : 0} serviço(s)</span>
          </div>
        </div>
      `;
      
      // Substitua o evento do botão "Novo Serviço" na função loadServicos() com este código:
document.getElementById('btn-novo-servico').addEventListener('click', () => {
  const modalNovoServico = new bootstrap.Modal(document.getElementById('modalNovoServico'));
  modalNovoServico.show();
});

      
      // Configurar eventos para botões de edição e exclusão
      document.querySelectorAll('.btn-edit-servico').forEach(btn => {
        btn.addEventListener('click', () => {
          const servicoId = btn.getAttribute('data-id');
          showToast(`Editando serviço ${servicoId}`, 'Info', 'info');
        });
      });
      
      document.querySelectorAll('.btn-delete-servico').forEach(btn => {
        btn.addEventListener('click', () => {
          const servicoId = btn.getAttribute('data-id');
          if (confirm('Tem certeza que deseja excluir este serviço?')) {
            showToast(`Excluindo serviço ${servicoId}`, 'Info', 'warning');
          }
        });
      });
      
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
      mainContent.innerHTML = `
        <div class="alert alert-danger mt-4">
          Erro ao carregar os serviços: ${error.message}
        </div>
      `;
      showToast('Erro ao carregar serviços', 'Erro', 'danger');
    }
  }
  
  // Função para gerar linhas da tabela de serviços
  function gerarLinhasServicos(servicos) {
    if (!servicos || servicos.length === 0) {
      return `<tr><td colspan="5" class="text-center">Nenhum serviço encontrado</td></tr>`;
    }
    
    return servicos.map(servico => {
      return `
        <tr>
          <td>${servico.nome}</td>
          <td>${servico.descricao || '-'}</td>
          <td>${formatCurrency(servico.preco_padrao || 0)}</td>
          <td>${servico.tempo_garantia_dias || 0}</td>
          <td>
            <button class="btn btn-sm btn-outline-success btn-edit-servico" data-id="${servico.id}" data-bs-toggle="tooltip" title="Editar">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger btn-delete-servico" data-id="${servico.id}" data-bs-toggle="tooltip" title="Excluir">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }
  
  // Função para carregar a página de ordens de serviço
  async function loadOrdens() {
    try {
      // Obter lista de ordens
      const { data: ordens, error } = await supabase
        .from('ordens_servico')
        .select(`
          id,
          data_criacao,
          data_conclusao,
          status,
          descricao_problema,
          solucao_aplicada,
          valor_total,
          forma_pagamento,
          garantia_ate,
          clientes(id, nome),
          itens_ordem_servico(servico_id, quantidade, valor_unitario, servicos(nome))
        `)
        .order('data_criacao', { ascending: false });
      
      if (error) throw error;
      
      // Renderizar conteúdo
      mainContent.innerHTML = `
        <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
          <h1 class="h2">Ordens de Serviço</h1>
          <div class="btn-toolbar mb-2 mb-md-0">
            <button type="button" class="btn btn-primary" id="btn-nova-ordem">
              <i class="fas fa-plus"></i> Nova Ordem
            </button>
          </div>
        </div>
        
        <!-- Filtros -->
        <div class="card shadow-sm mb-4">
          <div class="card-body">
            <div class="row g-2">
              <div class="col-md-3">
                <select class="form-select" id="filtro-status">
                  <option value="">Todos os status</option>
                  <option value="pendente">Pendente</option>
                  <option value="em_andamento">Em andamento</option>
                  <option value="concluido">Concluído</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div class="col-md-4">
                <input type="text" class="form-control" id="filtro-cliente" placeholder="Cliente...">
              </div>
              <div class="col-md-3">
                <input type="date" class="form-control" id="filtro-data">
              </div>
              <div class="col-md-2">
                <button class="btn btn-outline-primary w-100" id="btn-filtrar">
                  <i class="fas fa-filter"></i> Filtrar
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Tabela de ordens -->
        <div class="card shadow-sm">
          <div class="card-header bg-white">
            <h5 class="mb-0">Lista de Ordens de Serviço</h5>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-hover">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Cliente</th>
                    <th>Serviço(s)</th>
                    <th>Data</th>
                    <th>Status</th>
                    <th>Valor</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody id="tabela-ordens">
                  ${gerarLinhasOrdens(ordens)}
                </tbody>
              </table>
            </div>
          </div>
          <div class="card-footer bg-white">
            <span class="text-muted">Total: ${ordens ? ordens.length : 0} ordem(ns)</span>
          </div>
        </div>
      `;
      
      // Configurar evento para botão "Nova Ordem"
      document.getElementById('btn-nova-ordem').addEventListener('click', () => {
        showToast('Funcionalidade em desenvolvimento', 'Info', 'info');
      });
      
      // Configurar evento para o botão de filtrar
      document.getElementById('btn-filtrar').addEventListener('click', () => {
        const status = document.getElementById('filtro-status').value;
        const cliente = document.getElementById('filtro-cliente').value.trim();
        const data = document.getElementById('filtro-data').value;
        
        showToast(`Filtro aplicado: Status=${status}, Cliente=${cliente}, Data=${data}`, 'Info', 'info');
      });
      
      // Configurar eventos para botões de visualização
      document.querySelectorAll('.btn-view-ordem').forEach(btn => {
        btn.addEventListener('click', () => {
          const ordemId = btn.getAttribute('data-id');
          showToast(`Visualizando ordem ${ordemId}`, 'Info', 'info');
        });
      });
      
    } catch (error) {
      console.error('Erro ao carregar ordens:', error);
      mainContent.innerHTML = `
        <div class="alert alert-danger mt-4">
          Erro ao carregar as ordens de serviço: ${error.message}
        </div>
      `;
      showToast('Erro ao carregar ordens', 'Erro', 'danger');
    }
  }
  
  // Função para carregar a página de garantias
  async function loadGarantias() {
    try {
      // Obter lista de garantias ativas
      const hoje = new Date();
      const { data: garantias, error } = await supabase
        .from('ordens_servico')
        .select(`
          id,
          data_criacao,
          data_conclusao,
          garantia_ate,
          clientes(id, nome),
          itens_ordem_servico(servico_id, servicos(nome, tempo_garantia_dias))
        `)
        .eq('status', 'concluido')
        .gt('garantia_ate', hoje.toISOString())
        .order('garantia_ate', { ascending: true });
      
      if (error) throw error;
      
      // Renderizar conteúdo
      mainContent.innerHTML = `
        <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
          <h1 class="h2">Garantias</h1>
          <div class="btn-toolbar mb-2 mb-md-0">
            <div class="btn-group me-2">
              <button type="button" class="btn btn-sm btn-outline-secondary">
                <i class="fas fa-download"></i> Exportar
              </button>
            </div>
          </div>
        </div>
        
        <!-- Alerta de garantias próximas do vencimento -->
        <div class="alert alert-warning mb-4">
          <h5 class="alert-heading"><i class="fas fa-exclamation-triangle"></i> Garantias próximas do vencimento</h5>
          <p>Existem garantias que vencerão nos próximos 30 dias. Entre em contato com os clientes para verificar a satisfação com o serviço.</p>
        </div>
        
        <!-- Tabela de garantias -->
        <div class="card shadow-sm">
          <div class="card-header bg-white">
            <h5 class="mb-0">Garantias Ativas</h5>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-hover">
                <thead>
                  <tr>
                    <th>OS #</th>
                    <th>Cliente</th>
                    <th>Serviço</th>
                    <th>Data da Conclusão</th>
                    <th>Vencimento da Garantia</th>
                    <th>Dias Restantes</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody id="tabela-garantias">
                  ${gerarLinhasGarantias(garantias)}
                </tbody>
              </table>
            </div>
          </div>
          <div class="card-footer bg-white">
            <span class="text-muted">Total: ${garantias ? garantias.length : 0} garantia(s) ativa(s)</span>
          </div>
        </div>
      `;
      
    } catch (error) {
      console.error('Erro ao carregar garantias:', error);
      mainContent.innerHTML = `
        <div class="alert alert-danger mt-4">
          Erro ao carregar as garantias: ${error.message}
        </div>
      `;
      showToast('Erro ao carregar garantias', 'Erro', 'danger');
    }
  }
  
  // Função para gerar linhas da tabela de garantias
  function gerarLinhasGarantias(garantias) {
    if (!garantias || garantias.length === 0) {
      return `<tr><td colspan="7" class="text-center">Nenhuma garantia ativa encontrada</td></tr>`;
    }
    
    const hoje = new Date();
    
    return garantias.map(garantia => {
      const dataConclusao = garantia.data_conclusao ? new Date(garantia.data_conclusao) : null;
      const dataGarantia = garantia.garantia_ate ? new Date(garantia.garantia_ate) : null;
      
      // Calcular dias restantes
      const diasRestantes = dataGarantia ? dateDiffInDays(hoje, dataGarantia) : 0;
      
      // Definir classe de alerta com base nos dias restantes
      let classeAlerta = '';
      if (diasRestantes <= 7) {
        classeAlerta = 'bg-danger text-white';
      } else if (diasRestantes <= 30) {
        classeAlerta = 'bg-warning';
      }
      
      // Obter o primeiro serviço da ordem (simplificação)
      const primeiroServico = garantia.itens_ordem_servico && garantia.itens_ordem_servico.length > 0 
        ? garantia.itens_ordem_servico[0].servicos.nome 
        : 'Serviço não especificado';
      
      return `
        <tr class="${classeAlerta}">
          <td>OS-${garantia.id.toString().padStart(6, '0')}</td>
          <td>${garantia.clientes ? garantia.clientes.nome : 'Cliente não especificado'}</td>
          <td>${primeiroServico}</td>
          <td>${formatDate(garantia.data_conclusao)}</td>
          <td>${formatDate(garantia.garantia_ate)}</td>
          <td>${diasRestantes} dias</td>
          <td>
            <button class="btn btn-sm btn-outline-primary btn-view-garantia" data-id="${garantia.id}" data-bs-toggle="tooltip" title="Visualizar">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-sm btn-outline-success btn-acionar-garantia" data-id="${garantia.id}" data-bs-toggle="tooltip" title="Acionar Garantia">
              <i class="fas fa-tools"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }
  
  // Função para carregar a página financeira
  async function loadFinanceiro() {
    try {
      // Obter dados financeiros do mês atual
      const dataAtual = new Date();
      const mesAtual = {
        mes: dataAtual.getMonth() + 1,
        ano: dataAtual.getFullYear()
      };
      
      const resumoFinanceiro = await getResumoFinanceiro(mesAtual);
      
      // Obter histórico financeiro
      const inicio = new Date(dataAtual.getFullYear(), dataAtual.getMonth() - 2, 1).toISOString();
      const { data: historico, error } = await supabase
        .from('financeiro')
        .select(`
          id,
          data,
          tipo,
          categoria,
          descricao,
          valor,
          ordem_servico_id,
          ordens_servico(id, clientes(nome))
        `)
        .gte('data', inicio)
        .order('data', { ascending: false });
      
      if (error) throw error;
      
      // Renderizar conteúdo
      mainContent.innerHTML = `
        <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
          <h1 class="h2">Financeiro</h1>
          <div class="btn-toolbar mb-2 mb-md-0">
            <div class="btn-group me-2">
              <button type="button" class="btn btn-sm btn-outline-primary" id="btn-nova-receita">
                <i class="fas fa-plus"></i> Nova Receita
              </button>
              <button type="button" class="btn btn-sm btn-outline-danger" id="btn-nova-despesa">
                <i class="fas fa-minus"></i> Nova Despesa
              </button>
            </div>
            <button type="button" class="btn btn-sm btn-outline-secondary" id="btn-relatorio">
              <i class="fas fa-file-alt"></i> Relatórios
            </button>
          </div>
        </div>
        
        <!-- Resumo Financeiro -->
        <div class="row mb-4">
          <div class="col-md-4">
<div class="card card-stats card-receitas shadow-sm">
              <div class="card-body">
                <h5 class="card-title text-muted">Receitas do Mês</h5>
                <h3 class="mb-0">${formatCurrency(resumoFinanceiro ? resumoFinanceiro.receitas : 0)}</h3>
                <p class="card-text text-success">
                  <i class="fas fa-arrow-up"></i> Atualizado hoje
                </p>
              </div>
            </div>
          </div>
          
          <div class="col-md-4">
            <div class="card card-stats card-despesas shadow-sm">
              <div class="card-body">
                <h5 class="card-title text-muted">Despesas do Mês</h5>
                <h3 class="mb-0">${formatCurrency(resumoFinanceiro ? resumoFinanceiro.despesas : 0)}</h3>
                <p class="card-text text-danger">
                  <i class="fas fa-arrow-down"></i> Atualizado hoje
                </p>
              </div>
            </div>
          </div>
          
          <div class="col-md-4">
            <div class="card card-stats shadow-sm">
              <div class="card-body">
                <h5 class="card-title text-muted">Saldo do Mês</h5>
                <h3 class="mb-0">${formatCurrency(resumoFinanceiro ? resumoFinanceiro.saldo : 0)}</h3>
                <p class="card-text ${resumoFinanceiro && resumoFinanceiro.saldo >= 0 ? 'text-success' : 'text-danger'}">
                  <i class="fas ${resumoFinanceiro && resumoFinanceiro.saldo >= 0 ? 'fa-thumbs-up' : 'fa-thumbs-down'}"></i> Balanço mensal
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Gráfico de Receitas x Despesas -->
        <div class="card shadow-sm mb-4">
          <div class="card-header bg-white">
            <h5 class="mb-0">Receitas x Despesas (Últimos 6 meses)</h5>
          </div>
          <div class="card-body">
            <canvas id="grafico-financeiro" height="200"></canvas>
          </div>
        </div>
        
        <!-- Tabela de Movimentações -->
        <div class="card shadow-sm">
          <div class="card-header bg-white">
            <div class="d-flex justify-content-between align-items-center">
              <h5 class="mb-0">Últimas Movimentações</h5>
              <div class="btn-group">
                <button type="button" class="btn btn-sm btn-outline-secondary" id="btn-filtrar-todas">Todas</button>
                <button type="button" class="btn btn-sm btn-outline-success" id="btn-filtrar-receitas">Receitas</button>
                <button type="button" class="btn btn-sm btn-outline-danger" id="btn-filtrar-despesas">Despesas</button>
              </div>
            </div>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-hover">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Categoria</th>
                    <th>Descrição</th>
                    <th>Ordem/Cliente</th>
                    <th>Valor</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody id="tabela-financeiro">
                  ${gerarLinhasFinanceiro(historico)}
                </tbody>
              </table>
            </div>
          </div>
          <div class="card-footer bg-white">
            <span class="text-muted">Total: ${historico ? historico.length : 0} movimentação(ões)</span>
          </div>
        </div>
      `;
      
      // Inicializar gráfico
      inicializarGraficoFinanceiro();
      
      // Configurar eventos dos botões
      document.getElementById('btn-nova-receita').addEventListener('click', () => {
        showToast('Funcionalidade em desenvolvimento', 'Info', 'info');
      });
      
      document.getElementById('btn-nova-despesa').addEventListener('click', () => {
        showToast('Funcionalidade em desenvolvimento', 'Info', 'info');
      });
      
      document.getElementById('btn-relatorio').addEventListener('click', () => {
        showToast('Funcionalidade em desenvolvimento', 'Info', 'info');
      });
      
      // Configurar eventos de filtro
      document.getElementById('btn-filtrar-todas').addEventListener('click', () => {
        const linhas = document.querySelectorAll('#tabela-financeiro tr');
        linhas.forEach(linha => linha.style.display = '');
      });
      
      document.getElementById('btn-filtrar-receitas').addEventListener('click', () => {
        const linhas = document.querySelectorAll('#tabela-financeiro tr');
        linhas.forEach(linha => {
          const tipoCell = linha.querySelector('td:nth-child(2)');
          if (tipoCell && tipoCell.textContent.trim() === 'Receita') {
            linha.style.display = '';
          } else {
            linha.style.display = 'none';
          }
        });
      });
      
      document.getElementById('btn-filtrar-despesas').addEventListener('click', () => {
        const linhas = document.querySelectorAll('#tabela-financeiro tr');
        linhas.forEach(linha => {
          const tipoCell = linha.querySelector('td:nth-child(2)');
          if (tipoCell && tipoCell.textContent.trim() === 'Despesa') {
            linha.style.display = '';
          } else {
            linha.style.display = 'none';
          }
        });
      });
      
    } catch (error) {
      console.error('Erro ao carregar financeiro:', error);
      mainContent.innerHTML = `
        <div class="alert alert-danger mt-4">
          Erro ao carregar os dados financeiros: ${error.message}
        </div>
      `;
      showToast('Erro ao carregar dados financeiros', 'Erro', 'danger');
    }
  }

  // Função para gerar linhas da tabela financeira
  function gerarLinhasFinanceiro(movimentacoes) {
    if (!movimentacoes || movimentacoes.length === 0) {
      return `<tr><td colspan="7" class="text-center">Nenhuma movimentação encontrada</td></tr>`;
    }
    
    return movimentacoes.map(mov => {
      const data = new Date(mov.data);
      const dataFormatada = `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth()+1).toString().padStart(2, '0')}/${data.getFullYear()}`;
      
      // Definir classe com base no tipo
      const classeValor = mov.tipo === 'receita' ? 'text-success' : 'text-danger';
      const tipoFormatado = mov.tipo === 'receita' ? 'Receita' : 'Despesa';
      
      // Informações da ordem/cliente
      let ordemCliente = '-';
      if (mov.ordem_servico_id && mov.ordens_servico && mov.ordens_servico.clientes) {
        ordemCliente = `OS-${mov.ordem_servico_id.toString().padStart(6, '0')} / ${mov.ordens_servico.clientes.nome}`;
      }
      
      return `
        <tr>
          <td>${dataFormatada}</td>
          <td class="${classeValor}">${tipoFormatado}</td>
          <td>${mov.categoria || '-'}</td>
          <td>${mov.descricao || '-'}</td>
          <td>${ordemCliente}</td>
          <td class="${classeValor}">${formatCurrency(mov.valor || 0)}</td>
          <td>
            <button class="btn btn-sm btn-outline-secondary btn-view-movimentacao" data-id="${mov.id}" data-bs-toggle="tooltip" title="Visualizar">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-sm btn-outline-primary btn-edit-movimentacao" data-id="${mov.id}" data-bs-toggle="tooltip" title="Editar">
              <i class="fas fa-edit"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Inicializar gráfico financeiro
  async function inicializarGraficoFinanceiro() {
    try {
      // Obter dados financeiros dos últimos 6 meses
      const dataAtual = new Date();
      const dadosReceitas = [];
      const dadosDespesas = [];
      const labels = [];
      
      for (let i = 5; i >= 0; i--) {
        const mes = new Date(dataAtual.getFullYear(), dataAtual.getMonth() - i, 1);
        const inicioPeriodo = new Date(mes.getFullYear(), mes.getMonth(), 1).toISOString();
        const fimPeriodo = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).toISOString();
        
        // Obter receitas e despesas do mês
        const { data: receitas, error: receitasError } = await supabase
          .from('financeiro')
          .select('valor')
          .eq('tipo', 'receita')
          .gte('data', inicioPeriodo)
          .lte('data', fimPeriodo);
        
        const { data: despesas, error: despesasError } = await supabase
          .from('financeiro')
          .select('valor')
          .eq('tipo', 'despesa')
          .gte('data', inicioPeriodo)
          .lte('data', fimPeriodo);
        
        if (receitasError) throw receitasError;
        if (despesasError) throw despesasError;
        
        // Somar valores
        const totalReceitas = receitas ? receitas.reduce((sum, item) => sum + (item.valor || 0), 0) : 0;
        const totalDespesas = despesas ? despesas.reduce((sum, item) => sum + (item.valor || 0), 0) : 0;
        
        // Formatar nome do mês
        const nomeMes = mes.toLocaleDateString('pt-BR', { month: 'short' });
        
        labels.push(nomeMes);
        dadosReceitas.push(totalReceitas);
        dadosDespesas.push(totalDespesas);
      }
      
      // Criar gráfico
      const ctx = document.getElementById('grafico-financeiro').getContext('2d');
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Receitas (R$)',
              data: dadosReceitas,
              backgroundColor: 'rgba(76, 201, 240, 0.7)',
              borderColor: 'rgba(76, 201, 240, 1)',
              borderWidth: 1
            },
            {
              label: 'Despesas (R$)',
              data: dadosDespesas,
              backgroundColor: 'rgba(247, 37, 133, 0.7)',
              borderColor: 'rgba(247, 37, 133, 1)',
              borderWidth: 1
            }
          ]
        },
        options: {
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return 'R$ ' + value.toFixed(2);
                }
              }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  return 'R$ ' + context.raw.toFixed(2);
                }
              }
            }
          }
        }
      });
      
    } catch (error) {
      console.error('Erro ao inicializar gráfico financeiro:', error);
      document.getElementById('grafico-financeiro').parentNode.innerHTML = `
        <div class="alert alert-warning">
          Não foi possível carregar o gráfico financeiro.
        </div>
      `;
    }
  }
});
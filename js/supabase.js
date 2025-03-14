// Configuração inicial do Supabase
// Arquivo: js/supabase.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// Credenciais do Supabase
const supabaseUrl = 'https://rdhftnrksrawaahoqgpo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaGZ0bnJrc3Jhd2FhaG9xZ3BvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE5ODA3NDQsImV4cCI6MjA1NzU1Njc0NH0.v7ItKQTkx9TNGoPBIlsgcwYUQ3jA8PlY1SaIj6bH5qA'
const supabase = createClient(supabaseUrl, supabaseKey)

// Funções para manipulação de clientes
async function getClientes() {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('nome')
  
  if (error) {
    console.error('Erro ao buscar clientes:', error)
    return []
  }
  
  return data
}

async function addCliente(cliente) {
  const { data, error } = await supabase
    .from('clientes')
    .insert([
      { 
        nome: cliente.nome, 
        email: cliente.email,
        telefone: cliente.telefone,
        endereco: cliente.endereco,
        data_cadastro: new Date().toISOString(),
        observacoes: cliente.observacoes
      }
    ])
    .select()
  
  if (error) {
    console.error('Erro ao adicionar cliente:', error)
    return null
  }
  
  return data[0]
}

// Função para adicionar serviço - Movida para antes da exportação
async function addServico(servico) {
  const { data, error } = await supabase
    .from('servicos')
    .insert([
      { 
        nome: servico.nome,
        descricao: servico.descricao,
        preco_padrao: servico.preco_padrao,
        tempo_garantia_dias: servico.tempo_garantia_dias
      }
    ])
    .select();
  
  if (error) {
    console.error('Erro ao adicionar serviço:', error);
    return null;
  }
  
  return data[0];
}

// Funções para manipulação de ordens de serviço
async function createOrdemServico(ordem) {
  const { data, error } = await supabase
    .from('ordens_servico')
    .insert([
      {
        cliente_id: ordem.cliente_id,
        data_criacao: new Date().toISOString(),
        status: 'pendente',
        descricao_problema: ordem.descricao_problema,
        valor_total: ordem.valor_total
      }
    ])
    .select()
  
  if (error) {
    console.error('Erro ao criar ordem de serviço:', error)
    return null
  }
  
  // Adicionar itens da ordem
  if (ordem.itens && ordem.itens.length > 0) {
    const itens = ordem.itens.map(item => ({
      ordem_servico_id: data[0].id,
      servico_id: item.servico_id,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario,
      descricao_adicional: item.descricao_adicional
    }))
    
    const { error: itemError } = await supabase
      .from('itens_ordem_servico')
      .insert(itens)
    
    if (itemError) {
      console.error('Erro ao adicionar itens da ordem:', itemError)
    }
  }
  
  return data[0]
}

// Funções para manipulação de serviços
async function getServicos() {
  const { data, error } = await supabase
    .from('servicos')
    .select('*')
    .order('nome')
  
  if (error) {
    console.error('Erro ao buscar serviços:', error)
    return []
  }
  
  return data
}

async function updateServico(id, servico) {
  const { data, error } = await supabase
    .from('servicos')
    .update({
      nome: servico.nome,
      descricao: servico.descricao,
      preco_padrao: servico.preco_padrao,
      tempo_garantia_dias: servico.tempo_garantia_dias
    })
    .eq('id', id)
    .select()
  
  if (error) {
    console.error('Erro ao atualizar serviço:', error)
    return null
  }
  
  return data[0]
}

async function deleteServico(id) {
  const { error } = await supabase
    .from('servicos')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Erro ao excluir serviço:', error)
    return false
  }
  
  return true
}

// Funções para relatórios financeiros
async function getResumoFinanceiro(mesAno) {
  const inicio = new Date(mesAno.ano, mesAno.mes - 1, 1).toISOString()
  const fim = new Date(mesAno.ano, mesAno.mes, 0).toISOString()
  
  const { data, error } = await supabase
    .from('financeiro')
    .select('*')
    .gte('data', inicio)
    .lte('data', fim)
  
  if (error) {
    console.error('Erro ao buscar dados financeiros:', error)
    return null
  }
  
  const receitas = data
    .filter(item => item.tipo === 'receita')
    .reduce((sum, item) => sum + item.valor, 0)
  
  const despesas = data
    .filter(item => item.tipo === 'despesa')
    .reduce((sum, item) => sum + item.valor, 0)
  
  return {
    receitas,
    despesas,
    saldo: receitas - despesas,
    detalhes: data
  }
}

export {
  supabase,
  getClientes,
  addCliente,
  createOrdemServico,
  getResumoFinanceiro,
  addServico,
  getServicos,
  updateServico,
  deleteServico
};
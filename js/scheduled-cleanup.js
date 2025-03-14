// scheduled-cleanup.js - Script para limpeza automática de usuários expirados
// Este script pode ser executado como uma função de borda do Supabase ou como uma tarefa agendada em um servidor

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rdhftnrksrawaahoqgpo.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaGZ0bnJrc3Jhd2FhaG9xZ3BvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE5ODA3NDQsImV4cCI6MjA1NzU1Njc0NH0.v7ItKQTkx9TNGoPBIlsgcwYUQ3jA8PlY1SaIj6bH5qA'; // Substitua pela chave de serviço do Supabase

// Função principal para limpar usuários expirados
async function cleanupExpiredUsers() {
  // Inicializar cliente Supabase com a chave de serviço para acesso completo
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  try {
    console.log('Iniciando limpeza de usuários expirados...');
    
    const currentDate = new Date().toISOString();
    
    // Primeiro, vamos obter os usuários expirados para logs
    const { data: expiredUsers, error: fetchError } = await supabase
      .from('usuarios')
      .select('id, username, nome_completo, data_expiracao')
      .eq('is_temporario', true)
      .lt('data_expiracao', currentDate);
    
    if (fetchError) {
      throw new Error(`Erro ao buscar usuários expirados: ${fetchError.message}`);
    }
    
    if (!expiredUsers || expiredUsers.length === 0) {
      console.log('Nenhum usuário expirado encontrado.');
      return {
        status: 'success',
        message: 'Nenhum usuário expirado encontrado.'
      };
    }
    
    // Log de usuários que serão removidos
    console.log(`Encontrados ${expiredUsers.length} usuários expirados:`);
    expiredUsers.forEach(user => {
      console.log(`- ${user.username} (${user.nome_completo}), expirado em ${new Date(user.data_expiracao).toLocaleString()}`);
    });
    
    // Extrair IDs para exclusão
    const expiredIds = expiredUsers.map(user => user.id);
    
    // Excluir usuários expirados
    const { error: deleteError } = await supabase
      .from('usuarios')
      .delete()
      .in('id', expiredIds);
    
    if (deleteError) {
      throw new Error(`Erro ao excluir usuários expirados: ${deleteError.message}`);
    }
    
    console.log(`${expiredUsers.length} usuários expirados foram removidos com sucesso.`);
    
    return {
      status: 'success',
      message: `${expiredUsers.length} usuários expirados foram removidos com sucesso.`,
      removedUsers: expiredUsers.map(u => u.username)
    };
  } catch (error) {
    console.error('Erro durante a limpeza de usuários expirados:', error);
    
    return {
      status: 'error',
      message: `Erro durante a limpeza: ${error.message}`
    };
  }
}

// Para executar como uma função independente
if (require.main === module) {
  cleanupExpiredUsers()
    .then(result => {
      console.log('Resultado da limpeza:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Erro fatal:', error);
      process.exit(1);
    });
}

// Exportar para uso em outros contextos, como funções de borda do Supabase
module.exports = cleanupExpiredUsers;
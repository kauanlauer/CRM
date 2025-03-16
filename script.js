// Inicialização do Supabase
const supabaseUrl = 'https://kngcohputrawfkexcsmz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuZ2NvaHB1dHJhd2ZrZXhjc216Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwOTQ1ODMsImV4cCI6MjA1NzY3MDU4M30.MT3gfizwHeWR7IsaDdfxFTlrkG5HrpwpWQlPnGUTozs';

// Corrigir a inicialização do cliente Supabase
let supabase;
if (window.supabase) {
    supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
} else if (window.supabaseJs) {
    supabase = window.supabaseJs.createClient(supabaseUrl, supabaseKey);
} else {
    console.error('Biblioteca Supabase não encontrada!');
}

// Variáveis globais
let currentUser = null;
let clients = [];
let services = [];
let orders = [];
let users = [];
const itemsPerPage = 10;
let currentClientsPage = 1;
let currentServicesPage = 1;
let currentOrdersPage = 1;
let currentTransactionsPage = 1;

// Elementos DOM
const loginPage = document.getElementById("login-page");
const dashboardPage = document.getElementById("dashboard-page");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const registerModal = document.getElementById("register-modal");
const registerLink = document.getElementById("register-link");
const closeRegister = document.getElementById("close-register");
const logoutBtn = document.getElementById("logout-btn");
const userName = document.getElementById("user-name");
const userAvatar = document.getElementById("user-avatar");
const sidebar = document.getElementById("sidebar");
const toggleMenu = document.getElementById("toggle-menu");
const overlay = document.getElementById("overlay");
const menuLinks = document.querySelectorAll(".sidebar-menu a");
const pages = document.querySelectorAll(".page");
const loading = document.querySelector(".loading");
const adminOnlyElements = document.querySelectorAll(".admin-only");

// Elementos de Dashboard
const totalClientsElement = document.getElementById("total-clients");
const totalServicesElement = document.getElementById("total-services");
const pendingOrdersElement = document.getElementById("pending-orders");
const totalRevenueElement = document.getElementById("total-revenue");
const recentOrdersTable = document.getElementById("recent-orders");

// Elementos de Cliente
const clientsTable = document.getElementById("clients-list");
const addClientBtn = document.getElementById("add-client-btn");
const clientModal = document.getElementById("client-modal");
const closeClient = document.getElementById("close-client");
const clientForm = document.getElementById("client-form");
const clientSearch = document.getElementById("client-search");
const clientsPagination = document.getElementById("clients-pagination");

// Elementos de Serviço
const servicesTable = document.getElementById("services-list");
const addServiceBtn = document.getElementById("add-service-btn");
const serviceModal = document.getElementById("service-modal");
const closeService = document.getElementById("close-service");
const serviceForm = document.getElementById("service-form");
const serviceSearch = document.getElementById("service-search");
const servicesPagination = document.getElementById("services-pagination");

// Elementos de Ordem de Serviço
const ordersTable = document.getElementById("orders-list");
const addOrderBtn = document.getElementById("add-order-btn");
const orderModal = document.getElementById("order-modal");
const closeOrder = document.getElementById("close-order");
const orderForm = document.getElementById("order-form");
const orderClientSelect = document.getElementById("order-client");
const orderServiceSelect = document.getElementById("order-service");
const orderSearch = document.getElementById("order-search");
const ordersPagination = document.getElementById("orders-pagination");
const viewOrderModal = document.getElementById("view-order-modal");
const closeViewOrder = document.getElementById("close-view-order");

// Elementos Financeiros
const totalIncomeElement = document.getElementById("total-income");
const monthlyIncomeElement = document.getElementById("monthly-income");
const pendingPaymentsElement = document.getElementById("pending-payments");
const transactionsTable = document.getElementById("transactions-list");
const transactionsPagination = document.getElementById(
  "transactions-pagination"
);

// Elementos de Usuário
const usersTable = document.getElementById("users-list");
const addUserBtn = document.getElementById("add-user-btn");
const userModal = document.getElementById("user-modal");
const closeUser = document.getElementById("close-user");
const userForm = document.getElementById("user-form");

// Funções de utilidade
function showLoading() {
  loading.style.display = "flex";
}

function hideLoading() {
  loading.style.display = "none";
}

function showAlert(elementId, message, type = "danger") {
  const alert = document.getElementById(elementId);
  alert.textContent = message;
  alert.className = `alert alert-${type}`;
  alert.style.display = "block";

  // Auto hide after 5 seconds
  setTimeout(() => {
    alert.style.display = "none";
  }, 5000);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getStatusBadge(status) {
  switch (status) {
    case "pending":
      return '<span class="badge badge-pending">Pendente</span>';
    case "in-progress":
      return '<span class="badge badge-in-progress">Em andamento</span>';
    case "completed":
      return '<span class="badge badge-completed">Concluído</span>';
    default:
      return status;
  }
}

function getStatusText(status) {
  switch (status) {
    case "pending":
      return "Pendente";
    case "in-progress":
      return "Em andamento";
    case "completed":
      return "Concluído";
    default:
      return status;
  }
}

function getRoleText(role) {
  return role === "admin" ? "Administrador" : "Usuário";
}

function isAdmin() {
  return (
    currentUser &&
    currentUser.user_metadata &&
    currentUser.user_metadata.role === "admin"
  );
}

// Função para criar as tabelas no Supabase (executada apenas uma vez)
async function createTables() {
  try {
    // Criar tabela de clientes
    await supabase.rpc("create_clients_table_if_not_exists");

    // Criar tabela de serviços
    await supabase.rpc("create_services_table_if_not_exists");

    // Criar tabela de ordens de serviço
    await supabase.rpc("create_orders_table_if_not_exists");

    console.log("Tabelas criadas ou já existentes!");
  } catch (error) {
    console.error("Erro ao criar tabelas:", error);
  }
}

// Funções de Autenticação
async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  showLoading();
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) throw error;

    currentUser = data.user;

    // Verificar se é o primeiro login e definir como admin se for
if (!currentUser.user_metadata || !currentUser.user_metadata.role) {
    // Verificar se há outros usuários na tabela users
    const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('count');
    
    let role = 'user';
    if (!usersError && (!usersData || usersData.length === 0)) {
        role = 'admin';
    }
    
    // Atualizar metadados do usuário
    await supabase.auth.updateUser({
        data: { role: role }
    });
    
    currentUser.user_metadata = { role: role };
}

    showDashboard();
  } catch (error) {
    showAlert("login-alert", "Erro ao fazer login: " + error.message);
  } finally {
    hideLoading();
  }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    if (password.length < 6) {
        showAlert('register-alert', 'A senha deve ter pelo menos 6 caracteres');
        return;
    }
    
    showLoading();
    try {
        // Email kauanlauer@gmail.com sempre será admin
        const isAdmin = email.toLowerCase() === 'kauanlauer@gmail.com';
        
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    name: name,
                    role: isAdmin ? 'admin' : 'user'
                }
            }
        });
        
        if (error) throw error;
        
        registerModal.style.display = 'none';
        showAlert('login-alert', 'Conta criada com sucesso! Faça login para continuar.', 'success');
        document.getElementById('register-form').reset();
    } catch (error) {
        showAlert('register-alert', 'Erro ao criar conta: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function handleLogout() {
  showLoading();
  try {
    await supabase.auth.signOut();
    currentUser = null;
    loginPage.style.display = "block";
    dashboardPage.style.display = "none";
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
  } finally {
    hideLoading();
  }
}

// Funções de Dashboard
async function showDashboard() {
  if (!currentUser) return;

  // Atualizar UI para o usuário logado
  loginPage.style.display = "none";
  dashboardPage.style.display = "block";

  userName.textContent = currentUser.user_metadata?.name || currentUser.email;
  userAvatar.textContent = (
    currentUser.user_metadata?.name?.charAt(0) || currentUser.email.charAt(0)
  ).toUpperCase();

  // Verificar permissões de admin
  if (isAdmin()) {
    adminOnlyElements.forEach((el) => (el.style.display = "block"));
  } else {
    adminOnlyElements.forEach((el) => (el.style.display = "none"));
  }

  // Carregar dados do dashboard
  await loadDashboardData();

  // Mostrar página ativa
  showActivePage("dashboard");
}

async function loadDashboardData() {
  showLoading();
  try {
    // Carregar clientes
    await loadClients();

    // Carregar serviços
    await loadServices();

    // Carregar ordens de serviço
    await loadOrders();

    // Atualizar estatísticas
    updateStats();

    // Carregar ordens recentes
    loadRecentOrders();
  } catch (error) {
    console.error("Erro ao carregar dados do dashboard:", error);
  } finally {
    hideLoading();
  }
}

function updateStats() {
  // Atualizar contadores
  totalClientsElement.textContent = clients.length;
  totalServicesElement.textContent = services.length;

  // Calcular ordens pendentes
  const pendingOrders = orders.filter(
    (order) => order.status !== "completed"
  ).length;
  pendingOrdersElement.textContent = pendingOrders;

  // Calcular receita total
  const totalRevenue = orders
    .filter((order) => order.status === "completed")
    .reduce((sum, order) => sum + order.price, 0);
  totalRevenueElement.textContent = formatCurrency(totalRevenue);

  // Atualizar estatísticas financeiras
  totalIncomeElement.textContent = formatCurrency(totalRevenue);

  // Calcular receita mensal
  const currentDate = new Date();
  const startOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );

  const monthlyRevenue = orders
    .filter(
      (order) =>
        order.status === "completed" &&
        new Date(order.created_at) >= startOfMonth
    )
    .reduce((sum, order) => sum + order.price, 0);
  monthlyIncomeElement.textContent = formatCurrency(monthlyRevenue);

  // Calcular pagamentos pendentes
  const pendingPayments = orders
    .filter((order) => order.status !== "completed")
    .reduce((sum, order) => sum + order.price, 0);
  pendingPaymentsElement.textContent = formatCurrency(pendingPayments);
}

function loadRecentOrders() {
  // Limpar tabela
  recentOrdersTable.innerHTML = "";

  // Pegar as 5 ordens mais recentes
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  if (recentOrders.length === 0) {
    recentOrdersTable.innerHTML =
      '<tr><td colspan="5" class="text-center">Nenhuma ordem de serviço encontrada</td></tr>';
    return;
  }

  recentOrders.forEach((order) => {
    const client = clients.find((c) => c.id === order.client_id) || {
      name: "Cliente Desconhecido",
    };
    const service = services.find((s) => s.id === order.service_id) || {
      name: "Serviço Desconhecido",
    };

    const row = document.createElement("tr");
    row.innerHTML = `
                  <td>${order.id}</td>
                  <td>${client.name}</td>
                  <td>${service.name}</td>
                  <td>${getStatusBadge(order.status)}</td>
                  <td>${formatDate(order.created_at)}</td>
              `;

    recentOrdersTable.appendChild(row);
  });
}

// Funções de Cliente
async function loadClients() {
  try {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("name");

    if (error) throw error;

    clients = data || [];

    renderClientsTable();
  } catch (error) {
    console.error("Erro ao carregar clientes:", error);
  }
}

function renderClientsTable(searchTerm = "") {
  // Filtrar clientes
  let filteredClients = clients;
  if (searchTerm) {
    searchTerm = searchTerm.toLowerCase();
    filteredClients = clients.filter(
      (client) =>
        client.name.toLowerCase().includes(searchTerm) ||
        client.email.toLowerCase().includes(searchTerm) ||
        client.phone.toLowerCase().includes(searchTerm)
    );
  }

  // Limpar tabela
  clientsTable.innerHTML = "";

  if (filteredClients.length === 0) {
    clientsTable.innerHTML =
      '<tr><td colspan="5" class="text-center">Nenhum cliente encontrado</td></tr>';
    clientsPagination.innerHTML = "";
    return;
  }

  // Paginação
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const start = (currentClientsPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedClients = filteredClients.slice(start, end);

  // Renderizar clientes
  paginatedClients.forEach((client) => {
    const row = document.createElement("tr");
    row.innerHTML = `
                  <td>${client.name}</td>
                  <td>${client.email}</td>
                  <td>${client.phone}</td>
                  <td>${client.address}</td>
                  <td class="actions">
                      <button class="btn btn-sm btn-primary edit-client" data-id="${client.id}">Editar</button>
                      <button class="btn btn-sm btn-danger delete-client" data-id="${client.id}">Excluir</button>
                  </td>
              `;

    clientsTable.appendChild(row);
  });

  // Configurar paginação
  renderPagination(
    clientsPagination,
    totalPages,
    currentClientsPage,
    "clients"
  );

  // Adicionar event listeners para os botões
  document.querySelectorAll(".edit-client").forEach((button) => {
    button.addEventListener("click", (e) => editClient(e.target.dataset.id));
  });

  document.querySelectorAll(".delete-client").forEach((button) => {
    button.addEventListener("click", (e) => deleteClient(e.target.dataset.id));
  });
}

function renderPagination(container, totalPages, currentPage, type) {
  // Limpar container de paginação
  container.innerHTML = "";

  if (totalPages <= 1) return;

  // Botão anterior
  const prevButton = document.createElement("button");
  prevButton.textContent = "Anterior";
  prevButton.disabled = currentPage === 1;
  prevButton.addEventListener("click", () =>
    handlePageChange(type, currentPage - 1)
  );
  container.appendChild(prevButton);

  // Botões numerados
  for (let i = 1; i <= totalPages; i++) {
    const pageButton = document.createElement("button");
    pageButton.textContent = i;
    pageButton.classList.toggle("active", i === currentPage);
    pageButton.addEventListener("click", () => handlePageChange(type, i));
    container.appendChild(pageButton);
  }

  // Botão próximo
  const nextButton = document.createElement("button");
  nextButton.textContent = "Próximo";
  nextButton.disabled = currentPage === totalPages;
  nextButton.addEventListener("click", () =>
    handlePageChange(type, currentPage + 1)
  );
  container.appendChild(nextButton);
}

function handlePageChange(type, page) {
  switch (type) {
    case "clients":
      currentClientsPage = page;
      renderClientsTable(clientSearch.value);
      break;
    case "services":
      currentServicesPage = page;
      renderServicesTable(serviceSearch.value);
      break;
    case "orders":
      currentOrdersPage = page;
      renderOrdersTable(orderSearch.value);
      break;
    case "transactions":
      currentTransactionsPage = page;
      renderTransactionsTable();
      break;
  }
}

function showClientModal(isEdit = false) {
  document.getElementById("client-modal-title").textContent = isEdit
    ? "Editar Cliente"
    : "Adicionar Cliente";
  clientModal.style.display = "block";
}

function editClient(clientId) {
  const client = clients.find((c) => c.id === clientId);
  if (!client) return;

  document.getElementById("client-id").value = client.id;
  document.getElementById("client-name").value = client.name;
  document.getElementById("client-email").value = client.email;
  document.getElementById("client-phone").value = client.phone;
  document.getElementById("client-address").value = client.address;

  showClientModal(true);
}

async function deleteClient(clientId) {
  if (
    !confirm(
      "Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita."
    )
  ) {
    return;
  }

  showLoading();
  try {
    // Verificar se há ordens de serviço para este cliente
    const hasOrders = orders.some((order) => order.client_id === clientId);

    if (hasOrders) {
      alert(
        "Não é possível excluir este cliente pois existem ordens de serviço associadas a ele."
      );
      return;
    }

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", clientId);

    if (error) throw error;

    // Atualizar lista de clientes
    await loadClients();

    // Atualizar estatísticas
    updateStats();
  } catch (error) {
    console.error("Erro ao excluir cliente:", error);
    alert("Erro ao excluir cliente: " + error.message);
  } finally {
    hideLoading();
  }
}

async function handleClientForm(e) {
    e.preventDefault();
  
    const clientId = document.getElementById("client-id").value;
    const name = document.getElementById("client-name").value;
    const email = document.getElementById("client-email").value || ""; // Usa string vazia se for nulo
    const phone = document.getElementById("client-phone").value || "";
    const address = document.getElementById("client-address").value || "";
    
    // Validar apenas o nome do cliente
    if (!name.trim()) {
      alert("O nome do cliente é obrigatório!");
      return;
    }
  
    const clientData = {
      name,
      email,
      phone,
      address,
    };

  showLoading();
  try {
    let result;

    if (clientId) {
      // Editar cliente existente
      result = await supabase
        .from("clients")
        .update(clientData)
        .eq("id", clientId);
    } else {
      // Criar novo cliente
      result = await supabase.from("clients").insert([clientData]);
    }

    if (result.error) throw result.error;

    // Fechar modal e limpar formulário
    clientModal.style.display = "none";
    clientForm.reset();
    document.getElementById("client-id").value = "";

    // Atualizar lista de clientes
    await loadClients();

    // Atualizar estatísticas
    updateStats();
  } catch (error) {
    console.error("Erro ao salvar cliente:", error);
    alert("Erro ao salvar cliente: " + error.message);
  } finally {
    hideLoading();
  }
}

// Funções de Serviço
async function loadServices() {
  try {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("name");

    if (error) throw error;

    services = data || [];

    renderServicesTable();
  } catch (error) {
    console.error("Erro ao carregar serviços:", error);
  }
}

function renderServicesTable(searchTerm = "") {
  // Filtrar serviços
  let filteredServices = services;
  if (searchTerm) {
    searchTerm = searchTerm.toLowerCase();
    filteredServices = services.filter(
      (service) =>
        service.name.toLowerCase().includes(searchTerm) ||
        service.description.toLowerCase().includes(searchTerm)
    );
  }

  // Limpar tabela
  servicesTable.innerHTML = "";

  if (filteredServices.length === 0) {
    servicesTable.innerHTML =
      '<tr><td colspan="5" class="text-center">Nenhum serviço encontrado</td></tr>';
    servicesPagination.innerHTML = "";
    return;
  }

  // Paginação
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
  const start = (currentServicesPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedServices = filteredServices.slice(start, end);

  // Renderizar serviços
  paginatedServices.forEach((service) => {
    const row = document.createElement("tr");
    row.innerHTML = `
                  <td>${service.name}</td>
                  <td>${service.description}</td>
                  <td>${formatCurrency(service.price)}</td>
                  <td>${service.warranty}</td>
                  <td class="actions">
                      <button class="btn btn-sm btn-primary edit-service" data-id="${
                        service.id
                      }">Editar</button>
                      <button class="btn btn-sm btn-danger delete-service" data-id="${
                        service.id
                      }">Excluir</button>
                  </td>
              `;

    servicesTable.appendChild(row);
  });

  // Configurar paginação
  renderPagination(
    servicesPagination,
    totalPages,
    currentServicesPage,
    "services"
  );

  // Adicionar event listeners para os botões
  document.querySelectorAll(".edit-service").forEach((button) => {
    button.addEventListener("click", (e) => editService(e.target.dataset.id));
  });

  document.querySelectorAll(".delete-service").forEach((button) => {
    button.addEventListener("click", (e) => deleteService(e.target.dataset.id));
  });
}

function showServiceModal(isEdit = false) {
  document.getElementById("service-modal-title").textContent = isEdit
    ? "Editar Serviço"
    : "Adicionar Serviço";
  serviceModal.style.display = "block";
}

function editService(serviceId) {
  const service = services.find((s) => s.id === serviceId);
  if (!service) return;

  document.getElementById("service-id").value = service.id;
  document.getElementById("service-name").value = service.name;
  document.getElementById("service-description").value = service.description;
  document.getElementById("service-price").value = service.price;
  document.getElementById("service-warranty").value = service.warranty;

  showServiceModal(true);
}

async function deleteService(serviceId) {
  if (
    !confirm(
      "Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita."
    )
  ) {
    return;
  }

  showLoading();
  try {
    // Verificar se há ordens de serviço para este serviço
    const hasOrders = orders.some((order) => order.service_id === serviceId);

    if (hasOrders) {
      alert(
        "Não é possível excluir este serviço pois existem ordens de serviço associadas a ele."
      );
      return;
    }

    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", serviceId);

    if (error) throw error;

    // Atualizar lista de serviços
    await loadServices();

    // Atualizar estatísticas
    updateStats();
  } catch (error) {
    console.error("Erro ao excluir serviço:", error);
    alert("Erro ao excluir serviço: " + error.message);
  } finally {
    hideLoading();
  }
}

async function handleServiceForm(e) {
  e.preventDefault();

  const serviceId = document.getElementById("service-id").value;
  const name = document.getElementById("service-name").value;
  const description = document.getElementById("service-description").value;
  const price = parseFloat(document.getElementById("service-price").value);
  const warranty = parseInt(document.getElementById("service-warranty").value);

  const serviceData = {
    name,
    description,
    price,
    warranty,
  };

  showLoading();
  try {
    let result;

    if (serviceId) {
      // Editar serviço existente
      result = await supabase
        .from("services")
        .update(serviceData)
        .eq("id", serviceId);
    } else {
      // Criar novo serviço
      result = await supabase.from("services").insert([serviceData]);
    }

    if (result.error) throw result.error;

    // Fechar modal e limpar formulário
    serviceModal.style.display = "none";
    serviceForm.reset();
    document.getElementById("service-id").value = "";

    // Atualizar lista de serviços
    await loadServices();

    // Atualizar estatísticas
    updateStats();
  } catch (error) {
    console.error("Erro ao salvar serviço:", error);
    alert("Erro ao salvar serviço: " + error.message);
  } finally {
    hideLoading();
  }
}

// Funções de Ordem de Serviço
async function loadOrders() {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    orders = data || [];

    renderOrdersTable();
    renderTransactionsTable();
  } catch (error) {
    console.error("Erro ao carregar ordens de serviço:", error);
  }
}

function renderOrdersTable(searchTerm = "") {
  // Filtrar ordens
  let filteredOrders = orders;
  if (searchTerm) {
    searchTerm = searchTerm.toLowerCase();
    filteredOrders = orders.filter((order) => {
      const client = clients.find((c) => c.id === order.client_id);
      const service = services.find((s) => s.id === order.service_id);

      return (
        (client && client.name.toLowerCase().includes(searchTerm)) ||
        (service && service.name.toLowerCase().includes(searchTerm)) ||
        order.description.toLowerCase().includes(searchTerm) ||
        order.id.toString().includes(searchTerm)
      );
    });
  }

  // Limpar tabela
  ordersTable.innerHTML = "";

  if (filteredOrders.length === 0) {
    ordersTable.innerHTML =
      '<tr><td colspan="7" class="text-center">Nenhuma ordem de serviço encontrada</td></tr>';
    ordersPagination.innerHTML = "";
    return;
  }

  // Paginação
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const start = (currentOrdersPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedOrders = filteredOrders.slice(start, end);

  // Renderizar ordens
  paginatedOrders.forEach((order) => {
    const client = clients.find((c) => c.id === order.client_id) || {
      name: "Cliente Desconhecido",
    };
    const service = services.find((s) => s.id === order.service_id) || {
      name: "Serviço Desconhecido",
    };

    const row = document.createElement("tr");
    row.innerHTML = `
                  <td>${order.id}</td>
                  <td>${client.name}</td>
                  <td>${service.name}</td>
                  <td>${getStatusBadge(order.status)}</td>
                  <td>${formatDate(order.created_at)}</td>
                  <td>${formatCurrency(order.price)}</td>
                  <td class="actions">
                      <button class="btn btn-sm btn-primary view-order" data-id="${
                        order.id
                      }">Ver</button>
                      <button class="btn btn-sm btn-primary edit-order" data-id="${
                        order.id
                      }">Editar</button>
                      <button class="btn btn-sm btn-danger delete-order" data-id="${
                        order.id
                      }">Excluir</button>
                  </td>
              `;

    ordersTable.appendChild(row);
  });

  // Configurar paginação
  renderPagination(ordersPagination, totalPages, currentOrdersPage, "orders");

  // Adicionar event listeners para os botões
  document.querySelectorAll(".view-order").forEach((button) => {
    button.addEventListener("click", (e) => viewOrder(e.target.dataset.id));
  });

  document.querySelectorAll(".edit-order").forEach((button) => {
    button.addEventListener("click", (e) => editOrder(e.target.dataset.id));
  });

  document.querySelectorAll(".delete-order").forEach((button) => {
    button.addEventListener("click", (e) => deleteOrder(e.target.dataset.id));
  });
}

function renderTransactionsTable() {
  // Limpar tabela
  transactionsTable.innerHTML = "";

  if (orders.length === 0) {
    transactionsTable.innerHTML =
      '<tr><td colspan="5" class="text-center">Nenhuma transação encontrada</td></tr>';
    transactionsPagination.innerHTML = "";
    return;
  }

  // Paginação
  const totalPages = Math.ceil(orders.length / itemsPerPage);
  const start = (currentTransactionsPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedTransactions = orders.slice(start, end);

  // Renderizar transações
  paginatedTransactions.forEach((order) => {
    const client = clients.find((c) => c.id === order.client_id) || {
      name: "Cliente Desconhecido",
    };

    const row = document.createElement("tr");
    row.innerHTML = `
                  <td>${order.id}</td>
                  <td>${client.name}</td>
                  <td>${formatCurrency(order.price)}</td>
                  <td>${getStatusBadge(order.status)}</td>
                  <td>${formatDate(order.created_at)}</td>
              `;

    transactionsTable.appendChild(row);
  });

  // Configurar paginação
  renderPagination(
    transactionsPagination,
    totalPages,
    currentTransactionsPage,
    "transactions"
  );
}

function populateOrderForm() {
  // Limpar select de clientes
  orderClientSelect.innerHTML =
    '<option value="">Selecione um cliente</option>';
  clients.forEach((client) => {
    const option = document.createElement("option");
    option.value = client.id;
    option.textContent = client.name;
    orderClientSelect.appendChild(option);
  });

  // Limpar select de serviços
  orderServiceSelect.innerHTML =
    '<option value="">Selecione um serviço</option>';
  services.forEach((service) => {
    const option = document.createElement("option");
    option.value = service.id;
    option.textContent = service.name;
    orderServiceSelect.appendChild(option);
  });
}

function showOrderModal(isEdit = false) {
  document.getElementById("order-modal-title").textContent = isEdit
    ? "Editar Ordem de Serviço"
    : "Nova Ordem de Serviço";
  populateOrderForm();
  orderModal.style.display = "block";
}

function viewOrder(orderId) {
  const order = orders.find((o) => o.id === orderId);
  if (!order) return;

  const client = clients.find((c) => c.id === order.client_id) || {
    name: "Cliente Desconhecido",
  };
  const service = services.find((s) => s.id === order.service_id) || {
    name: "Serviço Desconhecido",
  };

  // Calcular data de garantia
  let warrantyDate = "";
  if (order.status === "completed" && service.warranty > 0) {
    const date = new Date(order.updated_at || order.created_at);
    date.setDate(date.getDate() + service.warranty);
    warrantyDate = formatDate(date);
  } else {
    warrantyDate = "N/A";
  }

  // Preencher modal de visualização
  document.getElementById("view-order-client").textContent = client.name;
  document.getElementById("view-order-service").textContent = service.name;
  document.getElementById("view-order-description").textContent =
    order.description;
  document.getElementById("view-order-status").textContent = getStatusText(
    order.status
  );
  document.getElementById("view-order-date").textContent = formatDate(
    order.created_at
  );
  document.getElementById("view-order-price").textContent = formatCurrency(
    order.price
  );
  document.getElementById("view-order-warranty").textContent = warrantyDate;

  viewOrderModal.style.display = "block";
}

function editOrder(orderId) {
  const order = orders.find((o) => o.id === orderId);
  if (!order) return;

  document.getElementById("order-id").value = order.id;

  showOrderModal(true);

  // Aguardar o preenchimento dos selects
  setTimeout(() => {
    document.getElementById("order-client").value = order.client_id;
    document.getElementById("order-service").value = order.service_id;
    document.getElementById("order-description").value = order.description;
    document.getElementById("order-status").value = order.status;
  }, 100);
}

async function deleteOrder(orderId) {
  if (
    !confirm(
      "Tem certeza que deseja excluir esta ordem de serviço? Esta ação não pode ser desfeita."
    )
  ) {
    return;
  }

  showLoading();
  try {
    const { error } = await supabase.from("orders").delete().eq("id", orderId);

    if (error) throw error;

    // Atualizar lista de ordens
    await loadOrders();

    // Atualizar estatísticas
    updateStats();

    // Atualizar ordens recentes
    loadRecentOrders();
  } catch (error) {
    console.error("Erro ao excluir ordem de serviço:", error);
    alert("Erro ao excluir ordem de serviço: " + error.message);
  } finally {
    hideLoading();
  }
}

async function handleOrderForm(e) {
  e.preventDefault();

  const orderId = document.getElementById("order-id").value;
  const clientId = document.getElementById("order-client").value;
  const serviceId = document.getElementById("order-service").value;
  const description = document.getElementById("order-description").value;
  const status = document.getElementById("order-status").value;

  // Obter o preço do serviço
  const service = services.find((s) => s.id === serviceId);
  if (!service) {
    alert("Serviço inválido. Por favor, selecione um serviço.");
    return;
  }

  const orderData = {
    client_id: clientId,
    service_id: serviceId,
    description,
    status,
    price: service.price,
  };

  if (!orderId) {
    // Nova ordem, incluir data de criação
    orderData.created_at = new Date().toISOString();
  } else {
    // Ordem existente, incluir data de atualização
    orderData.updated_at = new Date().toISOString();
  }

  showLoading();
  try {
    let result;

    if (orderId) {
      // Editar ordem existente
      result = await supabase
        .from("orders")
        .update(orderData)
        .eq("id", orderId);
    } else {
      // Criar nova ordem
      result = await supabase.from("orders").insert([orderData]);
    }

    if (result.error) throw result.error;

    // Fechar modal e limpar formulário
    orderModal.style.display = "none";
    orderForm.reset();
    document.getElementById("order-id").value = "";

    // Atualizar lista de ordens
    await loadOrders();

    // Atualizar estatísticas
    updateStats();

    // Atualizar ordens recentes
    loadRecentOrders();
  } catch (error) {
    console.error("Erro ao salvar ordem de serviço:", error);
    alert("Erro ao salvar ordem de serviço: " + error.message);
  } finally {
    hideLoading();
  }
}

// Funções de Usuário
async function loadUsers() {
  try {
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) throw error;

    users = data || [];

    renderUsersTable();
  } catch (error) {
    console.error("Erro ao carregar usuários:", error);
  }
}

function renderUsersTable() {
  // Limpar tabela
  usersTable.innerHTML = "";

  if (users.length === 0) {
    usersTable.innerHTML =
      '<tr><td colspan="4" class="text-center">Nenhum usuário encontrado</td></tr>';
    return;
  }

  // Renderizar usuários
  users.forEach((user) => {
    const row = document.createElement("tr");
    const role = user.user_metadata?.role || "user";

    row.innerHTML = `
                  <td>${user.user_metadata?.name || "Sem nome"}</td>
                  <td>${user.email}</td>
                  <td>${getRoleText(role)}</td>
                  <td class="actions">
                      <button class="btn btn-sm btn-primary edit-user" data-id="${
                        user.id
                      }">Editar</button>
                      ${
                        user.id !== currentUser.id
                          ? `<button class="btn btn-sm btn-danger delete-user" data-id="${user.id}">Excluir</button>`
                          : ""
                      }
                  </td>
              `;

    usersTable.appendChild(row);
  });

  // Adicionar event listeners para os botões
  document.querySelectorAll(".edit-user").forEach((button) => {
    button.addEventListener("click", (e) => editUser(e.target.dataset.id));
  });

  document.querySelectorAll(".delete-user").forEach((button) => {
    button.addEventListener("click", (e) => deleteUser(e.target.dataset.id));
  });
}

function showUserModal(isEdit = false) {
  document.getElementById("user-modal-title").textContent = isEdit
    ? "Editar Usuário"
    : "Adicionar Usuário";
  userModal.style.display = "block";
}

function editUser(userId) {
  const user = users.find((u) => u.id === userId);
  if (!user) return;

  document.getElementById("user-id").value = user.id;
  document.getElementById("user-name").value = user.user_metadata?.name || "";
  document.getElementById("user-email").value = user.email;
  document.getElementById("user-password").value = "";
  document.getElementById("user-role").value =
    user.user_metadata?.role || "user";

  showUserModal(true);
}

async function deleteUser(userId) {
  if (
    !confirm(
      "Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita."
    )
  ) {
    return;
  }

  showLoading();
  try {
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) throw error;

    // Atualizar lista de usuários
    await loadUsers();
  } catch (error) {
    console.error("Erro ao excluir usuário:", error);
    alert("Erro ao excluir usuário: " + error.message);
  } finally {
    hideLoading();
  }
}

async function handleUserForm(e) {
  e.preventDefault();

  const userId = document.getElementById("user-id").value;
  const name = document.getElementById("user-name").value;
  const email = document.getElementById("user-email").value;
  const password = document.getElementById("user-password").value;
  const role = document.getElementById("user-role").value;

  showLoading();
  try {
    if (userId) {
      // Atualizar usuário existente
      const userData = {
        email,
        user_metadata: { name, role },
      };

      if (password) {
        userData.password = password;
      }

      const { error } = await supabase.auth.admin.updateUserById(
        userId,
        userData
      );

      if (error) throw error;
    } else {
      // Criar novo usuário
      const { error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role },
      });

      if (error) throw error;
    }

    // Fechar modal e limpar formulário
    userModal.style.display = "none";
    userForm.reset();
    document.getElementById("user-id").value = "";

    // Atualizar lista de usuários
    await loadUsers();
  } catch (error) {
    console.error("Erro ao salvar usuário:", error);
    alert("Erro ao salvar usuário: " + error.message);
  } finally {
    hideLoading();
  }
}

// Navegação
function showActivePage(pageId) {
  // Remover classe active de todas as páginas e links
  pages.forEach((page) => page.classList.remove("active"));
  menuLinks.forEach((link) => link.classList.remove("active"));

  // Adicionar classe active à página e link corretos
  document.getElementById(pageId).classList.add("active");
  document.querySelector(`[data-page="${pageId}"]`).classList.add("active");

  // No mobile, fechar o menu lateral
  if (window.innerWidth <= 768) {
    sidebar.classList.remove("active");
    overlay.style.display = "none";
  }
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  // Verificar sessão existente
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      if (session) {
        currentUser = session.user;
        showDashboard();
      }
    } else if (event === "SIGNED_OUT") {
      loginPage.style.display = "block";
      dashboardPage.style.display = "none";
    }
  });

  // Inicializar tabelas no Supabase
  createTables();

  // Login
  loginForm.addEventListener("submit", handleLogin);

  // Registro
  registerLink.addEventListener("click", (e) => {
    e.preventDefault();
    registerModal.style.display = "block";
  });

  closeRegister.addEventListener("click", () => {
    registerModal.style.display = "none";
    document.getElementById("register-alert").style.display = "none";
  });

  registerForm.addEventListener("submit", handleRegister);

  // Logout
  logoutBtn.addEventListener("click", handleLogout);

  // Navegação
  menuLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const pageId = e.target.closest("a").dataset.page;
      showActivePage(pageId);

      // Carregar dados específicos da página
      if (pageId === "clients") {
        loadClients();
      } else if (pageId === "services") {
        loadServices();
      } else if (pageId === "orders") {
        loadOrders();
      } else if (pageId === "users") {
        loadUsers();
      }
    });
  });

  // Mobile menu
  toggleMenu.addEventListener("click", () => {
    sidebar.classList.toggle("active");
    overlay.style.display = sidebar.classList.contains("active")
      ? "block"
      : "none";
  });

  overlay.addEventListener("click", () => {
    sidebar.classList.remove("active");
    overlay.style.display = "none";
  });

  // Cliente
  addClientBtn.addEventListener("click", () => {
    document.getElementById("client-form").reset();
    document.getElementById("client-id").value = "";
    showClientModal();
  });

  closeClient.addEventListener("click", () => {
    clientModal.style.display = "none";
  });

  clientForm.addEventListener("submit", handleClientForm);

  clientSearch.addEventListener("input", () => {
    currentClientsPage = 1;
    renderClientsTable(clientSearch.value);
  });

  // Serviço
  addServiceBtn.addEventListener("click", () => {
    document.getElementById("service-form").reset();
    document.getElementById("service-id").value = "";
    showServiceModal();
  });

  closeService.addEventListener("click", () => {
    serviceModal.style.display = "none";
  });

  serviceForm.addEventListener("submit", handleServiceForm);

  serviceSearch.addEventListener("input", () => {
    currentServicesPage = 1;
    renderServicesTable(serviceSearch.value);
  });

  // Ordem de Serviço
  addOrderBtn.addEventListener("click", () => {
    document.getElementById("order-form").reset();
    document.getElementById("order-id").value = "";
    showOrderModal();
  });

  closeOrder.addEventListener("click", () => {
    orderModal.style.display = "none";
  });

  orderForm.addEventListener("submit", handleOrderForm);

  orderSearch.addEventListener("input", () => {
    currentOrdersPage = 1;
    renderOrdersTable(orderSearch.value);
  });

  closeViewOrder.addEventListener("click", () => {
    viewOrderModal.style.display = "none";
  });

  // Usuário
  addUserBtn.addEventListener("click", () => {
    document.getElementById("user-form").reset();
    document.getElementById("user-id").value = "";
    showUserModal();
  });

  closeUser.addEventListener("click", () => {
    userModal.style.display = "none";
  });

  userForm.addEventListener("submit", handleUserForm);

  // Fechar modais ao clicar fora
  window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) {
      e.target.style.display = "none";
    }
  });
});


async function makeCurrentUserAdmin() {
    try {
        // Atualizar metadados do usuário para admin
        const { data, error } = await supabase.auth.updateUser({
            data: { role: 'admin' }
        });
        
        if (error) {
            throw error;
        }
        
        // Atualizar o usuário atual no navegador
        currentUser.user_metadata = currentUser.user_metadata || {};
        currentUser.user_metadata.role = 'admin';
        
        // Atualizar a UI imediatamente
        adminOnlyElements.forEach(el => el.style.display = 'block');
        
        alert('Você agora é administrador! As alterações foram aplicadas.');
        
        // Confirmar no console
        console.log('Usuário definido como admin:', currentUser);
        
    } catch (error) {
        console.error('Erro ao definir como admin:', error);
        alert('Erro ao definir como admin: ' + error.message);
    }
}
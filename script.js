// Inicialização do Supabase
const supabaseUrl = "https://kngcohputrawfkexcsmz.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuZ2NvaHB1dHJhd2ZrZXhjc216Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwOTQ1ODMsImV4cCI6MjA1NzY3MDU4M30.MT3gfizwHeWR7IsaDdfxFTlrkG5HrpwpWQlPnGUTozs";

// Corrigir a inicialização do cliente Supabase
let supabase;
if (window.supabase) {
  supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
} else if (window.supabaseJs) {
  supabase = window.supabaseJs.createClient(supabaseUrl, supabaseKey);
} else {
  console.error("Biblioteca Supabase não encontrada!");
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
      case "canceled":  // Corrigido de "Cancelado" para "canceled" para corresponder ao value da option
        return '<span class="badge badge-canceled">Cancelado</span>';
      case "completed":  // Corrigido para corresponder ao value da option
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
      case "cancelado":
      return "Cancelado";
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
        .from("users")
        .select("count");

      let role = "user";
      if (!usersError && (!usersData || usersData.length === 0)) {
        role = "admin";
      }

      // Atualizar metadados do usuário
      await supabase.auth.updateUser({
        data: { role: role },
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

  const name = document.getElementById("register-name").value;
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;

  if (password.length < 6) {
    showAlert("register-alert", "A senha deve ter pelo menos 6 caracteres");
    return;
  }

  showLoading();
  try {
    // Email kauanlauer@gmail.com sempre será admin
    const isAdmin = email.toLowerCase() === "kauanlauer@gmail.com";

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          name: name,
          role: isAdmin ? "admin" : "user",
        },
      },
    });

    if (error) throw error;

    registerModal.style.display = "none";
    showAlert(
      "login-alert",
      "Conta criada com sucesso! Faça login para continuar.",
      "success"
    );
    document.getElementById("register-form").reset();
  } catch (error) {
    showAlert("register-alert", "Erro ao criar conta: " + error.message);
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

  await initNotificationSystem();
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
    button.addEventListener("click", (e) =>
      viewOrder(e.currentTarget.dataset.id)
    );
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

// Add event listener for service selection to set default price
orderServiceSelect.addEventListener("change", function () {
  const serviceId = this.value;
  if (serviceId) {
    const service = services.find((s) => s.id === serviceId);
    if (service) {
      // Only set default price if the price field is empty or 0
      const priceField = document.getElementById("order-price");
      if (!priceField.value || parseFloat(priceField.value) === 0) {
        priceField.value = service.price;
      }
    }
  }
});

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
    document.getElementById("order-price").value = order.price; // Add this line
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

  // Usar o preço inserido manualmente em vez do preço do serviço
  const price = parseFloat(document.getElementById("order-price").value) || 0;

  // Verificar se o serviço existe
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
    price, // Usar o preço inserido manualmente
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
    // Em vez de usar supabase.auth.admin.listUsers(), vamos buscar da tabela profile
    const { data, error } = await supabase
      .from("profile")
      .select("*")
      .order("name");

    if (error) throw error;

    users = data || [];

    renderUsersTable();
  } catch (error) {
    console.error("Erro ao carregar usuários:", error);
    showAlert("Erro ao carregar usuários: " + error.message, "danger");
  }
}

// Função para editar usuário
function editUser(userId) {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
  
    document.getElementById("user-id").value = user.id;
    document.getElementById("user-name").value = user.name || "";
    document.getElementById("user-email").value = user.email || "";
    document.getElementById("user-password").value = ""; // Sempre em branco por segurança
    document.getElementById("user-role").value = user.role || "user";
  
    showUserModal(true);
  }
  
  // Função para excluir usuário
  async function deleteUser(userId) {
    if (!confirm("Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.")) {
      return;
    }
  
    showLoading();
    try {
      // Excluir da tabela profile em vez de usar auth.admin.deleteUser
      const { error } = await supabase
        .from('profile')
        .delete()
        .eq('id', userId);
  
      if (error) throw error;
  
      // Atualizar lista de usuários
      await loadUsers();
      showAlert("Usuário excluído com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      showAlert("Erro ao excluir usuário: " + error.message, "danger");
    } finally {
      hideLoading();
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
      const role = user.role || "user";
  
      row.innerHTML = `
        <td>${user.name || "Sem nome"}</td>
        <td>${user.email || "Sem email"}</td>
        <td>${getRoleText(role)}</td>
        <td class="actions">
          <button class="btn btn-sm btn-primary edit-user" data-id="${user.id}">Editar</button>
          ${user.id !== currentUser.id
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

// Função para salvar usuário
async function handleUserForm(e) {
    e.preventDefault();
  
    const userId = document.getElementById("user-id").value;
    const name = document.getElementById("user-name").value;
    const email = document.getElementById("user-email").value;
    const password = document.getElementById("user-password").value;
    const role = document.getElementById("user-role").value;
  
    // Validação básica
    if (!name || !email) {
      showAlert("Nome e email são obrigatórios!", "danger");
      return;
    }
  
    // Se for um novo usuário, senha é obrigatória
    if (!userId && !password) {
      showAlert("Senha é obrigatória para novos usuários!", "danger");
      return;
    }
  
    showLoading();
    try {
      let result;
  
      if (userId) {
        // Editar usuário existente na tabela profile
        result = await supabase
          .from('profile')
          .update({
            name,
            email,
            role
          })
          .eq('id', userId);
        
        // Se a senha foi fornecida, implementar lógica para atualizar senha
        // Isso geralmente requer uma função serverless ou endpoint de API separado
        if (password) {
          // Aqui você precisa implementar lógica para atualizar a senha do usuário
          // Como não podemos usar admin.updateUserById, isso precisaria ser feito via
          // uma função no backend ou seguindo o fluxo de "esqueci minha senha"
          console.log("Atualização de senha requer implementação adicional no backend");
        }
      } else {
        // Criar novo usuário na tabela profile
        // Idealmente, o registro do usuário deveria ser feito via autenticação do Supabase
        // e então os metadados do usuário salvos em profile
        
        // Gerar um UUID para o novo usuário
        const newUserId = self.crypto.randomUUID();
        
        result = await supabase
          .from('profile')
          .insert([{
            id: newUserId,
            name,
            email,
            role,
            created_at: new Date().toISOString()
          }]);
          
        // Para registro de autenticação completo, é recomendado usar o fluxo de convite
        // ou um endpoint serverless dedicado para criar usuários com autenticação
      }
  
      if (result.error) throw result.error;
  
      // Fechar modal e limpar formulário
      userModal.style.display = "none";
      userForm.reset();
      document.getElementById("user-id").value = "";
  
      // Atualizar lista de usuários
      await loadUsers();
      showAlert("Usuário salvo com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao salvar usuário:", error);
      showAlert("Erro ao salvar usuário: " + error.message, "danger");
    } finally {
      hideLoading();
    }
  }

  
// Função para criar a tabela profile no Supabase caso não exista
async function createProfileTable() {
    try {
      // Executar uma função RPC que criará a tabela se não existir
      await supabase.rpc("create_profile_table_if_not_exists");
      console.log("Tabela profile criada ou já existente!");
    } catch (error) {
      console.error("Erro ao criar tabela profile:", error);
    }
  }
  
  // Adicionar à função createTables
  async function createTables() {
    try {
      // Criar tabela de clientes
      await supabase.rpc("create_clients_table_if_not_exists");
  
      // Criar tabela de serviços
      await supabase.rpc("create_services_table_if_not_exists");
  
      // Criar tabela de ordens de serviço
      await supabase.rpc("create_orders_table_if_not_exists");
      
      // Criar tabela de perfil de usuários
      await createProfileTable();
  
      console.log("Tabelas criadas ou já existentes!");
    } catch (error) {
      console.error("Erro ao criar tabelas:", error);
    }
  }
  
  // Função auxiliar para verificar se o usuário atual existe na tabela profile
// e criar seu registro caso não exista
async function ensureUserProfileExists() {
    if (!currentUser) return;
    
    try {
      // Verificar se o usuário já existe na tabela profile
      const { data, error } = await supabase
        .from('profile')
        .select('id')
        .eq('id', currentUser.id)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        // PGRST116 é o erro para "não encontrado", outros erros devem ser tratados
        throw error;
      }
      
      // Se o usuário não existir na tabela profile, criar
      if (!data) {
        const { error: insertError } = await supabase
          .from('profile')
          .insert([{
            id: currentUser.id,
            name: currentUser.user_metadata?.name || currentUser.email,
            email: currentUser.email,
            role: currentUser.user_metadata?.role || 'user',
            created_at: new Date().toISOString()
          }]);
          
        if (insertError) throw insertError;
        console.log("Perfil de usuário criado com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao verificar/criar perfil do usuário:", error);
    }
  }
  
  // Adicionar chamada à função ensureUserProfileExists dentro de showDashboard
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
    
    // Garantir que o perfil do usuário existe
    await ensureUserProfileExists();
  
    // Carregar dados do dashboard
    await loadDashboardData();
  
    // Mostrar página ativa
    showActivePage("dashboard");
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
      data: { role: "admin" },
    });

    if (error) {
      throw error;
    }

    // Atualizar o usuário atual no navegador
    currentUser.user_metadata = currentUser.user_metadata || {};
    currentUser.user_metadata.role = "admin";

    // Atualizar a UI imediatamente
    adminOnlyElements.forEach((el) => (el.style.display = "block"));

    alert("Você agora é administrador! As alterações foram aplicadas.");

    // Confirmar no console
    console.log("Usuário definido como admin:", currentUser);
  } catch (error) {
    console.error("Erro ao definir como admin:", error);
    alert("Erro ao definir como admin: " + error.message);
  }
}


// Função para controlar o modo escuro
function setupDarkMode() {
    // Verificar se há uma preferência salva no localStorage
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    // Criar e adicionar o toggle de tema ao header
    const userInfo = document.querySelector('.user-info');
    
    // Criar o wrapper do switch
    const themeSwitch = document.createElement('div');
    themeSwitch.className = 'theme-switch-wrapper';
    
    // Criar o label e o input
    const switchLabel = document.createElement('label');
    switchLabel.className = 'theme-switch';
    
    const switchInput = document.createElement('input');
    switchInput.type = 'checkbox';
    switchInput.id = 'theme-switch';
    switchInput.checked = currentTheme === 'dark';
    
    const slider = document.createElement('span');
    slider.className = 'slider';
    
    // Montar a estrutura do switch
    switchLabel.appendChild(switchInput);
    switchLabel.appendChild(slider);
    themeSwitch.appendChild(switchLabel);
    
    // Criar o ícone
    const themeIcon = document.createElement('i');
    themeIcon.className = currentTheme === 'dark' 
      ? 'fas fa-moon theme-icon' 
      : 'fas fa-sun theme-icon';
    themeSwitch.appendChild(themeIcon);
    
    // Inserir antes do botão de logout
    userInfo.insertBefore(themeSwitch, document.getElementById('logout-btn'));
    
    // Adicionar event listener para o switch
    switchInput.addEventListener('change', function() {
      if (this.checked) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        themeIcon.className = 'fas fa-moon theme-icon';
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
        themeIcon.className = 'fas fa-sun theme-icon';
      }
    });
  }
  
  // Adicionar a função setupDarkMode nos Event Listeners
  document.addEventListener("DOMContentLoaded", () => {
    // Verificar sessão existente
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (session) {
          currentUser = session.user;
          showDashboard();
          
          // Configurar modo escuro após o login
          setupDarkMode();
        }
      } else if (event === "SIGNED_OUT") {
        loginPage.style.display = "block";
        dashboardPage.style.display = "none";
      }
    });
  
  // Solicitar permissão para notificações do navegador
  requestNotificationPermission();
  });
  
  // Verificar preferências do sistema do usuário
  function checkSystemPreference() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      
      // Se o switch já existe, atualizá-lo
      const switchInput = document.getElementById('theme-switch');
      if (switchInput) switchInput.checked = true;
      
      const themeIcon = document.querySelector('.theme-icon');
      if (themeIcon) themeIcon.className = 'fas fa-moon theme-icon';
    }
  }
  
  // Executar no carregamento inicial se não houver preferência salva
  if (!localStorage.getItem('theme')) {
    checkSystemPreference();
  }
  
  // Adicionar listener para mudanças na preferência do sistema
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('theme')) {
      const newTheme = e.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      
      // Se o switch já existe, atualizá-lo
      const switchInput = document.getElementById('theme-switch');
      if (switchInput) switchInput.checked = e.matches;
      
      const themeIcon = document.querySelector('.theme-icon');
      if (themeIcon) {
        themeIcon.className = e.matches 
          ? 'fas fa-moon theme-icon' 
          : 'fas fa-sun theme-icon';
      }
    }
  });



  

  // Sistema de Notificações para o CRM
// Adicionar ao arquivo script.js

// Variáveis globais para o sistema de notificações
let notifications = [];
let unreadNotificationsCount = 0;
let notificationCheckInterval = null;

// Elementos DOM para notificações
const notificationBadge = document.createElement('span');
notificationBadge.className = 'notification-badge';
notificationBadge.style.display = 'none';

const notificationPanel = document.createElement('div');
notificationPanel.className = 'notification-panel';
notificationPanel.style.display = 'none';

// Função para inicializar o sistema de notificações
async function initNotificationSystem() {
  // Verificar se o usuário está logado
  if (!currentUser) return;
  
  // Criar tabela de notificações se não existir
  try {
    await supabase.rpc('create_notifications_table_if_not_exists');
    console.log('Tabela de notificações verificada/criada com sucesso');
  } catch (error) {
    console.error('Erro ao criar tabela de notificações:', error);
  }
  
  // Adicionar a interface de notificações ao header
  setupNotificationUI();
  
  // Carregar notificações existentes
  await loadNotifications();
  
  // Configurar verificação periódica de novas notificações
  if (notificationCheckInterval) clearInterval(notificationCheckInterval);
  notificationCheckInterval = setInterval(checkForNewNotifications, 60000); // A cada minuto
  
  // Configurar verificação de prazos e gerar notificações automáticas
  generateAutomaticNotifications();
  setInterval(generateAutomaticNotifications, 3600000); // A cada hora
}

// Configurar a interface de notificações
function setupNotificationUI() {
  // Adicionar ícone de notificação ao header
  const userInfo = document.querySelector('.user-info');
  const notificationIcon = document.createElement('div');
  notificationIcon.className = 'notification-icon';
  notificationIcon.innerHTML = '<i class="fas fa-bell"></i>';
  notificationIcon.appendChild(notificationBadge);
  
  // Inserir antes do botão de modo escuro
  const themeSwitch = document.querySelector('.theme-switch-wrapper');
  if (themeSwitch) {
    userInfo.insertBefore(notificationIcon, themeSwitch);
  } else {
    userInfo.insertBefore(notificationIcon, document.getElementById('logout-btn'));
  }
  
  // Adicionar painel de notificações
  notificationPanel.innerHTML = `
    <div class="notification-header">
      <h3>Notificações</h3>
      <span class="notification-actions">
        <button id="mark-all-read" class="btn btn-sm">Marcar todas como lidas</button>
        <button id="close-notifications" class="btn btn-sm"><i class="fas fa-times"></i></button>
      </span>
    </div>
    <div class="notification-list" id="notification-list">
      <div class="empty-notifications">Nenhuma notificação disponível</div>
    </div>
  `;
  
  document.body.appendChild(notificationPanel);
  
  // Adicionar event listeners
  notificationIcon.addEventListener('click', toggleNotificationPanel);
  document.getElementById('mark-all-read').addEventListener('click', markAllAsRead);
  document.getElementById('close-notifications').addEventListener('click', toggleNotificationPanel);
  
  // Fechar quando clicar fora
  document.addEventListener('click', (e) => {
    if (notificationPanel.style.display === 'block' && 
        !notificationPanel.contains(e.target) && 
        !notificationIcon.contains(e.target)) {
      notificationPanel.style.display = 'none';
    }
  });
}

// Mostrar/esconder painel de notificações
function toggleNotificationPanel() {
  if (notificationPanel.style.display === 'none' || !notificationPanel.style.display) {
    notificationPanel.style.display = 'block';
    
    // Posicionar o painel corretamente
    const notificationIcon = document.querySelector('.notification-icon');
    const rect = notificationIcon.getBoundingClientRect();
    notificationPanel.style.top = (rect.bottom + window.scrollY) + 'px';
    notificationPanel.style.right = (window.innerWidth - rect.right) + 'px';
  } else {
    notificationPanel.style.display = 'none';
  }
}

// Carregar notificações do usuário atual
async function loadNotifications() {
  try {
    showLoading();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) throw error;
    
    notifications = data || [];
    unreadNotificationsCount = notifications.filter(n => !n.read).length;
    
    renderNotifications();
  } catch (error) {
    console.error('Erro ao carregar notificações:', error);
  } finally {
    hideLoading();
  }
}

// Verificar se há novas notificações
async function checkForNewNotifications() {
  if (!currentUser) return;
  
  try {
    const lastCheckTime = localStorage.getItem('lastNotificationCheck') || new Date(0).toISOString();
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('read', false)
      .gt('created_at', lastCheckTime);
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      // Adicionar novas notificações e atualizar a contagem
      notifications = [...data, ...notifications].slice(0, 20);
      unreadNotificationsCount += data.length;
      
      // Atualizar a interface
      renderNotifications();
      
      // Mostrar notificação do navegador para a primeira nova notificação
      if (data.length > 0 && Notification.permission === 'granted') {
        const latestNotification = data[0];
        new Notification('Meu CRM', {
          body: latestNotification.message,
          icon: '/favicon.ico' // Adicione um favicon ao seu projeto
        });
      }
    }
    
    localStorage.setItem('lastNotificationCheck', now);
  } catch (error) {
    console.error('Erro ao verificar novas notificações:', error);
  }
}

// Renderizar as notificações na interface
function renderNotifications() {
  // Atualizar a badge de notificações não lidas
  if (unreadNotificationsCount > 0) {
    notificationBadge.textContent = unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount;
    notificationBadge.style.display = 'block';
  } else {
    notificationBadge.style.display = 'none';
  }
  
  // Renderizar a lista de notificações
  const notificationList = document.getElementById('notification-list');
  
  if (notifications.length === 0) {
    notificationList.innerHTML = '<div class="empty-notifications">Nenhuma notificação disponível</div>';
    return;
  }
  
  notificationList.innerHTML = '';
  
  notifications.forEach(notification => {
    const notificationItem = document.createElement('div');
    notificationItem.className = `notification-item ${notification.read ? 'read' : 'unread'}`;
    notificationItem.dataset.id = notification.id;
    
    // Definir ícone baseado no tipo
    let icon = 'info-circle';
    let iconClass = 'info';
    
    switch (notification.type) {
      case 'warning':
        icon = 'exclamation-triangle';
        iconClass = 'warning';
        break;
      case 'error':
        icon = 'exclamation-circle';
        iconClass = 'error';
        break;
      case 'success':
        icon = 'check-circle';
        iconClass = 'success';
        break;
    }
    
    // Formatar a data
    const timeAgo = formatTimeAgo(new Date(notification.created_at));
    
    notificationItem.innerHTML = `
      <div class="notification-icon-${iconClass}">
        <i class="fas fa-${icon}"></i>
      </div>
      <div class="notification-content">
        <div class="notification-title">${notification.title}</div>
        <div class="notification-message">${notification.message}</div>
        <div class="notification-time">${timeAgo}</div>
      </div>
      <div class="notification-actions">
        <button class="btn-mark-read" title="Marcar como lida"><i class="fas fa-check"></i></button>
      </div>
    `;
    
    // Adicionar evento para marcar como lida
    notificationItem.querySelector('.btn-mark-read').addEventListener('click', (e) => {
      e.stopPropagation();
      markAsRead(notification.id);
    });
    
    // Adicionar evento para ir para a ação relacionada, se houver
    if (notification.action_url) {
      notificationItem.addEventListener('click', () => {
        markAsRead(notification.id);
        navigateToAction(notification.action_url, notification.related_type, notification.related_id);
      });
      notificationItem.style.cursor = 'pointer';
    }
    
    notificationList.appendChild(notificationItem);
  });
}

// Formatar o tempo relativo
function formatTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'agora';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} min atrás`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} h atrás`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} d atrás`;
  }
  
  return formatDate(date);
}

// Marcar uma notificação como lida
async function markAsRead(notificationId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
    
    if (error) throw error;
    
    // Atualizar a interface
    const notificationIndex = notifications.findIndex(n => n.id === notificationId);
    if (notificationIndex !== -1 && !notifications[notificationIndex].read) {
      notifications[notificationIndex].read = true;
      unreadNotificationsCount = Math.max(0, unreadNotificationsCount - 1);
      renderNotifications();
    }
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
  }
}

// Marcar todas as notificações como lidas
async function markAllAsRead() {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', currentUser.id)
      .eq('read', false);
    
    if (error) throw error;
    
    // Atualizar a interface
    notifications.forEach(notification => {
      notification.read = true;
    });
    
    unreadNotificationsCount = 0;
    renderNotifications();
  } catch (error) {
    console.error('Erro ao marcar todas notificações como lidas:', error);
  }
}

// Navegar para a ação relacionada
function navigateToAction(actionUrl, relatedType, relatedId) {
  // Fechar o painel de notificações
  notificationPanel.style.display = 'none';
  
  // Navegar para a página correspondente
  if (relatedType === 'order') {
    showActivePage('orders');
    
    // Encontrar e visualizar a ordem específica
    setTimeout(() => {
      const orderButton = document.querySelector(`.view-order[data-id="${relatedId}"]`);
      if (orderButton) {
        orderButton.click();
      }
    }, 500);
  } else if (relatedType === 'client') {
    showActivePage('clients');
    
    // Buscar o cliente específico
    setTimeout(() => {
      const clientButton = document.querySelector(`.edit-client[data-id="${relatedId}"]`);
      if (clientButton) {
        clientButton.click();
      }
    }, 500);
  } else if (relatedType === 'service') {
    showActivePage('services');
    
    // Buscar o serviço específico
    setTimeout(() => {
      const serviceButton = document.querySelector(`.edit-service[data-id="${relatedId}"]`);
      if (serviceButton) {
        serviceButton.click();
      }
    }, 500);
  } else if (actionUrl) {
    // URL externa
    window.open(actionUrl, '_blank');
  }
}

// Criar uma nova notificação
async function createNotification(title, message, type, relatedId = null, relatedType = null, actionUrl = null) {
  if (!currentUser) return null;
  
  try {
    const notification = {
      user_id: currentUser.id,
      title,
      message,
      type, // 'info', 'warning', 'error', 'success'
      read: false,
      related_id: relatedId,
      related_type: relatedType,
      action_url: actionUrl
    };
    
    const { data, error } = await supabase
      .from('notifications')
      .insert([notification])
      .select();
    
    if (error) throw error;
    
    // Atualizar a interface
    if (data && data.length > 0) {
      notifications.unshift(data[0]);
      unreadNotificationsCount++;
      renderNotifications();
      
      // Mostrar notificação do navegador
      if (Notification.permission === 'granted') {
        new Notification('Meu CRM', {
          body: message,
          icon: '/favicon.ico'
        });
      }
      
      return data[0];
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    return null;
  }
}

// Solicitar permissão para notificações do navegador
function requestNotificationPermission() {
  if (Notification && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
}

// Gerar notificações automáticas baseadas em regras de negócio
async function generateAutomaticNotifications() {
  if (!currentUser) return;
  
  // 1. Verificar ordens com prazo de garantia próximo de vencer
  const today = new Date();
  const nearExpiryOrders = orders.filter(order => {
    if (order.status !== 'completed') return false;
    
    const service = services.find(s => s.id === order.service_id);
    if (!service || !service.warranty) return false;
    
    const completionDate = new Date(order.updated_at || order.created_at);
    const warrantyEndDate = new Date(completionDate);
    warrantyEndDate.setDate(warrantyEndDate.getDate() + service.warranty);
    
    // Garantia vencendo em 7 dias ou menos
    const daysToExpiry = Math.ceil((warrantyEndDate - today) / (1000 * 60 * 60 * 24));
    return daysToExpiry > 0 && daysToExpiry <= 7;
  });
  
  // Criar notificações para ordens com garantia próxima do fim
  for (const order of nearExpiryOrders) {
    const service = services.find(s => s.id === order.service_id);
    const client = clients.find(c => c.id === order.client_id);
    
    if (!service || !client) continue;
    
    const completionDate = new Date(order.updated_at || order.created_at);
    const warrantyEndDate = new Date(completionDate);
    warrantyEndDate.setDate(warrantyEndDate.getDate() + service.warranty);
    
    const daysToExpiry = Math.ceil((warrantyEndDate - today) / (1000 * 60 * 60 * 24));
    
    // Verificar se já existe uma notificação para esta ordem e prazo
    const notificationExists = notifications.some(n => 
      n.related_id === order.id && 
      n.related_type === 'order' && 
      n.title.includes('Garantia') &&
      n.message.includes(`${daysToExpiry} dia`)
    );
    
    if (!notificationExists) {
      await createNotification(
        `Garantia Expirando: ${client.name}`,
        `A garantia do serviço "${service.name}" para o cliente ${client.name} expira em ${daysToExpiry} dia${daysToExpiry > 1 ? 's' : ''}.`,
        'warning',
        order.id,
        'order'
      );
    }
  }
  
  // 2. Verificar clientes sem ordens recentes (inativos há mais de 90 dias)
  const inactivityThreshold = new Date();
  inactivityThreshold.setDate(inactivityThreshold.getDate() - 90);
  
  const inactiveClients = clients.filter(client => {
    const latestOrder = orders
      .filter(o => o.client_id === client.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    
    return latestOrder && new Date(latestOrder.created_at) < inactivityThreshold;
  });
  
  // Criar notificações para clientes inativos
  for (const client of inactiveClients) {
    // Verificar se já existe uma notificação para este cliente inativo
    const notificationExists = notifications.some(n => 
      n.related_id === client.id && 
      n.related_type === 'client' && 
      n.title.includes('Cliente Inativo')
    );
    
    if (!notificationExists) {
      await createNotification(
        `Cliente Inativo: ${client.name}`,
        `O cliente ${client.name} não fez novos pedidos nos últimos 90 dias.`,
        'info',
        client.id,
        'client'
      );
    }
  }
  
  // 3. Verificar ordens pendentes há muito tempo (mais de 15 dias)
  const pendingThreshold = new Date();
  pendingThreshold.setDate(pendingThreshold.getDate() - 15);
  
  const longPendingOrders = orders.filter(order => 
    order.status === 'pending' && new Date(order.created_at) < pendingThreshold
  );
  
  // Criar notificações para ordens pendentes há muito tempo
  for (const order of longPendingOrders) {
    const client = clients.find(c => c.id === order.client_id);
    const service = services.find(s => s.id === order.service_id);
    
    if (!client || !service) continue;
    
    // Verificar se já existe uma notificação para esta ordem pendente
    const notificationExists = notifications.some(n => 
      n.related_id === order.id && 
      n.related_type === 'order' && 
      n.title.includes('Ordem Pendente')
    );
    
    if (!notificationExists) {
      await createNotification(
        `Ordem Pendente Há Muito Tempo`,
        `A ordem de ${service.name} para ${client.name} está pendente há mais de 15 dias.`,
        'warning',
        order.id,
        'order'
      );
    }
  }
}



// Sistema de Modo Offline e Sincronização para o CRM
// Adicionar ao arquivo script.js

// Variáveis globais para modo offline
let isOnline = navigator.onLine;
let syncQueue = [];
let offlineDb = null;
let isSyncing = false;
let lastSyncTime = null;
const DB_VERSION = 1;
const DB_NAME = 'offlineCrm';

// Constantes para sincronização
const SYNC_STATUS = {
  PENDING: 'pending',
  SYNCED: 'synced',
  FAILED: 'failed',
  CONFLICT: 'conflict'
};

// Inicializar sistema de modo offline
async function initOfflineMode() {
  // Adicionar indicador de conexão no header
  setupConnectionIndicator();
  
  // Carregar sincronização pendente do localStorage
  loadSyncQueue();
  
  // Inicializar banco de dados IndexedDB
  await initIndexedDB();
  
  // Configurar listeners de conexão
  window.addEventListener('online', handleOnlineStatusChange);
  window.addEventListener('offline', handleOnlineStatusChange);
  
  // Verificar status inicial de conexão
  updateConnectionStatus();
  
  // Se estiver online, sincronizar dados
  if (isOnline) {
    syncOfflineData();
  }
  
  // Configurar verificação periódica de sincronização
  setInterval(() => {
    if (isOnline && !isSyncing && syncQueue.length > 0) {
      syncOfflineData();
    }
  }, 60000); // Verificar a cada minuto
  
  // Sobrescrever funções originais para suportar modo offline
  overrideCRMFunctions();
}

// Inicializar IndexedDB
function initIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Criar object stores (tabelas) para dados offline
      if (!db.objectStoreNames.contains('clients')) {
        const clientsStore = db.createObjectStore('clients', { keyPath: 'id' });
        clientsStore.createIndex('name', 'name', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('services')) {
        const servicesStore = db.createObjectStore('services', { keyPath: 'id' });
        servicesStore.createIndex('name', 'name', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('orders')) {
        const ordersStore = db.createObjectStore('orders', { keyPath: 'id' });
        ordersStore.createIndex('client_id', 'client_id', { unique: false });
        ordersStore.createIndex('status', 'status', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
      }
    };
    
    request.onsuccess = (event) => {
      offlineDb = event.target.result;
      resolve(offlineDb);
    };
    
    request.onerror = (event) => {
      console.error('Erro ao inicializar IndexedDB:', event.target.error);
      reject(event.target.error);
    };
  });
}

// Adicionar indicador de status de conexão ao header
function setupConnectionIndicator() {
  const userInfo = document.querySelector('.user-info');
  if (!userInfo) return;
  
  const connectionIndicator = document.createElement('div');
  connectionIndicator.className = 'connection-indicator';
  connectionIndicator.id = 'connection-indicator';
  
  const statusIcon = document.createElement('i');
  statusIcon.className = isOnline ? 'fas fa-wifi text-success' : 'fas fa-wifi-slash text-danger';
  statusIcon.id = 'connection-icon';
  
  const statusBadge = document.createElement('span');
  statusBadge.className = isOnline ? 'sync-badge sync-badge-success' : 'sync-badge sync-badge-danger';
  statusBadge.id = 'sync-badge';
  statusBadge.style.display = 'none';
  statusBadge.title = 'Itens aguardando sincronização';
  
  connectionIndicator.appendChild(statusIcon);
  connectionIndicator.appendChild(statusBadge);
  
  // Inserir antes da informação do usuário
  userInfo.insertBefore(connectionIndicator, userInfo.firstChild);
  
  // Adicionar popup de sincronização
  const syncPopup = document.createElement('div');
  syncPopup.className = 'sync-popup';
  syncPopup.id = 'sync-popup';
  syncPopup.style.display = 'none';
  
  syncPopup.innerHTML = `
    <div class="sync-header">
      <h3>Sincronização</h3>
      <button id="close-sync" class="close-sync"><i class="fas fa-times"></i></button>
    </div>
    <div class="sync-content">
      <div class="sync-status">
        <p><strong>Status:</strong> <span id="sync-status-text">Online</span></p>
        <p><strong>Última sincronização:</strong> <span id="last-sync-time">Nunca</span></p>
      </div>
      <div class="sync-queue">
        <h4>Itens aguardando sincronização</h4>
        <div id="sync-queue-items" class="sync-queue-items">
          <p class="empty-queue">Nenhum item pendente</p>
        </div>
      </div>
      <div class="sync-actions">
        <button id="force-sync" class="btn btn-primary btn-sm">Sincronizar Agora</button>
        <button id="clear-sync" class="btn btn-danger btn-sm">Limpar Fila</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(syncPopup);
  
  // Adicionar event listeners
  connectionIndicator.addEventListener('click', toggleSyncPopup);
  document.getElementById('close-sync').addEventListener('click', toggleSyncPopup);
  document.getElementById('force-sync').addEventListener('click', forceSyncData);
  document.getElementById('clear-sync').addEventListener('click', clearSyncQueue);
}

// Mostrar/esconder popup de sincronização
function toggleSyncPopup(e) {
  e.stopPropagation();
  const syncPopup = document.getElementById('sync-popup');
  
  if (syncPopup.style.display === 'none' || !syncPopup.style.display) {
    // Atualizar informações antes de mostrar
    updateSyncPopupInfo();
    
    syncPopup.style.display = 'block';
    
    // Posicionar o popup
    const connectionIndicator = document.getElementById('connection-indicator');
    const rect = connectionIndicator.getBoundingClientRect();
    syncPopup.style.top = (rect.bottom + window.scrollY) + 'px';
    syncPopup.style.right = (window.innerWidth - rect.right) + 'px';
    
    // Adicionar listener para fechar ao clicar fora
    document.addEventListener('click', closeSyncPopupOutside);
  } else {
    syncPopup.style.display = 'none';
    document.removeEventListener('click', closeSyncPopupOutside);
  }
}

// Fechar popup ao clicar fora
function closeSyncPopupOutside(e) {
  const syncPopup = document.getElementById('sync-popup');
  const connectionIndicator = document.getElementById('connection-indicator');
  
  if (!syncPopup.contains(e.target) && !connectionIndicator.contains(e.target)) {
    syncPopup.style.display = 'none';
    document.removeEventListener('click', closeSyncPopupOutside);
  }
}

// Atualizar informações do popup de sincronização
function updateSyncPopupInfo() {
  const statusText = document.getElementById('sync-status-text');
  const lastSyncTimeElem = document.getElementById('last-sync-time');
  const syncQueueItems = document.getElementById('sync-queue-items');
  
  // Atualizar status
  statusText.textContent = isOnline ? 'Online' : 'Offline';
  statusText.className = isOnline ? 'text-success' : 'text-danger';
  
  // Atualizar última sincronização
  if (lastSyncTime) {
    lastSyncTimeElem.textContent = formatDatetime(new Date(lastSyncTime));
  } else {
    lastSyncTimeElem.textContent = 'Nunca';
  }
  
  // Atualizar fila de sincronização
  if (syncQueue.length === 0) {
    syncQueueItems.innerHTML = '<p class="empty-queue">Nenhum item pendente</p>';
  } else {
    const itemsByType = syncQueue.reduce((acc, item) => {
      if (!acc[item.type]) {
        acc[item.type] = 0;
      }
      acc[item.type]++;
      return acc;
    }, {});
    
    let itemsHtml = '<ul class="sync-items-list">';
    
    Object.entries(itemsByType).forEach(([type, count]) => {
      const typeName = {
        'client': 'Cliente',
        'service': 'Serviço',
        'order': 'Ordem de Serviço'
      }[type] || type;
      
      itemsHtml += `<li>${count} ${typeName}${count > 1 ? 's' : ''} pendente${count > 1 ? 's' : ''}</li>`;
    });
    
    itemsHtml += '</ul>';
    syncQueueItems.innerHTML = itemsHtml;
  }
  
  // Atualizar estado dos botões
  const forceSync = document.getElementById('force-sync');
  forceSync.disabled = !isOnline || syncQueue.length === 0;
  
  const clearSync = document.getElementById('clear-sync');
  clearSync.disabled = syncQueue.length === 0;
}

// Lidar com mudanças de status de conexão
function handleOnlineStatusChange() {
  const wasOnline = isOnline;
  isOnline = navigator.onLine;
  
  // Atualizar a UI
  updateConnectionStatus();
  
  // Se voltou a ficar online, tentar sincronizar
  if (!wasOnline && isOnline) {
    showNotification('Conexão restaurada', 'Você está online novamente. Sincronizando dados...', 'success');
    syncOfflineData();
  } else if (wasOnline && !isOnline) {
    showNotification('Modo offline ativado', 'Você está trabalhando offline. As alterações serão sincronizadas quando a conexão for restaurada.', 'warning');
  }
}

// Atualizar o indicador de status de conexão
function updateConnectionStatus() {
  const connectionIcon = document.getElementById('connection-icon');
  if (!connectionIcon) return;
  
  connectionIcon.className = isOnline ? 'fas fa-wifi text-success' : 'fas fa-wifi-slash text-danger';
  
  const syncBadge = document.getElementById('sync-badge');
  if (syncBadge) {
    if (syncQueue.length > 0) {
      syncBadge.textContent = syncQueue.length > 99 ? '99+' : syncQueue.length;
      syncBadge.style.display = 'block';
      syncBadge.className = isOnline ? 'sync-badge sync-badge-warning' : 'sync-badge sync-badge-danger';
    } else {
      syncBadge.style.display = 'none';
    }
  }
}

// Salvar fila de sincronização no localStorage
function saveSyncQueue() {
  localStorage.setItem('syncQueue', JSON.stringify(syncQueue));
  updateConnectionStatus();
}

// Carregar fila de sincronização do localStorage
function loadSyncQueue() {
  const savedQueue = localStorage.getItem('syncQueue');
  if (savedQueue) {
    try {
      syncQueue = JSON.parse(savedQueue);
    } catch (error) {
      console.error('Erro ao carregar fila de sincronização:', error);
      syncQueue = [];
    }
  }
  
  lastSyncTime = localStorage.getItem('lastSyncTime');
  updateConnectionStatus();
}

// Adicionar item à fila de sincronização
function addToSyncQueue(item) {
  // Gerar ID local se for novo item
  if (item.action === 'create' && !item.localId) {
    item.localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  syncQueue.push(item);
  saveSyncQueue();
  
  // Armazenar no IndexedDB também
  storeOfflineItem(item);
  
  // Notificar usuário
  showNotification(
    'Item adicionado para sincronização',
    `${getTypeLabel(item.type)} será sincronizado quando você estiver online.`,
    'info'
  );
}

// Armazenar item offline no IndexedDB
async function storeOfflineItem(item) {
  if (!offlineDb) return;
  
  try {
    const transaction = offlineDb.transaction('syncQueue', 'readwrite');
    const store = transaction.objectStore('syncQueue');
    
    await store.add(item);
  } catch (error) {
    console.error('Erro ao armazenar item offline:', error);
  }
}

// Sincronizar dados offline com o servidor
async function syncOfflineData() {
  if (!isOnline || isSyncing || syncQueue.length === 0) return;
  
  isSyncing = true;
  showLoading();
  
  try {
    // Clone a fila para trabalhar com ela
    const queueToProcess = [...syncQueue];
    const successfulItems = [];
    const failedItems = [];
    
    // Processar itens um por um
    for (const item of queueToProcess) {
      try {
        const result = await processSyncItem(item);
        
        if (result.success) {
          successfulItems.push(item);
        } else {
          failedItems.push({item, error: result.error});
        }
      } catch (error) {
        failedItems.push({item, error});
      }
    }
    
    // Remover itens sincronizados com sucesso da fila
    syncQueue = syncQueue.filter(item => 
      !successfulItems.some(successItem => 
        (successItem.id === item.id || 
         (item.localId && successItem.localId === item.localId))
      )
    );
    
    // Atualizar localStorage
    saveSyncQueue();
    
    // Atualizar última sincronização
    lastSyncTime = new Date().toISOString();
    localStorage.setItem('lastSyncTime', lastSyncTime);
    
    // Notificar usuário
    if (successfulItems.length > 0) {
      showNotification(
        'Sincronização concluída',
        `${successfulItems.length} ${successfulItems.length > 1 ? 'itens foram sincronizados' : 'item foi sincronizado'} com sucesso.`,
        'success'
      );
    }
    
    if (failedItems.length > 0) {
      showNotification(
        'Falha na sincronização',
        `${failedItems.length} ${failedItems.length > 1 ? 'itens não puderam' : 'item não pôde'} ser sincronizado. Tente novamente mais tarde.`,
        'error'
      );
      console.error('Itens com falha na sincronização:', failedItems);
    }
    
  } catch (error) {
    console.error('Erro durante sincronização:', error);
    showNotification(
      'Erro de sincronização',
      'Ocorreu um erro ao sincronizar seus dados. Tente novamente mais tarde.',
      'error'
    );
  } finally {
    isSyncing = false;
    hideLoading();
    updateConnectionStatus();
  }
}

// Processar um item individual da fila de sincronização
async function processSyncItem(item) {
  try {
    let result;
    
    switch (item.type) {
      case 'client':
        result = await syncClientItem(item);
        break;
      case 'service':
        result = await syncServiceItem(item);
        break;
      case 'order':
        result = await syncOrderItem(item);
        break;
      default:
        throw new Error(`Tipo de item desconhecido: ${item.type}`);
    }
    
    return { success: true, result };
  } catch (error) {
    console.error(`Erro ao sincronizar item ${item.type}:`, error);
    return { success: false, error: error.message };
  }
}

// Sincronizar um cliente
async function syncClientItem(item) {
  let result;
  
  switch (item.action) {
    case 'create':
      const { data, error } = await supabase
        .from('clients')
        .insert([item.data]);
      
      if (error) throw error;
      
      // Atualizar o ID local para o ID do servidor
      if (data && data.length > 0) {
        updateLocalIdReferences(item.localId, data[0].id, 'client');
      }
      
      result = data;
      break;
      
    case 'update':
      result = await supabase
        .from('clients')
        .update(item.data)
        .eq('id', item.id);
      break;
      
    case 'delete':
      result = await supabase
        .from('clients')
        .delete()
        .eq('id', item.id);
      break;
      
    default:
      throw new Error(`Ação desconhecida: ${item.action}`);
  }
  
  // Atualizar dados locais
  await loadClients();
  
  return result;
}

// Sincronizar um serviço
async function syncServiceItem(item) {
  let result;
  
  switch (item.action) {
    case 'create':
      const { data, error } = await supabase
        .from('services')
        .insert([item.data]);
      
      if (error) throw error;
      
      // Atualizar o ID local para o ID do servidor
      if (data && data.length > 0) {
        updateLocalIdReferences(item.localId, data[0].id, 'service');
      }
      
      result = data;
      break;
      
    case 'update':
      result = await supabase
        .from('services')
        .update(item.data)
        .eq('id', item.id);
      break;
      
    case 'delete':
      result = await supabase
        .from('services')
        .delete()
        .eq('id', item.id);
      break;
      
    default:
      throw new Error(`Ação desconhecida: ${item.action}`);
  }
  
  // Atualizar dados locais
  await loadServices();
  
  return result;
}

// Sincronizar uma ordem de serviço
async function syncOrderItem(item) {
  // Verificar se há referências a IDs locais que precisam ser convertidas
  if (item.data.client_id && item.data.client_id.startsWith('local_')) {
    const serverClientId = getServerIdForLocalId(item.data.client_id, 'client');
    if (serverClientId) {
      item.data.client_id = serverClientId;
    } else {
      throw new Error(`Cliente com ID local ${item.data.client_id} não encontrado no servidor.`);
    }
  }
  
  if (item.data.service_id && item.data.service_id.startsWith('local_')) {
    const serverServiceId = getServerIdForLocalId(item.data.service_id, 'service');
    if (serverServiceId) {
      item.data.service_id = serverServiceId;
    } else {
      throw new Error(`Serviço com ID local ${item.data.service_id} não encontrado no servidor.`);
    }
  }
  
  let result;
  
  switch (item.action) {
    case 'create':
      const { data, error } = await supabase
        .from('orders')
        .insert([item.data]);
      
      if (error) throw error;
      
      // Atualizar o ID local para o ID do servidor
      if (data && data.length > 0) {
        updateLocalIdReferences(item.localId, data[0].id, 'order');
      }
      
      result = data;
      break;
      
    case 'update':
      result = await supabase
        .from('orders')
        .update(item.data)
        .eq('id', item.id);
      break;
      
    case 'delete':
      result = await supabase
        .from('orders')
        .delete()
        .eq('id', item.id);
      break;
      
    default:
      throw new Error(`Ação desconhecida: ${item.action}`);
  }
  
  // Atualizar dados locais
  await loadOrders();
  
  return result;
}

// Atualizar referências de ID local para ID do servidor
function updateLocalIdReferences(localId, serverId, type) {
  if (!localId || !serverId) return;
  
  // Atualizar no localStorage
  const idMappings = JSON.parse(localStorage.getItem('localIdMappings') || '{}');
  if (!idMappings[type]) {
    idMappings[type] = {};
  }
  idMappings[type][localId] = serverId;
  localStorage.setItem('localIdMappings', JSON.stringify(idMappings));
  
  // Atualizar referências na fila de sincronização
  syncQueue.forEach(item => {
    if (type === 'client' && item.data && item.data.client_id === localId) {
      item.data.client_id = serverId;
    } else if (type === 'service' && item.data && item.data.service_id === localId) {
      item.data.service_id = serverId;
    }
  });
  
  saveSyncQueue();
}

// Obter ID do servidor para um ID local
function getServerIdForLocalId(localId, type) {
  const idMappings = JSON.parse(localStorage.getItem('localIdMappings') || '{}');
  return idMappings[type] && idMappings[type][localId];
}

// Forçar sincronização de dados
function forceSyncData() {
  if (!isOnline) {
    showNotification('Sem conexão', 'Você precisa estar online para sincronizar dados.', 'warning');
    return;
  }
  
  if (syncQueue.length === 0) {
    showNotification('Nada para sincronizar', 'Não há itens pendentes para sincronização.', 'info');
    return;
  }
  
  syncOfflineData();
}

// Limpar fila de sincronização
function clearSyncQueue() {
  if (!confirm('Tem certeza que deseja limpar a fila de sincronização? Todos os dados offline não sincronizados serão perdidos.')) {
    return;
  }
  
  syncQueue = [];
  saveSyncQueue();
  
  // Limpar no IndexedDB
  if (offlineDb) {
    try {
      const transaction = offlineDb.transaction('syncQueue', 'readwrite');
      const store = transaction.objectStore('syncQueue');
      store.clear();
    } catch (error) {
      console.error('Erro ao limpar fila de sincronização no IndexedDB:', error);
    }
  }
  
  showNotification('Fila limpa', 'A fila de sincronização foi limpa com sucesso.', 'success');
  updateConnectionStatus();
  updateSyncPopupInfo();
}

// Obter label do tipo de item
function getTypeLabel(type) {
  switch (type) {
    case 'client':
      return 'Cliente';
    case 'service':
      return 'Serviço';
    case 'order':
      return 'Ordem de serviço';
    default:
      return type;
  }
}

// Mostrar notificação para o usuário
function showNotification(title, message, type = 'info') {
  // Verificar se o elemento de notificação já existe
  let notificationContainer = document.getElementById('notification-container');
  
  if (!notificationContainer) {
    // Criar container de notificações
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'notification-container';
    document.body.appendChild(notificationContainer);
  }
  
  // Criar a notificação
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  
  // Adicionar ícone de acordo com o tipo
  let icon = 'info-circle';
  switch (type) {
    case 'success':
      icon = 'check-circle';
      break;
    case 'error':
      icon = 'exclamation-circle';
      break;
    case 'warning':
      icon = 'exclamation-triangle';
      break;
  }
  
  notification.innerHTML = `
    <div class="notification-icon">
      <i class="fas fa-${icon}"></i>
    </div>
    <div class="notification-content">
      <div class="notification-title">${title}</div>
      <div class="notification-message">${message}</div>
    </div>
    <button class="notification-close"><i class="fas fa-times"></i></button>
  `;
  
  // Adicionar ao container
  notificationContainer.appendChild(notification);
  
  // Configurar botão de fechar
  const closeButton = notification.querySelector('.notification-close');
  closeButton.addEventListener('click', () => {
    notification.classList.add('notification-hide');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  });
  
  // Auto-remover após 5 segundos
  setTimeout(() => {
    notification.classList.add('notification-hide');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 5000);
}

// Formatar data e hora
function formatDatetime(date) {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Sobrescrever funções originais para suportar modo offline
function overrideCRMFunctions() {
  // Sobrescrever manipulação de clientes
  const originalHandleClientForm = handleClientForm;
  window.handleClientForm = async function(e) {
    e.preventDefault();
    
    const clientId = document.getElementById("client-id").value;
    const name = document.getElementById("client-name").value;
    const email = document.getElementById("client-email").value || "";
    const phone = document.getElementById("client-phone").value || "";
    const address = document.getElementById("client-address").value || "";
    
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
      // Se estiver offline, adicionar à fila de sincronização
      if (!isOnline) {
        const syncItem = {
          type: 'client',
          action: clientId ? 'update' : 'create',
          data: clientData,
          timestamp: new Date().toISOString()
        };
        
        if (clientId) {
          syncItem.id = clientId;
        } else {
          // Gerar ID local
          const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          clientData.id = localId;
          syncItem.localId = localId;
        }
        
        // Adicionar à fila de sincronização
        addToSyncQueue(syncItem);
        
        // Adicionar ou atualizar no array local
        if (clientId) {
          const index = clients.findIndex(c => c.id === clientId);
          if (index !== -1) {
            clients[index] = { ...clients[index], ...clientData };
          }
        } else {
          clients.push(clientData);
        }
        
        // Fechar modal e limpar formulário
        clientModal.style.display = "none";
        clientForm.reset();
        document.getElementById("client-id").value = "";
        
        // Atualizar UI
        renderClientsTable();
        updateStats();
        
        showNotification(
          `Cliente ${clientId ? 'atualizado' : 'criado'} offline`,
          'As alterações serão sincronizadas quando você estiver online.',
          'info'
        );
      } else {
        // Se estiver online, usar o método original
        await originalHandleClientForm(e);
      }
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      alert("Erro ao salvar cliente: " + error.message);
    } finally {
      hideLoading();
    }
  };
  
  // Sobrescrever manipulação de serviços
  const originalHandleServiceForm = handleServiceForm;
  window.handleServiceForm = async function(e) {
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
      // Se estiver offline, adicionar à fila de sincronização
      if (!isOnline) {
        const syncItem = {
          type: 'service',
          action: serviceId ? 'update' : 'create',
          data: serviceData,
          timestamp: new Date().toISOString()
        };
        
        if (serviceId) {
          syncItem.id = serviceId;
        } else {
          // Gerar ID local
          const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          serviceData.id = localId;
          syncItem.localId = localId;
        }
        
        // Adicionar à fila de sincronização
        addToSyncQueue(syncItem);
        
        // Adicionar ou atualizar no array local
        if (serviceId) {
          const index = services.findIndex(s => s.id === serviceId);
          if (index !== -1) {
            services[index] = { ...services[index], ...serviceData };
          }
        } else {
          services.push(serviceData);
        }
        
        // Fechar modal e limpar formulário
        serviceModal.style.display = "none";
        serviceForm.reset();
        document.getElementById("service-id").value = "";
        
        // Atualizar UI
        renderServicesTable();
        updateStats();
        
        showNotification(
          `Serviço ${serviceId ? 'atualizado' : 'criado'} offline`,
          'As alterações serão sincronizadas quando você estiver online.',
          'info'
        );
      } else {
        // Se estiver online, usar o método original
        await originalHandleServiceForm(e);
      }
    } catch (error) {
      console.error("Erro ao salvar serviço:", error);
      alert("Erro ao salvar serviço: " + error.message);
    } finally {
      hideLoading();
    }
  };
  
  // Sobrescrever manipulação de ordens de serviço
  const originalHandleOrderForm = handleOrderForm;
  window.handleOrderForm = async function(e) {
    e.preventDefault();
    
    const orderId = document.getElementById("order-id").value;
    const clientId = document.getElementById("order-client").value;
    const serviceId = document.getElementById("order-service").value;
    const description = document.getElementById("order-description").value;
    const status = document.getElementById("order-status").value;
    const price = parseFloat(document.getElementById("order-price").value) || 0;
    
    // Verificar se o serviço existe
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
      price,
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
      // Se estiver offline, adicionar à fila de sincronização
      if (!isOnline) {
        const syncItem = {
          type: 'order',
          action: orderId ? 'update' : 'create',
          data: orderData,
          timestamp: new Date().toISOString()
        };
        
        if (orderId) {
          syncItem.id = orderId;
        } else {
          // Gerar ID local
          const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          orderData.id = localId;
          syncItem.localId = localId;
        }
        
        // Adicionar à fila de sincronização
        addToSyncQueue(syncItem);
        
        // Adicionar ou atualizar no array local
        if (orderId) {
          const index = orders.findIndex(o => o.id === orderId);
          if (index !== -1) {
            orders[index] = { ...orders[index], ...orderData };
          }
        } else {
          orders.push(orderData);
        }
        
        // Fechar modal e limpar formulário
        orderModal.style.display = "none";
        orderForm.reset();
        document.getElementById("order-id").value = "";
        
        // Atualizar UI
        renderOrdersTable();
        renderTransactionsTable();
        updateStats();
        loadRecentOrders();
        
        showNotification(
          `Ordem ${orderId ? 'atualizada' : 'criada'} offline`,
          'As alterações serão sincronizadas quando você estiver online.',
          'info'
        );
      } else {
        // Se estiver online, usar o método original
        await originalHandleOrderForm(e);
      }
    } catch (error) {
      console.error("Erro ao salvar ordem de serviço:", error);
      alert("Erro ao salvar ordem de serviço: " + error.message);
    } finally {
      hideLoading();
    }
  };
}

// Inicializar modo offline quando o documento estiver pronto
document.addEventListener("DOMContentLoaded", () => {
  // Código existente...
  
  // Inicializar modo offline após login
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      if (session) {
        // Inicializar após o dashboard ser carregado
        const originalShowDashboard = showDashboard;
        window.showDashboard = async function() {
          await originalShowDashboard();
          initOfflineMode();
        };
      }
    }
  });
});
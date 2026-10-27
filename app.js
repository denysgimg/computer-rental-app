const SERVER_URL = "http://localhost:5000";

const STATUS_LABELS = {
  available: "Вільний",
  booked: "Заброньований",
  rented: "Виданий",
};

const BOOKING_STATUS_LABELS = {
  booked: "Заброньовано",
  rented: "Видано",
  returned: "Повернуто",
};

let allComputers = [];
let allClients = [];
let allBookings = [];
let editingId = null;
let bookingFilter = "";
let editingClientId = null;
let clientFilter = "";

// Один app.js підключено до трьох сторінок: визначаємо, на якій ми зараз.
const hasComputersPage = document.getElementById("computers-body") !== null;
const hasBookingsPage = document.getElementById("bookings-body") !== null;
const hasClientsPage = document.getElementById("clients-body") !== null;

/* ---------- Робота з сервером ---------- */

async function fetchJson(path) {
  const response = await fetch(`${SERVER_URL}${path}`);
  if (!response.ok) {
    throw new Error("Помилка сервера: " + response.status);
  }
  return response.json();
}

async function sendJson(path, method, body) {
  const response = await fetch(`${SERVER_URL}${path}`, {
    method: method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    throw new Error("Помилка сервера: " + response.status);
  }
  return response;
}

async function loadData() {
  try {
    const [computers, clients, bookings] = await Promise.all([
      fetchJson("/computers"),
      fetchJson("/clients"),
      fetchJson("/bookings"),
    ]);
    allComputers = computers;
    allClients = clients;
    allBookings = bookings;
    if (hasComputersPage) {
      applyFilters();
    }
    if (hasBookingsPage) {
      fillBookingSelects();
      renderBookings();
    }
    if (hasClientsPage) {
      renderClients();
    }
  } catch (error) {
    showMessage(
      "Не вдалося завантажити дані. Запустіть JSON Server командою npm start і оновіть сторінку.",
      true,
      hasComputersPage ? "message" : hasClientsPage ? "client-message" : "booking-message"
    );
  }
}

/* ---------- Спільні допоміжні функції ---------- */

function showMessage(text, isError = true, elementId = "message") {
  const message = document.getElementById(elementId);
  message.textContent = text;
  message.className = text === "" ? "msg" : "msg " + (isError ? "msg-error" : "msg-ok");
}

function showBookingMessage(text, isError = true) {
  showMessage(text, isError, "booking-message");
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function makeButton(text, onClick, extraClass = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "row-btn " + extraClass;
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

function textCell(text, className = "") {
  const cell = document.createElement("td");
  cell.className = className;
  cell.textContent = text;
  return cell;
}

function emptyRow(columns, text) {
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = columns;
  cell.className = "empty";
  cell.textContent = text;
  row.appendChild(cell);
  return row;
}

function statusPill(kind, label) {
  const pill = document.createElement("span");
  pill.className = "pill pill-" + kind;
  pill.textContent = label;
  return pill;
}

function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatDate(isoDate) {
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
}

/* ---------- Комп'ютери ---------- */

function applyFilters() {
  const search = document.getElementById("search").value.trim().toLowerCase();
  const type = document.getElementById("filter-type").value;
  const status = document.getElementById("filter-status").value;
  const sort = document.getElementById("sort").value;

  const result = allComputers.filter((computer) => {
    const matchesSearch =
      computer.name.toLowerCase().includes(search) ||
      computer.cpu.toLowerCase().includes(search);
    const matchesType = type === "" || computer.type === type;
    const matchesStatus = status === "" || computer.status === status;
    return matchesSearch && matchesType && matchesStatus;
  });

  if (sort === "ram-desc") {
    result.sort((a, b) => b.ram - a.ram);
  } else if (sort === "ram-asc") {
    result.sort((a, b) => a.ram - b.ram);
  } else {
    result.sort((a, b) => a.name.localeCompare(b.name, "uk"));
  }

  updateComputerStats(status);
  renderComputers(result);
}

function updateComputerStats(activeStatus) {
  const count = (status) =>
    allComputers.filter((computer) => computer.status === status).length;

  setText("stat-total", allComputers.length);
  setText("stat-available", count("available"));
  setText("stat-booked", count("booked"));
  setText("stat-rented", count("rented"));

  for (const button of document.querySelectorAll(".stat")) {
    button.setAttribute("aria-pressed", String(button.dataset.status === activeStatus));
  }
}

function renderComputers(computers) {
  const tbody = document.getElementById("computers-body");
  tbody.innerHTML = "";

  if (computers.length === 0) {
    const text =
      allComputers.length === 0
        ? "Комп'ютерів ще немає. Додайте перший у формі ліворуч."
        : "Нічого не знайдено. Змініть пошук або фільтри.";
    tbody.appendChild(emptyRow(6, text));
    return;
  }

  for (const computer of computers) {
    const row = document.createElement("tr");

    row.appendChild(textCell(computer.name, "name"));
    row.appendChild(textCell(computer.type, "nowrap"));
    row.appendChild(textCell(computer.cpu, "nowrap"));
    row.appendChild(textCell(`${computer.ram} ГБ`, "nowrap"));

    const statusCell = document.createElement("td");
    statusCell.appendChild(
      statusPill(computer.status, STATUS_LABELS[computer.status] || computer.status)
    );
    row.appendChild(statusCell);

    const actionsCell = document.createElement("td");
    actionsCell.className = "actions";
    actionsCell.append(
      makeButton("Редагувати", () => startEdit(computer)),
      makeButton("Видалити", () => deleteComputer(computer), "danger")
    );
    row.appendChild(actionsCell);

    tbody.appendChild(row);
  }
}

function validateComputer(data) {
  if (data.name === "") {
    return "Назва не може бути порожньою.";
  }
  if (data.cpu === "") {
    return "Вкажіть процесор.";
  }
  if (!Number.isInteger(data.ram) || data.ram <= 0) {
    return "ОЗП має бути цілим додатним числом.";
  }
  return null;
}

async function saveComputer(event) {
  event.preventDefault();

  const data = {
    name: document.getElementById("name").value.trim(),
    type: document.getElementById("type").value,
    cpu: document.getElementById("cpu").value.trim(),
    ram: Number(document.getElementById("ram").value),
  };

  const error = validateComputer(data);
  if (error) {
    showMessage(error);
    return;
  }

  const isEdit = editingId !== null;
  if (!isEdit) {
    data.status = "available";
  }

  try {
    if (isEdit) {
      await sendJson(`/computers/${editingId}`, "PATCH", data);
    } else {
      await sendJson("/computers", "POST", data);
    }
    resetForm();
    showMessage(isEdit ? "Зміни збережено." : "Комп'ютер додано.", false);
    loadData();
  } catch (error) {
    showMessage("Не вдалося зберегти комп'ютер. Перевірте, чи запущено JSON Server.");
  }
}

function startEdit(computer) {
  editingId = computer.id;
  document.getElementById("name").value = computer.name;
  document.getElementById("type").value = computer.type;
  document.getElementById("cpu").value = computer.cpu;
  document.getElementById("ram").value = computer.ram;
  document.getElementById("form-title").textContent = "Редагувати комп'ютер";
  document.getElementById("submit-button").textContent = "Зберегти зміни";
  document.getElementById("cancel-button").hidden = false;
  document.getElementById("name").focus();
  showMessage("");
}

function resetForm() {
  editingId = null;
  document.getElementById("computer-form").reset();
  document.getElementById("form-title").textContent = "Додати комп'ютер";
  document.getElementById("submit-button").textContent = "Додати";
  document.getElementById("cancel-button").hidden = true;
}

async function deleteComputer(computer) {
  if (computer.status !== "available") {
    showMessage("Не можна видалити комп'ютер, який заброньований або виданий.");
    return;
  }
  if (!confirm(`Видалити «${computer.name}»?`)) {
    return;
  }

  try {
    await sendJson(`/computers/${computer.id}`, "DELETE");
    showMessage("Комп'ютер видалено.", false);
    loadData();
  } catch (error) {
    showMessage("Не вдалося видалити комп'ютер.");
  }
}

/* ---------- Бронювання ---------- */

function computerName(id) {
  const computer = allComputers.find((item) => item.id === id);
  return computer ? computer.name : "(видалено)";
}

function clientName(id) {
  const client = allClients.find((item) => item.id === id);
  return client ? client.name : "(видалено)";
}

function fillSelect(select, items) {
  const previous = select.value;
  select.innerHTML = "";
  for (const item of items) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name;
    select.appendChild(option);
  }
  if (items.some((item) => item.id === previous)) {
    select.value = previous;
  }
}

function fillBookingSelects() {
  fillSelect(document.getElementById("booking-computer"), allComputers);
  fillSelect(document.getElementById("booking-client"), allClients);
  updateAvailabilityHint();
}

function readBookingForm() {
  return {
    computerId: document.getElementById("booking-computer").value,
    clientId: document.getElementById("booking-client").value,
    startDate: document.getElementById("booking-start").value,
    endDate: document.getElementById("booking-end").value,
  };
}

// Період перетинається, якщо початок нового не пізніше кінця наявного
// і кінець нового не раніше початку наявного.
function hasOverlap(data) {
  return allBookings.some(
    (booking) =>
      booking.computerId === data.computerId &&
      booking.status !== "returned" &&
      data.startDate <= booking.endDate &&
      data.endDate >= booking.startDate
  );
}

function validateBooking(data) {
  if (data.computerId === "" || data.clientId === "") {
    return "Оберіть комп'ютер і клієнта.";
  }
  if (data.startDate === "" || data.endDate === "") {
    return "Вкажіть дати початку й завершення.";
  }
  if (data.endDate < data.startDate) {
    return "Дата завершення не може бути раніше дати початку.";
  }
  if (data.startDate < todayString()) {
    return "Дата початку не може бути в минулому.";
  }
  if (hasOverlap(data)) {
    return "Комп'ютер уже заброньований або виданий на цей період.";
  }
  return null;
}

// Підказка під формою показує доступність ще до натискання кнопки.
function updateAvailabilityHint() {
  const hint = document.getElementById("availability-hint");
  const data = readBookingForm();
  let text;
  let kind;

  if (data.computerId === "" || data.startDate === "" || data.endDate === "") {
    text = "Оберіть комп'ютер і період, щоб перевірити доступність.";
    kind = "idle";
  } else if (data.endDate < data.startDate) {
    text = "Дата завершення раніше дати початку.";
    kind = "error";
  } else if (hasOverlap(data)) {
    text = "На цей період комп'ютер зайнятий.";
    kind = "error";
  } else {
    text = "На цей період комп'ютер вільний.";
    kind = "ok";
  }

  hint.textContent = text;
  hint.className = "hint hint-" + kind;
}

// Статус комп'ютера обчислюється за його бронюваннями.
async function syncComputerStatus(computerId) {
  const bookings = (await fetchJson("/bookings")).filter(
    (booking) => booking.computerId === computerId
  );
  let status = "available";
  if (bookings.some((booking) => booking.status === "rented")) {
    status = "rented";
  } else if (bookings.some((booking) => booking.status === "booked")) {
    status = "booked";
  }
  await sendJson(`/computers/${computerId}`, "PATCH", { status: status });
}

async function saveBooking(event) {
  event.preventDefault();

  const data = { ...readBookingForm(), status: "booked" };

  const error = validateBooking(data);
  if (error) {
    showBookingMessage(error);
    return;
  }

  try {
    await sendJson("/bookings", "POST", data);
    await syncComputerStatus(data.computerId);
    document.getElementById("booking-form").reset();
    document.getElementById("booking-end").min = todayString();
    showBookingMessage("Бронювання створено.", false);
    await loadData();
  } catch (error) {
    showBookingMessage("Не вдалося створити бронювання. Перевірте, чи запущено JSON Server.");
  }
}

async function changeBookingStatus(booking, newStatus) {
  if (newStatus === "rented") {
    const busy = allBookings.some(
      (item) => item.computerId === booking.computerId && item.status === "rented"
    );
    if (busy) {
      showBookingMessage("Комп'ютер ще не повернуто з попередньої видачі.");
      return;
    }
  }

  try {
    await sendJson(`/bookings/${booking.id}`, "PATCH", { status: newStatus });
    await syncComputerStatus(booking.computerId);
    showBookingMessage(
      newStatus === "rented" ? "Комп'ютер видано." : "Комп'ютер повернено.",
      false
    );
    loadData();
  } catch (error) {
    showBookingMessage("Не вдалося змінити статус бронювання.");
  }
}

async function cancelBooking(booking) {
  if (!confirm("Скасувати це бронювання?")) {
    return;
  }
  try {
    await sendJson(`/bookings/${booking.id}`, "DELETE");
    await syncComputerStatus(booking.computerId);
    showBookingMessage("Бронювання скасовано.", false);
    loadData();
  } catch (error) {
    showBookingMessage("Не вдалося скасувати бронювання.");
  }
}

function isOverdue(booking) {
  return booking.status === "rented" && booking.endDate < todayString();
}

function matchesBookingFilter(booking) {
  if (bookingFilter === "") {
    return true;
  }
  if (bookingFilter === "overdue") {
    return isOverdue(booking);
  }
  return booking.status === bookingFilter;
}

function updateBookingStats() {
  const count = (status) =>
    allBookings.filter((booking) => booking.status === status).length;

  setText("stat-b-all", allBookings.length);
  setText("stat-b-booked", count("booked"));
  setText("stat-b-rented", count("rented"));
  setText("stat-b-overdue", allBookings.filter(isOverdue).length);
  setText("stat-b-returned", count("returned"));

  for (const button of document.querySelectorAll(".stat")) {
    button.setAttribute("aria-pressed", String(button.dataset.status === bookingFilter));
  }
}

function renderBookings() {
  const tbody = document.getElementById("bookings-body");
  tbody.innerHTML = "";
  updateBookingStats();

  const visible = allBookings
    .filter(matchesBookingFilter)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  if (visible.length === 0) {
    const text =
      allBookings.length === 0
        ? "Бронювань ще немає. Створіть перше у формі ліворуч."
        : "Немає бронювань з таким статусом.";
    tbody.appendChild(emptyRow(5, text));
    return;
  }

  for (const booking of visible) {
    const row = document.createElement("tr");

    row.appendChild(textCell(computerName(booking.computerId), "name"));
    row.appendChild(textCell(clientName(booking.clientId)));
    row.appendChild(
      textCell(
        `${formatDate(booking.startDate)} — ${formatDate(booking.endDate)}`,
        "nowrap"
      )
    );

    const statusCell = document.createElement("td");
    statusCell.appendChild(
      statusPill(booking.status, BOOKING_STATUS_LABELS[booking.status] || booking.status)
    );
    if (isOverdue(booking)) {
      const tag = document.createElement("span");
      tag.className = "tag-overdue";
      tag.textContent = "Прострочено";
      statusCell.appendChild(tag);
    }
    row.appendChild(statusCell);

    const actionsCell = document.createElement("td");
    actionsCell.className = "actions";
    if (booking.status === "booked") {
      actionsCell.append(
        makeButton("Видати", () => changeBookingStatus(booking, "rented"), "main"),
        makeButton("Скасувати", () => cancelBooking(booking), "danger")
      );
    } else if (booking.status === "rented") {
      actionsCell.append(
        makeButton("Повернути", () => changeBookingStatus(booking, "returned"), "main")
      );
    }
    row.appendChild(actionsCell);

    tbody.appendChild(row);
  }
}

/* ---------- Клієнти ---------- */

function clientBookings(clientId) {
  return allBookings.filter((b) => String(b.clientId) === String(clientId));
}

// Що клієнт має зараз: виданий комп'ютер, бронювання або нічого.
function clientState(clientId) {
  const list = clientBookings(clientId);
  if (list.some((b) => b.status === "rented")) {
    return "rented";
  }
  if (list.some((b) => b.status === "booked")) {
    return "booked";
  }
  return "idle";
}

function validateClient(data) {
  if (data.name === "") {
    return "Вкажіть ім'я клієнта.";
  }
  if (!/^\+380\d{9}$/.test(data.phone)) {
    return "Телефон має бути у форматі +380XXXXXXXXX.";
  }
  const duplicate = allClients.some(
    (c) => c.phone === data.phone && String(c.id) !== String(editingClientId)
  );
  if (duplicate) {
    return "Клієнт із таким телефоном уже існує.";
  }
  return null;
}

async function saveClient(event) {
  event.preventDefault();

  const data = {
    name: document.getElementById("client-name").value.trim(),
    phone: document.getElementById("client-phone").value.trim(),
  };

  const error = validateClient(data);
  if (error) {
    showMessage(error, true, "client-message");
    return;
  }

  const isEdit = editingClientId !== null;
  try {
    if (isEdit) {
      await sendJson(`/clients/${editingClientId}`, "PATCH", data);
    } else {
      await sendJson("/clients", "POST", data);
    }
    resetClientForm();
    showMessage(isEdit ? "Зміни збережено." : "Клієнта додано.", false, "client-message");
    loadData();
  } catch (error) {
    showMessage("Не вдалося зберегти клієнта. Перевірте, чи запущено JSON Server.", true, "client-message");
  }
}

function startClientEdit(client) {
  editingClientId = client.id;
  document.getElementById("client-name").value = client.name;
  document.getElementById("client-phone").value = client.phone;
  document.getElementById("client-form-title").textContent = "Редагувати клієнта";
  document.getElementById("client-submit").textContent = "Зберегти зміни";
  document.getElementById("client-cancel").hidden = false;
  document.getElementById("client-name").focus();
  showMessage("", true, "client-message");
}

function resetClientForm() {
  editingClientId = null;
  document.getElementById("client-form").reset();
  document.getElementById("client-form-title").textContent = "Додати клієнта";
  document.getElementById("client-submit").textContent = "Додати";
  document.getElementById("client-cancel").hidden = true;
}

async function deleteClient(client) {
  if (clientBookings(client.id).length > 0) {
    showMessage("Не можна видалити клієнта, у якого є бронювання.", true, "client-message");
    return;
  }
  if (!confirm(`Видалити клієнта «${client.name}»?`)) {
    return;
  }

  try {
    await sendJson(`/clients/${client.id}`, "DELETE");
    showMessage("Клієнта видалено.", false, "client-message");
    loadData();
  } catch (error) {
    showMessage("Не вдалося видалити клієнта.", true, "client-message");
  }
}

function updateClientStats() {
  const counts = { rented: 0, booked: 0, idle: 0 };
  for (const client of allClients) {
    counts[clientState(client.id)]++;
  }
  setText("stat-c-all", allClients.length);
  setText("stat-c-rented", counts.rented);
  setText("stat-c-booked", counts.booked);
  setText("stat-c-idle", counts.idle);
  for (const button of document.querySelectorAll(".stat")) {
    button.setAttribute("aria-pressed", String(button.dataset.status === clientFilter));
  }
}

function renderClients() {
  updateClientStats();

  const query = document.getElementById("client-search").value.trim().toLowerCase();
  const shown = allClients.filter((client) => {
    const matches =
      client.name.toLowerCase().includes(query) || client.phone.includes(query);
    return matches && (clientFilter === "" || clientState(client.id) === clientFilter);
  });

  const tbody = document.getElementById("clients-body");
  tbody.innerHTML = "";
  if (shown.length === 0) {
    tbody.appendChild(
      emptyRow(5, allClients.length === 0 ? "Клієнтів ще немає. Додайте першого." : "Нічого не знайдено. Змініть пошук або фільтр.")
    );
    return;
  }

  for (const client of shown) {
    const row = document.createElement("tr");
    row.appendChild(textCell(client.name, "name"));
    row.appendChild(textCell(client.phone, "nowrap"));
    row.appendChild(textCell(String(clientBookings(client.id).length), "nowrap"));

    const stateCell = document.createElement("td");
    const state = clientState(client.id);
    if (state === "rented") {
      stateCell.appendChild(statusPill("rented", "Має комп'ютер"));
    } else if (state === "booked") {
      stateCell.appendChild(statusPill("booked", "Є бронювання"));
    } else {
      stateCell.textContent = "—";
    }
    row.appendChild(stateCell);

    const actions = document.createElement("td");
    actions.className = "actions";
    actions.appendChild(makeButton("Змінити", () => startClientEdit(client)));
    actions.appendChild(makeButton("Видалити", () => deleteClient(client), "danger"));
    row.appendChild(actions);

    tbody.appendChild(row);
  }
}

/* ---------- Події ---------- */

if (hasComputersPage) {
  document.getElementById("computer-form").addEventListener("submit", saveComputer);
  document.getElementById("cancel-button").addEventListener("click", resetForm);
  document.getElementById("search").addEventListener("input", applyFilters);
  document.getElementById("filter-type").addEventListener("change", applyFilters);
  document.getElementById("filter-status").addEventListener("change", applyFilters);
  document.getElementById("sort").addEventListener("change", applyFilters);

  // Клік по смузі статусів вмикає або вимикає фільтр за статусом.
  for (const button of document.querySelectorAll(".stat")) {
    button.addEventListener("click", () => {
      const select = document.getElementById("filter-status");
      select.value = select.value === button.dataset.status ? "" : button.dataset.status;
      applyFilters();
    });
  }
}

if (hasBookingsPage) {
  const startInput = document.getElementById("booking-start");
  const endInput = document.getElementById("booking-end");

  startInput.min = todayString();
  endInput.min = todayString();
  startInput.addEventListener("input", () => {
    endInput.min = startInput.value || todayString();
    updateAvailabilityHint();
  });
  endInput.addEventListener("input", updateAvailabilityHint);
  document.getElementById("booking-computer").addEventListener("change", updateAvailabilityHint);
  document.getElementById("booking-form").addEventListener("submit", saveBooking);

  for (const button of document.querySelectorAll(".stat")) {
    button.addEventListener("click", () => {
      bookingFilter = bookingFilter === button.dataset.status ? "" : button.dataset.status;
      renderBookings();
    });
  }
}

if (hasClientsPage) {
  document.getElementById("client-form").addEventListener("submit", saveClient);
  document.getElementById("client-cancel").addEventListener("click", resetClientForm);
  document.getElementById("client-search").addEventListener("input", renderClients);

  for (const button of document.querySelectorAll(".stat")) {
    button.addEventListener("click", () => {
      clientFilter = clientFilter === button.dataset.status ? "" : button.dataset.status;
      renderClients();
    });
  }
}

loadData();

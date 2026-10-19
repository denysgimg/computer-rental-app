const API_URL = "http://localhost:3000";

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

/* ---------- Робота з сервером ---------- */

async function fetchJson(path) {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) {
    throw new Error("Помилка сервера: " + response.status);
  }
  return response.json();
}

async function sendJson(path, method, body) {
  const response = await fetch(`${API_URL}${path}`, {
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
    applyFilters();
    fillBookingSelects();
    renderBookings();
  } catch (error) {
    showMessage("Не вдалося завантажити дані. Перевірте, чи запущено json-server.");
  }
}

/* ---------- Повідомлення ---------- */

function showMessage(text, isError = true, elementId = "message") {
  const message = document.getElementById(elementId);
  message.textContent = text;
  message.style.color = isError ? "#b00020" : "#1b7f3b";
}

function showBookingMessage(text, isError = true) {
  showMessage(text, isError, "booking-message");
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

  renderComputers(result);
}

function renderComputers(computers) {
  const tbody = document.getElementById("computers-body");
  tbody.innerHTML = "";

  if (computers.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 7;
    cell.textContent = "Нічого не знайдено.";
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  for (const computer of computers) {
    const row = document.createElement("tr");
    const values = [
      computer.id,
      computer.name,
      computer.type,
      computer.cpu,
      computer.ram,
      STATUS_LABELS[computer.status] || computer.status,
    ];
    for (const value of values) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    }

    const actionsCell = document.createElement("td");
    actionsCell.append(
      makeButton("Редагувати", () => startEdit(computer)),
      makeButton("Видалити", () => deleteComputer(computer))
    );
    row.appendChild(actionsCell);

    tbody.appendChild(row);
  }
}

function makeButton(text, onClick) {
  const button = document.createElement("button");
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
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
    showMessage("Не вдалося зберегти комп'ютер. Перевірте json-server.");
  }
}

function startEdit(computer) {
  editingId = computer.id;
  document.getElementById("name").value = computer.name;
  document.getElementById("type").value = computer.type;
  document.getElementById("cpu").value = computer.cpu;
  document.getElementById("ram").value = computer.ram;
  document.getElementById("form-title").textContent = "Редагувати комп'ютер";
  document.getElementById("submit-button").textContent = "Зберегти";
  document.getElementById("cancel-button").hidden = false;
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

function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

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

  const data = {
    computerId: document.getElementById("booking-computer").value,
    clientId: document.getElementById("booking-client").value,
    startDate: document.getElementById("booking-start").value,
    endDate: document.getElementById("booking-end").value,
    status: "booked",
  };

  const error = validateBooking(data);
  if (error) {
    showBookingMessage(error);
    return;
  }

  try {
    await sendJson("/bookings", "POST", data);
    await syncComputerStatus(data.computerId);
    document.getElementById("booking-form").reset();
    showBookingMessage("Бронювання створено.", false);
    loadData();
  } catch (error) {
    showBookingMessage("Не вдалося створити бронювання. Перевірте json-server.");
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

function renderBookings() {
  const tbody = document.getElementById("bookings-body");
  tbody.innerHTML = "";

  if (allBookings.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = "Бронювань поки немає.";
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  const sorted = [...allBookings].sort((a, b) =>
    b.startDate.localeCompare(a.startDate)
  );

  for (const booking of sorted) {
    const row = document.createElement("tr");
    const values = [
      computerName(booking.computerId),
      clientName(booking.clientId),
      booking.startDate,
      booking.endDate,
      BOOKING_STATUS_LABELS[booking.status] || booking.status,
    ];
    for (const value of values) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    }

    const actionsCell = document.createElement("td");
    if (booking.status === "booked") {
      actionsCell.append(
        makeButton("Видати", () => changeBookingStatus(booking, "rented")),
        makeButton("Скасувати", () => cancelBooking(booking))
      );
    } else if (booking.status === "rented") {
      actionsCell.append(
        makeButton("Повернути", () => changeBookingStatus(booking, "returned"))
      );
    } else {
      actionsCell.textContent = "—";
    }
    row.appendChild(actionsCell);

    tbody.appendChild(row);
  }
}

/* ---------- Події ---------- */

document.getElementById("computer-form").addEventListener("submit", saveComputer);
document.getElementById("cancel-button").addEventListener("click", resetForm);
document.getElementById("search").addEventListener("input", applyFilters);
document.getElementById("filter-type").addEventListener("change", applyFilters);
document.getElementById("filter-status").addEventListener("change", applyFilters);
document.getElementById("sort").addEventListener("change", applyFilters);
document.getElementById("booking-form").addEventListener("submit", saveBooking);

loadData();
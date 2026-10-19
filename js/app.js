const API_URL = "http://localhost:3000";

const STATUS_LABELS = {
  available: "Вільний",
  booked: "Заброньований",
  rented: "Виданий",
};

let editingId = null;

async function loadComputers() {
  try {
    const response = await fetch(`${API_URL}/computers`);
    if (!response.ok) {
      throw new Error("Помилка сервера: " + response.status);
    }
    const computers = await response.json();
    renderComputers(computers);
  } catch (error) {
    showMessage("Не вдалося завантажити дані. Перевірте, чи запущено json-server.");
  }
}

function renderComputers(computers) {
  const tbody = document.getElementById("computers-body");
  tbody.innerHTML = "";

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

    const editButton = document.createElement("button");
    editButton.textContent = "Редагувати";
    editButton.addEventListener("click", () => startEdit(computer));

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Видалити";
    deleteButton.addEventListener("click", () => deleteComputer(computer));

    actionsCell.append(editButton, deleteButton);
    row.appendChild(actionsCell);

    tbody.appendChild(row);
  }
}

function showMessage(text, isError = true) {
  const message = document.getElementById("message");
  message.textContent = text;
  message.style.color = isError ? "#b00020" : "#1b7f3b";
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

  const url = isEdit ? `${API_URL}/computers/${editingId}` : `${API_URL}/computers`;
  const method = isEdit ? "PATCH" : "POST";

  try {
    const response = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Помилка сервера: " + response.status);
    }
    resetForm();
    showMessage(isEdit ? "Зміни збережено." : "Комп'ютер додано.", false);
    loadComputers();
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
    const response = await fetch(`${API_URL}/computers/${computer.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Помилка сервера: " + response.status);
    }
    showMessage("Комп'ютер видалено.", false);
    loadComputers();
  } catch (error) {
    showMessage("Не вдалося видалити комп'ютер.");
  }
}

document.getElementById("computer-form").addEventListener("submit", saveComputer);
document.getElementById("cancel-button").addEventListener("click", resetForm);

loadComputers();
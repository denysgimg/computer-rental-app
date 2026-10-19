const API_URL = "http://localhost:3000";

const STATUS_LABELS = {
  available: "Вільний",
  booked: "Заброньований",
  rented: "Виданий",
};

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

async function addComputer(event) {
  event.preventDefault();

  const data = {
    name: document.getElementById("name").value.trim(),
    type: document.getElementById("type").value,
    cpu: document.getElementById("cpu").value.trim(),
    ram: Number(document.getElementById("ram").value),
    status: "available",
  };

  const error = validateComputer(data);
  if (error) {
    showMessage(error);
    return;
  }

  try {
    const response = await fetch(`${API_URL}/computers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Помилка сервера: " + response.status);
    }
    event.target.reset();
    showMessage("Комп'ютер додано.", false);
    loadComputers();
  } catch (error) {
    showMessage("Не вдалося зберегти комп'ютер. Перевірте json-server.");
  }
}

document.getElementById("computer-form").addEventListener("submit", addComputer);

loadComputers();
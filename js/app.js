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

function showMessage(text) {
  document.getElementById("message").textContent = text;
}

loadComputers();
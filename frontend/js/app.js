const API_URL = "http://localhost:3000";

const userId = document.getElementById("userId");
const endpoint = document.getElementById("endpoint");
const sendBtn = document.getElementById("sendBtn");
const responseBox = document.getElementById("response");
const total = document.getElementById("total");
const allowed = document.getElementById("allowed");
const blocked = document.getElementById("blocked");
const users = document.getElementById("users");
const historyList = document.getElementById("historyList");

const state = {
  history: []
};

function setButtonLoading(isLoading) {
  sendBtn.disabled = isLoading;
  sendBtn.textContent = isLoading ? "Sending..." : "Send Request";
}

function renderHistory() {
  if (!historyList) {
    return;
  }

  if (state.history.length === 0) {
    historyList.innerHTML = '<li class="history-empty">No requests yet.</li>';
    return;
  }

  historyList.innerHTML = state.history
    .map((item) => {
      const badgeClass = item.decision === "BLOCKED" ? "badge blocked" : "badge allowed";
      return `
        <li class="history-item">
          <div class="history-top">
            <strong>User ${item.userId}</strong>
            <span class="${badgeClass}">${item.decision}</span>
          </div>
          <div class="history-meta">${item.method} ${item.endpoint}</div>
          <div class="history-time">${item.timestamp}</div>
        </li>
      `;
    })
    .join("");
}

function showResponse(message) {
  responseBox.textContent = message;
}

async function loadHistory() {
  try {
    const response = await fetch(`${API_URL}/api/history`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    state.history = Array.isArray(data.requests) ? data.requests : [];
    renderHistory();
  } catch (error) {
    console.error("History Error:", error);
  }
}

async function sendRequest() {
  const user = userId.value.trim();
  const selectedEndpoint = endpoint.value;

  if (!/^\d+$/.test(user)) {
    showResponse("Please enter a valid User ID.");
    return;
  }

  if (!selectedEndpoint) {
    showResponse("Please select an endpoint.");
    return;
  }

  setButtonLoading(true);
  showResponse("Sending request...");

  try {
    const response = await fetch(`${API_URL}/api/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: user,
        endpoint: selectedEndpoint
      })
    });

    let data;

    try {
      data = await response.json();
    } catch (error) {
      data = { error: "Unable to parse backend response." };
    }

    if (!response.ok) {
      const message = data.error || `HTTP ${response.status}`;
      showResponse(message);
      setButtonLoading(false);
      return;
    }

    showResponse(JSON.stringify(data, null, 4));
    state.history = [
      {
        userId: data.userId,
        endpoint: data.endpoint,
        method: data.method || (selectedEndpoint === "/login" || selectedEndpoint === "/orders" ? "POST" : "GET"),
        decision: data.decision,
        timestamp: data.timestamp
      },
      ...state.history
    ];
    renderHistory();
    await updateStats();
    await loadHistory();
  } catch (error) {
    console.error("Request Error:", error);
    showResponse("Unable to connect to API Traffic Gateway.");
  } finally {
    setButtonLoading(false);
  }
}

async function updateStats() {
  try {
    console.log("Fetching stats...");
    const response = await fetch(`${API_URL}/api/stats`);
    console.log(`Stats response status: ${response.status}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const stats = await response.json();
    console.log("Stats data:", stats);

    total.textContent = String(stats.totalRequests ?? 0);
    allowed.textContent = String(stats.allowedRequests ?? 0);
    blocked.textContent = String(stats.blockedRequests ?? 0);
    users.textContent = String(stats.activeUsers ?? 0);
  } catch (error) {
    console.error("Stats request failed:", error);
    total.textContent = "0";
    allowed.textContent = "0";
    blocked.textContent = "0";
    users.textContent = "0";
  }
}

sendBtn.addEventListener("click", sendRequest);

renderHistory();
updateStats();
loadHistory();
setInterval(updateStats, 1000);
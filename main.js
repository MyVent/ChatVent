const connectBtn = document.getElementById("connect-btn");
const chatContainer = document.getElementById("chat-container");
const messages = document.getElementById("messages");
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const newStranger = document.getElementById("new-stranger");

let ws = null;

// Funktion zum Hinzufügen von Nachrichten
function addMessage(msg, fromMe = false) {
    const msgDiv = document.createElement("div");
    msgDiv.textContent = fromMe ? `Du: ${msg}` : msg;
    messages.appendChild(msgDiv);
    messages.scrollTop = messages.scrollHeight;
}

// WebSocket Verbindung aufbauen
function connectToServer() {
    ws = new WebSocket("wss://DEIN_RENDER_SERVER_URL"); // Render WebSocket URL einfügen

    ws.onopen = () => {
        addMessage("Verbunden zum Server. Suche nach einem Stranger...");
        ws.send("__FIND__"); // Server nach Partner fragen
    };

    ws.onmessage = (event) => {
        const msg = event.data;

        if(msg === "__CONNECTED__") {
            addMessage("Verbunden mit einem Stranger!");
            connectBtn.style.display = "none";
            chatContainer.classList.remove("hidden");
        } else if(msg === "__DISCONNECTED__") {
            addMessage("Stranger hat die Verbindung beendet.");
        } else {
            addMessage(msg);
        }
    };

    ws.onclose = () => {
        addMessage("Verbindung getrennt.");
        connectBtn.style.display = "inline-block";
        chatContainer.classList.add("hidden");
    };
}

// Connect Button Event
connectBtn.addEventListener("click", () => {
    connectToServer();
});

// Nachrichten senden
chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = messageInput.value.trim();
    if(msg && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
        addMessage(msg, true);
        messageInput.value = "";
    }
});

// Neuer Stranger
newStranger.addEventListener("click", () => {
    if(ws && ws.readyState === WebSocket.OPEN) {
        ws.send("__FIND__");
        addMessage("Suche neuen Stranger...");
    }
});

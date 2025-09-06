const messages = document.getElementById("messages");
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const newStranger = document.getElementById("new-stranger");

let ws = null;

// Nachricht hinzufügen
function addMessage(msg, fromMe = false) {
    const msgDiv = document.createElement("div");
    msgDiv.textContent = fromMe ? `Du: ${msg}` : msg;
    messages.appendChild(msgDiv);
    messages.scrollTop = messages.scrollHeight;
}

// Verbindung zum Server aufbauen und automatisch Stranger suchen
function initChat() {
    ws = new WebSocket("wws://chatvent.onrender.com"); // Hier Render URL einfügen

    ws.onopen = () => {
        addMessage("Verbunden zum Server. Suche nach einem Stranger...");
        ws.send("__FIND__");
    };

    ws.onmessage = (event) => {
        const msg = event.data;

        if(msg === "__CONNECTED__") {
            addMessage("Verbunden mit einem Stranger!");
        } else if(msg === "__DISCONNECTED__") {
            addMessage("Stranger hat die Verbindung beendet.");
        } else {
            addMessage(msg);
        }
    };

    ws.onclose = () => {
        addMessage("Verbindung getrennt.");
    };
}

// Chat initialisieren
initChat();

// Nachricht senden
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

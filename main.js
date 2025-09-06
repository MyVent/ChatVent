const messages = document.getElementById("messages");
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const newStranger = document.getElementById("new-stranger");

let ws = null;

// Nachricht hinzufügen
function addMessage(msg, type = "stranger") {
    const msgDiv = document.createElement("div");
    msgDiv.textContent = msg;
    msgDiv.classList.add("message");
    msgDiv.classList.add(type);
    messages.appendChild(msgDiv);
    messages.scrollTop = messages.scrollHeight;
}

// Verbindung starten
function initChat() {
    ws = new WebSocket("wss://chatvent.onrender.com"); // Render URL einfügen

    ws.onopen = () => {
        addMessage("Verbunden zum Server. Suche nach einem Stranger...", "stranger");
        ws.send("__FIND__");
    };

    ws.onmessage = async (event) => {
        let msg;

        if(event.data instanceof Blob) {
            msg = await event.data.text();
        } else {
            msg = event.data;
        }

        if(msg === "__CONNECTED__") {
            addMessage("Verbunden mit einem Stranger!", "stranger");
        } else if(msg === "__DISCONNECTED__") {
            addMessage("Stranger hat die Verbindung beendet.", "stranger");
        } else if(msg === "__FIND__") {
            return; // Steuerbefehl ignorieren
        } else {
            addMessage(msg, "stranger");
        }
    };

    ws.onclose = () => {
        addMessage("Verbindung getrennt.", "stranger");
    };
}

initChat();

// Eigene Nachrichten senden
chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = messageInput.value.trim();
    if(msg && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
        addMessage(msg, "self");
        messageInput.value = "";
    }
});

// Neuer Stranger
newStranger.addEventListener("click", () => {
    if(ws && ws.readyState === WebSocket.OPEN) {
        addMessage("Trenne alte Verbindung und suche neuen Stranger...", "stranger");
        ws.send("__FIND__");
    }
});

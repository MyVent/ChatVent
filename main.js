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
    msgDiv.classList.add(type); // "self" oder "stranger"
    messages.appendChild(msgDiv);
    messages.scrollTop = messages.scrollHeight;
}

// Verbindung aufbauen und Stranger suchen
function initChat() {
    ws = new WebSocket("wss://chatvent.onrender.com"); // Render WebSocket URL einfügen

    ws.onopen = () => {
        addMessage("Verbunden zum Server. Suche nach einem Stranger...", "stranger");
        ws.send("__FIND__"); // Partner suchen
    };

    ws.onmessage = async (event) => {
        let msg;

        // Prüfen ob die Nachricht ein Blob ist
        if(event.data instanceof Blob) {
            msg = await event.data.text(); 
        } else {
            msg = event.data;
        }

        // Steuer-Nachrichten abfangen
        if(msg === "__CONNECTED__") {
            addMessage("Verbunden mit einem Stranger!", "stranger");
        } else if(msg === "__DISCONNECTED__") {
            addMessage("Stranger hat die Verbindung beendet.", "stranger");
        } else if(msg === "__FIND__") {
            // Ignorieren, wird nur intern verwendet
            return;
        } else {
            addMessage(msg, "stranger"); // Nachricht vom Stranger
        }
    };

    ws.onclose = () => {
        addMessage("Verbindung getrennt.", "stranger");
    };
}

// Chat starten
initChat();

// Eigene Nachrichten senden
chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = messageInput.value.trim();
    if(msg && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
        addMessage(msg, "self"); // Eigene Nachricht
        messageInput.value = "";
    }
});

// Neuer Stranger
newStranger.addEventListener("click", () => {
    if(ws && ws.readyState === WebSocket.OPEN) {
        // Alte Verbindung zum Partner trennen
        if(ws.partner) {
            ws.partner = null;
        }

        // Status im Chat anzeigen
        addMessage("Trenne alte Verbindung und suche neuen Stranger...", "stranger");

        // Partner neu suchen
        ws.send("__FIND__");
    }
});

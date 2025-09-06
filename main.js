let ws = null;
const messages = document.getElementById('messages');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const newStranger = document.getElementById('new-stranger');
const connectBtn = document.getElementById('connect-btn');
const chatContainer = document.getElementById('chat-container');

// Connect-Button Funktion
connectBtn.addEventListener('click', () => {
    ws = new WebSocket('wss://DEIN_RENDER_SERVER_URL'); // hier Render WebSocket URL einfügen

    ws.onopen = () => {
        connectBtn.style.display = 'none';
        chatContainer.classList.remove('hidden');
        addMessage("Verbunden! Warte auf einen Stranger...");
    };

    ws.onmessage = (event) => {
        addMessage(event.data);
    };

    ws.onclose = () => {
        addMessage("Verbindung getrennt.");
        connectBtn.style.display = 'inline-block';
        chatContainer.classList.add('hidden');
    };
});

// Nachrichten senden
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = messageInput.value.trim();
    if(ws && ws.readyState === WebSocket.OPEN && msg){
        ws.send(msg);
        addMessage("Du: " + msg);
        messageInput.value = '';
    }
});

// Neuer Stranger
newStranger.addEventListener('click', () => {
    if(ws && ws.readyState === WebSocket.OPEN){
        ws.send('__NEW__');
        addMessage("Suche neuen Stranger...");
    }
});

// Nachricht im Chat anzeigen
function addMessage(msg){
    const msgDiv = document.createElement('div');
    msgDiv.textContent = msg;
    messages.appendChild(msgDiv);
    messages.scrollTop = messages.scrollHeight;
}

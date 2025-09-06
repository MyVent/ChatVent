// vorher: const ws = new WebSocket('ws://localhost:3000');
const ws = new WebSocket('wss://DEIN_RENDER_SERVER_URL');
const messages = document.getElementById('messages');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const newStranger = document.getElementById('new-stranger');

ws.onmessage = (event) => {
    const msgDiv = document.createElement('div');
    msgDiv.textContent = event.data;
    messages.appendChild(msgDiv);
    messages.scrollTop = messages.scrollHeight;
};

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = messageInput.value.trim();
    if(msg){
        ws.send(msg);
        messageInput.value = '';
    }
});

newStranger.addEventListener('click', () => {
    ws.send('__NEW__'); // Signal für neuen Partner
});

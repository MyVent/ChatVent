const messages = document.getElementById("messages");
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const newStranger = document.getElementById("new-stranger");

let ws = null;
let connected = false;

function addMessage(msg,type="stranger"){
    const div = document.createElement("div");
    div.textContent = msg;
    div.classList.add("message", type);
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

function initChat(){
    ws = new WebSocket("wss://chatvent.onrender.com"); // Render URL einfügen

    ws.onopen = ()=>{
        addMessage("Verbunden mit Stranger!", "stranger");
    }

    ws.onmessage = async (event)=>{
        let msg;
        if(event.data instanceof Blob){
            msg = await event.data.text();
        } else {
            msg = event.data;
        }

        if(msg === "__CONNECTED__"){
            connected = true;
            addMessage("Verbunden mit einem Stranger!", "stranger");
        } else {
            addMessage(msg,"stranger");
        }
    }

    ws.onclose = ()=>{
        connected = false;
        addMessage("Verbindung getrennt.", "stranger");
    }
}

initChat();

// Eigene Nachrichten senden
chatForm.addEventListener("submit", e=>{
    e.preventDefault();
    const msg = messageInput.value.trim();
    if(msg && ws && ws.readyState===WebSocket.OPEN){
        ws.send(msg);
        addMessage(msg,"self");
        messageInput.value="";
    }
})

// Neuer Stranger → Verbindung trennen und neue Direktverbindung
newStranger.addEventListener("click", ()=>{
    if(ws && ws.readyState===WebSocket.OPEN){
        ws.close(); // Alte Verbindung trennen
        addMessage("Suche neuen Stranger...", "stranger");
        setTimeout(initChat, 500); // Neue Verbindung aufbauen
    }
})

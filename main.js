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
        connected = true;
        addMessage("Verbunden mit einem Stranger!", "stranger");
    }

    ws.onmessage = async (event)=>{
        let msg;
        if(event.data instanceof Blob){
            msg = await event.data.text();
        } else {
            msg = event.data;
        }

        addMessage(msg,"stranger");
    }

    ws.onclose = ()=>{
        connected = false;
        addMessage("Verbindung getrennt.", "stranger");
    }
}

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

// Neuer Stranger Button
newStranger.addEventListener("click", ()=>{
    if(ws && ws.readyState===WebSocket.OPEN){
        ws.close(); // alte Verbindung trennen
        addMessage("Suche neuen Stranger...", "stranger");
        setTimeout(() => initChat(), 500); // neue Verbindung starten
    } else {
        initChat(); // keine alte Verbindung
    }
})

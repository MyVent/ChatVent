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

function connectToStranger(){
    if(!ws || ws.readyState !== WebSocket.OPEN){
        ws = new WebSocket("wss://chatvent.onrender.com"); // Render URL einfügen

        ws.onopen = ()=>{
            ws.send("__FIND__");
            addMessage("Suche nach einem Stranger...", "stranger");
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
            } else if(msg === "__WAITING__"){
                connected = false;
                addMessage("Warte auf einen Stranger...", "stranger");
            } else if(msg === "__DISCONNECTED__"){
                connected = false;
                addMessage("Stranger hat die Verbindung beendet.", "stranger");
            } else {
                if(connected) addMessage(msg,"stranger");
            }
        }

        ws.onclose = ()=>{
            connected = false;
            addMessage("Verbindung getrennt.", "stranger");
        }
    } else {
        // Wenn schon WebSocket offen, nur neue Verbindung suchen
        if(connected){
            connected = false;
            addMessage("Verbindung zum alten Stranger getrennt. Suche neuen Stranger...", "stranger");
        }
        ws.send("__FIND__");
    }
}

// Eigene Nachricht senden
chatForm.addEventListener("submit", e=>{
    e.preventDefault();
    const msg = messageInput.value.trim();
    if(msg && ws && ws.readyState===WebSocket.OPEN && connected){
        ws.send(msg);
        addMessage(msg,"self");
        messageInput.value="";
    }
})

// Neuer Stranger Button
newStranger.addEventListener("click", ()=>{
    connectToStranger();
})

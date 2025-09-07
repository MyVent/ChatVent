const WS_SERVER = window.__CHATVENT_WS__ || "wss://chatvent.onrender.com";

let ws = null;
let paired = false;
const statusEl = document.getElementById("status");
const btnConnect = document.getElementById("btn-connect");
const btnDisconnect = document.getElementById("btn-disconnect");
const messagesEl = document.getElementById("messages");
const form = document.getElementById("msg-form");
const input = document.getElementById("msg-input");
const countrySelect = document.getElementById("country-select");

let typingIndicator = null;

// HELPER
function logMessage(text, who="them") {
  const div = document.createElement("div");
  div.className = "message " + (who==="me"?"me":"them");
  const meta = document.createElement("div"); meta.className="meta";
  meta.textContent = who==="me"?"You":"Stranger";
  const body = document.createElement("div"); body.className="body";
  body.textContent=text;
  div.appendChild(meta); div.appendChild(body);
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function showTyping(show) {
  if(show) {
    if(!typingIndicator){
      typingIndicator = document.createElement("div");
      typingIndicator.className = "message them typing";
      typingIndicator.textContent = "Stranger is typing...";
      messagesEl.appendChild(typingIndicator);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  } else {
    if(typingIndicator){
      typingIndicator.remove();
      typingIndicator = null;
    }
  }
}

function setStatus(s){ statusEl.textContent = s; }

function connectWS(){
  if(ws) return;
  setStatus("connecting...");
  ws = new WebSocket(WS_SERVER + "/ws");

  ws.addEventListener("open", ()=>{
    setStatus("online — ready");
    btnConnect.disabled = false;
  });

  ws.addEventListener("message", ev=>{
    try{
      const msg = JSON.parse(ev.data);
      handleServerMessage(msg);
    }catch(e){
      console.warn("invalid message", ev.data);
    }
  });

  ws.addEventListener("close", ()=>{
    setStatus("offline");
    ws=null;
    paired=false;
    btnConnect.disabled=false;
    btnDisconnect.disabled=true;
    showTyping(false);
  });
}

function handleServerMessage(msg){
  switch(msg.type){
    case "paired":
      paired=true;
      setStatus(`paired with ${msg.country||'unknown'}`);
      btnDisconnect.disabled=false;
      btnConnect.disabled=true;
      logMessage(`You are now connected to a stranger from ${msg.country||'unknown'}. Say hi!`, 'them');
      break;
    case "msg":
      logMessage(msg.text,'them');
      break;
    case "system":
      logMessage("[system] " + msg.text,'system');
      break;
    case "typing":
      showTyping(true);
      // Entferne die Anzeige nach 2 Sekunden
      setTimeout(()=>showTyping(false), 2000);
      break;
    case "unpaired":
      paired=false;
      setStatus('waiting');
      btnDisconnect.disabled=true;
      btnConnect.disabled=false;
      logMessage("Stranger disconnected.",'system');
      messagesEl.innerHTML = '';
      showTyping(false);
      break;
  }
}

// BUTTONS
btnConnect.addEventListener("click", ()=>{
  if(!ws) connectWS();
  if(ws && ws.readyState===WebSocket.OPEN){
    const country = countrySelect ? countrySelect.value : 'any';
    ws.send(JSON.stringify({type:'find', country}));
    setStatus("searching...");
    btnConnect.disabled=true;
  }
});

btnDisconnect.addEventListener("click", ()=>{
  if(ws && ws.readyState===WebSocket.OPEN){
    ws.send(JSON.stringify({type:'leave'}));
    messagesEl.innerHTML='';
    showTyping(false);
    setStatus('offline');
    paired=false;
    btnConnect.disabled=false;
    btnDisconnect.disabled=true;
  }
});

form.addEventListener("submit", e=>{
  e.preventDefault();
  const text = input.value.trim();
  if(!text) return;
  logMessage(text,'me');
  if(ws && ws.readyState===WebSocket.OPEN && paired){
    ws.send(JSON.stringify({type:'msg', text}));
  } else {
    logMessage("Not connected. Click 'Find a Stranger' first.",'system');
  }
  input.value='';
});

input.addEventListener("input", ()=>{
  if(ws && ws.readyState===WebSocket.OPEN && paired){
    ws.send(JSON.stringify({type:'typing'}));
  }
});

// Auto-connect
connectWS();

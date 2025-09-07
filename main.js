const WS_SERVER = window.__CHATVENT_WS__ || "wss://chatvent.onrender.com";

let ws = null;
let paired = false;
const statusEl = document.getElementById("status");
const btnConnect = document.getElementById("btn-connect");
const btnDisconnect = document.getElementById("btn-disconnect");
const messagesEl = document.getElementById("messages");
const form = document.getElementById("msg-form");
const input = document.getElementById("msg-input");

// Chat-Hilfsfunktion
function logMessage(text, who="them"){
  const div = document.createElement("div");
  div.className = "message " + (who==="me"?"me":(who==="system"?"system":"them"));
  const meta = document.createElement("div"); meta.className="meta";
  meta.textContent = who==="me"?"You":(who==="system"?"System":"Stranger");
  const body = document.createElement("div"); body.className="body";
  body.textContent=text;
  div.appendChild(meta); div.appendChild(body);
  messagesEl.appendChild(div);
  messagesEl.scrollTop=messagesEl.scrollHeight;
}

function setStatus(s){ statusEl.textContent=s; }

// Verbindung
function connectWS(){
  if(ws) return;
  setStatus("connecting...");
  ws = new WebSocket(WS_SERVER+"/ws");

  ws.addEventListener("open", ()=>{
    setStatus("online — ready");
    btnConnect.disabled=false;
  });

  ws.addEventListener("message", ev=>{
    try{ handleServerMessage(JSON.parse(ev.data)); }
    catch(e){ console.warn("invalid message", ev.data); }
  });

  ws.addEventListener("close", ()=>{
    setStatus("offline"); ws=null; paired=false;
    btnDisconnect.disabled=true; btnConnect.disabled=false;
  });
}

// Servernachrichten
function handleServerMessage(msg){
  switch(msg.type){
    case "paired":
      paired=true;
      setStatus("paired");
      btnDisconnect.disabled=false; btnConnect.disabled=true;
      logMessage("You are now connected. Say hi!", "system");
      break;
    case "msg":
      logMessage(msg.text,'them');
      break;
    case "system":
      logMessage("[system] "+msg.text,'system');
      break;
    case "typing":
      setStatus("Stranger is typing...");
      break;
    case "stopTyping":
      setStatus(paired?"paired":"online — ready");
      break;
    case "unpaired":
      paired=false; setStatus('waiting');
      btnDisconnect.disabled=true; btnConnect.disabled=false;
      logMessage("Stranger disconnected.",'system');
      break;
  }
}

// Buttons
btnConnect.addEventListener("click", ()=>{
  if(!ws) connectWS();
  if(ws && ws.readyState===WebSocket.OPEN){
    const country=document.getElementById("country-select").value;
    // Wir senden unser Land an den Server
    ws.send(JSON.stringify({type:'find', countryOwn: country}));
    setStatus("searching...");
    btnConnect.disabled=true;
  }
});

btnDisconnect.addEventListener("click", ()=>{
  if(ws && ws.readyState===WebSocket.OPEN){
    ws.send(JSON.stringify({type:'leave'}));
    messagesEl.innerHTML=""; // Chat leeren
  }
});

// Nachricht senden
form.addEventListener("submit", e=>{
  e.preventDefault();
  const text=input.value.trim();
  if(!text) return;
  logMessage(text,'me');
  if(ws && ws.readyState===WebSocket.OPEN && paired){
    ws.send(JSON.stringify({type:'msg', text}));
  } else {
    logMessage("Not connected. Click 'Find a Stranger' first.",'system');
  }
  input.value='';
});

// Auto-connect
connectWS();

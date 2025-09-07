const WS_SERVER = window.__CHATVENT_WS__ || "wss://chatvent.onrender.com";

let ws = null;
let paired = false;
const statusEl = document.getElementById("status");
const btnConnect = document.getElementById("btn-connect");
const btnDisconnect = document.getElementById("btn-disconnect");
const messagesEl = document.getElementById("messages");
const form = document.getElementById("msg-form");
const input = document.getElementById("msg-input");

function logMessage(text, who="them"){
  const div = document.createElement("div");
  div.className = "message " + (who==="me"?"me":"them");
  const meta = document.createElement("div"); meta.className="meta";
  meta.textContent = who==="me"?"You":"Stranger";
  const body = document.createElement("div"); body.className="body";
  body.textContent=text;
  div.appendChild(meta); div.appendChild(body);
  messagesEl.appendChild(div);
  messagesEl.scrollTop=messagesEl.scrollHeight;
}

function setStatus(s){statusEl.textContent=s;}

function connectWS(){
  if(ws) return;
  setStatus("connecting...");
  ws=new WebSocket(WS_SERVER+"/ws");

  ws.addEventListener("open",()=>{
    setStatus("online — ready");
    btnConnect.disabled=false;
  });

  ws.addEventListener("message", ev=>{
    try{handleServerMessage(JSON.parse(ev.data));}catch(e){console.warn("invalid message", ev.data);}
  });

  ws.addEventListener("close", ()=>{
    setStatus("offline"); ws=null; paired=false;
    btnDisconnect.disabled=true; btnConnect.disabled=false;
  });
}

function handleServerMessage(msg){
  switch(msg.type){
    case "paired":
      paired=true;
      setStatus(`paired with ${msg.country||'unknown'}`);
      btnDisconnect.disabled=false; btnConnect.disabled=true;
      logMessage(`You are now connected to a stranger from ${msg.country||'unknown'}. Say hi!`,'them');
      break;
    case "msg":
      logMessage(msg.text,'them');
      break;
    case "system":
      logMessage("[system] "+msg.text,'them');
      break;
    case "unpaired":
      paired=false; setStatus('waiting');
      btnDisconnect.disabled=true; btnConnect.disabled=false;
      logMessage("Stranger disconnected.",'them');
      break;
  }
}

function handleServerMessage(msg){
  switch(msg.type){
    case "paired":
      paired = true;
      setStatus(`paired with ${msg.country || 'unknown'}`);
      btnDisconnect.disabled=false;
      btnConnect.disabled=true;
      logMessage(`You are now connected to a stranger from ${msg.country || 'unknown'}. Say hi!`, 'them');
      break;
    case "msg":
      logMessage(msg.text,'them');
      break;
    case "system":
      logMessage("[system] "+msg.text,'them');
      break;
    case "unpaired":
      paired=false;
      setStatus('waiting');
      btnDisconnect.disabled=true;
      btnConnect.disabled=false;
      logMessage("Stranger disconnected.",'them');
      break;
  }
}


btnConnect.addEventListener("click", ()=>{
  if(!ws) connectWS();
  if(ws && ws.readyState===WebSocket.OPEN){
    const country=document.getElementById("country-select").value;
    ws.send(JSON.stringify({type:'find', country}));
    setStatus("searching...");
    btnConnect.disabled=true;
  }
});

btnDisconnect.addEventListener("click", ()=>{
  if(ws && ws.readyState===WebSocket.OPEN){
    ws.send(JSON.stringify({type:'leave'}));}
});

form.addEventListener("submit", e=>{
  e.preventDefault();
  const text=input.value.trim();
  if(!text) return;
  logMessage(text,'me');
  if(ws && ws.readyState===WebSocket.OPEN && paired){
    ws.send(JSON.stringify({type:'msg', text}));
  } else {
    logMessage("Not connected. Click 'Find a Stranger' first.",'them');
  }
  input.value='';
});

connectWS();

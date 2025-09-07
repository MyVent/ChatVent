// server.js - ChatVent WebSocket Server
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

// Optional: static files if hosting client here
app.use(express.static('public'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

// Queue für wartende User
const waiting = [];
// Map socket -> peer socket
const partners = new Map();
// Map socket -> country
const countries = new Map();

function send(ws, obj){
  try{ ws.send(JSON.stringify(obj)); }catch(e){}
}

// Pairing-Funktion
function pair(a,b){
  partners.set(a,b);
  partners.set(b,a);
  send(a,{type:'paired', country:countries.get(b)});
  send(b,{type:'paired', country:countries.get(a)});
}

// Unpairing
function unpair(ws){
  const p = partners.get(ws);
  if(p){
    partners.delete(ws);
    partners.delete(p);
    try{ p.send(JSON.stringify({type:'unpaired'})); }catch(e){}
  }
}

wss.on('connection', (ws)=>{
  ws.isAlive = true;

  ws.on('pong', ()=> ws.isAlive = true);

  ws.on('message', (raw)=>{
    let msg = null;
    try{ msg = JSON.parse(raw); }catch(e){ return; }

    switch(msg.type){
      case 'find':
        // Speichere Country
        countries.set(ws, msg.country || 'any');

        // Wenn schon gepaart, ignorieren
        if(partners.has(ws)) return;

        // Suche nach passendem Partner
        let index = waiting.findIndex(s => {
          if(s.readyState !== WebSocket.OPEN) return false;
          const c1 = msg.country;
          const c2 = countries.get(s);
          return c1==='any' || c2==='any' || c1===c2;
        });

        if(index !== -1){
          const other = waiting.splice(index,1)[0];
          pair(ws, other);
        } else {
          waiting.push(ws);
          send(ws,{type:'system', text:'Waiting for a stranger...'});
        }
        break;

      case 'leave':
        unpair(ws);
        send(ws,{type:'system', text:'You left the conversation.'});
        break;

      case 'msg':
        const peer = partners.get(ws);
        if(peer && peer.readyState===WebSocket.OPEN){
          send(peer,{type:'msg', text:msg.text});
        } else {
          send(ws,{type:'system', text:'No peer connected.'});
        }
        break;

      case 'typing':
        const peerTyping = partners.get(ws);
        if(peerTyping && peerTyping.readyState===WebSocket.OPEN){
          send(peerTyping,{type:'typing'});
        }
        break;

      default: break;
    }
  });

  ws.on('close', ()=>{
    // Entferne aus Warteschlange
    const idx = waiting.indexOf(ws);
    if(idx !== -1) waiting.splice(idx,1);
    unpair(ws);
    countries.delete(ws);
  });
});

// WebSocket Upgrade
server.on('upgrade', (request, socket, head) => {
  if(request.url.startsWith('/ws')){
    wss.handleUpgrade(request, socket, head, ws=>{
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Heartbeat
setInterval(()=>{
  wss.clients.forEach(ws=>{
    if(ws.isAlive===false) return ws.terminate();
    ws.isAlive=false;
    ws.ping();
  });
},30000);

server.listen(PORT, ()=>console.log('ChatVent server listening on', PORT));

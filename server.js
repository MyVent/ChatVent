const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

const waiting = [];
const partners = new Map();
const countries = new Map();

// Hilfsfunktion zum Senden
function send(ws, obj){
  try{ ws.send(JSON.stringify(obj)); }catch(e){}
}

// Pairing-Funktion
function pair(a, b){
  partners.set(a,b);
  partners.set(b,a);

  const countryA = countries.get(a) || 'unknown';
  const countryB = countries.get(b) || 'unknown';

  // Sende an A das Land von B
  send(a, { type:'paired', country: countryB });
  // Sende an B das Land von A
  send(b, { type:'paired', country: countryA });
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
  ws.on('pong', ()=> ws.isAlive=true);

  ws.on('message', (raw)=>{
    let msg = null;
    try{ msg = JSON.parse(raw); }catch(e){ return; }

    switch(msg.type){
      case 'find':
        const selectedCountry = msg.country || 'any';
        countries.set(ws, selectedCountry);

        if(partners.has(ws)) return;

        // Versuche Partner zu finden
        let index = -1;
        if(selectedCountry !== 'any'){
          // 90% Chance auf gleichen Country
          const rand = Math.random();
          if(rand < 0.9){
            index = waiting.findIndex(s=>{
              const c = countries.get(s);
              return c===selectedCountry && s.readyState===WebSocket.OPEN;
            });
          }
        }
        // Wenn kein Country-Partner gefunden -> nimm irgendwen
        if(index === -1){
          index = waiting.findIndex(s=>s.readyState===WebSocket.OPEN);
        }

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
    const idx = waiting.indexOf(ws);
    if(idx!==-1) waiting.splice(idx,1);
    unpair(ws);
    countries.delete(ws);
  });
});

server.on('upgrade', (req, socket, head)=>{
  if(req.url.startsWith('/ws')){
    wss.handleUpgrade(req, socket, head, ws=>{
      wss.emit('connection', ws, req);
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

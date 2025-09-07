// server.js - ChatVent WebSocket Server
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

// Warteschlange & Partnerzuordnung
const waiting = [];
const partners = new Map();

function send(ws, obj){
  try{ ws.send(JSON.stringify(obj)); } catch(e){}
}

function pair(a,b){
  partners.set(a,b);
  partners.set(b,a);
  send(a,{type:'paired', country:b.country});
  send(b,{type:'paired', country:a.country});
}

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
    let msg = null; try{ msg = JSON.parse(raw) } catch(e){ return }

    switch(msg.type){
      case 'find':
        if(partners.has(ws)) return;
        ws.country = msg.country || 'any';

        // Suche passenden Partner
        let index = waiting.findIndex(s=> (s.country===ws.country || ws.country==='any' || s.country==='any') && s.readyState===WebSocket.OPEN);
        if(index !== -1){
          const other = waiting.splice(index,1)[0];
          pair(ws,other);
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
        const peerMsg = partners.get(ws);
        if(peerMsg && peerMsg.readyState===WebSocket.OPEN){
          send(peerMsg,{type:'msg', text: msg.text});
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

      default:
        break;
    }
  });

  ws.on('close', ()=>{
    const idx = waiting.indexOf(ws);
    if(idx!==-1) waiting.splice(idx,1);
    unpair(ws);
  });
});

// WebSocket Upgrade
server.on('upgrade', (req, socket, head)=>{
  if(req.url.startsWith('/ws')){
    wss.handleUpgrade(req,socket,head, ws=> wss.emit('connection', ws, req));
  } else socket.destroy();
});

// Heartbeat
setInterval(()=>{
  wss.clients.forEach(ws=>{
    if(ws.isAlive===false) return ws.terminate();
    ws.isAlive=false;
    ws.ping();
  });
}, 30000);

server.listen(PORT, ()=>console.log('ChatVent server listening on', PORT));

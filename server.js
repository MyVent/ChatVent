// server.js - WebSocket mit Länder-Pairing
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

function send(ws,obj){
  try{ ws.send(JSON.stringify(obj)); } catch(e){}
}

function pair(a,b){
  partners.set(a,b); partners.set(b,a);
  // Sende dem Client das Land des Partners
  send(a,{type:'paired', country:b.country || 'unknown'});
  send(b,{type:'paired', country:a.country || 'unknown'});
}

function unpair(ws){
  const p = partners.get(ws);
  if(p){
    partners.delete(ws);
    partners.delete(p);
    try{ p.send(JSON.stringify({type:'unpaired'})); } catch(e){}
  }
}

wss.on('connection', ws => {
  ws.isAlive = true;
  ws.on('pong', ()=> ws.isAlive = true);

  ws.on('message', raw=>{
    let msg=null; try{ msg=JSON.parse(raw); }catch(e){ return; }
    switch(msg.type){
      case 'find':
        if(partners.has(ws)) return; // schon gepaart
        ws.country = msg.country || 'any';

        // Suche einen passenden Partner
        let found=false;
        for(let i=0;i<waiting.length;i++){
          const other = waiting[i];
          if(!other || other.readyState!==WebSocket.OPEN) continue;

          // Länder-Abgleich: 'any' matcht alles
          if(ws.country==='any' || other.country==='any' || ws.country===other.country){
            waiting.splice(i,1); // entferne Partner aus Warteliste
            pair(ws,other);
            found=true;
            break;
          }
        }
        if(!found){
          waiting.push(ws);
          send(ws,{type:'system', text:'waiting for a stranger...'});
        }
        break;

      case 'leave':
        unpair(ws);
        send(ws,{type:'system', text:'left conversation.'});
        break;

      case 'msg':
        const peer = partners.get(ws);
        if(peer && peer.readyState===WebSocket.OPEN){
          send(peer,{type:'msg', text:msg.text});
        } else {
          send(ws,{type:'system', text:'No peer connected.'});
        }
        break;
    }
  });

  ws.on('close', ()=>{
    const idx = waiting.indexOf(ws);
    if(idx!==-1) waiting.splice(idx,1);
    unpair(ws);
  });
});

// WS Upgrade
server.on('upgrade', (request, socket, head)=>{
  if(request.url.startsWith('/ws')){
    wss.handleUpgrade(request,socket,head, ws=>{
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
    ws.isAlive=false; ws.ping();
  });
}, 30000);

server.listen(PORT, ()=>console.log('ChatVent server listening on',PORT));

// server.js - extended pairing server with logging & simple moderation
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static client (optional). When deploying, you may host client separately (Netlify)
app.use(express.static('public'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

// Keep a queue of sockets waiting to be paired
const waiting = [];
// Map socket -> peer socket
const partners = new Map();

// Track message counts for simple spam protection
const msgCounts = new Map();
const RATE_LIMIT = 20; // max messages per minute

function send(ws, obj){
  try{ ws.send(JSON.stringify(obj)) }catch(e){}
}

function pair(a,b){
  partners.set(a,b); partners.set(b,a);
  send(a,{type:'paired'});
  send(b,{type:'paired'});
  console.log('Paired two users');
}

function unpair(ws){
  const p = partners.get(ws);
  if(p){
    partners.delete(ws);
    partners.delete(p);
    try{ p.send(JSON.stringify({type:'unpaired'})); }catch(e){}
    console.log('Users unpaired');
  }
}

// very simple bad word filter
const bannedWords = [/nigga/i, /badword2/i];
function cleanMessage(msg){
  let clean = msg;
  for(const w of bannedWords){
    clean = clean.replace(w, '***');
  }
  return clean;
}

wss.on('connection', (ws, req)=>{
  ws.isAlive = true;
  ws.on('pong', ()=> ws.isAlive = true);

  ws.on('message', (raw)=>{
    let msg = null; try{ msg = JSON.parse(raw) }catch(e){ return }

    switch(msg.type){
      case 'find':
        if(partners.has(ws)) return;
        if(waiting.length){
          const other = waiting.shift();
          if(other && other.readyState === WebSocket.OPEN){
            pair(ws, other);
          }
        } else {
          waiting.push(ws);
          send(ws, {type:'system', text:'waiting for a stranger...'});
        }
        break;
      case 'leave':
        unpair(ws);
        send(ws,{type:'system', text:'left conversation.'});
        break;
      case 'msg':
        const now = Date.now();
        const bucket = msgCounts.get(ws) || {count:0, start:now};
        if(now - bucket.start > 60000){
          bucket.count = 0; bucket.start = now;
        }
        bucket.count++;
        msgCounts.set(ws,bucket);

        if(bucket.count > RATE_LIMIT){
          send(ws,{type:'system', text:'Rate limit exceeded. Please wait.'});
          return;
        }

        const peer = partners.get(ws);
        if(peer && peer.readyState === WebSocket.OPEN){
          const clean = cleanMessage(msg.text);
          send(peer, {type:'msg', text: clean});
        } else {
          send(ws,{type:'system', text:'No peer connected.'});
        }
        break;
      default:
        break;
    }
  });

  ws.on('close', ()=>{
    const idx = waiting.indexOf(ws);
    if(idx !== -1) waiting.splice(idx,1);
    unpair(ws);
    msgCounts.delete(ws);
  });
});

server.on('upgrade', (request, socket, head) => {
  if(request.url.startsWith('/ws')){
    wss.handleUpgrade(request, socket, head, function done(ws) {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// heartbeat
setInterval(()=>{
  wss.clients.forEach((ws)=>{
    if(ws.isAlive === false) return ws.terminate();
    ws.isAlive = false; ws.ping();
  });
}, 30000);

server.listen(PORT, ()=> console.log('ChatVent server listening on', PORT));


// server.js - ChatVent mit robuster Textanalyse via banned.txt
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static client files
app.use(express.static('public'));

// ---- WebSocket Server ----
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

// ---- Pairing-Logik ----
const waiting = [];           // Warteschlange
const partners = new Map();   // socket -> peer

function send(ws, obj){
  try { ws.send(JSON.stringify(obj)); } catch(e){}
}

function pair(a, b){
  partners.set(a,b); partners.set(b,a);
  send(a,{type:'paired'});
  send(b,{type:'paired'});
}

function unpair(ws){
  const p = partners.get(ws);
  if(p){
    partners.delete(ws);
    partners.delete(p);
    try{ p.send(JSON.stringify({type:'unpaired'})); }catch(e){}
  }
}

// ---- Textanalyse / Filter ----
const bannedFile = path.join(__dirname, 'banned.txt');
let bannedWords = [];

// Funktion: Escaped Regex für wörtliche Suche
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Lade banned words
function loadBannedWords() {
  try {
    const data = fs.readFileSync(bannedFile, 'utf-8');
    bannedWords = data
      .split(/\r?\n/)
      .filter(line => line.trim().length > 0)
      .map(word => new RegExp(escapeRegExp(word.trim()), 'gi'));
    console.log('Banned words loaded:', bannedWords.length);
  } catch (err) {
    console.warn('banned.txt konnte nicht geladen werden', err);
  }
}

// Initial laden
loadBannedWords();

// Zensur-Funktion
function sanitizeMessage(text){
  let clean = text;
  bannedWords.forEach((regex) => {
    clean = clean.replace(regex, match => '*'.repeat(match.length));
  });
  return clean;
}

// ---- WebSocket Events ----
wss.on('connection', (ws)=>{
  ws.isAlive = true;
  ws.on('pong', () => ws.isAlive = true);

  ws.on('message', (raw)=>{
    let msg = null; try { msg = JSON.parse(raw); } catch(e){ return; }
    switch(msg.type){
      case 'find':
        if(partners.has(ws)) return;
        if(waiting.length){
          const other = waiting.shift();
          if(other && other.readyState===WebSocket.OPEN){
            pair(ws, other);
          }
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
        if(peer && peer.readyState === WebSocket.OPEN){
          const cleanText = sanitizeMessage(msg.text);
          send(peer, {type:'msg', text: cleanText});
          send(ws, {type:'msg', text: cleanText}); // Sender sieht auch gecleant
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
    if(idx!==-1) waiting.splice(idx,1);
    unpair(ws);
  });
});

// ---- Upgrade HTTP -> WS ----
server.on('upgrade', (request, socket, head) => {
  if(request.url.startsWith('/ws')){
    wss.handleUpgrade(request, socket, head, function done(ws) {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// ---- Heartbeat ----
setInterval(()=>{
  wss.clients.forEach((ws)=>{
    if(ws.isAlive===false) return ws.terminate();
    ws.isAlive=false; ws.ping();
  });
}, 30000);

// ---- Start Server ----
server.listen(PORT, ()=> console.log('ChatVent server listening on', PORT));

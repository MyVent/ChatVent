const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const geoip = require('geoip-lite');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static('public'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer:true });

const waiting = [];
const partners = new Map();

function send(ws,obj){ try{ ws.send(JSON.stringify(obj)) }catch(e){} }

function pair(a,b){
  partners.set(a,b); partners.set(b,a);
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

wss.on('connection',(ws,req)=>{
  ws.isAlive = true;
  ws.on('pong',()=>ws.isAlive=true);

  // GEO-IP
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const geo = geoip.lookup(ip);
  ws.country = geo ? geo.country : 'any';

  ws.on('message',(raw)=>{
    let msg=null; try{ msg=JSON.parse(raw) }catch(e){return;}
    switch(msg.type){
      case 'find':
        if(partners.has(ws)) return;

        const targetCountry = msg.country || 'any';
        const idx = waiting.findIndex(other =>
            other.readyState===WebSocket.OPEN &&
            (targetCountry==='any' || other.country===targetCountry)
        );
        if(idx!==-1){
          const other = waiting.splice(idx,1)[0];
          pair(ws,other);
        } else {
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

  ws.on('close',()=>{
    const idx = waiting.indexOf(ws);
    if(idx!==-1) waiting.splice(idx,1);
    unpair(ws);
  });
});

server.on('upgrade',(req,socket,head)=>{
  if(req.url.startsWith('/ws')){
    wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
  } else socket.destroy();
});

setInterval(()=>{
  wss.clients.forEach(ws=>{
    if(ws.isAlive===false) return ws.terminate();
    ws.isAlive=false; ws.ping();
  });
},30000);

server.listen(PORT,()=>console.log('ChatVent server listening on',PORT));

const WebSocket = require('ws');
const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

let clients = [];

wss.on('connection', (ws) => {
    clients.push(ws);
    ws.partner = null;
    findPartner(ws);

    ws.on('message', (msg) => {
        if(msg === '__NEW__'){
            findPartner(ws, true);
        } else if(ws.partner){
            ws.partner.send(msg);
        }
    });

    ws.on('close', () => {
        if(ws.partner) ws.partner.partner = null;
        clients = clients.filter(c => c !== ws);
    });
});

function findPartner(ws, reset=false){
    if(reset && ws.partner){
        ws.partner.partner = null;
        ws.partner = null;
    }
    for(let client of clients){
        if(client !== ws && !client.partner){
            ws.partner = client;
            client.partner = ws;
            ws.send("Verbunden mit einem Stranger!");
            client.send("Verbunden mit einem Stranger!");
            break;
        }
    }
}

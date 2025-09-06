const WebSocket = require('ws');
const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

let waiting = null;

wss.on('connection', (ws) => {
    ws.partner = null;

    ws.on('message', (msg) => {
        if(msg === "__FIND__"){
            if(waiting && waiting !== ws){
                // Partner gefunden
                ws.partner = waiting;
                waiting.partner = ws;

                ws.send("__CONNECTED__");
                waiting.send("__CONNECTED__");

                waiting = null;
            } else {
                waiting = ws;
            }
        } else if(ws.partner){
            ws.partner.send(msg); // Nachricht weiterleiten
        }
    });

    ws.on('close', () => {
        if(ws.partner){
            ws.partner.send("Stranger hat die Verbindung beendet.");
            ws.partner.partner = null;
        }
        if(waiting === ws) waiting = null;
    });
});

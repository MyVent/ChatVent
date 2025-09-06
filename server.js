const WebSocket = require('ws');
const PORT = process.env.PORT || 3000;

const wss = new WebSocket.Server({ port: PORT });

wss.on('connection', (ws) => {

    // Neue Verbindung, keine Warteliste
    ws.send("__CONNECTED__"); // Optional: direkt verbunden

    ws.on('message', (msg) => {
        // Alle Nachrichten an denselben Client zurücksenden (oder an Bot simulieren)
        if(ws.readyState === WebSocket.OPEN){
            ws.send(msg); // Echo oder Bot antwortet hier
        }
    });

    ws.on('close', () => {
        // Verbindung geschlossen, keine Warteliste nötig
    });
});

console.log(`WebSocket Server läuft auf Port ${PORT}`);

const WebSocket = require('ws');
const PORT = process.env.PORT || 3000;

const wss = new WebSocket.Server({ port: PORT });

let waitingClient = null; // Ein Client, der auf Partner wartet
const partners = new Map();

wss.on('connection', (ws) => {

    // Prüfen, ob ein Partner verfügbar ist
    if (waitingClient && waitingClient !== ws) {
        partners.set(ws, waitingClient);
        partners.set(waitingClient, ws);

        ws.send("__CONNECTED__");
        waitingClient.send("__CONNECTED__");

        waitingClient = null;
    } else {
        waitingClient = ws;
        ws.send("__WAITING__"); // Optional: Statusmeldung „Warte auf Stranger“
    }

    ws.on('message', (msg) => {

        // Nachricht an Partner weiterleiten
        if (partners.has(ws)) {
            const partner = partners.get(ws);
            if (partner.readyState === WebSocket.OPEN) {
                partner.send(msg);
            }
        }
    });

    ws.on('close', () => {
        // Partner benachrichtigen
        if (partners.has(ws)) {
            const partner = partners.get(ws);
            if (partner.readyState === WebSocket.OPEN) partner.send("__DISCONNECTED__");
            partners.delete(partner);
            partners.delete(ws);
        }

        // Aus Warteliste entfernen
        if (waitingClient === ws) waitingClient = null;
    });
});

console.log(`WebSocket Server läuft auf Port ${PORT}`);

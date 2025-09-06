const WebSocket = require('ws');
const PORT = process.env.PORT || 3000;

const wss = new WebSocket.Server({ port: PORT });

// Wir verwenden hier nur ein Omegle-Prinzip: ein Client wartet auf einen Partner
let waitingClient = null;
const partners = new Map();

wss.on('connection', (ws) => {

    ws.on('message', (msg) => {

        if(msg === "__FIND__") {

            // Alte Verbindung trennen, falls vorhanden
            if(partners.has(ws)){
                const oldPartner = partners.get(ws);
                if(oldPartner.readyState === WebSocket.OPEN) oldPartner.send("__DISCONNECTED__");
                partners.delete(oldPartner);
                partners.delete(ws);
            }

            // Partner finden
            if(waitingClient && waitingClient !== ws){
                partners.set(ws, waitingClient);
                partners.set(waitingClient, ws);

                ws.send("__CONNECTED__");
                waitingClient.send("__CONNECTED__");

                waitingClient = null; // Warteliste leeren
            } else {
                waitingClient = ws;
                ws.send("__WAITING__"); // Status: Warte auf Stranger
            }

            return;
        }

        // Normale Nachricht an Partner weiterleiten
        if(partners.has(ws)){
            const partner = partners.get(ws);
            if(partner.readyState === WebSocket.OPEN){
                partner.send(msg);
            }
        }
    });

    ws.on('close', () => {
        // Partner benachrichtigen
        if(partners.has(ws)){
            const partner = partners.get(ws);
            if(partner.readyState === WebSocket.OPEN) partner.send("__DISCONNECTED__");
            partners.delete(partner);
            partners.delete(ws);
        }

        // Aus Warteliste entfernen
        if(waitingClient === ws) waitingClient = null;
    });
});

console.log(`WebSocket Server läuft auf Port ${PORT}`);

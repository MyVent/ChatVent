const WebSocket = require('ws');
const PORT = process.env.PORT || 3000;

const wss = new WebSocket.Server({ port: PORT });

let waiting = null; // nur ein Client wartet
const partners = new Map();

wss.on('connection', (ws) => {

    ws.on('message', (msg) => {
        if(msg === "__FIND__") {
            // alte Verbindung trennen
            if(partners.has(ws)) {
                const oldPartner = partners.get(ws);
                if(oldPartner.readyState === WebSocket.OPEN) oldPartner.send("__DISCONNECTED__");
                partners.delete(oldPartner);
                partners.delete(ws);
            }

            // Partner finden
            if(waiting && waiting !== ws) {
                const partner = waiting;
                waiting = null;

                partners.set(ws, partner);
                partners.set(partner, ws);

                ws.send("__CONNECTED__");
                partner.send("__CONNECTED__");
            } else {
                waiting = ws; // selbst warten
            }
            return;
        }

        // Nachricht an Partner weiterleiten
        if(partners.has(ws)) {
            const partner = partners.get(ws);
            if(partner.readyState === WebSocket.OPEN) {
                partner.send(msg);
            }
        }
    });

    ws.on('close', () => {
        if(partners.has(ws)) {
            const partner = partners.get(ws);
            if(partner.readyState === WebSocket.OPEN) partner.send("__DISCONNECTED__");
            partners.delete(partner);
            partners.delete(ws);
        }
        if(waiting === ws) waiting = null;
    });
});

console.log(`WebSocket Server läuft auf Port ${PORT}`);

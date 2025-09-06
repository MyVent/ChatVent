const WebSocket = require('ws');
const PORT = process.env.PORT || 3000;

const wss = new WebSocket.Server({ port: PORT });

// Liste aller wartenden Clients
let waiting = [];
// Map für aktive Verbindungen: client => partner
const partners = new Map();

wss.on('connection', (ws) => {
    ws.on('message', (msg) => {

        // Steuerbefehle
        if(msg === "__FIND__") {
            // Alte Verbindung trennen
            if(partners.has(ws)) {
                const oldPartner = partners.get(ws);
                if(oldPartner.readyState === WebSocket.OPEN) {
                    oldPartner.send("__DISCONNECTED__");
                }
                partners.delete(oldPartner);
                partners.delete(ws);
            }

            // Prüfen, ob ein wartender Client da ist
            let foundPartner = null;
            for(let i = 0; i < waiting.length; i++) {
                if(waiting[i] !== ws) {
                    foundPartner = waiting[i];
                    waiting.splice(i, 1);
                    break;
                }
            }

            if(foundPartner) {
                // Verbindung herstellen
                partners.set(ws, foundPartner);
                partners.set(foundPartner, ws);

                ws.send("__CONNECTED__");
                foundPartner.send("__CONNECTED__");
            } else {
                // Wenn keiner verfügbar, in die Warteliste
                if(!waiting.includes(ws)) waiting.push(ws);
            }
            return;
        }

        // Normale Nachricht weiterleiten
        if(partners.has(ws)) {
            const partner = partners.get(ws);
            if(partner.readyState === WebSocket.OPEN) {
                partner.send(msg);
            }
        }
    });

    ws.on('close', () => {
        // Partner benachrichtigen
        if(partners.has(ws)) {
            const partner = partners.get(ws);
            if(partner.readyState === WebSocket.OPEN) {
                partner.send("__DISCONNECTED__");
            }
            partners.delete(partner);
            partners.delete(ws);
        }

        // Aus Warteliste entfernen
        waiting = waiting.filter(client => client !== ws);
    });
});

console.log(`WebSocket Server läuft auf Port ${PORT}`);

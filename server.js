const WebSocket = require('ws');
const PORT = process.env.PORT || 3000;

const wss = new WebSocket.Server({ port: PORT });

let waiting = [];
const partners = new Map();

wss.on('connection', (ws) => {

    ws.on('message', (msg) => {

        if(msg === "__FIND__") {
            // Alte Verbindung trennen, falls vorhanden
            if(partners.has(ws)) {
                const oldPartner = partners.get(ws);
                if(oldPartner.readyState === WebSocket.OPEN) {
                    oldPartner.send("__DISCONNECTED__");
                }
                partners.delete(oldPartner);
                partners.delete(ws);
            }

            // Prüfen, ob ein Partner verfügbar ist
            let foundPartner = null;
            for(let i = 0; i < waiting.length; i++) {
                if(waiting[i] !== ws) {
                    foundPartner = waiting[i];
                    waiting.splice(i, 1); // Partner aus Warteliste entfernen
                    break;
                }
            }

            if(foundPartner) {
                partners.set(ws, foundPartner);
                partners.set(foundPartner, ws);

                ws.send("__CONNECTED__");
                foundPartner.send("__CONNECTED__");
            } else {
                // Wenn kein Partner da, in Warteliste aufnehmen
                if(!waiting.includes(ws)) waiting.push(ws);
            }

            return;
        }

        // Normale Nachricht an Partner weiterleiten
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

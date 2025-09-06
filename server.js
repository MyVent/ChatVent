const WebSocket = require('ws');
const PORT = process.env.PORT || 3000;

const wss = new WebSocket.Server({ port: PORT });

let waiting = []; // Liste aller wartenden Clients
const partners = new Map(); // Map: ws -> Partner

wss.on('connection', (ws) => {

    ws.on('message', (msg) => {

        if(msg === "__FIND__") {
            // Alte Verbindung trennen
            if(partners.has(ws)) {
                const oldPartner = partners.get(ws);
                if(oldPartner.readyState === WebSocket.OPEN) oldPartner.send("__DISCONNECTED__");
                partners.delete(oldPartner);
                partners.delete(ws);
            }

            // Prüfen, ob ein wartender Client verfügbar ist
            let partner = null;
            for(let i = 0; i < waiting.length; i++){
                if(waiting[i] !== ws){
                    partner = waiting[i];
                    waiting.splice(i,1);
                    break;
                }
            }

            if(partner){
                // Partner verbinden
                partners.set(ws, partner);
                partners.set(partner, ws);

                ws.send("__CONNECTED__");
                partner.send("__CONNECTED__");
            } else {
                // Wenn kein Partner verfügbar, in Warteliste
                if(!waiting.includes(ws)) waiting.push(ws);
            }
            return;
        }

        // Normale Nachrichten an Partner weiterleiten
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
        waiting = waiting.filter(c => c !== ws);
    });
});

console.log(`WebSocket Server läuft auf Port ${PORT}`);

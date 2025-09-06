const WebSocket = require('ws');
const PORT = process.env.PORT || 3000;

const wss = new WebSocket.Server({ port: PORT });

wss.on('connection', (ws) => {

    // Direkt verbunden
    ws.send("__CONNECTED__");

    ws.on('message', (msg) => {
        // Optional: Fake-Stranger antwortet zufällig
        setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
                const responses = [
                    "Hey!",
                    "Interessant...",
                    "Erzähl mir mehr!",
                    "Haha, echt?",
                    "Cool!"
                ];
                const reply = responses[Math.floor(Math.random() * responses.length)];
                ws.send(reply);
            }
        }, Math.random() * 1500 + 500); // zufällige Antwort zwischen 0.5–2s
    });

    ws.on('close', () => {
        // Verbindung geschlossen
    });
});

console.log(`WebSocket Server läuft auf Port ${PORT}`);

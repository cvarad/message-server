const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');

const server = https.createServer({
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
}, (req, res) => {
    res.writeHead(200);
    res.end('Hello there! This is a temporary page to let you download the tls certificate and add it to the trusted root CAs');
});
const wss = new WebSocket.Server({server});

let convUserMap = new Map();
function addConversation(conversationId, sender, receiver) {
    if (convUserMap.has(conversationId)) {
        return;
    }
    convUserMap.set(conversationId, [sender, receiver]);
}

let userSockMap = new Map();
function addUser(userId, ws) {
    if (userSockMap.has(userId)) {
        return;
    }
    userSockMap.set(userId, ws);
}

wss.on('connection', (ws) => {
    console.log('New Connection!');
    ws.on('message', (msg) => {
        msg = msg.toString('utf-8')
        try {
            msgData = JSON.parse(msg);
            console.log('Received JSON: ' + msgData)
            addUser(msgData.sender, ws)
            addConversation(msgData.conversation_id, msgData.sender, msgData.receiver);
        } catch (e) {
            console.log('Received non-JSON: ' + msg);
        }
    });
});

server.listen(443);
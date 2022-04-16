const WebSocket = require('ws');

const WSS_OPTIONS = {
    port: 7071
};
const wss = new WebSocket.Server(WSS_OPTIONS);

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
        msgData = JSON.parse(msg.toString('utf-8'));
        addUser(msgData.sender, ws)
        addConversation(msgData.conversation_id, msgData.sender, msgData.receiver);
    });
});

const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');

const parser = require('./parser');
const logger = require('./logger').getConsoleLogger(' MAIN ');


const server = https.createServer({
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
}, (_, res) => {
    res.writeHead(200);
    res.end('Hello! Download the TLS certificate and add it to the trusted root CAs (If not done already)!');
});
const wss = new WebSocket.Server({ server });

let convUserMap = new Map();
function addConversation(conversationId, from, to) {
    if (convUserMap.has(conversationId)) {
        return;
    }
    convUserMap.set(conversationId, [from, to]);
}
function getConvParticipants(conversationId) {
    return convUserMap.get(conversationId);
}

let userSockMap = new Map();
function addUser(userId, ws) {
    if (userSockMap.has(userId)) {
        return;
    }
    userSockMap.set(userId, ws);
}
function getUserSocket(userId) {
    return userSockMap.get(userId);
}
function removeUser(userId) {
    userSockMap.delete(userId);
}

server.on('upgrade', (request, socket, head) => {
    // TODO: message-server & presence-server seperation
});

wss.on('connection', (ws, req) => {
    logger.info('New connection received!');
    registerCallbacks(ws);
});

function routeMessage(msgData, sender) {
    const participants = getConvParticipants(msgData.conversationId);
    if (!participants) {
        logger.error(`No participants found for conv id: ${msgData.conversationId}`);
        return;
    }
    
    delete msgData.to;
    msgData.from = sender;

    for (let user of participants) {
        if (user === sender) continue;

        let ws = getUserSocket(user);
        if (!ws) {
            logger.debug(`Socket not found for user: ${user}`);
            continue;
        };
        logger.info(`Routing message (${msgData.messageId}) to (${user})`);
        ws.send(JSON.stringify(msgData));
    }
}

function handleMessage(msg, ws) {
    try {
        data = parser.parse(msg);        
    } catch (e) {
        logger.warn(`Received non-JSON: ${msg.toString()}`);
    }

    addConversation(data.conversationId, ws.userId, data.to);
    routeMessage(data, ws.userId);
}

// TODO: user authentication; dynamodb
function authenticate(data) {
    return true;
}

function registerCallbacks(ws) {
    ws.on('message', (msg) => {
        if (!ws.authenticated) {
            ws.authenticated = true;
            data = JSON.parse(msg);
            if (authenticate(data)) {
                logger.info(`User ${data.userId} authenticated!`);
                addUser(data.userId, ws);
                ws.userId = data.userId; // TODO: set user id from received data
            } else {
                ws.close();
            }

            return;
        }

        handleMessage(msg, ws);
    });

    ws.on('close', () => {
        logger.info(`Connection closed for: ${ws.userId}`);
        removeUser(ws.userId);
    });
}

server.listen(443);
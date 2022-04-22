const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');

const parser = require('./parser');
const ddb = require('./ddb-client');
const sqs = require('./sqs-client');
const logger = require('./logger').getLogger(' MAIN ');


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
        return false;
    }
    convUserMap.set(conversationId, new Set([from, to]));
    return true;
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

function routeMessage(msgData) {
    const participants = getConvParticipants(msgData.conversationId);
    if (!participants) {
        logger.error(`No participants found for conv id: ${msgData.conversationId}`);
        return;
    }

    for (let user of participants) {
        if (user === msgData.from) continue;

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

    let newConv = addConversation(data.conversationId, ws.userId, data.to);
    delete data.to;
    data.from = ws.userId;
    data.timestamp = new Date().toISOString();
    let sqsData = Object.assign({}, data);
    if (newConv) 
        sqsData.participants = Array.from(getConvParticipants(data.conversationId));

    sqs.sendMessage(JSON.stringify(sqsData));
    routeMessage(data);
}

function authenticate(data, callback) {
    if (!data.userId || !data.token) {
        callback(false);
        return;
    }
    ddb.authenticate(data.userId, data.token, callback);
}

function notifyAuth(ws) {
    ws.send(JSON.stringify({ 'authenticated': true }));
}

function registerCallbacks(ws) {
    ws.on('message', (msg) => {
        if (!ws.authenticated) {
            data = JSON.parse(msg);
            ws.userId = data.userId;
            authenticate(data, (authenticated) => {
                if (authenticated) {
                    logger.info(`User ${data.userId} authenticated!`);
                    ws.authenticated = true;
                    addUser(data.userId, ws);
                    notifyAuth(ws);
                } else {
                    logger.info(`User ${data.userId} authentication failed!`);
                    ws.close();
                }
            });
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
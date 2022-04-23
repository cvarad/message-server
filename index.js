const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');

const parser = require('./parser');
const ddb = require('./ddb-client');
const presence = require('./presence-service');
const msgService = require('./message-service');
const logger = require('./logger').getLogger(' MAIN ');


const server = https.createServer({
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
}, (_, res) => {
    res.writeHead(200);
    res.end('Hello! Download the TLS certificate and add it to the trusted root CAs (If not done already)!');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
    logger.info('New connection received!');
    registerCallbacks(ws);
});

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

function onMessage(msg, ws) {
    let data = parser.parse(msg);
    if (!ws.authenticated) {
        ws.userId = data.userId;
        authenticate(data, (authenticated) => {
            if (authenticated) {
                logger.info(`User ${data.userId} authenticated!`);
                ws.authenticated = true;
                msgService.addUser(data.userId, ws);
                notifyAuth(ws);
            } else {
                logger.info(`User ${data.userId} authentication failed!`);
                ws.close();
            }
        });
    } else if (data.type) {
        presence.handleMessage(data, ws);
    } else {
        msgService.handleMessage(data, ws);
    }
}

function registerCallbacks(ws) {
    ws.on('message', (msg) => {
        onMessage(msg, ws);
    });
    ws.on('close', () => {
        logger.info(`Connection closed for: ${ws.userId}`);
        msgService.removeUser(ws.userId);
        presence.handleClose(ws);
    });
}

server.listen(443);

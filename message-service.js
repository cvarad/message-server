const sqs = require('./sqs-client');
const logger = require('./logger').getLogger('MSGSER');

let convUserMap = new Map();
let userSockMap = new Map();

exports.handleMessage = (data, ws) => {
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

function addUser(userId, ws) {
    if (userSockMap.has(userId)) {
        return;
    }
    userSockMap.set(userId, ws);
}
exports.addUser = addUser;

function getUserSocket(userId) {
    return userSockMap.get(userId);
}
exports.getUserSocket = getUserSocket;

function removeUser(userId) {
    userSockMap.delete(userId);
}
exports.removeUser = removeUser;

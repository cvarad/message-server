const logger = require('./logger').getLogger('PRESNC');

let pubsubMap = new Map();

function addSubscriber(subscriptionId, ws) {
    if (!pubsubMap.has(subscriptionId)) {
        pubsubMap.set(subscriptionId, new Set());
    }

    pubsubMap.get(subscriptionId).add(ws);
}

// Implement efficient solution for removing subscriber
// by keeping a user-subscription map
function removeSubscriber(ws) {
    for (let subscriberSet of pubsubMap.values())
        subscriberSet.delete(ws);
}

function getSubscribers(subscriptionId) {
    if (pubsubMap.has(subscriptionId))
        return Array.from(pubsubMap.get(subscriptionId));
    return [];
}

function notifyAll(data) {
    let subscribers = getSubscribers(data.userId);
    for (let subscriber of subscribers) {
        subscriber.send(JSON.stringify({ 
            type: 'notify',
            subscriptionId: data.userId,
            status: data.status 
        }));
    }
}

function registerCallbacks(ws) {
    ws.on('message', (msg) => {
        let data = JSON.parse(msg);
        logger.info(`Received presence data: ${msg}`);
        if (data.type === 'publish') { // {type: 'publish', status: 'online/offline/busy'}
            notifyAll(data); 
        } else if (data.type === 'subscribe') { // {type: 'subscribe, subscriptionId: 'chaunsa@university.com'}
            addSubscriber(data.subscriptionId, ws);
        } else {
            logger.error(`Unknown type received: ${data.type}`);
        }
    });

    ws.on('close', () => {
        logger.info(`Connection closed for: ${ws.userId}`);
        removeSubscriber(ws);
    });
}
exports.registerCallbacks = registerCallbacks;
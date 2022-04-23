const logger = require('./logger').getLogger('PRESNC');

let pubsubMap = new Map();

exports.handleMessage = (data, ws) => {
    if (data.type === 'publish') { // {type: 'publish', status: 'online/offline/busy'}
        logger.info(`Received PUBLISH from ${ws.userId}: ${data.status}`);
        notifyAll(data, ws.userId);
    } else if (data.type === 'subscribe') { // {type: 'subscribe, subscriptionId: 'chaunsa@university.com'}
        logger.info(`Received SUBSCRIBE from ${ws.userId} for ${data.subscriptionId}`);
        addSubscriber(data.subscriptionId, ws);
    } else {
        logger.error(`Unknown type received: ${data.type}`);
    }
}

exports.handleClose = (ws) => {
    notifyAll({ status: 'offline' }, ws.userId);
    removeSubscriber(ws);
}

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

function notifyAll(data, subscriptionId) {
    let subscribers = getSubscribers(subscriptionId);
    for (let subscriber of subscribers) {
        subscriber.send(JSON.stringify({
            type: 'notify',
            subscriptionId: subscriptionId,
            status: data.status
        }));
    }
}
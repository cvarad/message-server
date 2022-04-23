const logger = require('./logger');

let pubsubMap = new Map();

function addSubscriber(subscriptionId, ws) {
    if (!pubsubMap.has(subscriptionId)) {
        pubsubMap.set(subscriptionId, new Set());
    }

    pubsubMap.get(subscriptionId).add(ws);
}

function removeSubscriber(subscriptionId, ws) {
    pubsubMap.get(subscriptionId).delete(ws);
}

function getSubscribers(subscriptionId) {
    return Array.from(pubsubMap.get(subscriptionId));
}

function notifyAll(data, ws) {
    let subscribers = getSubscribers(data.userId);
    for (let subscriber of subscribers) {
        subscriber.send({ type: 'notify', status: data.status });
    }
}

function registerCallbacks(ws) {
    ws.on('message', (msg) => {
        let data = JSON.parse(msg);
        if (data.type === 'publish') { // {type: 'publish', status: 'online/offline/busy'}
            notifyAll(data, ws); 
        } else if (data.type === 'subscribe') { // {type: 'subscribe, subscriptionId: 'chaunsa@university.com'}
            addSubscriber(data.subscriptionId, ws);
        } else {
            logger.error(`Unknown type received: ${data.type}`);
        }
    });

    ws.on('close', () => {
        logger.info(`Connection closed for: ${ws.userId}`);
    });
}
exports.registerCallbacks = registerCallbacks;
const logger = require('./logger').getLogger('PRESNC');
const redis = require('./redis-cli');
const { getUserSocket } = require('./message-service');

let pubsubMap = new Map();

exports.handleMessage = (data, ws) => {
    if (data.type === 'publish') { // {type: 'publish', status: 'online/offline/busy'}
        logger.info(`Received PUBLISH from ${ws.userId}: ${data.status}`);
        if (data.status === 'typing') {
            let ws = getUserSocket(data.to);
            if (ws) {
                ws.send(JSON.stringify({
                    type: 'notify',
                    subscriptionId: ws.userId,
                    status: data.status
                }));
            }
        } else {
            redis.updatePresence(ws.userId, data.status);
            notifyAll(data, ws.userId);
        }
    } else if (data.type === 'subscribe') { // {type: 'subscribe, subscriptionId: 'chaunsa@university.com'}
        logger.info(`Received SUBSCRIBE from ${ws.userId} for ${data.subscriptionId}`);
        addSubscriber(data.subscriptionId, ws);
        notifyFromCache(data, ws);
    } else {
        logger.error(`Unknown type received: ${data.type}`);
    }
}

exports.handleClose = (ws) => {
    const ts = new Date().toISOString();
    redis.updatePresence(ws.userId, `offline#${ts}`);
    notifyAll({ status: 'offline', timestamp: ts }, ws.userId);
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

async function notifyFromCache(data, ws) {
    const notification = {
        type: 'notify',
        subscriptionId: data.subscriptionId,
    };

    const status = await redis.getPresence(data.subscriptionId);

    if (!status) {
        notification.status = 'offline';
    } else if (status.startsWith('offline')) {
        let [_, ts] = status.split('#');
        notification.status = 'offline';
        notification.timestamp = ts;
    } else {
        notification.status = status;
    }

    ws.send(JSON.stringify(notification));
}

function notifyAll(data, subscriptionId) {
    let subscribers = getSubscribers(subscriptionId);
    for (let subscriber of subscribers) {
        const notification = {
            type: 'notify',
            subscriptionId: subscriptionId,
            status: data.status
        };

        if (data.timestamp)
            notification.timestamp = data.timestamp;

        subscriber.send(JSON.stringify(notification));
    }
}
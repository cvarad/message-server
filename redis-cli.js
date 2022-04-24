const { createClient } = require('redis');
const logger = require('./logger').getLogger('REDCLI');

let client;

(async function init() {
    client = createClient();
    // set event-listeners
    client.on('error', (err) => {
        logger.error('Redis Client Error', err);
    });
    // connect
    await client.connect();
})();

async function updatePresence(id, status) {
    await client.set(id, status);
    logger.info(`Updated presence: ${id} (${status})`);
}
exports.updatePresence = updatePresence;

async function getPresence(id) {
    const status = await client.get(id);
    logger.info(`Fetched presence: ${id} (${status}`);
    return status;
}
exports.getPresence = getPresence;
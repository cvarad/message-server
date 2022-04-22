const logger = require('./logger').getLogger('PARSER');

/**
 * Parses the incoming message.
 * @param {any} msg 
 */
function parse(msg) {
    const rawData = msg.toString('utf-8');
    data = JSON.parse(rawData);
    logger.debug(`Received JSON: ${rawData}`);
    return data;
}
exports.parse = parse;

function parseBinary(msg) {
    // TODO: 3GPP 24.282 TLV format
}
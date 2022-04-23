const logger = require('./logger').getLogger('PARSER');

/**
 * Parses the incoming message.
 * @param {any} msg 
 */
function parse(msg) {
    const data = msg.toString('utf-8');
    try {
        let parsed =  JSON.parse(data);
        logger.debug(`Received data: ${data}`);
        return parsed;
    } catch (e) {
        logger.warn(`Received non-JSON: ${msg.toString()}`);
    }
}
exports.parse = parse;

function parseBinary(msg) {
    // TODO: 3GPP 24.282 TLV format
}
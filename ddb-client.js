const AWS = require('aws-sdk'); // TODO: Use v3
const logger = require('./logger').getLogger('DDBCLI');

// constants
const USER_TABLE = 'userDetailsTable';
const EMAIL_FIELD = 'email';

// init
AWS.config.update({region: 'us-east-1'});
const ddb = new AWS.DynamoDB();

function authenticate(data, callback) {
    if (!data.userId || !data.token) {
        callback(false);
        return;
    }
    dbAuth(data.userId, data.token, callback);
}
exports.authenticate = authenticate;

function dbAuth(userId, token, callback) {
    ddb.scan({
        FilterExpression: `${EMAIL_FIELD} = :e1`,
        ExpressionAttributeValues: {
            ':e1': {'S': userId}
        },
        TableName: USER_TABLE
    }, (err, data) => {
        let authenticated = false;
        if (err) {
            logger.error(err);
        } else if (data.Items.length !== 1) {
            logger.info(`Received ${data.Items.length} entries for ${userId}`);
        } else if (data.Items[0].jwtToken.S === token) {
            authenticated = true;
        }
        logger.info(JSON.stringify(data.Items[0]));
        callback(authenticated);
    });
}
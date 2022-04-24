const AWS = require('aws-sdk'); // TODO: Use v3
const logger = require('./logger').getLogger('DDBCLI');

// constants
const USER_TABLE = 'userDetailsTable';
const EMAIL_FIELD = 'email';
const PICTURE_URL_FIELD = 'pictureUrl';
exports.PICTURE_URL_FIELD = PICTURE_URL_FIELD;

// init
AWS.config.update({region: 'us-east-1'});
const ddb = new AWS.DynamoDB();

exports.authenticate = (data, callback) => {
    if (!data.userId || !data.token) {
        callback(false);
        return;
    }
    dbAuth(data.userId, data.token, callback);
}

exports.updateField = (key, name, value) => {
    logger.info(`Updating userDetailsTable: key=${key}, field=${name}, value=${value}`)
    ddb.updateItem({
        TableName: USER_TABLE,
        Key: {'email': {'S': key}},
        UpdateExpression: `SET ${name} = :url`,
        ExpressionAttributeValues: {':url': {'S': value}}
    }, (err, data) => {
        if (err) {
            logger.error(`Field update failed for ${key}` + err);
        }
    });
}

function dbAuth(userId, token, callback) {
    ddb.query({
        KeyConditionExpression:  `${EMAIL_FIELD} = :email`,
        ExpressionAttributeValues: {
            ':email': {'S': userId}
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
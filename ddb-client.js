const AWS = require('aws-sdk');
const logger = require('./logger').getConsoleLogger('DDBCLI');

// constants
const USER_TABLE = 'userDetailsTable';

// init
AWS.config.update({region: 'us-east-1'});
const ddb = new AWS.DynamoDB();

function authenticate(userId, token) {
    let authenticated = false;
    ddb.query({
        KeyConditionExpression: `email = ${userId}`,
        TableName: USER_TABLE
    }, (err, data) => {
        if (err) {
            logger.error(err);
            return;
        }
        if (data.Items.length !== 1) {
            logger.info(`Received ${data.Items.length} entries for ${userId}`);
            return;
        }
        console.log(JSON.stringify(data.Items[0]));
        if (data.Items[0].jwtToken === token) {
            authenticated = true;
        }
    });

    return authenticated;
}
exports.authenticate = authenticate;

// AWS.config.getCredentials((err) => {
//     if (err) logger.error(err.stack);
//     else console.log('Access Key:', AWS.config.credentials.accessKeyId);
//     console.log(AWS.config.region)
// });
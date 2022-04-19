const AWS = require('aws-sdk'); // TODO: Use v3
const logger = require('./logger').getConsoleLogger('DDBCLI');

// constants
const USER_TABLE = 'userDetailsTable';

// init
AWS.config.update({region: 'us-east-1'});
const ddb = new AWS.DynamoDB();

function authenticate(userId, token, callback) {
    ddb.scan({
        FilterExpression: 'email = :e1',
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
        console.log(JSON.stringify(data.Items[0]));
        callback(authenticated);
    });
}
exports.authenticate = authenticate;

//  AWS.config.getCredentials((err) => {
//      if (err) logger.error(err.stack);
//      else console.log('Access Key:', AWS.config.credentials.accessKeyId);
//      console.log(AWS.config.region)
//  });
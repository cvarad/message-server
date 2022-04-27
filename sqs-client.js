const AWS = require('aws-sdk');
const logger = require('./logger').getLogger('SQSCLI');

// constants
const ENDPOINT = 'https://sqs.us-east-1.amazonaws.com/';
const QUEUE_ENDPOINT = '649413426770/BDA-Test-Queue';
const TEST_QUEUE_ENDPOINT = '434135409552/TestQueue';
const debug = false;

// init
let creds;
if (debug) {
    creds = new AWS.SharedIniFileCredentials({profile: 'default'});
} else {
	creds = new AWS.SharedIniFileCredentials({profile: 'dynamodbacc'});
}
const sqs = new AWS.SQS({
    endpoint: ENDPOINT,
    accessKeyId: creds.accessKeyId,
    secretAccessKey: creds.secretAccessKey,
    region: 'us-east-1'
});

function sendMessage(msg) {
    sqs.sendMessage({
        MessageBody: msg,
        QueueUrl: ENDPOINT + (debug ? TEST_QUEUE_ENDPOINT : QUEUE_ENDPOINT)
    }, (err) => {
        if (err) logger.error(err);
    });
}
exports.sendMessage = sendMessage;
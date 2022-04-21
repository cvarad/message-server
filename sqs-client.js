const AWS = require('aws-sdk');
const logger = require('./logger').getConsoleLogger('SQSCLI');

// constants
const ENDPOINT = 'https://sqs.us-east-1.amazonaws.com/';
const QUEUE_ENDPOINT = '434135409552/TestQueue';

// init
let creds = new AWS.SharedIniFileCredentials({profile: 'default'});
const sqs = new AWS.SQS({
    endpoint: ENDPOINT,
    accessKeyId: creds.accessKeyId,
    secretAccessKey: creds.secretAccessKey,
    region: 'us-east-1'
});

function sendMessage(msg) {
    sqs.sendMessage({
        MessageBody: msg,
        QueueUrl: ENDPOINT + QUEUE_ENDPOINT
    }, (err) => {
        if (err) logger.error(err);
    });
}
exports.sendMessage = sendMessage;
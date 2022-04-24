const crypto = require('crypto');
const request = require('request');

const ddb = require('./ddb-client');
const logger = require('./logger').getLogger('FILESV');

const S3_URL = 'https://bda-project.s3.amazonaws.com';
const PROFILES_ENDPOINT = '/profiles';
const FILES_ENDPOINT = '/files';

function setup(app) {
    app.use(binaryHandler);
    
    app.get('/', (_, res) => {
        res.writeHead(200);
        res.end('Add TLS certificate to trusted root CAs');
    });

    app.put('/profile', handleProfileUpload);
    app.put('/file', handleFileUpload);
}
exports.setup = setup;

async function binaryHandler(req, res, next) {
    const buffers = [];
    for await (const chunk of req) {
        buffers.push(chunk);
    }

    req.body = Buffer.concat(buffers);
    next();
}

function handleProfileUpload(req, res) {
    const userId = req.headers['user-id'];
    let token = req.headers['authorization'];
    if (token)
        token = token.match(/^Bearer (.+)$/)[1];
    
    ddb.authenticate({userId: userId, token: token}, (success) => {
        if (!success) {
            logger.info(`Auth failed for ${userId}`);
            res.writeHead(403).end();
            return;
        }

        const uploadUrl = S3_URL + PROFILES_ENDPOINT + `/${md5(userId)}`;
        request.put({
            url: uploadUrl,
            headers: {
                'content-type': req.headers['content-type']            
            },
            body: req.body
        }, (err, response) => {
            if (err) {
                logger.error(err);
            } else if (response.statusCode === 200) {
                logger.info('File upload successful!');
                res.setHeader('content-type', 'application/json');
                res.end(JSON.stringify({url: uploadUrl}));
            } else {
                res.writeHead(response.statusCode).end();
            }
        });
    });
}

function handleFileUpload(req, res) {
    res.writeHead(200).end();
}

function md5(str) {
    return crypto.createHash('md5').update(str).digest('hex');
}
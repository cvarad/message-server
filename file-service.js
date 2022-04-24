const crypto = require('crypto');
const request = require('request');
const cors = require('cors');

const ddb = require('./ddb-client');
const logger = require('./logger').getLogger('FILESV');

const S3_URL = 'https://bda-project.s3.amazonaws.com';
const PROFILES_ENDPOINT = '/profiles';
const FILES_ENDPOINT = '/files';

function setup(app) {
    app.use(bodyHandler);
    app.use(cors());

    app.get('/', (_, res) => {
        res.writeHead(200);
        res.end('Add TLS certificate to trusted root CAs');
    });

    app.put('/profile', handleProfileUpload);
    app.get('/profile', handleProfileDownload);
    app.put('/file', handleFileUpload);
}
exports.setup = setup;

async function bodyHandler(req, res, next) {
    const buffers = [];
    for await (const chunk of req) {
        buffers.push(chunk);
    }

    req.body = Buffer.concat(buffers);
    // Check for JSON body
    if (req.headers['content-type'] === 'application/json') {
        req.body = JSON.parse(req.body.toString('utf-8'));
    }

    next();
}

function handleProfileUpload(req, res) {
    const userId = req.headers['user-id'];
    let token = req.headers['authorization'];
    if (token)
        token = token.match(/^Bearer (.+)$/)[1];

    ddb.authenticate({ userId: userId, token: token }, (success) => {
        if (!success) {
            logger.info(`Auth failed for ${userId}`);
            res.writeHead(403).end();
            return;
        }

        // const uploadUrl = S3_URL + PROFILES_ENDPOINT + `/${md5(userId)}`;
        const uploadUrl = constructUrl(PROFILES_ENDPOINT, md5(userId));
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
                res.end(JSON.stringify({ url: uploadUrl }));
            } else {
                res.writeHead(response.statusCode).end();
            }
        });
    });
}

function handleProfileDownload(req, res) {
    let urls = [];
    if (!req.body.ids || !(req.body.ids instanceof Array)){
        res.writeHead(400).end();
        return;
    }
    for (const id of req.body.ids) {
        urls.push(constructUrl(PROFILES_ENDPOINT, md5(id)));
    }
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ 'urls': urls }));
}

function handleFileUpload(req, res) {
    res.writeHead(200).end();
}

function constructUrl(endpoint, id) {
    return S3_URL + endpoint + `/${id}`;
}

function md5(str) {
    return crypto.createHash('md5').update(str).digest('hex');
}
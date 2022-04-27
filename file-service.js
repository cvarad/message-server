const crypto = require('crypto');
const cors = require('cors');
const AWS = require('aws-sdk');

const ddb = require('./ddb-client');
const logger = require('./logger').getLogger('FILESV');

const S3_URL = 'https://bda-project.s3.amazonaws.com/';
const S3_ENDPOINT = 'https://s3.amazonaws.com/';
const S3_BUCKET = 'bda-project';
const PROFILES_ENDPOINT = 'profiles';
const FILES_ENDPOINT = 'files';

const creds = new AWS.SharedIniFileCredentials({profile: 'default'});
const s3 = new AWS.S3({
    endpoint: S3_ENDPOINT,
    accessKeyId: creds.accessKeyId,
    secretAccessKey: creds.secretAccessKey,
    region: 'us-east-1'
});

function setup(app) {
    app.use(bodyHandler);
    app.use(cors());

    app.get('/', (_, res) => {
        res.writeHead(200);
        res.end('Add TLS certificate to trusted root CAs');
    });

    app.post('/profile', handleProfileDownload);
    app.put('/profile', (req, res) => {
        const uploadUrl = constructKey(PROFILES_ENDPOINT, md5(req.headers['user-id']));
        upload(req, res, uploadUrl);
    });
    app.put('/file', (req, res) => {
        const uploadUrl = constructKey(FILES_ENDPOINT, crypto.randomUUID());
        upload(req, res, uploadUrl);
    });

    // This should be in a different location
    app.post('/api/auth/getUserList', (req, res) => {
        ddb.getUserDetails(res, req.body.userList);
    });
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
        try {
            req.body = JSON.parse(req.body.toString('utf-8'));
            logger.debug(`Profile picture request for ${req.body.urls}`);
        } catch (err) {
            logger.error(`Error parsing JSON: ${req.body.toString('utf-8')}`);
            res.writeHead(400).end();
            return;
        }
    }

    next();
}

function handleProfileDownload(req, res) {
    let urls = [];
    if (!req.body.ids || !(req.body.ids instanceof Array)){
        res.writeHead(400).end();
        return;
    }
    for (const id of req.body.ids) {
        urls.push(S3_URL + PROFILES_ENDPOINT + `/${md5(id)}`);
    }
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ 'urls': urls }));
}

function upload(req, res, key) {
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

        s3.upload({
            Bucket: S3_BUCKET,
            Key: key,
            Body: req.body,
            ContentType: req.headers['content-type']
        }, (err, data) => {
            if (err) {
                logger.error(err);
                res.setHeader(403).end();
            } else  {
                logger.info('File upload successful!');
                res.setHeader('content-type', 'application/json');
                res.end(JSON.stringify({ url: data.Location }));
            }
        });
    });
}

function constructKey(endpoint, id) {
    return endpoint + `/${id}`;
}

function md5(str) {
    return crypto.createHash('md5').update(str).digest('hex');
}
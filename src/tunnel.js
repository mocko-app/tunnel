require('colors');
const axios = require('axios');
const debug = require('debug')('mocko:tunnel:tunnel');

const REMOVE_HEADERS = new Set();
REMOVE_HEADERS.add('transfer-encoding');
REMOVE_HEADERS.add('accept-encoding');
REMOVE_HEADERS.add('content-length');
REMOVE_HEADERS.add('connection');

let lastId = '0';

async function tunnel(port, token) {
    debug('connecting to stream');
    const { data } = await axios.post(`https://dev-mocko.free.mockoapp.net/tunnels/${token}/subscribers`)  // TODO implement
        .catch(exitWithError);

    lastId = data.start;
    fetchPage(data.subscriberId, port);
    console.log(`${'✔'.green} Forwarding requests from ${data.url} to local port ${port}`);
}

async function fetchPage(subscriberId, port) {
    debug('fetching request page');
    const { data } = await axios.get(`https://api.codetunnel.net/stream/v1/subscribers/${subscriberId}/messages?wait=true&after=${lastId}`)
        .catch(exitWithError);

    data.forEach(([id, req]) => {
        lastId = id;
        sendRequest(subscriberId, id, req, port);
    });

    setTimeout(() => fetchPage(subscriberId, port), 100);
}

async function sendRequest(token, id, message, port) {
    debug('sending request');
    const req = JSON.parse(message);

    console.log(`${req.method.toUpperCase()} ${req.path}`);
    const res = await axios({
        method: req.method,
        url: `http://localhost:${port}${req.path}`,
        data: Buffer.from(req.body, 'base64'),
        headers: req.headers,
        validateStatus: () => true,
        responseType: 'arraybuffer',
    });
    const data = JSON.stringify({
        status: res.status,
        headers: sanitizeHeaders(res.headers),
        body: res.data.toString('base64'),
    });

    debug('publishing response');
    try {
        if(data.length > 8192) {
            throw new Error('Response is too large to be tunneled back');
        }
        await axios.post(`https://api.codetunnel.net/stream-response/v1/subscribers/${token}/responses`, { id, data });
    } catch(e) {
        const badGateway = JSON.stringify({
            status: 502,
            headers: { 'Content-Type': 'application/json' },
            body: Buffer.from(JSON.stringify({
                statusCode: 502,
                error: 'Bad Gateway',
                message: 'Failed to tunnel response back, check the mocko-tunnel CLI logs for more information',
            })).toString('base64'),
        });

        console.warn(`Failed to publish response: ${e?.response?.data?.message || e?.message || e}`);
        await axios.post(`https://api.codetunnel.net/stream-response/v1/subscribers/${token}/responses`, { id, data: badGateway })
            .catch(() => {});
    }
}

function exitWithError(error) {
    let message = 'Error: ' + (error?.response?.data?.message ?? error?.message ?? error);
    if(error?.response?.data?.statusCode === 404) {
        message = 'Invalid or expired token, you can find it in your project settings: https://app.mocko.dev/tunnels';
    }
    if(error?.response?.data?.statusCode === 409) {
        message = 'Your token expired, get a new one in your project settings: https://app.mocko.dev/tunnels';
    }

    console.error(message);
    process.exit(1);
}

function sanitizeHeaders(headers) {
    const entries = Object.entries(headers)
        .filter(([k]) => !REMOVE_HEADERS.has(k));
    return Object.fromEntries(entries);
}

module.exports = { tunnel };

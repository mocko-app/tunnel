const axios = require('axios');
const debug = require('debug')('mocko:tunnel:tunnel');

let lastId = '0';

async function tunnel(port, token) {
    debug('connecting to stream');
    // TODO connect
    console.log(`Tunnelling requests to local port ${port}`)

    fetchPage(token);
}

async function fetchPage(token) {
    debug('fetching request page');
    const { data } = await axios.get(`https://api.codetunnel.net/stream/v1/subscribers/${token}/messages?wait=true&after=${lastId}`)
        .catch(exitWithError);

    data.forEach(([id, req]) => {
        lastId = id;
        sendRequest(token, id, req);
    });

    setTimeout(() => fetchPage(token), 100);
}

async function sendRequest(token, id, req) {
    debug('sending request');
    // TODO request
    const data = req;

    debug('publishing response');
    try {
        await axios.post(`https://api.codetunnel.net/stream-response/v1/subscribers/${token}/responses`, { id, data });
    } catch(e) {
        console.warn(`Failed to publish response: ${e?.response?.data?.message || e?.message || e}`);
    }
}

function exitWithError(error) {
    let message = error?.response?.data?.message ?? error?.message ?? error;
    if(error?.response?.data?.statusCode === 404) {
        message = 'Invalid or expired token, you can find it in your project settings: https://app.mocko.dev/project';
    }
    if(error?.response?.data?.statusCode === 409) {
        message = 'Your token expired, get a new one in your project settings: https://app.mocko.dev/project';
    }

    console.error(message);
    process.exit(1);
}

module.exports = { tunnel };

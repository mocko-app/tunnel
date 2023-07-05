require('colors');
const axios = require('axios');
const { exitWithError, sleep, toTunnelResponse, toTunnelError, noop } = require('./utils');
const debug = require('debug')('mocko:tunnel:tunnel');

let page = '0';

async function tunnel(port, token) {
    debug('connecting to stream');
    const { data } = await axios.post(`https://dev-mocko.free.mockoapp.net/tunnels/${token}/subscribers`)  // TODO implement
        .catch(exitWithError('Failed to connect to Mocko: '));

    page = data.start;
    console.log(`${'✔'.green} Forwarding requests from ${data.url} to local port ${port}`);

    while(page) {
        await fetchPage(data.subscriberId, port);
        await sleep(100);
    }
}

async function fetchPage(subscriberId, port) {
    debug('fetching request page');
    const { data } = await axios.get(`https://api.codetunnel.net/stream/v1/subscribers/${subscriberId}/messages?wait=true&after=${page}`)
        .catch(exitWithError('Error: '));

    data.forEach(([id, req]) => {
        page = id;
        sendRequest(subscriberId, id, req, port);
    });
}

async function sendRequest(token, id, message, port) {
    debug(`sending request`);
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
    const data = toTunnelResponse(res.status, res.headers, res.data);

    debug(`publishing ${res.status} response of ${req.method} ${req.path}`);
    try {
        if(data.length > 8192) {
            throw new Error('Response is too large to be tunneled back');
        }
        await axios.post(`https://api.codetunnel.net/stream-response/v1/subscribers/${token}/responses`, { id, data });
    } catch(e) {
        const badGateway = toTunnelError('Failed to tunnel response back, check the mocko-tunnel CLI logs for more information')
        console.warn(`Failed to publish response: ${e?.response?.data?.message || e?.message || e}`);
        await axios.post(`https://api.codetunnel.net/stream-response/v1/subscribers/${token}/responses`, { id, data: badGateway })
            .catch(noop);
    }
}

module.exports = { tunnel };

require('colors');
const axios = require('axios');
const {
    exitWithError, sleep, toTunnelResponse,
    toTunnelError, noop, version,
} = require('./utils');
const debug = require('debug')('mocko:tunnel:tunnel');

let page = '0';

async function tunnel(port, token) {
    debug('connecting to stream');
    const { data } = await axios.post(`https://app.mocko.dev/_/tunnels/${token}/subscribers`, {
        version,
    }).catch(exitWithError('Failed to connect to Mocko: '));

    page = data.start;
    console.log(`${'✔'.green} Forwarding requests from ${data.url} to local port ${port}`);

    while(page) {
        await fetchPage(data.subscriberId, port); // 30s
        await sleep(100);
    }
}

async function fetchPage(subscriberId, port) {
    debug('fetching request page');
    const { data } = await axios.get(`https://api.codetunnel.net/stream/v1/subscribers/${subscriberId}/messages?wait=true&after=${page}`)
        .catch(exitWithError('Error: '));

    data.forEach(([id, req]) => {
        page = id;
        // No await, requests are sent in the background without holding the fetchPage loop
        proxyRequest(subscriberId, id, req, port);
    });
}

async function proxyRequest(token, id, message, port) {
    const req = JSON.parse(message);
    debug(`sending request ${req.method.toUpperCase()} ${req.path}`);

    const data = await sendRequest(req, port);
    await publishResponse(id, token, data);
}

async function sendRequest(req, port) {
    try {
        const res = await sendAxiosRequest(req, port);
        debug(`publishing ${res.status} response of ${req.method} ${req.path}`);
        const data = toTunnelResponse(res.status, res.headers, res.data);
        if(data.length > 8192) {
            throw new Error(`Response is too large (${data.length}/8192) to be tunneled back.`);
        }
        console.log(`${req.method.toUpperCase()} ${req.path}\t${res.status}`);
        return data;
    } catch(e) {
        debug(`publishing error response of ${req.method} ${req.path}`);
        console.log(`${req.method.toUpperCase()} ${req.path}\tFailed with error: ${e.message}`);
        return toTunnelError('Failed to send request to local port, check the mocko-tunnel CLI logs for more information');
    }
}

async function sendAxiosRequest(req, port) {
    return await axios({
        method: req.method,
        url: `http://localhost:${port}${req.path}`,
        data: req.body ? Buffer.from(req.body, 'base64') : null,
        headers: req.headers,
        validateStatus: () => true,
        responseType: 'arraybuffer',
        timeout: 10000,
    });
}

async function publishResponse(id, token, data) {
    try {
        await axios.post(`https://api.codetunnel.net/stream-response/v1/subscribers/${token}/responses`, { id, data });
    } catch(e) {
        const badGateway = toTunnelError('Failed to tunnel response back, check the mocko-tunnel CLI logs for more information')
        console.warn(`Failed to publish previous response: ${e?.response?.data?.message || e?.message || e}`);
        await axios.post(`https://api.codetunnel.net/stream-response/v1/subscribers/${token}/responses`, { id, data: badGateway })
            .catch(noop);
    }
}

module.exports = { tunnel };

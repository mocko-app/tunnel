const pkg = require('../package.json');

const debug = require('debug')('mocko:tunnel:utils');

const REMOVE_HEADERS = new Set();
REMOVE_HEADERS.add('transfer-encoding');
REMOVE_HEADERS.add('accept-encoding');
REMOVE_HEADERS.add('content-length');
REMOVE_HEADERS.add('connection');

const version = `mocko-tunnel/${pkg.version} NodeJS/${process.version} v8/${process.versions.v8} openssl/${process.versions.openssl} ${process.platform}/${process.arch}`;
const noop = () => { };
const sleep = t => new Promise(r => setTimeout(r, t));

const exitWithError = (tag) => (error) => {
    let message = tag + (error?.response?.data?.message ?? error?.message ?? error);
    debug(message);
    const status = error?.response?.data?.statusCode;
    if(status === 404 || status === 403) {
        message = 'Invalid or expired token, you can find it in your project settings: https://app.mocko.dev/tunnels';
    }
    if(status === 409) {
        message = 'Your token expired, get a new one in your project settings: https://app.mocko.dev/tunnels';
    }

    console.error(message);
    process.exit(1);
};

function toTunnelResponse(status, headers, data) {
    const dataBuffer = typeof data === 'string' ? Buffer.from(data) : data;
    const body = dataBuffer.toString('base64');

    return JSON.stringify({
        status, body,
        headers: sanitizeHeaders(headers),
    });
}

function toTunnelError(message) {
    const headers = { 'Content-Type': 'application/json' };
    const body = JSON.stringify({
        statusCode: 502,
        error: 'Bad Gateway',
        message,
    });
    return toTunnelResponse(502, headers, body);
}

function sanitizeHeaders(headers) {
    const entries = Object.entries(headers)
        .filter(([k]) => !REMOVE_HEADERS.has(k));
    return Object.fromEntries(entries);
}

module.exports = { toTunnelResponse, toTunnelError, exitWithError, sleep, noop, version };

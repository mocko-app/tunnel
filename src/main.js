const semver = require('semver');
if(!semver.satisfies(process.version, '>=14')) {
    console.error(`Your NodeJS version (${process.version}) is too old for mocko :(\nUse at least NodeJS 14 https://docs.mocko.dev/updating-node/`);
    process.exit(1);
}

const Bossy = require('@hapi/bossy');

const pkg = require('../package.json');
const { definition } = require('./definition');
const { tunnel } = require('./tunnel');

const debug = require('debug')('mocko:tunnel:main');

const usage = Bossy.usage(definition, 'mt <port> [options]\nExample: mt 8080');

const UUID_v4 = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

async function run() {
    debug('building args with bossy');
    const args = buildArgs();

    if(args.version) {
        console.log(`mocko-tunnel/${pkg.version} NodeJS/${process.version} v8/${process.versions.v8} openssl/${process.versions.openssl} ${process.platform}/${process.arch}`);
        process.exit(0);
    }

    if(args.help || !args._ || args._.length !== 1) {
        console.log(usage);
        process.exit(0);
    }

    debug('validating args');
    validateArgs(args);
    const port = parseInt(args._[0]);
    let token = args.token;

    if(!token) {
        debug('prompting token');
        token = await promptToken();
    }

    debug('starting tunnel');
    await tunnel(port, token);
}

function buildArgs() {
    const args = Bossy.parse(definition);

    if (args instanceof Error) {
        console.error(args.message);
        console.log(usage);

        process.exit(1);
    }

    return args;
}

function validateArgs({ token, _ }) {
    const port = _[0];

    if(!port) {
        exitWithError('A valid port must be provided');
    }

    let portNumber = parseInt(port);
    if(isNaN(portNumber)) {
        exitWithError('Port must be a number');
    }

    if(portNumber < 1 || portNumber > 49151) {
        exitWithError('Port must be between 1 and 49151');
    }

    if(!token) {
        return;
    }

    if(!UUID_v4.test(token)) {
        exitWithError('Token must be a valid UUID, you can find it in your project settings on https://app.mocko.dev/project');
    }
}

async function promptToken() {
    const { default: inquirer } = await import('inquirer');
    const { token } = await inquirer.prompt([{
        type: 'input',
        name: 'token',
        message: 'Provide your tunnel token, found in your project settings:',
        validate: tok => UUID_v4.test(tok) || 'Token must be a valid UUID, you can find it in your project settings on https://app.mocko.dev/project',
    }]);

    return token;
}

function exitWithError(message) {
    console.error(message);
    process.exit(1);
}

module.exports.run = run;

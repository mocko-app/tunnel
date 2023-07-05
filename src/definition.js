module.exports.definition = {
    h: {
        description: 'Shows this screen',
        alias: 'help',
        type: 'help',
    },
    v: {
        description: 'Shows the current version',
        alias: 'version',
        type: 'help',
    },
    t: {
        description: 'Sets the tunnel token. If not provided, the token will be prompted',
        alias: 'token',
    },
    d: {
        description: 'Runs in debug mode',
        alias: 'debug',
        type: 'boolean',
        default: false,
    },
};

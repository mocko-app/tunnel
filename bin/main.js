#!/usr/bin/env node
require('../src/main')
    .run()
    .catch(e => {
        console.error(e);
        process.exit(1);
    });

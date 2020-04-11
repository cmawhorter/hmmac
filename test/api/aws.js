/*
 * hmmac
 * https://github.com/cmawhorter/hmmac
 *
 * Copyright (c) 2014 Cory Mawhorter
 * Licensed under the MIT license.
 */

// This mimics some rudimentary behavior of S3 to allow for automated testing.

const server = require('./server');

// eslint-disable-next-line no-unused-vars
server.get('/s3/:blah', (req, res, next) => {});

server.listen(18080);

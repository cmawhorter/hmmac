/*
 * hmmac
 * https://github.com/cmawhorter/hmmac
 *
 * Copyright (c) 2014 Cory Mawhorter
 * Licensed under the MIT license.
 */

const ourFakeCredentialsDb = [
  { key: '1', secret: 'a' },
  { key: '2', secret: 'b' },
  { key: '3', secret: 'c' },
];

module.exports = {
  lookup(key, callback) {
    // eslint-disable-next-line no-console
    console.log(`looking up key ${key}...`);
    // make async
    process.nextTick(() => {
      for (let i = 0; i < ourFakeCredentialsDb.length; i += 1) {
        const cred = ourFakeCredentialsDb[i];

        if (cred.key === key) {
          // eslint-disable-next-line no-console
          console.log(`found. returning ${cred}`);

          return callback(cred);
        }
      }

      // eslint-disable-next-line no-console
      console.log('not found.');

      return callback(null);
    });
  },
};

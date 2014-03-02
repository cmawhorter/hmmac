/*
 * hmmac
 * https://github.com/cmawhorter/hmmac
 *
 * Copyright (c) 2014 Cory Mawhorter
 * Licensed under the MIT license.
 */

var ourFakeCredentialsDb = [
  { key: '1', secret: 'a' },
  { key: '2', secret: 'b' },
  { key: '3', secret: 'c' }
];

module.exports = {
	lookup: function(key, callback) {
		console.log('looking up key ' + key + '...');
		// make async
    process.nextTick(function() {
      for (var i=0; i < ourFakeCredentialsDb.length; i++) {
        var cred = ourFakeCredentialsDb[i];
        if (cred.key == key) {
        	console.log('found. returning ' + cred);
        	return callback(cred);
        }
      }

      console.log('not found.');
      callback(null);
    });
	}
};

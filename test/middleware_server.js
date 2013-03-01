var	express = require('express'),
	hmmac = require('../lib/hmmac');

module.exports = function(hmmacOptions, validateCallback) {
	var app = express();

	app.use(express.logger('dev'));
	app.use(express.bodyParser());

	// app.use(function(req, res, next) {
	// 	console.log(req, res);
	// 	next();
	// });

	app.use(hmmac.middleware(hmmacOptions, validateCallback));

	app.put('/quotes/nelson', function(req, res) {
	    res.send(200, 'Request Authenticated');
	});

	return app;
};
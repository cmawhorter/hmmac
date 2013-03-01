var http = require('http'),
    Hmmac = require('../lib/hmmac');

var hmmac = new Hmmac({headerPrefix:'Amz', hash: 'sha1', serviceLabel: 'AWS', debug: true});

var validateCredentials = function(requestAccessKeyId){
    return {accessKeyId: requestAccessKeyId, accessKeySecret: 'OtxrzxIsfpFjA7SwPzILwy8Bw21TLhquhboDYROV'};
}

http.createServer(function (request, response) {

    if(hmmac.validateHttpRequest(request, validateCredentials)){
        response.writeHead(200);
        response.end('Success!');
    } else {
        response.writeHead(401)
        response.end('Authorization failed!');
    }

}).listen(8080);

console.log('Server running at http://127.0.0.1:8080/');

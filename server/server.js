﻿/// import configuration /////////////////////////////////////////////////
var config = require('./config.js');

/// initialize modules
require('./utils/configManager.js')(config);

/// create http server //////////////////////////////////////////////////////
var express = require('express');
var http = require('http');
var app = express();
var bodyParser = require('body-parser');
app.set('port', process.env.PORT || 3000);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

/// create authentication strategy ///////////////////////////////////////////
var passport = require('passport');
var passportStrategy = require('./utils/tokenStrategy.js').createTokenStrategy();
passport.use('token', passportStrategy);
app.use(passport.initialize());


/// Expose static content /////////////////////////////////////////////////////////////////
for (var i = 0 ; i < config.staticContent.length; i++)  {
        console.log('Expose ' + config.staticContent[i].path);
        app.use(config.staticContent[i].route,express.static(__dirname + config.staticContent[i].path));
}


/// Register error handler /////////////////////////////////////////////////////////
if(!config.debugMode) {
    process.on('uncaughtException', function (err) {
        console.error('!!! Caught exception: ', err);
    });

    app.use(function error(err, req, res, next) {
        // log it
        console.error(err, req.method, req.originalUrl);

        // respond with 500 "Internal Server Error".
        res.send(500);
    });

}

/// Register API's and API Tester/////////////////////////////////////////////////////////////////
var testAPIs = require('./utils/apiRegistar.js')(app,config);


/// Run server /////////////////////////////////////////////////////////////////
http.createServer(app).listen(app.get('port'), function () {
    console.log('javu.io server listening on port ' + app.get('port'));
    if (config.debugMode ) testAPIs();
});
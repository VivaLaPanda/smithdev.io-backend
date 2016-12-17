var express = require('express');
var router = express.Router();
db = require('../models/database');


/*
    Boilerplate email stuff
*/
var nodemailer = require('nodemailer');
var directTransport = require('nodemailer-direct-transport');
var transport = nodemailer.createTransport(directTransport({
    name: 'api.smithdev.io' // should be the hostname machine IP address resolves to
}));

/*
    Send a generic email
*/
var emailIt = function(email, t, h){
            console.log("calling emailIt with ", email, t, h);
            // setup e-mail data with unicode symbols
            var mailOptions = {
                from: '"no-reply" <no-reply@api.smithdev.io>', // sender address
                to: email+', adrian@smithdev.io', // list of receivers
                subject: 'password reset requested', // Subject line
                text: t, // plaintext body
                html: h
            };
            console.log("sending mail");
            // send mail with defined transport object
            transport.sendMail(mailOptions, function(error, info){
                if(error){
                    return console.log(error);
                }
                console.log(info);
                console.log('Message sent: ' + info.response);
            });
}

var baseURL = "http://api.smithdev.io";

var extractFirstItem = function(data){
    if(data.length <= 0){
        throw "length is leq 0";
    }else{
        return data[0];
    }
}

var focus = function(data){
    return function(garbage){
        return data;
    }
}

var logIt = function(data){
    console.log("logged: ", data);
    return data;
}

router.get('/', function(req, res, next){
    res.send("password reset route");
});

/*
    return a 200 no matter what
*/
router.post('/initiatereset', function(req, res, next) {
    var data = req.body.data;
    db.getUserIDByEmail(data).then(logIt, function(err){ res.status(200).send("completed"); })
    .then(db.createPasswordReset).then(logIt)
    .then(extractFirstItem).then(logIt)
    .then(function(result){
        var t = "Password reset link for smithdev: "+ baseURL + "#/passwordreset/" + result.passwordcode;
        var h = "<a href=\""+ baseURL + "#/passwordreset/" + result.passwordcode + "\">Password reset link for smithdev</a>";
        emailIt(data.email, t, h);
        res.send("completed");
    });
});

router.post('/performreset', function(req, res, next) {
    var data = req.body.data;
    db.retrievePasswordReset(data).then(extractFirstItem)
    .then(  function(result){ data.userid = result.userid; return data; },
            function(err){ res.status(500).send("already used reset code"); } )
    .then(db.updateUserPassword).then(focus(data))
    .then(db.removePasswordReset)
    .then(function(result){
        res.send("completed");
    });
});



module.exports = router;

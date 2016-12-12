var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
database = require('../models/database');



router.post('/newUser', function(req, res, next) {
    data = req.body.data;
    log.it("attempting new user creation", req.body);
    database.newUser(data).then(function(result){
        log.it("new user result: ", result);
        return result;
    },function(err){
        log.it("new user - there was an error : ", err);
        res.status(500).send("an account with that name has already been created");
    }).then(database.blankUserTable)
    .then(function(result){
        log.it("blanked result: ", result);
        res.status(200).send("account created");
    });
});

router.post('/login', function(req, res, next) {
    var data = req.body.data;
    log.it("attempting login", req.body);
    database.verifyUser(data).then(function(result){
        log.it("credentials verified! ", result);
        if(result.success){
            log.it("getting userData...");
            database.getUserIDByEmail(data)
            .then(database.generateNonceForUser)
            .then(function(data){
                log.it("got userid, hash..." , data);
                database.checkNonceForUser(data).then(
                    function(right){log.it("nonce check result :", right); },
                    function(err){ log.it("nonce check err ", err); }
                );
                jwtSecret = req.app.jwtSecret;
                log.it("encrypting ", data, " with secret ", jwtSecret);
                token = jwt.sign(data , jwtSecret);
                log.it("token is ", token);
                res.cookie('token', token, { domain: 'api.golfguide.net', expires: new Date(Date.now() + 9000000), httpOnly: true, secure: true});
                log.it("cookie set! returning ");
                res.status(200).send({isadmin : data.isadmin, success : result.success});
            });
        }else{
            log.it("credentials incorrect! ", result);
            res.status(401).send({success : result.success, message:"Wrong email or password"});
        }
    },function(err){
        log.it("login - there was an error : ", err);
        res.status(500).send({success : result.success, message:"Something went wrong, please wait and try again"});
    })
});


module.exports = router;

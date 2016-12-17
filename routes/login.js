var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
database = require('../models/database');



router.post('/newUser', function(req, res, next) {
    data = req.body.data;
    console.log("attempting new user creation", data);
    database.newUser(data).then(function(result){
        console.log("new user result: ", result);
        res.status(200).send("account created");
    })
	.catch(function(err){
        console.log("new user - there was an error : ", err);
        res.status(500).send("an account with that name has already been created");
    });
});

router.post('/login', function(req, res, next) {
    var data = req.body.data;
    console.log("attempting login", req.body);
    database.verifyUser(data).then(function(result){
        console.log("credentials verified! ", result);
        if(result.success){
            console.log("getting userData...");
            database.getUserIDByEmail(data)
            .then(database.generateNonceForUser)
            .then(function(data){
                console.log("got userid, hash..." , data);
                database.checkNonceForUser(data)
				.then(function(right){
						console.log("nonce check result :", right); 
				})
				.catch(function(err) {
					console.log("nonce check err ", err);
					
					res.status(500).send({success : result.success, message:"Something went wrong, please wait and try again."});
				});
				
                jwtSecret = req.app.jwtSecret;
                console.log("encrypting ", data, " with secret ", jwtSecret);
                token = jwt.sign(data , jwtSecret);
                console.log("token is ", token);
                res.cookie('token', token, { domain: 'api.smithdev.io', expires: new Date(Date.now() + 9000000), httpOnly: true, secure: true});
                console.log("cookie set! returning ");
                res.status(200).send({isadmin : data.isadmin, success : result.success});
            });
        }else{
            console.log("credentials incorrect! ", result);
            res.status(401).send({success : result.success, message:"Wrong email or password"});
        }
    })
	.catch(function(err){
        console.log("login - there was an error : ", err);
        res.status(500).send({success : false, message:"Wrong email or password"});
    })
});


module.exports = router;

var express = require('express');
var router = express.Router();
database = require('../models/database');

router.get('/', function(req, res, next){
	console.log("Login check complete");
	
    res.send("reached /user");
});

var extractFirst = function(fromWhat){
    return fromWhat[0];
}

var genericError = function(err){
    console.log("there was an error : ", err);
    return null;
}

var holdIt = function(name, items){
    return function(result){
        items[name] = result;
        return result;
    }
}


router.get('/getUserEmail', function(req, res, next){
    data = req.tokenData;
    console.log("requesting email", data);
    database.getUserEmail(data).then(function(email){
        res.send(email);
    })
});

router.get('/getUserInfo', function(req, res, next){
    data = req.tokenData;
    var returnUserInfo = function(result){
            console.log("userinfo request result: ", result);
            res.status(200).send(result);//result);
    }
    console.log("requesting userinfo", data);
    database.getUserInfo(data)
	.then(
        returnUserInfo
	)
	.catch(function(err){
		console.log("ERR! but the problem wasn't resolved!");
		res.status(500).send("There was a problem retrieving the users info");
    })
});

router.post('/updateUserInfo', function(req, res, next) {
    //console.log(req.body.data);
    data = req.body.data;
    data.userid = req.tokenData.userid;
    console.log("updating userinfo", data);
    database.updateUserInfo(data).then(function(result){
        console.log("userinfo update result: ", result);
        res.status(200).send("updated");//result);
    })
	.catch(function(err){
        console.log("there was an error : ", err);
        res.status(500).send("error updating");
    })
});


router.post('/logout', function(req, res, next) {
	database.logoutUser({userID : req.tokenData.userID})
		.then(function(result){
			console.log("logged out! ", result);
			res.status(200).send("logged out");
		})
		.catch(function(err){
			console.log("there was an error : ", err);
			res.status(500).send("Error logging out");
		})
});

//subscribe this user to the mailing list (just sets the boolean)
router.post('/subscribe', function(req, res, next) {
	database.subscribeUser({userid : req.tokenData.userid})
		.then(function(result){
			console.log("subscribed! ", result);
			res.status(200).send("logged out");
		})
		.catch(function(err){
			console.log("Failed to subscribe : ", err);
			res.status(500).send("error subscribing");
		})
});

module.exports = router;

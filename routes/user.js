var express = require('express');
var router = express.Router();
database = require('../models/database');

router.get('/', function(req, res, next){
    res.send("reached /user");
});


//these are littered everywhere now ;)
var focus = function(onWhat){
    return function(garbage){
        return onWhat;
    }
}

var extractFirst = function(fromWhat){
    return fromWhat[0];
}

var genericError = function(err){
    log.it("there was an error : ", err);
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
    log.it("requesting email", data);
    database.getUserEmail(data).then(function(email){
        res.send(email);
    })
});

router.get('/getUserInfo', function(req, res, next){
    data = req.tokenData;
    var returnUserInfo = function(result){
            log.it("userinfo request result: ", result);
            res.status(200).send(result);//result);
    }
    log.it("requesting userinfo", data);
    database.getUserInfo(data).then(
        returnUserInfo,
        function(err){
            log.it("there was an error : ", err);
            log.it("attemping blanking of user table to resolve...");
            database.blankUserTable(data)
                .then(getUserInfo)
                .then(returnUserInfo,
                function(err){
                    log.it("ERR! but the problem wasn't resolved!");
                    res.status(500).send("There was a problem retrieving the users info");
                }
            )
        }
    )
});

router.post('/updateUserInfo', function(req, res, next) {
    //log.it(req.body.data);
    data = req.body.data;
    data.userid = req.tokenData.userid;
    log.it("updating userinfo", data);
    database.updateUserInfo(data).then(function(result){
        log.it("userinfo update result: ", result);
        res.status(200).send("updated");//result);
    },function(err){
        log.it("there was an error : ", err);
        res.status(500).send("error updating");
    })
});

var focus = function(onWhat){
	return function(garbage){
		return onWhat;
	}
}

//about time!
router.post('/logout', function(req, res, next) {
	database.logoutUser({userid : req.tokenData.userid})
		.then(function(result){
			console.log("logged out! ", result);
			res.status(200).send("logged out");
		})
});

//subscribe this user to the mailing list (just sets the boolean)
router.post('/subscribe', function(req, res, next) {
	database.subscribeUser({userid : req.tokenData.userid})
		.then(function(result){
			console.log("subscribed! ", result);
			res.status(200).send("logged out");
		})
});

module.exports = router;

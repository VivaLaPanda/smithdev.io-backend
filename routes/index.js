var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next){
	var bigString = "Hello, and welcome to the smithdev api!\
		If you hit this route it will tell you what subroutes you can\
		hit. Hitting user and admin will require auth.";
	var result = {
		"info" : bigString,
		"routes" : "/login, /user, /admin"
	}
    res.send(result);
});

module.exports = router;

var express = require('express');
var router = express.Router();
database = require('../models/database');


/*
    Whomever -
        /admin route should have middleware farther up the chain
        that prevents non-admin users from accessing this route
        ie if you put something on this route it should be something
        that requires admin privileges.
    -Christian Burke
*/

router.get('/', function(req, res, next){
    res.send("reached /admin");
});

router.get('/canary', function(req, res, next){
    res.send("youre probably an admin!");
});

module.exports = router;

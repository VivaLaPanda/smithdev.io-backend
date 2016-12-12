var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var jwt = require('jsonwebtoken');
var cors = require('cors');

var DOMAIN = 'api.golfguide.net';

var routes = require('./routes/index');
var admin = require('./routes/admin');
var login = require('./routes/login');
var user = require('./routes/user');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(cors({
  methods: ['GET', 'PUT', 'POST', 'OPTIONS'],
  origin:	[
	'http://smithdev.io'
		],
  credentials: true
}));

/*
    Unwrap the token and set it's contents to tokenData
    decodeToken doesn't care what's in it,
    in fact, decodeToken doesn't care if it's malformed,
    it just tries it's best to decode and then calls next
*/
var decodeToken = function(req, res, next){
    console.log("token decoder middleware");
    console.log("token ",req.cookies.token);
    console.log("decoding with ", req.app.jwtSecret);
    jwt.verify(req.cookies.token, req.app.jwtSecret, function(err, decoded) {
        if(!err){
            console.log("Token decoded properly!");
            req.decode = decoded;
            req.wellFormedToken = true;
        }else{
            console.log("Malformed token detected!");
            req.decode = {};
            req.wellFormedToken = false;
            
        }
        next();
    });
}

/*
    "authenticate" means the token nonce matches with our nonce
    This function won't throw errors, but will label you with labels
    that may cause errors in the future
*/
var authenticateToken = function(req, res, next){
    if(req.wellFormedToken){
        database.checkNonceForUser(req.decode).then(function(authentic){
            if(authentic){
                req.tokenData = req.decode;
                req.authenticated = true;
                console.log("user is authenticated");
            }else{
                req.decode = undefined;
                req.authenticated = false;
                console.log("user unauthenticated");
            }
            next();
        }, function(err){ console.log("authentication err ", err); next();});
    }else{
        next();
    }
}

/*
    "authorize" means the userID is an admin

    There is ONE way out of this function without a 401, and
    to get it one needs to be a logical conjunction of
        decoded, authenticated and authorized
*/
var authorizeAdmin = function(req, res, next){
    if(req.authenticated){
        database.isUserAdmin(req.tokenData).then(function(authorized){
            req.admin = authorized;
            console.log("authorization status of user :", req.admin);
            if(req.admin){
                next();
            }else{
                res.status(401).send("User is not an administrator");
            }
        }, function(err){ console.log("authorize err ", err); res.status(400).send("User is not an administrator");});
    }else{
        res.status(401).send("User is not an administrator");
    }
}

/*
    authoriize an individual user to access that users data
    otherwise wipe the userid fields so user routes fail
*/
var authorizeUser = function(req, res, next){
    console.log("attempting user authorization");
    if(req.authenticated){
        console.log("user authenticated!");
        next();
        req.query.userid = req.tokenData.userid;
    }else{
        console.log("user authorization failed");
        req.body.userid = -1;
        res.status(401).send("User is not logged in");
    }
}

app.use('/admin', decodeToken);
app.use('/admin', authenticateToken);
app.use('/admin', authorizeAdmin);

app.use('/user', decodeToken);
app.use('/user', authenticateToken);
app.use('/user', authorizeUser);


app.use('/', routes);
app.use('/login', login);
app.use('/admin', admin);
app.use('/user', user);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

console.log("Server awake and listening on port 3000\n");

module.exports = app;

var exports = module.exports = {};

var bcrypt = require('bcrypt-as-promised');
var jwt = require('jsonwebtoken');
var highwayhash = require('highwayhash');
var farmhash = require('farmhash');
var randomstring = require("randomstring");
var secrets = require('../secrets');
var Q = require('q');
var options = {
    promiseLib: Q
};
var pgp = require('pg-promise')(options);
var Cryptr = require('cryptr');
var cryptr = secrets.cryptr;

var db = pgp(secrets.connectionString);
const key = secrets.highway;


/*
    I'm thinkin' if we just insert it and let it fail hard
    when there's already an entry, that's the best way to
    do it.
*/
exports.newUser = function(data){
    return bcrypt.hash(data.pass, 10)
        .then(function(res){
            data.hashed = res;
        }, console.error)
        .then(function(res){ return db.one(
            'insert into useraccounts(emailaddress, hashedpass)\
            values(${email}, ${hashed}) returning userid', data)})
        .then(function(res){ data.userid = res.userid; return data; });
}

/*
    Ensure that the email and password combo is right
*/
exports.verifyUser = function(data){
    return db.one("select hashedpass from useraccounts where emailaddress = ${email}", data)
    .then(function(result){ return bcrypt.compare(data.pass, result.hashedpass) })
    .then(function(result){
        console.log("comparison successful", result);
        return { "success" : true };
    }, function(err){
        console.error("the password is wrong!", err);
        return { "success" : false };
    });
}

exports.getUserIDByEmail = function(data){
    console.log("getting userID for ", data.email);
    return db.one("select userid, isadmin from useraccounts where emailaddress = ${email}", data)
        .then(justSendIt, genericError);
}

exports.isUserAdmin = function(data){
    return db.one("select isadmin from useraccounts where userid = ${userid}", data)
    .then(function(result){
        return result.isadmin;
    }, function(err){
        return false;
    });
}

exports.getUserEmail = function(data){
    return db.one("select emailaddress from useraccounts where userid = ${userid}", data);
};


/*
    Securely hash the current time and store
    the unhashed value in the database
    as the nonce for the user
    Return the hash
*/
exports.generateNonceForUser = function(data){
    console.log("generating nonce for userid ", data);
    curTime = String(Math.floor(new Date() / 1000));    //unix timestamp
    curTimeBuf = new Buffer(curTime);
    hashAsHexString = highwayhash.asHexString(key, curTimeBuf);
    console.log("inserting nonce to the database");
    return db.query("update useraccounts set nonce = $1 where userid = $2;", [curTime, data.userid])
        .then(function(result){
            console.log("nonce inserted!");
            data.hash = hashAsHexString;
            return data;
        },function(err){
            console.log("Error generating nonce at a database ! ", err);
        });
}

/*
    Check that the nonce in the database
    hashes to the provided hash
*/
exports.checkNonceForUser = function(dat){
    console.log("checking nonce ", dat);
    return db.one("select nonce from useraccounts where userid = ${userid}", dat)
        .then(function(usrData){
            hash = highwayhash.asHexString(key, new Buffer(usrData.nonce));
            if(hash == dat.hash){   //see what i did there?
                return true;
            }else{
                return false;
            }
        });
}

exports.blankUserTable = function(dat){
    console.log("performing blanking of usertable", dat);
    return db.query("insert into userinfo(userid) values ( ${userid} )", dat)
            .then(function(res){ return dat;});
}
/*
    get user info
*/
exports.getUserInfo = function(dat){
    return db.query("select * from userinfo where userid = ${userid}", dat);
}

/*
    set user info
*/
exports.updateUserInfo = function(dat){
    return db.query("update userinfo set\
                    userid = ${userid},\
                    firstname = ${firstname},\
                    lastname = ${lastname},\
                    zip = ${zip},\
                    gender = ${gender},\
                    income = ${income},\
                    handicap = ${handicap},\
                    playid = ${playid},\
                    homeowner = ${homeowner},\
                    secondhome = ${secondhome},\
                    education = ${education},\
                    maritalstatus = ${maritalstatus},\
                    tripinnextyear = ${tripinnextyear},\
                    golftripfunds = ${golftripfunds},\
                    course_id = ${course_id},\
                    annualequipmentcost = ${annualequipmentcost},\
					travelforgolf = ${travelforgolf},\
					annualgolftrip = ${annualgolftrip}\
                    where userid = ${userid}", dat);
}

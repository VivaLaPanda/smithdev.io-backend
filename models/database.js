var exports = module.exports = {};

var bcrypt = require('bcrypt-as-promised');
var jwt = require('jsonwebtoken');
var highwayhash = require('highwayhash');
var farmhash = require('farmhash');
var randomstring = require("randomstring");
var secrets = require('../secrets');
var Q = require('q');
var psql = require('promise-mysql');
var Cryptr = require('cryptr');
var cryptr = new Cryptr(secrets.crypterString);

const key = secrets.highway;

var connection;

psql.createConnection(secrets.connectionJson).then(function(conn){
    connection = conn;
});

var justSendIt = function(data){
    return data;
}


/*
    I'm thinkin' if we just insert it and let it fail hard
    when there's already an entry, that's the best way to
    do it.
	
	All users default to non-admin. An admin give another user
	admin after their account exists. Thus, we must bootstrap by manually setting this
	in the database for the first admin.
*/
exports.newUser = function(data){
    return bcrypt.hash(data.pass, 10)
        .then(function(res){
            data.hashed = res;
			data.isAdmin = false;
			if (!data.subscribedToEmails) {
				data.subscribedToEmails = false;
			}
			insertData = [
				data.email, 
				data.hashed, 
				data.isAdmin, 
				data.username,
				data.subscribedToEmails
			];
        }, console.error)
        .then(function(res){ return connection.query(
            'insert into User(emailAddress, hashedPass, isAdmin, username,  subscribedToEmails)\
			values(?, ?, ?, ?, ?)', insertData)})
        .then(function(res){
			userid = res.insertId; 
			return connection.query(
				'select * from User where userID = ?', [userid])
		})
		.catch(function(err) {
			console.log("Error inserting user", err);
			
			throw err;
		});
}



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
    hashAsHexString = farmhash.hash64WithSeed(curTimeBuf, key);
    console.log("inserting nonce to the database");
    return connection.query("update User set nonce = ? where userID = ?;", [curTime, data.userID])
        .then(function(result){
            console.log("nonce inserted!");
			
			console.log("originalNonce: ", curTime);
			console.log("hash: ", hashAsHexString);
			
			
            data.hash = hashAsHexString;
            return data;
        })
		.catch(function(err) {
			console.log("Error generating nonce at database", err);
			
			throw err;
		});
}

/*
    Check that the nonce in the database
    hashes to the provided hash
*/
exports.checkNonceForUser = function(dat){
    console.log("checking nonce ", dat);
    return connection.query("select nonce from User where userID = ?", [dat.userID])
		.then(function(result) {
			return result[0];
		})
        .then(function(usrData){
			console.log("user data", usrData);
			var nonce = new Buffer(usrData.nonce);
			
            hash = farmhash.hash64WithSeed(nonce, key);
			
			console.log("dbNonce", usrData.nonce);
			console.log("usrNonce?", dat.iat);
			
			console.log("dbhash", hash);
			console.log("userhash", dat.hash);
			
            if(hash == dat.hash){   //see what i did there?
                return true;
            }else{
                return false;
            }
        })
		.catch(function(err) {
			console.log("Error checking nonce");
			
			throw err;
		});
}


/*
    Ensure that the email and password combo is right
*/
exports.verifyUser = function(data){
	console.log('email: ', data);
	
    return connection.query("select hashedPass from User where emailAddress = ?", [data.email])
    .then(function(result){
		console.log(result);
		
		return bcrypt.compare(data.pass, result[0].hashedPass);
	})
    .then(function(result){
        console.log("comparison successful", result);
        return { "success" : true };
    })
	.catch(function(err) {
		console.log("Error verifying user");
			
		throw err;
	});
}

exports.logoutUser = function(data){
	return connection.query("update User set nonce = 0 where userID = ?;", [data.userID]);
}

exports.getUserIDByEmail = function(data){
    console.log("getting userid for ", data.email);
    return connection.query("select userID, isAdmin from User where emailAddress = ?", [data.email])
        .then(function(result){
				return result[0];
		})
		.catch(function(err) {
			console.log("Error getting user id by email", err);
			
			throw err;
		});
}

exports.isUserAdmin = function(data){
	console.log(data);
    return connection.query("select isAdmin from User where userID = ?", [data.userID])
    .then(function(result){
        return result[0].isAdmin;
    })
	.catch(function(err) {
		console.log("Error checking admin", err);
		
		return false;
	});
}

exports.getUserEmail = function(data){
    return connection.query("select emailAddress from User where userID = ?", [data.userid])
	.then(function(result) {
		return result[0]
	})
	.catch(function(err) {
		console.log("Error getting user email", err);
		
		throw err;
	});
};

/*
    get user info
*/
exports.getUserInfo = function(dat){
    return connection.query("select * from User where userID = ?", [dat.userid])
	.then(function(result) {
		return result[0]
	})
	.catch(function(err) {
		console.log("Error getting user info", err);
		
		throw err;
	});
}

/*
    set user core - Should only be used by admin
*/
exports.updateUserCore = function(dat){
	upData = [
		dat.userid,
		dat.username,
		dat.isAdmin,
		dat.emailAddress,
		dat.firstName,
		dat.lastName
	]
    return connection.query("update User set\
                    userid = ?,\
                    username = ?,\
                    isAdmin = ?,\
                    emailAddress = ?,\
                    firstName = ?,\
                    lastName = ?,\
					", upData)
	.catch(function(err) {
		console.log("Error updating user core", err);
		
		throw err;
	});
}

/*
    set user info - usable by any user
*/
exports.updateUserInfo = function(dat){
	upData = [
		dat.useriD,
		dat.firstName,
		dat.lastName,
		dat.emailAddress
	]
	
    return connection.query("update User set\
                    userid = ${userid},\
                    firstName = ${firstName},\
                    lastName = ${lastName},\
                    emailAddress = ${emailAddress},\
					", upData)
	.catch(function(err) {
		console.log("Error updating user info", err);
		
		throw err;
	});
}


/*
    PASSWORD RESET MACHINE
*/

exports.updateUserPassword = function(data){
    console.log("update user pass ", data);
    return bcrypt.hash(data.pass, 10)
        .then(function(res){
            data.hashed = res;
            console.log(data);
            return data;
        })
        .then(function(data){
            return connection.query("update User set hashedPass = ? where userid = ?", [data.hashed, data.userid]);
        })
		.catch(function(err) {
			console.log("Error updating password", err);
			
			throw err;
		});
}

//make a new password reset for the given userid
exports.createPasswordReset = function(data){
    return connection.query("insert into passwordResetCodes (userid) values (?)", [data.userid])
        .then(function(res) {
				data = {
					"userid"  : res.insertId
				}
				
				connection.query("select passwordCode from passwordResetCodes where userid = ?", [data.userid])
				.then(function(result){
					return result[0];
				})
				.catch(function(err) {
					console.log("Getting code", err);
					
					throw err;
				});
		})
		.catch(function(err) {
			console.log("Error inserting password reset code", err);
			
			throw err;
		});
}

//get the password reset
exports.retrievePasswordReset = function(data){
    return connection.query("select * from passwordResetCodes where passwordCode = ?", [data.passwordCode])
	.then(function(result){
		return result[0];
	})
	.catch(function(err) {
		console.log("Error getting password reset code", err);
		
		throw err;
	});
}

//gonna wipe these at midnight every night with no conditions
exports.removeAllPasswordResets = function(data){
    return connection.query("Truncate table passwordResetCodes;")
	.catch(function(err) {
		console.log("Error removing password reset codes", err);
		
		throw err;
	});
}

//delete a specific one
exports.removePasswordReset = function(data){
    return connection.query("delete from passwordResetCodes where passwordCode = ?;", [data.passwordCode])
	.catch(function(err) {
		console.log("Error removing password reset code", err);
		
		throw err;
	});
}

exports.subscribeUser = function(data){
    return connection.query("update User set subscribedToEmails = true where userid = ?;", [data.userid])
	.catch(function(err) {
		console.log("Error subscribing user to email list", err);
		
		throw err;
	});
}

/*********************
* Admin Tools
*********************/

exports.allCategories = function(){
    return connection.query("select * from Category;")
	.catch(function(err) {
		console.log("Error getting categories");
		
		throw err;
	});
}

exports.newCategory = function(data){
	return connection.query("insert into Category (name) values (?);", [data.name])
	.then(function(result) {
		return exports.allCategories();
	})
	.catch(function(err) {
		throw err;
	});
}

// We plan to avoid using this, but just in case
exports.updateCategory = function(data){
    return connection.query("update Category set name = ? where categoryID = ?;", [data.name, data.categoryID])
	.then(function(result) {
		return exports.allCategories();
	})
	.catch(function(err) {
		throw err;
	});
}

exports.removeCategory = function(data){
    return connection.query("delete from Category where categoryID = ?;", [data.categoryID])
	.then(function(result) {
		return exports.allCategories();
	})
	.catch(function(err) {
		throw err;
	});
}

exports.newBlogPost = function(data){
	var postID;
	
	insertData = [
		data.imageUrl,
		data.thumbImageUrl,
		data.title,
		data.description,
		data.postBody,
		data.userID
	];
	
	console.log("objdata: ", data);
	console.log("arrayDat", insertData);
	
    return connection.query("insert into BlogPost\
		(imageUrl, thumbImageUrl, title, description, postBody, userID)\
		values (?,?,?,?,?,?)", insertData)
	.then(function(result) {
		postID = result.insertId;
		
		if (data.categories) {
			categoriesData = [];
			data.categories.forEach(function(category){
				categoriesData.push([postID, category.categoryID]);
			})
			
			return connection.query("insert into PostInCategory (postID, categoryID) values ?", [categoriesData])
		} else {
			return;
		}
	})
	.then(function(result) {
		// For convenience sake we consider making a post to be editing one as well
		
		return connection.query("insert into UserEditPost (userID, postID) values (?,?)", [data.userID, postID])
	})
	.then(function(categoryInsertResult) {
		return exports.listBlogPost();
	})
	.catch(function(err) {
		console.log("Error making blog post", err);
		
		throw err;
	});
}

var deleteAllCategoriesOnPost = function(postID) {
	return connection.query("delete from PostInCategory where postID = ?", [postID]);
}

var deleteAllEditsOnPost = function(postID) {
	return connection.query("delete from UserEditPost where postID = ?", [postID]);
}

exports.deleteBlogPost = function(data) {
	postID = data.postID;
	
	return deleteAllEditsOnPost(postID)
	.then(deleteAllCategoriesOnPost(postID))
	.then(function(result) {
		return connection.query("delete from BlogPost where postID = ?", [postID]);
	})
	.then(function(result) {
		return exports.listBlogPost();
	})
	.catch(function(err) {
		throw err;
	});
}

exports.updateBlogPost = function(data){
	postID = data.postID;
	userID = data.userid;
	var postReturnValue;
	
	upData = [
		data.imageUrl,
		data.thumbImageUrl,
		data.title,
		data.description,
		data.postBody,
		postID
	];
	
	console.log("Obj data", data);
	console.log("Array dat", upData);
	
    return connection.query("update BlogPost\
		set imageUrl = ?,\
		thumbImageUrl = ?,\
		title = ?,\
		description = ?,\
		postBody = ?,\
		where postID = ?;", upData)
	.then(function(mainResult) {
		deleteAllCategoriesOnPost(postID)
		.then(function(deleteResult) {
			categoriesData = [];
			data.categories.forEach(function(category){
				categoriesData.push([result.insertId, category.categoryID]);
			})
			
			return connection.query("insert into PostInCategory (postID, categoryID) values ?", [categoriesData])
			.then(function(result) {
				return connection.query("insert into UserEditPost (userID, postID) values (?,?)", [userID, postID]);
			})
			.then(function(insertResult) {
				exports.listBlogPost();
			})
			.catch(function(err) {
				console.log("Error setting categories and returning post");
				
				throw err;
			});
		})
		.catch(function(err) {
			console.log("Error deleting old categories");
			
			throw err;
		});
	})
	.catch(function(err) {
		console.log("Error making blog post");
		
		throw err;
	});
}

exports.getBlogPost = function(postID) {
	var postReturnValue;
	
	return connection.query("select * from BlogPost where postID = ?", [postID])
	.then(function(postReturnBase) {
		postReturnValue = postReturnBase[0];
		console.log("return:", postReturnValue);
		
		return connection.query("select * from PostInCategory where postID = ?", [postID]);
	})
	.then(function(postReturnCategories) {
		postReturnValue.categories = postReturnCategories;
		console.log("return:", postReturnValue);
		
		return  connection.query("select * from UserEditPost where postID = ?", [postID]);
	})
	.then(function(postReturnEdits) {
		postReturnValue.edits = postReturnEdits;
		
		console.log("return:", postReturnValue);
		return postReturnValue;
	})
	.catch(function(err) {
		console.log("Error getting blog post");
		
		throw err;
	});
}

exports.listBlogPost = function() {
	var postListPlus = [];
	
	var operations = [];
	
	var pushPost = function(post) {
		console.log("post", post);
		
		return exports.getBlogPost(post.postID)
		.then(function(singlePost) {
			console.log("Full Single Post", singlePost);
			postListPlus.push(singlePost);
		})
		.catch(function(err) {
			console.log("Error getting single blog post");
			
			throw err;
		});
	}
	
	return connection.query("select postID from BlogPost")
	.then(function(posts) {
		posts.forEach(function (post) {
			operations.push(pushPost(post));
		});
		
		return operations;
	})
	.all(operations)
	.then(function(result) {
		return postListPlus;
	})
	.catch(function(err) {
		console.log("Error getting list of blog posts");
		
		throw err;
	});
}
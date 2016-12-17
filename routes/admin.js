var express = require('express');
var router = express.Router();
database = require('../models/database');


/*
    Whomever -
        /admin route should have middleware farther up the chain
        that prevents non-admin users from accessing this route
        ie if you put something on this route it should be something
        that requires admin privileges.
*/

router.get('/', function(req, res, next){
    res.send("reached /admin");
});

router.get('/canary', function(req, res, next){
	console.log("Admin check complete");
	
    res.send("youre probably an admin!");
});

router.post('/newCategory', function(req, res, next){
    data = req.body.data;
	
	database.newCategory(data)
	.then(function(result){
        res.status(200).send(result);
	})
	.catch(function(err){
		console.log("Error adding category: ", err);
		res.status(500).send("There was a problem adding a new category.");
    })
});

router.post('/updateCategory', function(req, res, next){
    data = req.body.data;
	
	database.updateCategory(data)
	.then(function(result){
        res.status(200).send(result);
	})
	.catch(function(err){
		console.log("Error updating category: ", err);
		res.status(500).send("There was a problem updating a category.");
    })
});

router.post('/removeCategory', function(req, res, next){
    data = req.body.data;
	
	database.removeCategory(data)
	.then(function(result){
        res.status(200).send(result);
	})
	.catch(function(err){
		console.log("Error removing category: ", err);
		res.status(500).send("There was a problem removing a category.");
    })
});

router.post('/newBlogPost', function(req, res, next){
    data = req.body.data;
	data.userID = req.tokenData.userID;
	
	database.newBlogPost(data)
	.then(function(result){
        res.status(200).send(result);
	})
	.catch(function(err){
		console.log("Error inserting blog post ", err);
		res.status(500).send("There was a problem making a new blog post.");
    })
});

router.post('/updateBlogPost', function(req, res, next){
    data = req.body.data;
	data.userID = req.tokenData.userID;
	
	database.updateBlogPost(data)
	.then(function(result){
        res.status(200).send(result);
	})
	.catch(function(err){
		console.log("Error updating blog post: ", err);
		res.status(500).send("There was a problem updating a blog post.");
    })
});

router.post('/deleteBlogPost', function(req, res, next){
    data = req.body.data;
	
	database.deleteBlogPost(data)
	.then(function(result){
        res.status(200).send(result);
	})
	.catch(function(err){
		console.log("Error deleting blog post: ", err);
		res.status(500).send("There was a problem deleting a blog post.");
    })
});

/*****
To get a specific blog post by ID
Get request to:
/blog/getBlogPost
******/

module.exports = router;

var express = require('express');
var router = express.Router();
database = require('../models/database');

router.get('/', function(req, res, next){
    res.send("reached /blog");
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

router.get('/categories', function(req, res, next){
	database.allCategories()
	.then(function(result){
        res.status(200).send(result);
	})
	.catch(function(err){
		console.log("Error getting categories: ", err);
		res.status(500).send("There was a problem getting the list of categories.");
    })
});

router.get('/getBlogPost', function(req, res, next){
    data = req.query;
	
	database.getBlogPost(data)
	.then(function(result){
        res.status(200).send(result);
	})
	.catch(function(err){
		console.log("Error getting one post: ", err);
		res.status(500).send("There was a problem retreiving this blog post.");
    })
});

router.get('/allBlogPosts', function(req, res, next){
    data = req.query;
	database.listBlogPost(data)
	.then(function(result){
        res.status(200).send(result);
	})
	.catch(function(err){
		console.log("Error getting all posts: ", err);
		res.status(500).send("There was a problem getting the list of blog posts.");
    })
});

module.exports = router;

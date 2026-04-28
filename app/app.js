// Import express.js
const express = require("express");

// Create express app
var app = express();
// Use the Pug templating engine
app.set('view engine', 'pug');
app.set('views', './app/views');
// Add static files location
app.use(express.static("static"));

// Get the functions in the db.js file to use
const db = require('./services/db');

// Create a route for root - /
app.get("/", function(req, res) {
    res.send("landing page");
});

// Create a route for testing the db
app.get("/db_test", function(req, res) {
    // Assumes a table called test_table exists in your database
    sql = 'select * from test_table';
    db.query(sql).then(results => {
        console.log(results);
        res.send(results)
    });
});

app.get("/users", function(req, res) {
    var sql = 'SELECT * FROM Users';

    db.query(sql).then(results => {
        res.render('users', { data: results });
    }).catch(err => {
        console.error(err);
        res.send("Database error");
    });
});

app.get("/user/:id", function(req, res) {
    var id = req.params.id; 
    var sql = 'SELECT * FROM Users where id = ?';

    db.query(sql,[id]).then(results => {
        res.render('users', { data: results });
    }).catch(err => {
        console.error(err);
        res.send("Database error");
    });
    });



// Create a route for /goodbye
// Responds to a 'GET' request
app.get("/goodbye", function(req, res) {
    res.send("Goodbye world!");
});

// Create a dynamic route for /hello/<name>, where name is any value provided by user
// At the end of the URL
// Responds to a 'GET' request
app.get("/hello/:name", function(req, res) {
    // req.params contains any parameters in the request
    // We can examine it in the console for debugging purposes
    console.log(req.params);
    //  Retrieve the 'name' parameter and use it in a dynamically generated page
    res.send("Hello " + req.params.name);
});

// Start server on port 3000
app.listen(3000,function(){
    console.log(`Server running at http://127.0.0.1:3000/`);
});
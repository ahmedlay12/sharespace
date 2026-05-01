"use strict";

const express = require("express");
const session = require("express-session");

var app = express();

app.set('view engine', 'pug');
app.set('views', './app/views');
app.use(express.static("static"));
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'sharespace-secret-key',
    resave: false,
    saveUninitialized: false
}));

app.use(function(req, res, next) {
    res.locals.loggedInUser = req.session.user || null;
    next();
});

app.use(function(req, res, next) {
    if (req.session.user) {
        const db = require('./services/db');
        db.query('SELECT COUNT(*) AS cnt FROM messages WHERE receiver_id = ? AND is_read = 0', [req.session.user.id])
          .then(r => { res.locals.unreadCount = r[0].cnt; next(); })
          .catch(() => { res.locals.unreadCount = 0; next(); });
    } else {
        res.locals.unreadCount = 0;
        next();
    }
});

const db = require('./services/db');

app.get("/", function(req, res) {
    res.render('index');
});

app.get("/register", function(req, res) {
    res.render('register', { error: null });
});

app.post("/register", function(req, res) {
    var name     = req.body.name;
    var email    = req.body.email;
    var password = req.body.password;
    var uni      = req.body.uni;
    var location = req.body.location;
    var bio      = req.body.bio;

    db.query('SELECT id FROM users WHERE email = ?', [email]).then(existing => {
        if (existing.length > 0) {
            return res.render('register', { error: 'An account with that email already exists.' });
        }
        var sql = 'INSERT INTO users (name, email, password, uni, location, bio) VALUES (?, ?, ?, ?, ?, ?)';
        return db.query(sql, [name, email, password, uni, location, bio]).then(() => {
            res.redirect('/login');
        });
    }).catch(err => {
        console.error(err);
        res.send("Database error");
    });
});

app.get("/login", function(req, res) {
    res.render('login', { error: null });
});

app.post("/login", function(req, res) {
    var email    = req.body.email;
    var password = req.body.password;

    db.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]).then(results => {
        if (results.length > 0) {
            req.session.user = results[0];
            res.redirect('/');
        } else {
            res.render('login', { error: 'Incorrect email or password.' });
        }
    }).catch(err => {
        console.error(err);
        res.send("Database error");
    });
});

app.get("/logout", function(req, res) {
    req.session.destroy();
    res.redirect('/');
});

app.get("/users", function(req, res) {
    var sql = `
        SELECT users.*,
               ROUND(AVG(ratings.score), 1) AS avg_rating,
               COUNT(DISTINCT ratings.id) AS rating_count
        FROM users
        LEFT JOIN ratings ON ratings.reviewed_id = users.id
        GROUP BY users.id
    `;
    db.query(sql).then(results => {
        res.render('users', { data: results });
    }).catch(err => {
        console.error(err);
        res.send("Database error");
    });
});

app.get("/users/:id", function(req, res) {
    var id = req.params.id;

    var userSql = `
        SELECT users.*,
               ROUND(AVG(ratings.score), 1) AS avg_rating,
               COUNT(DISTINCT ratings.id) AS rating_count
        FROM users
        LEFT JOIN ratings ON ratings.reviewed_id = users.id
        WHERE users.id = ?
        GROUP BY users.id
    `;

    var listingsSql = `
        SELECT listings.*, categories.name AS category_name
        FROM listings
        JOIN categories ON listings.category = categories.id
        WHERE listings.owner = ?
        ORDER BY listings.created_at DESC
    `;

    var ratingsSql = `
        SELECT ratings.*, users.name AS reviewer_name
        FROM ratings
        JOIN users ON ratings.reviewer_id = users.id
        WHERE ratings.reviewed_id = ?
        ORDER BY ratings.created_at DESC
    `;

    Promise.all([
        db.query(userSql, [id]),
        db.query(listingsSql, [id]),
        db.query(ratingsSql, [id])
    ]).then(([userResults, listingResults, ratingsResults]) => {
        res.render('user-profile', {
            user: userResults[0],
            listings: listingResults,
            ratings: ratingsResults
        });
    }).catch(err => {
        console.error(err);
        res.send("Database error");
    });
});

app.post("/rate/:id", function(req, res) {
    if (!req.session.user) return res.redirect('/login');

    var reviewed_id  = req.params.id;
    var reviewer_id  = req.session.user.id;

    if (reviewed_id == reviewer_id) return res.redirect('/users/' + reviewed_id);

    var score   = req.body.score;
    var comment = req.body.comment;

    db.query('INSERT INTO ratings (reviewer_id, reviewed_id, score, comment) VALUES (?, ?, ?, ?)',
        [reviewer_id, reviewed_id, score, comment]
    ).then(() => {
        res.redirect('/users/' + reviewed_id);
    }).catch(err => {
        console.error(err);
        res.send("Database error");
    });
});

app.get("/listings", function(req, res) {
    var search = req.query.search || '';
    var sql;
    var params;

    if (search) {
        sql = `
            SELECT listings.*, categories.name AS category_name, users.name AS user_name
            FROM listings
            JOIN categories ON listings.category = categories.id
            JOIN users ON listings.owner = users.id
            WHERE listings.title LIKE ? OR listings.description LIKE ? OR categories.name LIKE ?
            ORDER BY listings.created_at DESC
        `;
        params = ['%' + search + '%', '%' + search + '%', '%' + search + '%'];
    } else {
        sql = `
            SELECT listings.*, categories.name AS category_name, users.name AS user_name
            FROM listings
            JOIN categories ON listings.category = categories.id
            JOIN users ON listings.owner = users.id
            ORDER BY listings.created_at DESC
        `;
        params = [];
    }

    db.query(sql, params).then(results => {
        res.render('listings', { data: results, search: search });
    }).catch(err => {
        console.error(err);
        res.send("Database error");
    });
});

app.get("/listings/:id", function(req, res) {
    var id = req.params.id;

    var listingSql = `
        SELECT listings.*, categories.name AS category_name, users.name AS user_name,
               users.location AS owner_location, users.id AS owner_id
        FROM listings
        JOIN categories ON listings.category = categories.id
        JOIN users ON listings.owner = users.id
        WHERE listings.id = ?
    `;

    db.query(listingSql, [id]).then(listingResults => {
        if (listingResults.length === 0) return res.send("Listing not found");

        var listing = listingResults[0];

        var matchSql = 'SELECT listings.*, users.name AS user_name, users.location AS user_location, ' +
            '(CASE WHEN listings.location = ? THEN 2 ELSE 0 END + ' +
            'CASE WHEN listings.condition = ? THEN 1 ELSE 0 END + ' +
            "CASE WHEN listings.availability = 'available' THEN 1 ELSE 0 END) AS match_score " +
            'FROM listings JOIN users ON listings.owner = users.id ' +
            'WHERE listings.category = ? AND listings.id != ? ' +
            "AND listings.availability != 'collected' " +
            'ORDER BY match_score DESC, listings.created_at DESC LIMIT 4';

        var requestsSql = 'SELECT COUNT(*) AS total FROM requests WHERE listing_id = ?';

        return Promise.all([
            db.query(matchSql, [listing.location, listing.condition, listing.category, id]),
            db.query(requestsSql, [id])
        ]).then(([matches, reqCount]) => {
            res.render('listing-detail', {
                listing: listing,
                matches: matches,
                requestCount: reqCount[0].total
            });
        });
    }).catch(err => {
        console.error(err);
        res.send("Database error");
    });
});

app.get("/create-listing", function(req, res) {
    if (!req.session.user) return res.redirect('/login');
    db.query('SELECT * FROM categories').then(categories => {
        res.render('create-listing', { categories: categories, error: null });
    });
});

app.post("/create-listing", function(req, res) {
    if (!req.session.user) return res.redirect('/login');

    var title       = req.body.title;
    var description = req.body.description;
    var condition   = req.body.condition;
    var location    = req.body.location;
    var category    = req.body.category;
    var owner       = req.session.user.id;

    db.query(
        'INSERT INTO listings (title, description, `condition`, location, owner, category, posted) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [title, description, condition, location, owner, category, 'Just now']
    ).then(() => {
        res.redirect('/listings');
    }).catch(err => {
        console.error(err);
        res.send("Database error");
    });
});

app.post("/request/:listing_id", function(req, res) {
    if (!req.session.user) return res.redirect('/login');

    var listing_id        = req.params.listing_id;
    var requester_user_id = req.session.user.id;
    var message           = req.body.message;

    db.query(
        'INSERT INTO requests (listing_id, requester_user_id, message) VALUES (?, ?, ?)',
        [listing_id, requester_user_id, message]
    ).then(() => {
        res.redirect('/listings/' + listing_id);
    }).catch(err => {
        console.error(err);
        res.send("Database error");
    });
});

app.get("/my-requests", function(req, res) {
    if (!req.session.user) return res.redirect('/login');

    var id = req.session.user.id;

    var sentSql = `
        SELECT requests.*, listings.title AS listing_title, users.name AS owner_name
        FROM requests
        JOIN listings ON requests.listing_id = listings.id
        JOIN users ON listings.owner = users.id
        WHERE requests.requester_user_id = ?
        ORDER BY requests.created_at DESC
    `;

    var receivedSql = `
        SELECT requests.*, listings.title AS listing_title, users.name AS requester_name
        FROM requests
        JOIN listings ON requests.listing_id = listings.id
        JOIN users ON requests.requester_user_id = users.id
        WHERE listings.owner = ?
        ORDER BY requests.created_at DESC
    `;

    Promise.all([
        db.query(sentSql, [id]),
        db.query(receivedSql, [id])
    ]).then(([sent, received]) => {
        res.render('my-requests', { sent: sent, received: received });
    }).catch(err => {
        console.error(err);
        res.send("Database error");
    });
});

app.get("/categories", function(req, res) {
    var sql = `
        SELECT categories.*, COUNT(listings.id) AS listing_count
        FROM categories
        LEFT JOIN listings ON listings.category = categories.id
        GROUP BY categories.id
    `;
    db.query(sql).then(results => {
        res.render('categories', { data: results });
    }).catch(err => {
        console.error(err);
        res.send("Database error");
    });
});

app.get("/categories/:id", function(req, res) {
    var id = req.params.id;

    var catSql = 'SELECT * FROM categories WHERE id = ?';
    var listingsSql = `
        SELECT listings.*, users.name AS user_name
        FROM listings
        JOIN users ON listings.owner = users.id
        WHERE listings.category = ?
        ORDER BY listings.created_at DESC
    `;

    Promise.all([
        db.query(catSql, [id]),
        db.query(listingsSql, [id])
    ]).then(([catResults, listingResults]) => {
        res.render('category-listings', {
            category: catResults[0],
            listings: listingResults
        });
    }).catch(err => {
        console.error(err);
        res.send("Database error");
    });
});

app.get("/messages", function(req, res) {
    if (!req.session.user) return res.redirect('/login');

    var id = req.session.user.id;

    var sql = `
        SELECT
            u.id AS other_id,
            u.name AS other_name,
            m.content AS last_message,
            m.created_at AS last_time,
            m.sender_id,
            SUM(CASE WHEN m2.is_read = 0 AND m2.receiver_id = ? THEN 1 ELSE 0 END) AS unread
        FROM (
            SELECT
                CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS other_user,
                MAX(id) AS max_id
            FROM messages
            WHERE sender_id = ? OR receiver_id = ?
            GROUP BY other_user
        ) AS convos
        JOIN messages m ON m.id = convos.max_id
        JOIN users u ON u.id = convos.other_user
        LEFT JOIN messages m2 ON (m2.sender_id = convos.other_user AND m2.receiver_id = ?)
        GROUP BY u.id, u.name, m.content, m.created_at, m.sender_id
        ORDER BY m.created_at DESC
    `;

    db.query(sql, [id, id, id, id, id]).then(conversations => {
        res.render('messages-inbox', { conversations: conversations });
    }).catch(err => {
        console.error(err);
        res.send("Database error");
    });
});

app.get("/messages/:user_id", function(req, res) {
    if (!req.session.user) return res.redirect('/login');

    var myId    = req.session.user.id;
    var otherId = req.params.user_id;

    db.query('UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?', [otherId, myId]);

    var msgSql = `
        SELECT messages.*, users.name AS sender_name
        FROM messages
        JOIN users ON messages.sender_id = users.id
        WHERE (sender_id = ? AND receiver_id = ?)
           OR (sender_id = ? AND receiver_id = ?)
        ORDER BY created_at ASC
    `;

    var userSql = 'SELECT id, name, location FROM users WHERE id = ?';

    Promise.all([
        db.query(msgSql, [myId, otherId, otherId, myId]),
        db.query(userSql, [otherId])
    ]).then(([msgs, otherUser]) => {
        if (otherUser.length === 0) return res.send("User not found");
        res.render('messages-conversation', {
            messages: msgs,
            otherUser: otherUser[0]
        });
    }).catch(err => {
        console.error(err);
        res.send("Database error");
    });
});

app.post("/messages/:user_id", function(req, res) {
    if (!req.session.user) return res.redirect('/login');

    var senderId   = req.session.user.id;
    var receiverId = req.params.user_id;
    var content    = req.body.content;

    if (!content || !content.trim()) return res.redirect('/messages/' + receiverId);

    db.query(
        'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
        [senderId, receiverId, content.trim()]
    ).then(() => {
        res.redirect('/messages/' + receiverId);
    }).catch(err => {
        console.error(err);
        res.send("Database error");
    });
});

app.listen(3000, function(){
    console.log('ShareSpace running on http://localhost:3000');
});

module.exports = app;
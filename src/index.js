require("dotenv").config({ path: "src/.env" });
const express = require("express");
const { create } = require('express-handlebars');
const app = express();
const server = require("http").createServer(app);
const port = process.env.PORT || 3000;
const path = require("path");

const session = require("express-session");
const passport = require("passport");
const DiscordStrategy = require('passport-discord').Strategy;
const discordStrategyScopes = ['identify', 'email'];

const mongoose = require("mongoose")
const User = require("./models/User.js")
const sessionMiddleware = session({ secret: process.env.SECRET || "changeit", resave: false, saveUninitialized: false });
const express_handlebars_sections = require('express-handlebars-sections');

const hbs = create({})
express_handlebars_sections(hbs)

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, "/views"));

app.use(sessionMiddleware);
app.use(express.urlencoded({ extended: false }));
app.use(passport.initialize({}));
app.use(passport.session({}));
app.use('/static', express.static(path.join(__dirname, "public")));

mongoose.connect(process.env.MONGO_URL || "mongodb://localhost:27017/myapp")

passport.use(new DiscordStrategy({
        clientID: process.env.DISCORD_ID,
        clientSecret: process.env.DISCORD_SECRET,
        callbackURL: process.env.DISCORD_CALLBACK,
        scope: discordStrategyScopes
    },
    function(accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ discordId: profile.id, email: profile.email, username: profile.username}, function(err, user) {
            return cb(err, user);
        });
    }));

app.get("/", (req, res) => {
    const isAuthenticated = req.isAuthenticated();
    if (isAuthenticated) {
        res.render('index', {
            title: "Home"
        });
    } else {
        res.render('login', {
            title: "Login"
        });
    }
});

app.get('/auth/login', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', {
    failureRedirect: '/'
}), function(req, res) {
    res.redirect('/') // Successful auth
});

app.get("/auth/logout", (req, res) => {
    const socketId = req.session.socketId;
    if (socketId && io.of("/").sockets.get(socketId)) {
        io.of("/").sockets.get(socketId).disconnect(true);
    }
    req.logout();
    res.cookie("connect.sid", "", { expires: new Date() });
    res.redirect("/");
});

passport.serializeUser((user, cb) => {
    cb(null, user.discordId);
});

passport.deserializeUser((id, cb) => {
    User.findOne({discordId: id}, (error, result) => {
        if(error) return cb(error, null)
        cb(null, result);
    })

});
const { Server } = require('socket.io')
const io = new Server(server);

const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);

io.use(wrap(sessionMiddleware));
io.use(wrap(passport.initialize({})));
io.use(wrap(passport.session({})));

io.use((socket, next) => {
    if (socket.request.user) {
        next();
    } else {
        next(new Error('unauthorized'))
    }
});

io.on('connect', (socket) => {
    socket.on('whoami', (cb) => {
        cb(socket.request.user ? socket.request.user.username : '');
    });

    const session = socket.request.session;
    session.socketId = socket.id;
    session.save();
});

server.listen(port, () => {
    console.log(`application is running at: http://localhost:${port}`);
});

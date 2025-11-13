require('dotenv').config();

const express = require('express');
const passport = require('passport');

const crypto = require("crypto");
const bcrypt = require('bcrypt');

const mysql = require('mysql');
const sql_pool = mysql.createPool({
	host: process.env.DB_HOST,
	port: process.env.DB_PORT,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME
});

var MicrosoftStrategy = require('passport-microsoft').Strategy;
passport.use(new MicrosoftStrategy({
    clientID: process.env.MS_CLIENT_ID,
    clientSecret: process.env.MS_CLIENT_SECRET,
    callbackURL: "https://uiucverify.twong.dev/callback/microsoft/",
    authorizationURL: "https://login.microsoftonline.com/44467e6f-462c-4ea2-823f-7800de5434e3/oauth2/v2.0/authorize",
    tokenURL: "https://login.microsoftonline.com/44467e6f-462c-4ea2-823f-7800de5434e3/oauth2/v2.0/token",
    scope: ['user.read']
  },
  function(accessToken, refreshToken, profile, done) {
    let email = profile._json.mail;
    if (email !== undefined && email.endsWith('@illinois.edu')) {
      return done(null, profile);
    } else {
      return done(null, false);
    }
  }
));

var DiscordStrategy = require('passport-discord').Strategy;
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: 'https://uiucverify.twong.dev/callback/discord',
    scope: ['identify']
  },
  function(accessToken, refreshToken, profile, done) {
    if (profile !== undefined) {
      return done(null, profile);
    } else {
      return done(null, false);
    }
  }
));

passport.serializeUser(function(user, done) {
  done(null, user);
});
  
passport.deserializeUser(function(user, done) {
  done(null, user);
});

var app = express();
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: process.env.COOKIE_SECRET_TOKEN, resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

app.set('views', './views');
app.set('view engine', 'pug');

app.get('/', 
  function(req, res) {
    res.sendFile(__dirname + '/static/index.html');
  }
);

app.get('/privacy', 
  function(req, res) {
    res.redirect('https://github.com/CaptnSisko/uiucverify/blob/main/privacy.md')
  }
);

app.get('/tos', 
  function(req, res) {
    res.redirect('https://github.com/CaptnSisko/uiucverify/blob/main/termsofservice.md')
  }
);


app.get('/fail', 
  function(req, res) {
    res.send('Authentication Error. Please try again.');
  }
);

app.get('/step1', passport.authenticate('microsoft'));

app.get('/callback/microsoft',
  passport.authenticate('microsoft', { failureRedirect: '/fail' }),
  function(req, res) {
    // save the email from microsoft
    req.session.microsoft = req.user._json;
    // res.send(req.session);

    // Explicitly save session before redirecting (required for Passport 0.6.0+)
    req.session.save(function(err) {
      if (err) {
        console.error('Session save error:', err);
        return res.redirect('/fail');
      }
      res.redirect('/step2');
    });
  }
);

app.get('/step2', passport.authenticate('discord'));

app.get('/callback/discord',
  passport.authenticate('discord', { failureRedirect: '/fail' }),
  function(req, res) {
    if(req.session.microsoft === undefined) {
      res.send('You must log into Microsoft before logging into Discord! Do you have cookies enabled?')
    } else {
      req.session.discord = req.user;

      // Explicitly save session before redirecting (required for Passport 0.6.0+)
      req.session.save(function(err) {
        if (err) {
          console.error('Session save error:', err);
          return res.redirect('/fail');
        }
        res.redirect('/link');
      });
    }
  }
);

app.get('/link', 
  function(req, res) {
    if(req.session.discord === undefined || req.session.microsoft === undefined) {
      res.send('You must log into Microsoft and Discord before linking accounts! Do you have cookies enabled?')
    } else {
      let body = `
      Are you sure you would like to link your accounts?<br>
      Once linked, you will need to ask an admin to unlink your
      Discord and UIUC accounts.<br>
      Discord username: ${req.session.discord.username}<br>
      Discord ID: ${req.session.discord.id}<br>
      UIUC Email: ${req.session.microsoft.mail}<br>
      UIUC Microsoft ID: ${req.session.microsoft.id}<br>
      <br>
      <a href="/link_confirm"> Link My Accounts</a>
      `;

      res.writeHead(200, {
        'Content-Length': Buffer.byteLength(body),
        'Content-Type': 'text/html'
      });
      res.write(body);
      res.end();

    }

  }
);

app.get('/link_confirm', 
  function(req, res) {
    if(req.session.discord === undefined || req.session.microsoft === undefined) {
      res.send('You must log into Microsoft and Discord before linking accounts! Do you have cookies enabled?');
    } else {
      sql_pool.query('SELECT * FROM emails WHERE email = SHA2( MD5(?), 256);', [req.session.microsoft.mail], (err, data) => {
        if(err) {
          console.error(err);
          res.send('Error connecting to database');
        }
        if(data[0] !== undefined) {
          res.send('This email is already linked to a Discord account. Please contact an Admin for assistance.');
        } else {
          sql_pool.query('SELECT * FROM discord_ids WHERE discord_id = SHA2( MD5(?), 256);', [req.session.discord.id], (err, data) => {
            if(err) {
              console.error(err);
              res.send('Error connecting to database');
            }
            if(data[0] !== undefined) {
              res.send(`${data[0]['discord_id']} is already linked to an email. Please contact an Admin for assistance.`);
            } else {
    
              sql_pool.query('INSERT INTO emails VALUES ( SHA2( MD5(?), 256) )', [req.session.microsoft.mail], (err, data) => {
                if(err) {
                  console.error(err);
                  res.send('Error inserting into database');
                }
                  sql_pool.query('INSERT INTO discord_ids VALUES ( SHA2( MD5(?), 256) )', [req.session.discord.id], (err, data) => {
                    if(err) {
                      console.error(err);
                      res.send('Error inserting into database');
                    }
                      res.send('Your accounts have been linked! You may now close this window.');
                  });
              });
            }
          });
        }
      });
    }
  }
);


app.listen(3000);

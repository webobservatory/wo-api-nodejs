var express = require('express')
  , passport = require('passport')
  , logger = require('morgan')
  , util = require('util')
  , session = require('express-session')
//  , bodyParser = require("body-parser")
  , cookieParser = require("cookie-parser")
  , methodOverride = require('method-override')
//the following should be replaced by require("wo-api-nodejs") instead
  , woQuery = require("../../lib/index").Query
  , woStrategy = require('../../lib/index').Strategy;

var WO_CLIENT_ID = "55197ade2a80faff1366c49e"
var WO_CLIENT_SECRET = "4cceb42c2cb1edba";


//ignore wo server certificate 
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";


// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete 37signals profile is
//   serialized and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


// Use the Thirty7signalsStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and 37signals
//   profile), and invoke a callback with a user object.
passport.use(new woStrategy({
    clientID: WO_CLIENT_ID,
    clientSecret: WO_CLIENT_SECRET,
    callbackURL: "http://127.0.0.1:3000/auth/wo/callback"
  },
  function(accessToken, refreshToken, profile, done) {
      
      var user = {
            accessToken: accessToken,
            refreshToken: refreshToken,
            profile: profile
        };

        done(null, user);
      
    // asynchronous verification, for effect...
    //process.nextTick(function () {
    //console.log(accessToken);
    //console.log(profile);  
      // To keep the example simple, the user's 37signals profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the 37signals account with a user record in your database,
      // and return that user instead.
     // return done(null, profile);
   // });
  }
));




//var app = express.createServer();

// configure Express
var app = express();

// configure Express
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(logger("combined"));
  app.use(cookieParser());
//  app.use(bodyParser());
  app.use(methodOverride());
  app.use(session({ secret: 'keyboard cat',
		saveUninitialized: true,
		resave: true }));
  // Initialize Passport!  Also use passport.session() middleware, to support
  // persistent login sessions (recommended).
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(express.static(__dirname + '/public'));




//accessToken = "VgPMOdx5jPNKbk15xsICldVkFZkyxnE5J6zRZyGRKmw=";
//var client = new woQuery("webobservatory.soton.ac.uk",req.user.accessToken);
var client; 
var streamdata; // contains the stream data



app.get('/', function(req, res){
  
    
    res.render('index', { loginlink: '/auth/wo',
                        querylink:'/query',
                        streamlink:"/openStream",
                        streamdatalink:'/streamdata',
                        liststreamlink:"/listStream",
                        closestreamlink:"/closeStream"
    });
});

app.get('/query', function(req, res){
    if (!req.user || !req.user.accessToken)
    {
        //not logged in. Redirect to login page. 
        res.redirect('/auth/wo');
    }
    
    if (!client)
    {
        //e.g. query page can take some parameter passed via a form, and used as part of the query
        client = new woQuery("webobservatory.soton.ac.uk", req.user.accessToken);
    }

    var datasetid = "52e19220bef627683c79c3a6";
    var query = "SELECT * WHERE {  ?subject rdf:type ?class} LIMIT 10";
    var rst = "";
    var callback = function(err,data){
        if (!err) {
            rst = data;
            res.render('query', { result:rst});
        }
        };
    
    client.query(datasetid, query, callback);

  
});





app.get('/openStream', function(req, res){
    if (!req.user || !req.user.accessToken)
    {
        //not logged in. Redirect to login page. 
        res.redirect('/auth/wo');
    }
    
    if (!client)
    {
        client = new woQuery("webobservatory.soton.ac.uk", req.user.accessToken);
    }
    
    
    var datasetid = "54eb13d7590ea23530f24645";
    var query = "logs";
    
    var callback = function(err,data,stream){
        if (!err) {
            console.log(data);
            streamdata = data;
        }
        else{
            streamdata = err;
        }
        };
    
    client.openStream(datasetid, query, callback);
    
    res.render('query', { result:'Stream opened'});
  
});


app.get('/streamdata', function(req, res){
    
    
    if (streamdata)
    {
        res.render('query', {result:streamdata});
    }
    else{
        res.render('query', {result:"No Data"});
    }   
});


app.get('/listStream', function(req, res){
    if (!client)
    {
        res.render('query', { result:"No WO client" });
    }
    
    var rst;
    streams = client.listStream();
    
    if (streams.length>0)
    {
        rst = JSON.stringify(streams);
        res.render('query', {result:rst});
    }
    else{
        res.render('query', {result:"No stream open"});
    }   
});


app.get('/closeStream', function(req, res){
    var rst;

//no wo client created. 
    if (!client)
    {
        res.render('query', { result:"No WO client" });
    }

//close the 1st one in the liststream
    streams = client.listStream();
    if (streams.length>0)
    {
        client.closeStream(streams[0], function(e){console.log(e);});
        rst = "closed: "+JSON.stringify(streams[0]);
        res.render('query', {result:rst});
    }
    else
    {
        res.render('query', {result:'All stream closed'});
    }
});










app.get('/login', function(req, res){
  res.render('login', { user: req.user });
});

// GET /auth/37signals
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in 37signals authentication will involve
//   redirecting the user to 37signals.com.  After authorization, 37signals
//   will redirect the user back to this application at /auth/37signals/callback
app.get('/auth/wo',
  passport.authenticate('passport-wo'),
  function(req, res){
    // The request will be redirected to 37signals for authentication, so this
    // function will not be called.
  });

// GET /auth/37signals/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/wo/callback', 
  passport.authenticate('passport-wo', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.listen(3000);


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}

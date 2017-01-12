/* jshint node: true, devel: true */
'use strict';

const bodyParser = require('body-parser'),
    config = require('config'),
    redis = require('redis'),
    express = require('express'),
    app = express();


const WIT_ACCESS_TOKEN = (process.env.WIT_ACCESS_TOKEN) ?
    (process.env.WIT_ACCESS_TOKEN) :
    config.get('witAccessToken');


// REDIS Stuff
var credentials = {
    "host": "127.0.0.1",
    "port": 6379
};
// Connect to Redis
var redisClient = redis.createClient(credentials.port, credentials.host);

redisClient.on('connect', function() {
    console.log('REDIS Connected');
});


// parse application/json
// used for REST API's
app.use(bodyParser.json())
app.set('port', process.env.PORT || config.get('port'));

var server = app.listen(app.get('port'), function() {
    helloWorld();
})
var io = require('socket.io').listen(server);

// Make the files in the public folder available to the world
app.use(express.static(__dirname + '/public'));


app.get('/', function(req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/dashboard', function(req, res) {
    res.sendFile(__dirname + '/public/dashboard.html');


});


/*
 * Narvar Tracking API's all are POST'ed and forward the tracking message to FB
 */
app.post('/message', function(req, res) {

    var {
        room, message
    } = req.body;

    if (room) {
        sendMessage(room, message);
        res.status(200).send({
            'message': req.body,
            'status': 'Post received',
            'code': 200
        });

    } else {
        res.status(400).send({
            'message': req.body,
            'status': 'Error with post',
            'code': 400
        });
    }
});

let WIT_ENABLED = true;
let APIAI_ENABLED = true;
var roomTracker = new Set();
var rooms = {};
var numUsers = 0;

// Socket.io listen for events
io.on('connection', function(socket) {

    console.log('a user connected');

    socket.on('join', function(nickname) {
        // Attach nickname to socket
        socket.username = username;
        //socket.broadcast.emit('notice', nickname + ' has joined the chat.');
    });

    socket.on('room', function(room) {

        socket.user_id = room;

        socket.join(room);

        rooms[room] = room;

        emitUsers();
    });

    socket.on('disconnect', function() {
        console.log('user disconnected');
        removeRoom(socket);
    });

    // Message Received
    socket.on('chat message', function(msg) {

        console.log('message: ', msg);

        io.sockets.in(msg.room).emit('message', msg);
        //handleMessageWITAI(msg);
        handleMessageAPIAI(msg);
        pushToRedis(msg);

    });
    
    // Get recent messages
    socket.on('my messages', function(room) {
        console.log('messages requested for: ', room);
        getMessages(room);
    });

    // Admin dashboard stuff
    socket.on('get users', function(data) {
        emitUsers();
    });

    socket.on('get messages', function(data) {
        //getMessages();
    });

    socket.on('subscribe', function(data) {
        socket.join(data.room);
    });

});



function pushToRedis(msg) {
    
    var message = JSON.stringify(msg);
    
    redisClient.lpush(`message:${msg.room}`, message);
    redisClient.ltrim(messageKey, 0, 99);
}

// Get messages for Admin Dashboard
function getAllMessages(data) {
    // Get the 100 most recent messages from Redis
    var messages = redisClient.lrange('messages', 0, 99, function(err, reply) {
        if (!err) {
            var result = [];
            // Loop through the list, parsing each item into an object
            for (var msg in reply) result.push(JSON.parse(reply[msg]));
            // Pass the message list to the view
            io.sockets.emit("messages", {
                messages: result
            });
        } else {
            // no messages
        };
    });
}

// Get recent messages for client
function getMessages(data) {
    // Get the 100 most recent messages from Redis  
    var messages = redisClient.lrange(`message:${data}`, 0, 99, function(err, reply) {
        
        if (!err) {
            var result = [];
            // Loop through the list, parsing each item into an object
            for (var msg in reply) result.push(JSON.parse(reply[msg]));
            // Pass the message list to the view
            io.sockets.emit("recent messages", {
                messages: result
            });
        } else {
            // no messages
            console.log(`NO MESSAGES FOUND FOR: messages:${data}`);
        };
    });
//    redisClient.lrange(`message:${data}`, 0, -1, function(err, reply){
//        console.log('reply: ', reply);
//    });
}


function handleMessageWITAI(msg) {

    var sessionId = findOrCreateSession(msg.room);


    if (WIT_ENABLED && msg.username === 'guest') {

        sendToWit(sessionId, msg.message, msg.room);
        console.log('SENT TO WIT: ', msg.room, msg.message);

    }

    if (msg.username === 'admin') {
        WIT_ENABLED = false;
        console.log('ESCALATED BY AGENT - Turning WIT off');
    }

}

function handleMessageAPIAI(msg) {

    var sessionId = findOrCreateSession(msg.room);


    if (APIAI_ENABLED && msg.username === 'guest') {

        sendtoAPIAI(msg);
        console.log('SENT TO APIAI: ', msg.room, msg.message);

    }

    if (msg.username === 'admin') {
        APIAI_ENABLED = false;
        console.log('ESCALATED BY AGENT - Turning APIAI off');
    }

}

function joinRoom() {
    socket.join(room);
}

function emitUsers() {
    io.sockets.emit("users", {
        users: rooms
    });
}

function removeRoom(socket) {
    var user_id = socket.user_id;
    var length = rooms.length;
    for (var i = 0; i < length; i++) {
        if (rooms[i] === user_id) {
            rooms.splice(i, 1);
            break;
        }
    }

    console.log('Disconnected: ', socket.user_id);
    emitUsers();

}


// Messaging
function sendMessage(msg) {
    console.log('admin msg: ', msg);
    io.sockets.in(msg.room).emit('message', msg);
    pushToRedis(msg);
}


/*
 *
 * WIT.AI API
 *
 */
const {
    Wit, log
} = require('node-wit');
var context = {};
const session = 'my-user-session-42';
const context0 = {};

// Contains user sessions.
// Each session has an entry:
const sessions = {};



const findOrCreateSession = (roomId) => {
    let sessionId;
    console.log('creating session for: ', roomId);
    // Check if session exists for the user fbid
    Object.keys(sessions).forEach(k => {
        if (sessions[k].room === roomId) {
            // Yes
            sessionId = k;
        }
    });
    if (!sessionId) {
        // No session found for fbid, create a new one
        sessionId = new Date().toISOString();
        sessions[sessionId] = {
            room: roomId,
            access_token: 'none'
        };
    }
    return sessionId;
};


//// Our bot actions
var actions = {

    send: function send(request, response) {
        var sessionId = request.sessionId,
            context = request.context,
            entities = request.entities,
            recipientId = sessions[sessionId].room,
            text = response.text,
            quickReplies = response.quickreplies,
            room = sessions[sessionId].room,
            username = 'assist';

        var message = {
            username: username,
            room: room,
            message: text
        };

        sendMessage(message);

        return new Promise(function(resolve, reject) {
            if (quickReplies) {
                console.log('has quick replies');
                return Promise.resolve();

            } else {
                // Do something else
            }

            return resolve();
        });
    },

    doNothing: function(request) {
        console.log('Action Requested: DO NOTHING');
    }

};


function sendToWit(sessionId, messageText, roomID) {
    // This will run all actions until nothing left to do

    wit.runActions(sessionId, // Current session
        messageText,
        sessions[sessionId].context // Current session state
    ).then(function(context) {
        // Waiting for further messages to proceed.
        console.log('Waiting for next user messages');
        // Based on the session state, reset session
        if (context['done']) {
            delete sessions[sessionId];
        }
        // Updating current session state
        sessions[sessionId].context = context;

    }).catch(function(err) {
        console.error('ERROR! WIT ERROR MSG: ', err.stack || err);
    });
}

// WIT.ai init for production
const wit = new Wit({
    accessToken: WIT_ACCESS_TOKEN,
    actions,
    logger: new log.Logger(log.INFO)
});


/// API AI STUFF
var apiai = require('apiai');
var ai_app = apiai("11bee8e18413480ab769831c47910279");

function sendtoAPIAI(msg) {

    var messageText = msg.message;
    var ai_request = ai_app.textRequest(messageText, {
        sessionId: msg.room
    });

    var username = 'assist';


    ai_request.on('response', function(response) {

        console.log(response);
        var msgDate = new Date();
        var text = response.result.fulfillment.speech;
        var message = {
            username: username,
            room: msg.room,
            message: text,
            when: msgDate
        };
        //JSON.stringify(response.speech);
        sendMessage(message);
    });

    ai_request.on('error', function(error) {
        console.log(error);
    });

    ai_request.end();
}

function helloWorld() {

    console.log(`
NARVAR
 _____  _____  _____  _____  _____  _____ 
|  _  ||   __||   __||     ||   __||_   _|
|     ||__   ||__   ||-   -||__   |  | |  
|__|__||_____||_____||_____||_____|  |_| 
`);
    console.log('Running on port: ', app.get('port'));

}

module.exports = app;
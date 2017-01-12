//var socket = io();
var socket  = io.connect();
var username = 'guest'; // This will change if user is logged in
var myRoom;
var room;
var messages;

// Check if nickname stored in localStorage
if('localStorage' in window && localStorage.getItem('username')) {
        username = localStorage.getItem('username');
      } else {
        // If not in localStorage set as guest
        username = 'guest';
        if('localStorage' in window) {
          localStorage.setItem('username', username);
    }
}  




socket.on('message', function(msg) {
   console.log('Incoming message:', msg);
   //$('#messages').append($('<li>').text(msg.message));
   
  addMessage(msg);
    
});

socket.on('recent messages', function(data) {

    console.log('msg list:', data.messages);
    loadMessages(data)

});


// create a basic random number as uuid until backend provides one
var uuid = Math.round((Math.random() * 1000000));


console.log('UUID: ', uuid);

socket.on('connect', function() {
   checkID();
});





function createRoom(room){
    socket.emit('room', room);
    console.log('joined room: ', room);
}

function getMessages(room){
    socket.emit('my messages', room);
    console.log('messages requested');
}
                
$('form').submit(function(e){
    
    //e.preventDefault();
    
    sendMessage();
    //$('#messages').append($('<li>').text(myMessage));
  
    $('#m').val(''); // Clear input
    
    return false;
 });


function sendMessage(){
    
    var myMessage = $('#m').val();
    var msgDate = new Date();
    var message   = {
        username: username,
        room: room,
        message: myMessage,
        when: msgDate
    };
    
    console.log('msg for room: ', room);

    socket.emit('chat message', message); // Send what is in input
}



function checkID(){
    
    var localID = localStorage.getItem("assist_uuid");
    console.log('localID', localID);
    
    if(!localID){
        localStorage.setItem('assist_uuid', uuid);
        console.log('exists');
    } else {
        uuid = localID;
        room = uuid;
        console.log('set: ', localID);
        console.log('UUID: ', uuid);
        createRoom(uuid);
        getMessages(uuid);
    }
   
}


function addMessage(msg){
    
   var userName = msg.username;
    
   switch (userName) {
        case 'assist':
            $('#messages').append($('<li class="bubble you">').text(msg.message));
        //$('#message-window').append($('<div class="bubble you">').text(msg.message));
        break;
           
        case 'guest':
            $('#messages').append($('<li class="bubble me">').text(msg.message));
        //$('#message-window').append($('<div class="bubble you">').text(msg.message));
        break;
        
        case 'admin':
            $('#messages').append($('<li class="bubble you">').text(msg.message));
            changeAvatar();
        break;
        
        default:
        //$('#message-window').append($('<div class="bubble you">').text(msg.message));
    };
}

function loadMessages(data){
    
    var messages = data.messages;
    $('#messages').html('');
    messages.forEach(addMessage);
}



    
var chatWidget = (".chat-widget-container"),
    chatBox    = $(".chat-box-container"),
    botAvatar  = $(".bot"),
    personAvatar  = $(".person");

function changeAvatar(){
    
    botAvatar.fadeOut( "slow", function() {
        botAvatar.removeClass("active-agent");
        personAvatar.fadeIn("slow").addClass("active-agent");
    });
}

  
$(chatWidget).click(function(e){
    e.preventDefault();
    var welcomeMsg = 'How can we help you?';
    
    chatBox.toggleClass("show");
    //$('#messages').append($('<li class="bubble you">').text(welcomeMsg));
    botAvatar.addClass("active-agent");
    $('.chat-widget-text').hide();
});

checkID();
//var socket = io();
var socket  = io.connect();
var username = 'guest'; // This will change if user is logged in
var myRoom;
var room;
var messages;
var recent = false;

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
  scrollMessage();
    
});

socket.on('recent messages', function(data) {

    if(data.messages.length > 0){
        console.log('msg list:', data.messages);
        loadMessages(data);
        recent = true;
    } else {
        console.log('no recent messages');
        recent = false;
        showWelcome();
    }

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
    
    e.preventDefault();
    
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
        //getMessages(uuid);
    }
   
}


function addMessage(msg){
    

   var userName = msg.username;
    
   switch (userName) {
        case 'assist':
            $('#messages').append($('<li class="bubble you">').text(msg.message));
            
        break;
           
        case 'guest':
            $('#messages').append($('<li class="bubble me">').text(msg.message));
            
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
    
    messages.forEach(addMessage);
    setTimeout(scrollWindow, 100);
}

function showWelcome(){
    $('#messages').html('');
    var welcome = 'How can we help you?';
    var msgDate = new Date();
    var message   = {
        username: 'assist',
        room: room,
        message: welcome,
        when: msgDate
    };
    
    addMessage(message);
}

function scrollWindow(){
   var msgWindow = $('#messages-container');
   msgWindow.scrollTop(msgWindow.prop("scrollHeight"));
}

function scrollMessage(){
    
   var msgWindow = $('#messages-container');

   msgWindow.animate({ scrollTop: msgWindow.prop("scrollHeight")}, 1000);
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
    getMessages(uuid);
    chatBox.toggleClass("show");
    botAvatar.addClass("active-agent");
    $('.chat-widget-text').hide();
    
});

checkID();
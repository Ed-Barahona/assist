//var socket = io();
var socket = io.connect();
var userList = $("#user-list");

// create a basic random number as uuid until backend provides one
userList.html('');
var room;
var userCount;
var chat = {};
var users = {};
var rooms = {};
var username = 'admin';
// Request users from server
socket.on('connect', function() {
  socket.emit('get users');
  //socket.emit('get messages');
});


// Populate user obj from server   
socket.on('users', function(data) {   
    users = data.users;
    createUsers();
});

socket.on('messages', function(data) {   
    console.log('All messages:', data.messages);
    loadMessages(data);
});


socket.on('message', function(msg) {   
    console.log('Incoming:', msg);
    console.log('for username: ', msg.username);
    console.log('message', msg.message);
    
    addMessage(msg);

});



function createUsers(){

    $.each(users, function(key, value) {
        console.log('User', key);
        var room_id = key;
        
        console.log('rooms', rooms);
        if(!rooms[room_id]){
            addUser(room_id);
        }
    });

}



function addUser(user){
        
    rooms[user] = user;
    
    var userHTML = '<li class="person" data-chat="'+ user +'" data-room="'+ user +'">\
                        <img src="assets/narvar-avatar.png" alt="'+ user +'" /> \
                        <span class="name">'+ user +'</span>\
                        <span class="time">2:09 PM</span> \
                        <span class="preview">I was wondering...</span>\
                        </li>';
                        
    userList.append(userHTML);
}

function addMessage(msg){
    
    var userName = msg.username;
 
    switch (userName) {
        case 'admin':
        $('#message-window').append($('<div class="bubble me">').text(msg.message));
        break;
                
        case 'assist':
        $('#message-window').append($('<div class="bubble me">').text(msg.message));
        $('#ai-btn').fadeIn("slow").addClass("active-btn");
        break;

        case 'guest':
        $('#message-window').append($('<div class="bubble you">').text(msg.message));
        break;
        
        default:
        $('#message-window').append($('<div class="bubble you">').text(msg.message));
    };
}


function loadMessages(data){
    
    var messages = data.messages;   
    messages.forEach(addMessage);
}

// Connect to user 
function joinRoom(user){
    room = user;
    socket.emit('subscribe', { room: room });
}


// Join Room
$(document).on('click', '.join-user', function() {  
    var user = $(this).data('room');    
    joinRoom(user);
    return false;
});




$('.chat[data-chat=person2]').addClass('active-chat');
$('.person[data-chat=person2]').addClass('active');

// Select user to send message
$(document).on('click', '.left .person', function() {
    if ($(this).hasClass('.active')) {
        return false;
    } else {
        var findChat = $(this).attr('data-chat');
        var personName = $(this).find('.name').text();
        $('.right .top .name').html(personName);
        //$('.chat').removeClass('active-chat');
        $('.left .person').removeClass('active');
        $(this).addClass('active');
        $('.chat[data-chat = '+findChat+']').addClass('active-chat');
        

        joinRoom(personName);
        return false;
    }
});

// Send message
$('form').submit(function(){
    
    var msgDate   = new Date();
    var myMessage = $('#m').val();
    var message   = {
        username: username,
        room: room,
        message: myMessage,
        when: msgDate
    };
    
    
    socket.emit('chat message', message); // Send what is in input

    $('#m').val(''); // Clear input
    return false;
});
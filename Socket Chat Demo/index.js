var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var test = '!';
var found = 'Processing Answer...';
var answer = '!a sponge'; //we are going to want to write something that pre-processes the text given in the answer to make their entry lowercase with no spaces to prevent grammar issues

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {
    console.log('A User Has Connected');

    io.emit('chat message', 'Please answer this riddle: "I am full of holes but I can still hold water. What am I?"');

    socket.on('chat message', function(msg) {
        io.emit('chat message', msg);
        if(msg.includes(test)){
            io.emit('chat message', found);
            console.log('Attempted Answer:', msg);
            if(msg.toLowerCase().indexOf(answer.toLowerCase()) !== -1){
                io.emit('chat message', 'Correct!');
            }
            else {
                io.emit('chat message', 'Incorrect, Try Again!');
            }
        }
    });

    socket.on('disconnect', function() {
        console.log('A User Has Disconnected');
    });
});

http.listen(3000, function() {
    console.log('listening on localhost:3000');
});

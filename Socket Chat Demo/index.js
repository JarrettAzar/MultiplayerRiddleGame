var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var test = '!';
var found = 'Processing Answer...';
var answer = '!wow';

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {
    console.log('A User Has Connected');

    socket.on('chat message', function(msg) {
        io.emit('chat message', msg);
        if(msg.includes(test)){
            io.emit('chat message', found);
            console.log('Attempted Answer:', msg);
            if(msg.indexOf(answer) !== -1){
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

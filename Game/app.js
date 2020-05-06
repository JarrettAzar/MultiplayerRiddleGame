//Set up Socket and its variables
var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

//Set up filestream variables
var fs = require('fs');
var readline = require('readline');

//Directs the Socket to the correct HTML file
app.get('/', function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});

http.listen(2000, function() {
	console.log("listening on 2000........."); //Turn on the server
});

// load riddle list from the file and split it into an array
var R_LIST = fs.readFileSync(__dirname + '/server/testFile.txt');
R_LIST = R_LIST.toString();
R_LIST = R_LIST.split("\r\n");

var SOCKET_LIST = {}; //List of Sockets

var PLAYER_LIST = {}; //List of Players

var ITEM_LIST = {}; //List of Items

var ANSWER_LIST = {}; //List of Answers
var getAnswer; //Variable to help allocate answers correctly

// PLAYER DATA
var Player = function(id) {
	//Create a random (0 - 255, 0 - 255, 0 - 255) RGB Value for the player square
	var color = (Math.floor((Math.random() * 255))).toString() + ',' +
				(Math.floor((Math.random() * 255))).toString() + ',' +
				(Math.floor((Math.random() * 255))).toString();

	color = 'rgb(' + color + ')'; //Concatenate the RGB value so that it can be used correctly

	//Creates a player object with necessary attributes
	var player = {
		x:50,
		y:50,
		id:id,
		color:color,
		inRange:false,
		pressR:false,
		pressL:false,
		pressU:false,
		pressD:false,
		maxSpd:14
	}

	//Function for updating the player when the buttons are pressed
	player.updatePosition = function() {
		if(player.pressR)
			player.x += player.maxSpd;
		if(player.pressL)
			player.x -= player.maxSpd;
		if(player.pressU)
			player.y -= player.maxSpd;
		if(player.pressD)
			player.y += player.maxSpd;
	}

	return player;
}

//Function to update the necessary attributes of the player
Player.update = function() {
	var pkg = [];

	for(var i in PLAYER_LIST) {
		var player = PLAYER_LIST[i];
		player.updatePosition();
		pkg.push({
			x:player.x,
			y:player.y,
			color:player.color
		});
	}

	return pkg;
}
// END PLAYER DATA

//Helper function to remove an item from an array, used to make sure the item questions and answers are unique
function removeItem(array, item){
    for(var i in array){
        if(array[i]==item){
            array.splice(i,1);
            break;
        }
    }
}

// ITEM DATA
var Item = function(id, x, y) {
	// grab a random riddle to display
	var rand = Math.floor((Math.random() * R_LIST.length))
	var getRiddle = (R_LIST[rand]).split(",");
	getRiddle = getRiddle[0];
	getAnswer = (R_LIST[rand]).split(",");
	getAnswer = getAnswer[1];
	removeItem(R_LIST, R_LIST[rand]) //Remove the riddle from the list after it is used

	//Creates an item object with the necessary attributes
	var item = {
		x:x,
		y:y,
		id:id,
		hitb:25,
		canOpen:false,
		msgOn:false,
		solved:0,
		c:(0, 0, 0),
		message:getRiddle
	}

	//Similar to player, updates item status when needed
	item.updateStatus = function() {
		for(var i in PLAYER_LIST) {
			var player = PLAYER_LIST[i];
			if((player.x > (item.x - item.hitb) &&
				player.x < (item.x + item.hitb) &&
				player.y > (item.y - item.hitb) &&
				player.y < (item.y + item.hitb)) &&
				player.inRange) {
				item.canOpen = true;
			} else {
				item.canOpen = false;

			}
		}
	}

	return item;
}

var NUMITEMS = 15; //Changes the number of items shown

// create item list
var noAddFlag = false;
for(i = 0; i < NUMITEMS; i++) {
	var item = Item(i, Math.floor((Math.random() * 1500)), Math.floor((Math.random() * 475)));

	ITEM_LIST[i] = item; //Creates the Items
	ANSWER_LIST[i] = getAnswer; //Creates the corresponding answers at the corresponding index
}

console.log(ANSWER_LIST);

var sent = false; //This is just to keep track of wether or not the player has completed all Items

//Item update funcion, very similar to the Player update
Item.update = function() {
	var pkg = [];

	for(var i in ITEM_LIST) {
		item = ITEM_LIST[i];
		item.updateStatus();
		pkg.push({
			x:item.x,
			y:item.y,
			canOpen:item.canOpen,
			closeMsg:item.closeMsg,
			message:item.message,
			solved:item.solved
		});
	}

	var count = 0; //Set number of solved puzzles to 0, then loop  through and count the number of solved puzzles
	for(i = 0; i < NUMITEMS; i++){
		if(ITEM_LIST[i].solved == 1){
			count = count + 1;
		}
	}
	if(count == NUMITEMS && sent != true){
		io.emit('chat message', "CONGRATS YOU WIN FOR NOW!");
		sent = true;
	}

	return pkg;
}
// END ITEM DATA

// MAIN GAME LOOP
setInterval(function(){

	var pkg = {
		player:Player.update(),
		item:Item.update()
	}

	for(var i in SOCKET_LIST) {
		var socket = SOCKET_LIST[i];
		socket.emit('newPosition', pkg);
	}

}, 1000/25);

users = []; //creates a empty array to hold the users that join, used for usernames
var test = '!'; //Symbol that needs to be used to input an answer
io.on('connection', function(socket) {

	var socketID = Math.random(); //Creates a random 0.XXX number to use as the socket connection identifier

	//Socket listening function - "On setUsername call the socket executes the function"
	//This function sets the username and can be seen in the console as "Socket 0.923454325432 has joined as Jarrett"
	socket.on('setUsername', function(data){
		users[socketID] = data;
		console.log('SocketID: ' + socketID + ' has connected as ' + users[socketID])
		if (users[socketID] != null){
			io.emit('chat message', users[socketID] + ' has joined!');
		}
	});

	//This handles chat messages for the socket
    socket.on('chat message', function(msg) {
        io.emit('chat message', users[socketID] + ": " + msg);

		//Processing Answer Code
        msg = msg.replace(/\s+/g, '');
        msg = msg.toLowerCase();

		//Check if the answer is correct, this checks for exact answers
        if(msg.includes(test)){
            io.emit('chat message', 'Processing Answer...');
			console.log('Attempted Answer:', msg);

			for(i = 0; i < NUMITEMS; i++){
				if(ANSWER_LIST[i] === msg){
					var flag = true;
					ITEM_LIST[i].solved = 1;
				}
			}
			if (flag == true){
				io.emit('chat message', 'Correct!');
			}
			else
			{
				io.emit('chat message', 'Incorrect, Try Again!');
			}
        }

    });

	//socket.id = Math.random(); // assign id to socket
	SOCKET_LIST[socket.id] = socket; // add to the list of sockets

	// create a player object & add to list
	var player = Player(socket.id);
	PLAYER_LIST[socket.id] = player;

	socket.on('keyPress', function(data) {
		if(data.inputId === 'left')
			player.pressL = data.state;
		else if(data.inputId === 'right')
			player.pressR = data.state;
		else if(data.inputId === 'up')
			player.pressU = data.state;
		else if(data.inputId === 'down')
			player.pressD = data.state;
		else if(data.inputId === 'item')
			player.inRange = data.state;
	});

	socket.on('tryToOpen', function(data) {
		item.isOpen = true;
	});

	socket.on('disconnect', function() {
		console.log(users[socketID] + ' has Disconnected');
		delete PLAYER_LIST[socket.id];
	});
});

/**
 * Module dependencies.
 */

var express = require('express')
  , stylus = require('stylus')
  , nib = require('nib')
  , sio = require('socket.io');

/**
 * App.
 */

var app = express.createServer();

/**
 * App configuration.
 */

app.configure(function () {
  app.use(stylus.middleware({ src: __dirname + '/public', compile: compile }));
  app.use(express.static(__dirname + '/public'));
  app.set('views', __dirname);
  app.set('view engine', 'jade');

  function compile (str, path) {
    return stylus(str)
      .set('filename', path)
      .use(nib());
  };
});

/**
 * App routes.
 */

app.get('/', function (req, res) {
  res.render('index', { layout: false });
});

/**
 * App listen.
 */

app.listen(process.env.port, function () {
  var addr = app.address();
  console.log('   app listening on http://' + addr.address + ':' + addr.port);
});

/**
 * Socket.IO server (single process only)
 */

var io = sio.listen(app)
  , rooms = {}
  , nicknames = {};


io.sockets.on('connection', function(socket) {

	socket.on('join room', function (room) {
	    socket.set('room', room, function() { 
	    	rooms[room] = socket.room = room;
	    	console.log('room ' + room + ' saved'); 
	    });
	    socket.join(room);
	})	

	socket.on('destroy room', function(){
		if (!socket.room)
			return;
		delete rooms[socket.room];
	});

	socket.on('user message', function(msg) {
		socket.get('room', function(err, room) {
			socket.broadcast.to(room).emit('user message', socket.nickname, msg);
		});
	});

	socket.on('nickname', function(nick, fn) {
		if (nicknames[nick]) {
			fn(true);
		} else {
			fn(false);
			nicknames[nick] = socket.nickname = nick;
			socket.get('room', function(err, room) {
				socket.broadcast.to(room).emit('announcement', nick + ' connected');
				io.sockets.in(room).emit('nicknames', nicknames);
			});
		}
	});

	socket.on('disconnect', function() {
		if (!socket.nickname)
			return;
		delete nicknames[socket.nickname];
		socket.get('room', function(err, room) {
			socket.broadcast.to(room).emit('announcement', socket.nickname + ' disconnected');
			socket.broadcast.to(room).emit('nicknames', nicknames);
		});
	});
});

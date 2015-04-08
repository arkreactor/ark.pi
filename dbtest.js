///////////////////////////////////////////////////////////////////////
var cradle = require('cradle');
var db = new(cradle.Connection)('http://sensa.io').database('readings');


var sensornode = require('./sensornode');
sensornode.init(onSensorReading);

function onSensorReading(msg) {
  if (msg.data.Fahrenheit) onTempReading(msg);
  if (msg.data.rgb) onColorReading(msg);
}

function onTempReading(msg) {
  var temp = msg.data.Fahrenheit.value;
  if(!db || !db.save) {
    console.log('db not ready');
    return;
  }
  db.save({
    id: 'temp',
    date: Date.now(),
    data: temp,//75+Math.random(),
    unit: 'F'
  }, function (err, res) {
    if (err) {
      console.log('error creating record');
    } else {
        console.log('record created');
    }
  });

  /*var entry = new Reading({id:'temp', date:Date.now(), reading:temp});
  if (db) {
    entry.save(function(err, entry) {
      if (err) return console.error(err);
      console.log('saved ' + temp);
    });
  }*/
}

function onColorReading(msg) {
  /*var rgb = msg.data.rgb.value;
  var entry = new Reading({id:'color', date:Date.now(), reading:rgb});
  if (db) {
    entry.save(function(err, entry) {
      if (err) return console.error(err);
      console.log('saved ' + rgb);
    });
  }*/
}



/*var mongoose = require('mongoose');
mongoose.connect('mongodb://sensa.io/arkpi');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function (callback) {
  console.log('db opened');
});

var ReadingSchema = mongoose.Schema({
  id: String,
  date: Date,
  reading: String
});

var Reading = mongoose.model('reading', ReadingSchema);
*/

//////////////////////////////////////////////////////////////////////////////
// Web Server

var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server)
  , ioc = require('socket.io-client');

// io.set('log', 1);

  app.set('port', 8888);
  app.set('views', __dirname + '/arkview');
  app.engine('html', require('ejs').renderFile);
  app.locals.pretty = false;
  app.use(require('stylus').middleware({ src: __dirname + '/public'}));
  app.use(express.static(__dirname +'/public'));


require('./router')(app);

server.listen(app.get('port'), function(){
        console.log("Express server listening on port " + app.get('port'));
});
  
/*var connections = [];

io.sockets.on('connection', function (socket) {
  connections.push(socket);
  console.log("CONNECTED");

  socket.on('disconnect', function(socket){
    var i = connections.indexOf(socket);
           console.log("DISCONNECT: " + i);
    delete connections[i];
  });
});

*/
function blastToClients(name, payload) {
  connections.forEach(function(c) {
    c.emit(name, payload);
  });
}

function blastSensorReadingToClients(payload) {
  blastToClients('sensor_reading', payload);
}



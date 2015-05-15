////////////////////////////////////////////////////////////////////////
var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server)
  , ioc = require('socket.io-client');

// io.set('log', 1);


// app.configure(function(){
  app.set('port', 8088);
  app.set('views', __dirname + '/arkview');
  app.engine('html', require('ejs').renderFile);
  //app.set('view engine', 'jade');
  app.locals.pretty = false;
  // app.use(express.bodyParser());
  // app.use(express.cookieParser());
  // app.use(express.methodOverride());
  app.use(require('stylus').middleware({ src: __dirname + '/public'}));
  app.use(express.static(__dirname +'/public'));
// });

// app.configure('development', function(){
	// app.use(express.errorHandler());
// });

require('./router')(app);

server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});


////////////////////////////////////////////////////////////////////////////
var hypha = require('./hypha');

var gSerialDevices = {}    // map of Hypha devices by deviceID

hypha.findDevices(function(device) {
  if (!device.deviceID) {
    console.log('Hypha device found with no deviceID--ignoring.');
    return;
  }

  console.log('Hypha device found: ' + device.deviceID);
  gSerialDevices[device.deviceID] = device;

  // add our read function
  device.serialPort.on('data', function(data) {
    console.log(data);
    try {
      msg = JSON.parse(data);
      if (msg.measurement != undefined) {
        msg.measurement.deviceID = device.deviceID;  // ID the source if not already
        //onSensorReading(msg);
        blastToClients('sensor_report', msg);
      }
    } catch(e) {
      console.log('bad json from serial port');
    }
  });
  
  // add pin write methods
  // pin can be either an integer or an object with a pin property
  device.digitalWrite = function(pin, value) {
    // convert to integer
    if (value === true) value = 1;
    else if (value === false) value = 0;
    
    // if pin is an object and has a true activeLow property, invert value
    if (typeof pin === 'object') {
      if (pin.activeLow) value = 1 & ~value;
      pin = pin.pin;      // substitute actual pin number for object
    }

    msg = {writeD: {pin:pin, value:value}};
    this.serialPort.write(JSON.stringify(msg) + '\n');
    //console.log(JSON.stringify(msg));
  }

  device.analogWrite = function(pin, value) {
    if (typeof pin === 'object') pin = pin.pin;
    msg = {writeA: {pin:pin, value:value}};
    this.serialPort.write(JSON.stringify(msg) + '\n');
    //console.log(JSON.stringify(msg));
  }
  
  commands.syncDeviceState(device);

  // report actuator status to any attached clients
  var report = {}
  report[device.deviceID] = device.getStatus();
  blastToClients('status_report', report);
  console.log(JSON.stringify(report));
});

///////////////////////////////////////////////////////////////////////////
//var db = require('./db');

//db.init();

// TODO: break connections into local vs. remote?
var connections = [];

function blastToClients(name, payload) {
  connections.forEach(function(c) {
    c.emit(name, payload);
  });
}

function blastSensorReadingToClients(payload) {
  blastToClients('sensor_reading', payload);
}

function statusReport() {
  var report = {};
  for (name in gSerialDevices) {
    console.log('reporting on ' + name);
    if (gSerialDevices.hasOwnProperty(name)) {
      var device = gSerialDevices[name];
      report[device.deviceID] = device.getStatus();
    }
  }
  return report;
}

function emitStatusReport(socket) {
  socket.emit('status_report', statusReport());
}

function blastStatusReport() {
  connections.forEach(function(c) {
    emitStatusReport(c);
  });
}


////////////////////////////////////////////////////////////////////////////
// LOCAL SOCKET

var commands = require('./commands.js');

io.sockets.on('connection', function (socket) {
  connections.push(socket);
  console.log("CONNECTED");
  //console.log(JSON.stringify(statusReport()));
  emitStatusReport(socket);

  socket.on('disconnect', function(socket){
    var i = connections.indexOf(socket);
	  console.log("DISCONNECT: " + i);
    delete connections[i];
  });

  socket.on('command', function (data) {
    /*if (typeof data === 'string') data = JSON.parse(data);
    console.log(JSON.stringify(data));
    printProperties(gSerialDevices);*/

    // hack in an ID for now--client should send the deviceID
    if (!data.deviceID) data.deviceID = 'Kefir';
  	console.log(data);

   // find the device with the id
    var device = gSerialDevices[data.deviceID];
    if (!device) {
      console.log('deviceID not found: ' + data.deviceID);
      return;
    }

    commands.onCommand(device, data);
    blastStatusReport();
  });
});

////////////////////////////////////////////////////////////////////////////
// REMOTE SOCKET

var sensa = ioc.connect('http://sensa.io:8888');
sensa.on('connect', function(){
  connections.push(sensa);
});

sensa.on('command', function(data){
  console.log(data);

  if(data.module === "lights" && data.values) {
    console.log("light command receive: "+data.values.red+" "+data.values.green+" "+data.values.blue+"\n");
    if (data.relayID === 'Indicators') {
      // arduino.analogWrite(10, data.values.red);
      // arduino.analogWrite(9, data.values.green);
      // arduino.analogWrite(11, data.values.blue);
    }
    saveAction(data);

  } else if ( data.module === "RecircPump" ) {
    if (data.state == true) {
      // arduino.digitalWrite(2, true);  //pump on
      // arduino.digitalWrite(4, false);
    }
    else {
      // arduino.digitalWrite(2, false); //pump off
      // arduino.digitalWrite(4, false);
    }

    saveAction(data);
  } else if (data.module == "AirPump") {
    if (data.state == true) {
      //serialPort.write("air-on\n");
      arduino.digitalWrite(3, true); //forward
    }
    else {
      //serialPort.write("air-off\n");
      arduino.digitalWrite(3, false); //backward
    }
    saveAction(data);

  } else if (data.module == "growLight") {
    if (data.state == true) {
      serialPort.write("air-on\n");

      // arduino.digitalWrite(4, true); //forward
    }
    else {
      // arduino.digitalWrite(4, false); //backward
    }
    saveAction(data);

  }else {
    // unrecognized action
    saveAction(data, 'Unrecognized action');
  }
});


///////////////////////////////////////////////////////////////////////////////
// temperature and heating
/*
gTemp = {min:70, max:78};
thermocycleState = false;

function onSensorReading(msg) {
  if (msg.data.Fahrenheit) onTempReading(msg);
  if (msg.data.rgb) onColorReading(msg);
}

function onColorReading(msg) {
  console.log('color reading');
  //blastSensorReadingToClients(msg.data.rgb.value);
  saveReading(msg);
}

function onTempReading(msg) {
  var temp = msg.data.Fahrenheit.value;
  var heaterOn = false;

  blastSensorReadingToClients(temp);
  saveReading(msg);

  console.log('Fahrenheit: ' + temp);

  if (thermocycleState) {
    if (temp <= gTemp.max) {
      heaterOn = true;
    }
    else if (temp >= gTemp.max) {
      //setHeater(false);
    }
  }

  var heaterLevel = 50;
  console.log('thermocycleState = ' + thermocycleState);
  console.log('heating on = ' + heaterOn);
  // arduino.analogWrite(5, heaterOn? heaterLevel: 0);
}
*/
 
function printProperties(o) {
  var str = '{'
  for (var x in o) {
    if (o.hasOwnProperty(x))
      str += x + ':' + o[x] + ', ';
  }
  console.log(str + '}');
}

function tempReading() {
  var temp = 74 + Math.random()*.3;
  blastSensorReadingToClients(temp);
}
setInterval(tempReading, 1000);


//////////////////////////////////////////////////////////////////////////////
// cloud database
var cradle = require('cradle');
var db = new(cradle.Connection)('http://sensa.io');
var dbActions = db.database('actions');
var dbReadings = db.database('readings');

function saveReading(msg) {
  if (!dbReadings || !dbReadings.save) {
    return false;
  }

  // TODO: check msg has timestamp

  dbReadings.save(msg, function (err, res) {
    if (err) {
      console.log('error creating reading record');
    } else {
      console.log('reading record created');
    }
  });
}

// error is a string describing the problem
// could substitute error codes--read up on enums in js
function saveAction(msg, error) {
  if (!dbActions || !dbActions.save) {
    return false;
  }

  // TODO: check msg has timestamp
  // TODO: incorporate success or failure

  dbActionss.save(msg, function (err, res) {
    if (err) {
      console.log('error creating action record');
    } else {
      console.log('action record created');
    }
  });
}

///////////////////////////////////////////////////////////////////////////

function blastToClients(name, payload) {
  connections.forEach(function(c) {
    c.emit(name, payload);
  });
}

function blastSensorReadingToClients(payload) {
  blastToClients('sensor_reading', payload);
}


///////////////////////////////////////////////////////////////////////////////
// temperature and heating
/*
var sensornode = require('./sensornode');
sensornode.init(onSensorReading);

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

////////////////////////////////////////////////////////////////////////////
// // var gpio = require('rpi-gpio');
// var relays = require('./controllers/relays');

var serialport = require("serialport");
var SerialPort = serialport.SerialPort;

serialPort = new SerialPort('/dev/ttyACM0', {
  baudrate: 38400,
  parser: serialport.parsers.readline("\n")
});

serialPort.on("error", function(err) {
  console.log('error opening serial port');
});

serialPort.on("open", function () {
  console.log('serial port opened');

  /*setTimeout(function() {
    serialPort.write('{setEntry:{index:0,msMeasurementPeriod:0}}\n');
    serialPort.write('{setEntry:{index:1,msMeasurementPeriod:0}}\n');
  }, 4000);*/

  serialPort.on('data', function(data) {
    console.log(data);
    try {
      msg = JSON.parse(data);
      if (msg.measurement != undefined) {
        //handle reading
        //onSensorReading(msg);
        blastToClients('sensor_report', msg);
      }
    } catch(e) {
      console.log('bad json from serial port');
    }
  });
});


// wrap aggroserver's pin writes to look like firmata
// these methods will be replaced by configuring actuators on the arduino
var arduino = {};

arduino.digitalWrite = function(pin, value) {
  if (value === true) value = 1;
  else if (value === false) value = 0;
  msg = {writeD: {pin:pin, value:value}};
  serialPort.write(JSON.stringify(msg) + '\n');
}

arduino.analogWrite = function(pin, value) {
  msg = {writeA: {pin:pin, value:value}};
  serialPort.write(JSON.stringify(msg) + '\n');
}


//var ArduinoFirmata = require('arduino-firmata');
//var arduino = new ArduinoFirmata();

// arduino.connect(); // use default arduino
// arduino.connect('/dev/ttyACM0'); //Bone Serial
// arduino.connect('/dev/ttyACM0'); //Pi2 Serial Port Upper Left

// arduino.on('connect', function(){

  // console.log("board version"+arduino.boardVersion);
  // arduino.pinMode(2, ArduinoFirmata.OUTPUT); //Relay 1
  // arduino.digitalWrite(2, true);
  // arduino.pinMode(3, ArduinoFirmata.OUTPUT); //Relay 2
  // arduino.digitalWrite(3, true);
  // arduino.pinMode(4, ArduinoFirmata.OUTPUT); //Relay 3
  // arduino.digitalWrite(4, true);
  // arduino.pinMode(5, ArduinoFirmata.OUTPUT); //Relay 4
  // arduino.digitalWrite(5, true);
  // arduino.pinMode(9, ArduinoFirmata.OUTPUT); //Green Indicator
  // arduino.pinMode(10, ArduinoFirmata.OUTPUT); //Red Indicator
  // arduino.pinMode(11, ArduinoFirmata.OUTPUT); //Blue Indicator

// });



///////////////////////////////////////////////////////////////////////////////
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



var controllerStateObject = { "relay1": false, "relay2" : false, "relay3" : false, "relay4" : false };
var stateStr =JSON.stringify(controllerStateObject);
// fs.writeFileSync("./controllerState.txt",stateStr);

console.log(stateStr);

// relays.initialize();


//Variable not defined locally; global scope
var g_cronClient = null;

// connections to remote server
var connections = [];


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
    if (data.relayID === 'Mosfet1') serialPort.write("L"+data.values.red+" "+data.values.green+" "+data.values.blue+"\n");
    if (data.relayID=== 'Mosfet2') serialPort.write("G"+data.value+"\r");
    if (data.relayID === 'Mosfet3') serialPort.write("B"+data.value+"\r");
    saveAction(data);

  } else if ( data.module === "RecircPump" ) {
      if (data.state == true) {
        arduino.digitalWrite(2, true);  //pump on
        arduino.digitalWrite(4, false);
      }
      else {
        arduino.digitalWrite(2, false); //pump off
        arduino.digitalWrite(4, false);
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



//////////////////////////////////////////
/*LOCAL SOCKET */

io.sockets.on('connection', function (socket) {
  connections.push(socket);

  console.log("CONNECTED");


  socket.on('disconnect', function(socket){
    var i = connections.indexOf(socket);
	   console.log("DISCONNECT: " + i);
    delete connections[i];
  });


  // var sensors_map = { "liquidTemp" : "none", "humidityi2c" : "none", "ph" : "none" };

  socket.on('command', function (data) {
  	console.log(data);

    if ( data.module === "SensaOn" ) {
        if (data.state == true) {
          serialPort.write('{setEntry:{index:0,msMeasurementPeriod:2000}}\n{setEntry:{index:1,msMeasurementPeriod:2000}}\n');
        }
        else {
          serialPort.write('{setEntry:{index:0,msMeasurementPeriod:0}}\n{setEntry:{index:1,msMeasurementPeriod:0}}\n');
        }

    } else if (data.module === "lights" && data.values) {
      if (data.relayID === 'Indicators') {
        console.log("light command receive: "+data.values.red+" "+data.values.green+" "+data.values.blue+"\n");
        arduino.analogWrite(9, data.values.green);
      	arduino.analogWrite(10, data.values.red);
		    arduino.analogWrite(11, data.values.blue);
	     }


    } else if ( data.module === "LoadPump" ) {
        if (data.state == true) {
          arduino.digitalWrite(22, true); // RelayHighV 1 for plugin pump - on
        }
        else {
          arduino.digitalWrite(22, false); // RelayHighV 1 plugin pump - off
        }

    } else if ( data.module === "RecircValve" ) {
        if (data.state == true) {
          arduino.digitalWrite(26, false); // RelayLowV 1 NO valve - open
        }
        else {
          arduino.digitalWrite(26, true); // RelayLowV 1 NO valve - closed
        }

    } else if ( data.module === "DrainValve" ) {
        if (data.state == true) {
          arduino.digitalWrite(27, true); // RelayLowV 2 NC valve - open
        }
        else {
          arduino.digitalWrite(27, false); // RelayLowV 2 NO valve - closed
        }

    } else if ( data.module === "DispenseValve" ) {
        if (data.state == true) {
          arduino.digitalWrite(28, true);  //RelayLowV 3 Dispense Valve - open

        }
        else {
          arduino.digitalWrite(28, false);  //RelayLowV 3 Dispense Valve - closed
        }

    }else if ( data.module === "RecircPump" ) {
        if (data.state == true) {
          arduino.digitalWrite(29, true);  // Recirc pump on
          arduino.digitalWrite(27, false); //RelayLowV NO valve - open
          arduino.digitalWrite(26, false); //RelayLowV NC valve - closed
        }
        else {
          // arduino.digitalWrite(2, true); // pump off
          arduino.digitalWrite(29, false); // Recirc pump off
        }

    } else if (data.module == "AirPump") {
      if (data.state == true) {
        // arduino.digitalWrite(3, false); //forward
      }
      else {
        // arduino.digitalWrite(3, true); //backward
      }

    } else if (data.module == "growLight") {
      if (data.state == true) {
        // arduino.digitalWrite(4, false); //forward
      }
      else {
        // arduino.digitalWrite(4, true); //backward
      }

    } else if (data.module == "DosePump") {
      if (data.state == true) {
        // arduino.digitalWrite(5, false); //forward
      }
      else {
        // arduino.digitalWrite(5, true); //backward
      }

    }else if ( data.module === "thermocycle-off" ) {
        //serialPort.write("t\n");
        thermocycleState = false;
        //resetThermocycle();

    } else if ( data.module === "thermocycle" ) {
        //serialPort.write("T"+data.values.lower_bound_temp+" "+data.values.upper_bound_temp+"\n");
        thermocycleState = true;
        gTemp.min = data.values.lower_bound_temp;
        gTemp.max = data.values.upper_bound_temp;
        //resetThermocycle();

    } else if ( data.module === "readStateControl" ) {

      var currentStateStr = fs.readFileSync("./controllerState.txt");
      controllerStateObject = JSON.parse(currentStateStr);


    } else if ( data.module === "toggleControl" ) {
      var relayID = data.relayID;

      controllerStateObject[relayID] = data.state;
      //relays.write_value(relayID,data.state);


    } else if ( data.module === "arkSchedule" ) {

      var interval = data.interval;

      try {
              //Taking data from arkSchedule and writing to cron.js
              g_cronClient = net.connect({port: 1337},
                    function() { //'connect' listener
                       console.log('client connected');
                      try {
                          var panelObjMessage = JSON.stringify(data);
                          console.log('PanelObj:' + panelObjMessage);
                          g_cronClient.write(panelObjMessage + '\r\n');
                      } catch ( e ) {
                        console.log(e.message);
                      }
                    });

              //Acknowledge completion and closing connection
              g_cronClient.on('data', function(data) {
                 console.log(data.toString());
                  g_cronClient.end();
              });

              g_cronClient.on('end', function() {
                  console.log('client disconnected');
              });

      } catch ( e ) {
        console.log(e.message);
      }

  } else if ( data.module === "stopSchedule" ){
    relays.initialize();

  }


});

});

///////////////////////////////////////////////////////////////
// demo

function demo() {
  function lightsOff() {
    lights(0, 0, 0);
  }
  
  // 0-255
  function lights(red, green, blue) {
    arduino.analogWrite(gPins.RGB, red);
    arduino.analogWrite(gPins.RGB+1, green);
    arduino.analogWrite(gPins.RGB+2, blue);
  }

  function load() {
    lightsOff();
    arduino.digitalWrite(gPins.NOvalve, RELAYON); 
    arduino.digitalWrite(gPins.NCvalve, RELAYON); 
    arduino.digitalWrite(gPins.load,    true);
    arduino.digitalWrite(gPins.recirc,  RELAYOFF);
    blueToAqua(40000, recirc);
  }
  
  function recirc() {
    //lightsOff();
    lights(255, 0, 128);
    arduino.digitalWrite(gPins.NOvalve, RELAYOFF); 
    arduino.digitalWrite(gPins.NCvalve, RELAYOFF); 
    arduino.digitalWrite(gPins.load,    false);
    arduino.digitalWrite(gPins.recirc,  RELAYON);
    //colorCycle(20000, recircDone);
    setTimeout(recircDone, 20000);
  }

  function recircDone() {
    //lightsOff();
    arduino.digitalWrite(gPins.NOvalve, RELAYOFF); 
    arduino.digitalWrite(gPins.NCvalve, RELAYOFF); 
    arduino.digitalWrite(gPins.load,    false);
    arduino.digitalWrite(gPins.recirc,  RELAYOFF);
    //flashGreen();
  }

  function flashGreen() {
    var flashOnTime =  200;  // milliseconds
    var flashOffTime = 200;
    var numFlashes = 5;      // number of on-off cycles
    var lightOn = false;     // initial state
    var count = 0;

    lightsOff();

    (function recurse() {
      if (lightOn) {
        arduino.analogWrite(gPins.RGB+1, 0);
        if (count < numFlashes) setTimeout(recurse, flashOffTime);
        lightOn = !lightOn;
        count++;
      }
      else {
        arduino.analogWrite(gPins.RGB+1, 255);
        if (count < numFlashes) setTimeout(recurse, flashOnTime);
        lightOn = !lightOn;
      }
      //if (count >= numFlashes) lightsOff();
    })();
  }

  // steps blue to max, then green
  function blueToAqua(duration, callback) {
    var steps = 255;
    var stepTime = duration / (steps * 2);
    var step = 0;

    (function recurse() {
      if (step <= steps) {
        arduino.analogWrite(gPins.RGB+2, step);
        step++;
      }
      else if (step <= 2*steps) {
        arduino.analogWrite(gPins.RGB+1, step-steps);
        step++;
      }
      else {
        return callback();
      }
      
      setTimeout(recurse, stepTime);
    })();
  }

  // steps red to max, then green, then blue
  function colorCycle(duration, callback) {
    var steps = 255;
    var stepTime = duration / (3 * steps);
    var step = 0;

    (function recurse() {
      if (step <= steps) {
        arduino.analogWrite(gPins.RGB, step);
        step++;
      }
      else if (step <= 2*steps) {
        arduino.analogWrite(gPins.RGB+1, step-steps);
        step++;
      }
      else if (step <= 3*steps) {
        arduino.analogWrite(gPins.RGB+2, step-2*steps);
        step++;
      }
      else {
        return callback();
      }
      
      setTimeout(recurse, stepTime);
    })();
  }

  // start the chain
  load();
}

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

//var readFromSerial = false;

serialPort.on("open", function () {
  console.log('serial port opened');

  /*setTimeout(function() {
    serialPort.write('{setEntry:{index:0,msMeasurementPeriod:0}}\n');
    serialPort.write('{setEntry:{index:1,msMeasurementPeriod:0}}\n');
  }, 4000);*/

  serialPort.on('data', function(data) {
    console.log(data);
    //if (readFromSerial == false) { demo(); readFromSerial = true;}
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
  //console.log(JSON.stringify(msg));
}

arduino.analogWrite = function(pin, value) {
  msg = {writeA: {pin:pin, value:value}};
  serialPort.write(JSON.stringify(msg) + '\n');
  //console.log(JSON.stringify(msg));
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



//////////////////////////////////////////
/*LOCAL SOCKET */

var gPins = {
  recirc: 38,
  dispense: 40,
  NOvalve: 42,
  NCvalve: 44,
  heater: 52,
  air: 50,
  growlight: 48,
  growlux: 2,
  RGB: 4,
  dose: 8,
  mixSpeed: 11,
  mixDirection: 12,

  load: 7   //same as dose for now
}

var RELAYON = false, RELAYOFF = true;

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

    if (data.module === "Demo") {
      demo();

    } else if ( data.module === "sensors" ) {
      // TODO: issue command {entries:} and parse the result, and loop through it
      // TODO: change Hypha so that sensor entries have an enabled flag, instead of changing measurement period
      var numSensors = 7;
      msMeasurementTime = data.state ? 1000 : 0;
      var period = data.state ? numSensors*msMeasurementTime : 0;
      var msg = {setEntry: {index:0, msMeasurementPeriod:period}};

      // offset each sensor reading by a bit
      function setSensor() {
        var cmd = JSON.stringify(msg);
        console.log(cmd);
        serialPort.write(cmd + '\n');
        msg.setEntry.index++;
        if (msg.setEntry.index <= numSensors) {
           setTimeout(setSensor, msMeasurementTime);
        }
      }
      setSensor();

    } else if (data.module === "lights" && data.values) {
          if (data.relayID === 'Indicators') {
            console.log("light command receive: "+data.values.red+" "+data.values.green+" "+data.values.blue+"\n");
          	arduino.analogWrite(gPins.RGB, data.values.red);
            arduino.analogWrite((gPins.RGB+1), data.values.green);
    		    arduino.analogWrite((gPins.RGB+2), data.values.blue);
    	    }

    } else if ( data.module === "LoadPump" ) {
          if (data.state == true) {
            arduino.digitalWrite(gPins.load, true);  // RelayHighV 1 for plugin pump - on
            // arduino.digitalWrite(gPins.NCvalve, true);
            // arduino.digitalWrite(gPins.NOvalve, true);
          }
          else {
            arduino.digitalWrite(gPins.load, false); // RelayHighV 1 plugin pump - off
            // arduino.digitalWrite(gPins.NCvalve, false);
            // arduino.digitalWrite(gPins.NOvalve, false);
          }

    } else if ( data.module === "RecircValve" ) {
          if (data.state == true) {
            arduino.digitalWrite(gPins.NOvalve, RELAYON); // RelayLowV 1 NO valve - open
          }
          else {
            arduino.digitalWrite(gPins.NOvalve, RELAYOFF); // RelayLowV 1 NO valve - closed
          }

    } else if (data.module === "mixSpeed") {
          arduino.analogWrite(gPins.mixSpeed, data.value);
          console.log('Mix Speed :' + data.value);
    }

    else if (data.module === "mixDirection"){
      if (data.state == true){
          arduino.digitalWrite(gPins.mixDirection, true);
      } else {
          arduino.digitalWrite(gPins.mixDirection, false);
      }
    }

    else if ( data.module === "DrainValve" ) {
          if (data.state == true) {
            arduino.digitalWrite(gPins.NCvalve, RELAYON); // RelayLowV 2 NC valve - open
          }
          else {
            arduino.digitalWrite(gPins.NCvalve, RELAYOFF); // RelayLowV 2 NO valve - closed
          }

    } else if ( data.module === "DispenseValve" ) {
          if (data.state == true) {
            arduino.digitalWrite(gPins.dispense, RELAYON);  //RelayLowV 3 Dispense Valve - open
          }
          else {
            arduino.digitalWrite(gPins.dispense, RELAYOFF);  //RelayLowV 3 Dispense Valve - closed
          }

    }else if ( data.module === "RecircPump" ) {
          if (data.state == true) {
            arduino.digitalWrite(gPins.recirc, RELAYON);  // Recirc pump on
            // arduino.digitalWrite(27, false); //RelayLowV NO valve - open
            // arduino.digitalWrite(26, false); //RelayLowV NC valve - closed
          }
          else {
            // arduino.digitalWrite(2, true); // pump off
            arduino.digitalWrite(gPins.recirc, RELAYOFF); // Recirc pump off
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
            arduino.digitalWrite(gPins.growlight, RELAYON); //RelayHighV 2 - on AC/DC converters
            // arduino.digitalWrite(gPins.growlux, true);
            // arduino.digitalWrite(gPins.growlux+1, true);
            arduino.analogWrite(gPins.growlux, data.value);
            arduino.analogWrite(gPins.growlux+1, data.value);
            console.log(data.value);
          }
          else {
            arduino.digitalWrite(gPins.growlight, RELAYOFF); //RelayHighV 2 - off AC/DC converters
            // arduino.digitalWrite(gPins.growlux, false);
            // arduino.digitalWrite(gPins.growlux+1, false)
          }

    } else if (data.module == "DosePump") {
          if (data.state == true) {
            arduino.digitalWrite(gPins.dose, true); //Mosfet on
          }
          else {
            arduino.digitalWrite(gPins.dose, false); //Mosfet off
          }

    }else if ( data.module === "thermocycle-off" ) {
          //serialPort.write("t\n");
          thermocycleState = false;
          //resetThermocycle();

    } else if ( data.module === "thermocycle" ) {
          //serialPort.write("T"+data.values.lower_bound_temp+" "+data.values.upper_bound_temp+"\n");
          // thermocycleState = true;
          // gTemp.min = data.values.lower_bound_temp;
          // gTemp.max = data.values.upper_bound_temp;
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

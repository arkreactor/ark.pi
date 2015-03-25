
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

var sensornode = require('./sensornode');

gTemp = {min:70, max:78};
thermocycleState = false;

function onSensorReading(msg) {
  if (msg.data.Fahrenheit) onTempReading(msg);
  if (msg.data.rgb) onColorReading(msg);
}

function onColorReading(msg) {
  console.log('color reading');
  blastSensorReadingToClients(msg.data.rgb.value);
}

function onTempReading(msg) {
  var temp = msg.data.Fahrenheit.value;
  var heaterOn = false;

//  console.log(temp);
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
  arduino.analogWrite(5, heaterOn? heaterLevel: 0);
}

sensornode.init(onSensorReading);

////////////////////////////////////////////////////////////////////////////
// // var gpio = require('rpi-gpio');
// var relays = require('./controllers/relays');
/*
var serialport = require("serialport");
var SerialPort = serialport.SerialPort;

        serialPort = new SerialPort('/dev/ttyACM0', {
          baudrate: 9600,
          parser: serialport.parsers.readline("\n")
        });

        serialPort.on("open", function () {
          console.log('serial port opened');
        });
*/
var ArduinoFirmata = require('arduino-firmata');
var arduino = new ArduinoFirmata();

arduino.connect(); // use default arduino
// arduino.connect('/dev/ttyACM0'); //Bone Serial
arduino.connect('/dev/ttyACM0'); //Pi2 Serial Port Upper Left

arduino.on('connect', function(){

  console.log("board version"+arduino.boardVersion);
  arduino.pinMode(3, ArduinoFirmata.OUTPUT);
  arduino.pinMode(4, ArduinoFirmata.OUTPUT);
  arduino.pinMode(5, ArduinoFirmata.OUTPUT);
  arduino.pinMode(9, ArduinoFirmata.OUTPUT);
  arduino.pinMode(10, ArduinoFirmata.OUTPUT);
  arduino.pinMode(11, ArduinoFirmata.OUTPUT);

});



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

var connections = [];


/////////////////////////////////
/*REMOTE SOCKET*/

var sensa = ioc.connect('http://sensa.io:8888');
sensa.on('connect', function(){
  connections.push(sensa);
});

sensa.on('command', function(data){
  console.log(data);
  if(data.module === "lights" && data.values) {
    console.log("light command receive: "+data.values.red+" "+data.values.green+" "+data.values.blue+"\n");
    if (data.relayID === 'Mosfet1') {
      arduino.analogWrite(10, data.values.red);
      arduino.analogWrite(9, data.values.green);
      arduino.analogWrite(11, data.values.blue);
    }

  } else if ( data.module === "doseCycle" ) {
      if (data.state == true) {
        arduino.digitalWrite(3, true); // pump on
        // arduino.digitalWrite(4, false);
      }
      else {
        arduino.digitalWrite(3, false); // pump off
        // arduino.digitalWrite(4, false);
      }

  } else if (data.module == "doseDirection") {
    if (data.state == true) {
      arduino.digitalWrite(4, false); //forward
    }
    else {
      arduino.digitalWrite(4, true); //backward
    }

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


  var sensors_map = { "liquidTemp" : "none", "humidityi2c" : "none", "ph" : "none" };

  socket.on('command', function (data) {
  	console.log(data);

    if(data.module === "lights" && data.values) {
      console.log("light command receive: "+data.values.red+" "+data.values.green+" "+data.values.blue+"\n");
      if (data.relayID === 'Mosfet1') {
      	arduino.analogWrite(10, data.values.red);
      	arduino.analogWrite(9, data.values.green);
		    arduino.analogWrite(11, data.values.blue);
	  }
      	        //serialPort.write("L"+data.values.red+" "+data.values.green+" "+data.values.blue+"\n");
      //if (data.relayID=== 'Mosfet2') arduino.analogWrite(9, data.values.green);
      //if (data.relayID === 'Mosfet3') arduino.analogWrite(11, data.values.blue);

    } else if ( data.module === "doseCycle" ) {
        if (data.state == true) {
          arduino.digitalWrite(3, true); // pump on
          // arduino.digitalWrite(4, false);
        }
        else {
          arduino.digitalWrite(3, false); // pump off
          // arduino.digitalWrite(4, false);
        }

    } else if (data.module == "doseDirection") {
      if (data.state == true) {
        arduino.digitalWrite(4, false); //forward
      }
      else {
        arduino.digitalWrite(4, true); //backward
      }

    } else if ( data.module === "thermocycle-off" ) {
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

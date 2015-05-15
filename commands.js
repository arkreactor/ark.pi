var demo = require('./demo');

// Variable not defined locally; global scope
// var g_cronClient = null;


// device state properties:
// - pin: number
// - state: number or boolean, represents current state of pin
// - defaultState: number of boolean, defaults to false
// - activeLow: optional boolean for active low relays
// Active high is assumed unless activeLow === true
// TODO: store pin values with device description in microcontroller
var gHyphaDeviceActuatorMap = {
  Kefir:{
    //sensors:       {},
    RecircPump:    {pin:38, activeLow:true},
    DispenseValve: {pin:40, activeLow:true},
    RecircValve:   {pin:42, activeLow:true},
    DrainValve:    {pin:44, activeLow:true},
    growRelay:     {pin:48, activeLow:true},
    growLight:     {pin:2,  defaultState:0},
    AirPump:       {pin:50, activeLow:true},
    Heater:        {pin:52, activeLow:true},
    mixSpeed:      {pin:11, defaultState:0},
    mixDirection:  {pin:12},
    ledRed:        {pin:4,  defaultState:0},
    ledGreen:      {pin:5,  defaultState:0},
    ledBlue:       {pin:6,  defaultState:0},
    LoadPump:      {pin:7}, 
    DosePump:      {pin:8}
  },

  Hypha: {

  },

  Zephyr: {

  }
};

// call so that you can query the state of the device's actuators by calling getStatus
exports.syncDeviceState = function(device) {
  if (!device.deviceID) {
    console.log('pin map not assigned because deviceID is empty: ' + deviceID);
    return;
  }

  var actuatorMap = gHyphaDeviceActuatorMap[device.deviceID];
  if (!actuatorMap) {
    console.log('pin map not assigned because deviceID not found: ' + deviceID);
    return;
  }

  // clone -- will be bad if contains functions...
  device.actuators = JSON.parse(JSON.stringify(actuatorMap));

  // because we cannot query the state of microcontroller pins at the moment,
  // go through and set every actuator to its default state
  for (var name in device.actuators) {
    if (device.actuators.hasOwnProperty(name)) {
      var a = device.actuators[name];

      // for convenience, define the default state for the actuator
      if (a.defaultState === undefined) a.defaultState = false;

      var type = typeof a.defaultState;
      if (type === 'boolean') {
        //console.log('setting pin ' + a.pin + ' = ' + a.defaultState);
        device.digitalWrite(a, a.defaultState);
        a.state = a.defaultState;
      }
      else if (type === 'number') {
        //console.log('setting pin ' + a.pin + ' = ' + a.defaultState);
        device.analogWrite(a, a.defaultState);
        a.state = a.defaultState;
      }
      else if (a.setter) a.setter(device);
      else {
        console.log("error: don't know how to set default value for '" + name + "'");
      }

    }
  }

  // return a json object describing the state of the actuators
  device.getStatus = function() {
    var status = {};
    for (var name in this.actuators) {
      if (this.actuators.hasOwnProperty(name)) {
        //console.log(JSON.stringify(this.actuators[name]));
        status[name] = this.actuators[name].state;
      }
    }

    return status;
  }
}

exports.onCommand = function onCommand(device, data) {
  var pins = device.actuators;
  var serialPort = device.serialPort;

  if (data.module === "Demo") {
    //demo.run(device, pins); // must update pins

  } else if ( data.module === "sensors" ) {
    // TODO: issue command {entries:} and parse the result, and loop through it
    // TODO: change Hypha so that sensor entries have an enabled flag, instead of changing measurement period
    
    device.serialPort.write("{sensors:" + (data.State? 1: 0)  + "}\n");

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
      	device.analogWrite(pins.ledRed.pin, data.values.red);
        device.analogWrite(pins.ledGreen.pin,  data.values.green);
		    device.analogWrite(pins.ledBlue.pin,   data.values.blue);
        pins.ledRed.state = data.values.red;
        pins.ledGreen.state = data.values.green;
        pins.ledBlue.state = data.values.blue;
	    }

  } else if (data.module === "LoadPump") {
    device.digitalWrite(pins.load, data.state);
    pins.LoadPump.state = data.state;

  } else if (data.module === "RecircValve") {
    device.digitalWrite(pins.NOvalve, data.state);
    pins.RecircValve.state = data.state;

  } else if (data.module === "mixSpeed") {
    device.analogWrite(pins.mixSpeed, data.value);
    pins.mixSpeed.state = data.value;

  } else if (data.module === "mixDirection"){
    device.digitalWrite(pins.mixDirection, data.state);
    pins.mixDirection.state = data.state;
  
  } else if (data.module === "DrainValve") {
    device.digitalWrite(pins.DrainValue, data.state);
    pins.DrainValve.state = data.state;

  } else if (data.module === "DispenseValve") {
    device.digitalWrite(pins.DispenseValue, data.state);
    pins.DispenseValve.state = data.state;

  } else if (data.module === "RecircPump") {
    device.digitalWrite(pins.RecircPump, data.state);
    pins.RecircPump.state = data.state;

  } else if (data.module == "AirPump") {
    device.digitalWrite(pins.AirPump, data.state);
    pins.AirPump.state = data.state;

  } else if (data.module == "growLight") {
    if (data.state == false) data.value = 0;
    device.digitalWrite(pins.growRelay, data.state);
    device.analogWrite(pins.growLight.pin, data.value);
    device.analogWrite(pins.growLight.pin+1, data.value);
    pins.growLight.state = data.value;
    pins.growRelay.state = data.state;
    console.log(data.value);

  } else if (data.module == "DosePump") {
    device.digitalWrite(pins.DosePump, data.state);
    pins.DosePump.state = data.state;
 
  }
  
  /* else if ( data.module === "thermocycle-off" ) {
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
  */
}



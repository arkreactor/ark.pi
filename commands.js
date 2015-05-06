var demo = require('./demo');

// Variable not defined locally; global scope
// var g_cronClient = null;


// TODO: store pin values with device description
// store an object which decribes whether the pin is active low.
// Active high is assumed unless activeLow === true
var pins = {
  recirc:       {pin:38, activeLow:true},
  dispense:     {pin:40, activeLow:true},
  NOvalve:      {pin:42, activeLow:true},
  NCvalve:      {pin:44, activeLow:true},
  heater:       {pin:52, activeLow:true},
  air:          {pin:50, activeLow:true},
  growlight:    {pin:48, activeLow:true},
  growlux:      {pin:2},
  RGB:          {pin:4},
  dose:         {pin:8},
  mixSpeed:     {pin:11},
  mixDirection: {pin:12},

  load:         {pin:7}   //same as dose for now
}

exports.onCommand = function onCommand(device, data) {
  //var pins = device.pins;
  var serialPort = device.serialPort;

  if (data.module === "Demo") {
    demo.run(device, pins);

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
      	device.analogWrite(pins.RGB.pin, data.values.red);
        device.analogWrite(pins.RGB.pin+1, data.values.green);
		    device.analogWrite(pins.RGB.pin+2, data.values.blue);
	    }

  } else if (data.module === "LoadPump") {
    device.digitalWrite(pins.load, data.state);
    // device.digitalWrite(pins.NCvalve, data.state);
    // device.digitalWrite(pins.NOvalve, data.state);

  } else if (data.module === "RecircValve") {
    device.digitalWrite(pins.NOvalve, data.state);

  } else if (data.module === "mixSpeed") {
    device.analogWrite(pins.mixSpeed, data.value);
    console.log('Mix Speed :' + data.value);

  } else if (data.module === "mixDirection"){
    device.digitalWrite(pins.mixDirection, data.state);
  
  } else if (data.module === "DrainValve") {
    device.digitalWrite(pins.NCvalve, data.state);

  } else if (data.module === "DispenseValve") {
    device.digitalWrite(pins.dispense, data.state);

  } else if (data.module === "RecircPump") {
    device.digitalWrite(pins.recirc, data.state);

  } else if (data.module == "AirPump") {
     device.digitalWrite(pins.air, data.state);

  } else if (data.module == "growLight") {
    if (data.state == false) data.value = 0;
    device.digitalWrite(pins.growlight, data.state);
    device.analogWrite(pins.growlux.pin, data.value);
    device.analogWrite(pins.growlux.pin+1, data.value);
    console.log(data.value);

  } else if (data.module == "DosePump") {
    device.digitalWrite(pins.dose, data.state);

  } else if ( data.module === "thermocycle-off" ) {
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
}



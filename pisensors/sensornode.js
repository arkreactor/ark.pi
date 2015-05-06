//var ioc = require('socket.io-client');

var readPeriod = 5000;

////////////////////////////////////////////////////////////////////
// sensor modules

var sensors = [
  // require('./color/colorimeter'),
  require('./atlas/ph'),
  // require('./one-wire/temp')
];

exports.init = function(valueReporter) {

  sensors.forEach(function(sensor) {
    if (sensor.init) sensor.init();
  });

  function readSensors(/*valueReporter*/) {
    sensors.forEach(function(sensor) {
      sensor.read(function(msg) {
        //console.log("readSensors on (" + sensor + "): " + msg);
        if (valueReporter) valueReporter(msg);
        //sensa.emit(data.sensorID, msg);
      });
    });

    setTimeout(readSensors, readPeriod);
  }

  readSensors();
}

/////////////////////////////////////////////////////////////////////////
//var serverAddress = 'http://192.168.255.100:4000';
/*var serverAddress = 'http://sensa.io';
var sensa = ioc.connect(serverAddress);
sensa.on('connect', function() {
  //connections.push(sensa);
  console.log('connected');
  readSensors(function(data) {
    sensa.emit('Sensa1', data);
  });
});
*/

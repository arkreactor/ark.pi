var exec = require('child_process').exec;
var util = require('../sensor_util');

var tempId= '28-00000471fb7a';

exports = exports || {};    // hack to run standalone or as module
exports.read = function (value_reporter) {

  exec( "cat /sys/devices/w1_bus_master1/" + tempId + "/w1_slave | grep t= | cut -f2 -d=", function( error, stdout, stderr ){

    var tempC = parseFloat(stdout) / 1000;
    var tempF = ((1.8)*tempC + 32).toFixed(2);
    
    var msg = util.makeSensorMessage('Temperature', 'Celsius', tempC, 'C'); 
        util.addSensorReading(msg, 'Fahrenheit', tempF, 'F');    
    //console.log(msg);
    value_reporter(msg);
  });
}

exports.read(console.log);


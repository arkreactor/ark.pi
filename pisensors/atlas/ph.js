var serialport = require("serialport");
var util = require('../sensor_util');

var sensorAtlas;
var callbackFunc;

exports.init = function(callback) {
  callbackFunc = callback;

  sensorAtlas = new serialport.SerialPort('/dev/ttyAMA0', {
    baudrate: 38400,
    parser: serialport.parsers.readline("\r")
  });

  sensorAtlas.on("data", function (data) {
    var msg = util.makeSensorMessage('Reading', 'pH', data, 'pH');
    console.log(msg);
    if (callbackFunc) callbackFunc(msg);
  });

  sensorAtlas.on("open", function () {
    console.log('serial port opened');
    sensorAtlas.write("E\r");    //ensure continuous mode is off
  });

  sensorAtlas.on("error", function (err) {
    console.log('sensorAtlas serial error: ' + err);
  });
}

exports.read = function(callback) {
  callbackFunc = callback;
  sensorAtlas.write("R\r");
}

exports.write = function(command) {
  if (command.indexOf('\r') == -1) command += '\r';
  sensorAtlas.write(command);
}

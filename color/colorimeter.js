var serialport = require("serialport");
var util = require('../sensor_util');

var colorimeter;
var callbackFunc;

exports.init = function(callback) {
  callbackFunc = callback;

  colorimeter = new serialport.SerialPort('/dev/ttyAMA0', {
    baudrate: 38400,
    parser: serialport.parsers.readline("\r")
  });

  colorimeter.on("data", function (data) {
    var msg = util.makeSensorMessage('Opacity', 'rgb', data, 'RGB');
    //console.log(msg);
    if (callbackFunc) callbackFunc(msg);
  });

  colorimeter.on("open", function () {
    console.log('serial port opened');
    colorimeter.write("E\r");    //ensure continuous mode is off
  });

  colorimeter.on("error", function (err) {
    console.log('colorimeter serial error: ' + err);
  });
}

exports.read = function(callback) {
  callbackFunc = callback;
  colorimeter.write("R\r");
}

exports.write = function(command) {
  if (command.indexOf('\r') == -1) command += '\r';
  colorimeter.write(command);
}

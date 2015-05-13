var fs = require('fs');
var serialport = require("serialport");
var SerialPort = serialport.SerialPort;

var devPath = '/dev/'

// get a list of potential serial devices
// callback will be called with object containing {deviceID, path, serialPort} for each device found
exports.findDevices = function(callback) {
  
  //var devPath = defaultDevPath;
  //if (devPath[devPath.length-1] !== '/') devPath += '/';

  var filenames = fs.readdirSync(devPath);
  filenames.forEach(function(f) {
    if (f.indexOf('ttyACM') !== 0) return;
    var filename = devPath + f;

    var serialPort = new SerialPort(filename, {
      baudrate: 38400,
      parser: serialport.parsers.readline("\n")
    });

    serialPort.on("error", function(err) {
      console.log('error opening serial port: ' + err);
    });

    serialPort.on("open", function () {
      console.log('serial port opened');

      serialPort.on('data', function(data) {
        //console.log(data);
        try {
          var msg = JSON.parse(data);
          var init = msg.init;
          if (init && init.firmware === 'Hypha' && init.name) {
            //console.log('found Hypha device: ' + init.name);
            //serialPort.on('data', function(data) {}); // remove handler
            var o = {deviceID:init.name, path:filename, serialPort:serialPort};
            callback(o);
          }
        } catch(e) {
          //console.log('bad json from serial port ');
        }
      });
    });
  });
}

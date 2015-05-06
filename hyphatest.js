var hypha = require('./hypha.js');

var hyphaDevices = [];

hypha.findDevices(function(o) {
  hyphaDevices.push(o);
  console.log('device found: ' + o.deviceID);
});

/** Create a sensor reading message.  Call addSensorReading the returned message to add additional readings.
    id, value, unit are optional.
*/
exports.makeSensorMessage = function (sensorID, id, value, unit) {
  var message = {time: Date.now(), sensorID: sensorID, data: {}};
  if (id) exports.addSensorReading(message, id, value, unit);
  return message;
}

exports.addSensorReading = function (message, id, value, unit) {
  if (message && id) {
    message.data[id] = {id:id, value:value, unit:unit};
  }
}


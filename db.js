//////////////////////////////////////////////////////////////////////////////
// cloud database
var cradle = require('cradle');

var db, dbActions, dbReadings;

exports.init = function() {
  db = new(cradle.Connection)('http://sensa.io');
  dbActions = db.database('actions');
  dbReadings = db.database('readings');
}

exports.close = function() {
  
}

exports.saveReading = function(msg) {
  if (!dbReadings || !dbReadings.save) {
    return false;
  }

  // TODO: check msg has timestamp

  dbReadings.save(msg, function (err, res) {
    if (err) {
      console.log('error creating reading record');
    } else {
      console.log('reading record created');
    }
  });
}

// error is a string describing the problem
// could substitute error codes--read up on enums in js
exports.saveAction = function(msg, error) {
  if (!dbActions || !dbActions.save) {
    return false;
  }

  // TODO: check msg has timestamp
  // TODO: incorporate success or failure

  dbActionss.save(msg, function (err, res) {
    if (err) {
      console.log('error creating action record');
    } else {
      console.log('action record created');
    }
  });
}



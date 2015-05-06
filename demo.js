exports.run = function (arduino, pins) {
  var RELAYON = pins.RELAYON || false;
  var RELAYOFF = pins.RELAYOFF || !RELAYON;

  function lightsOff() {
    lights(0, 0, 0);
  }
  
  // 0-255
  function lights(red, green, blue) {
    arduino.analogWrite(pins.RGB, red);
    arduino.analogWrite(pins.RGB+1, green);
    arduino.analogWrite(pins.RGB+2, blue);
  }

  function load() {
    lightsOff();
    arduino.digitalWrite(pins.NOvalve, RELAYON); 
    arduino.digitalWrite(pins.NCvalve, RELAYON); 
    arduino.digitalWrite(pins.load,    true);
    arduino.digitalWrite(pins.recirc,  RELAYOFF);
    blueToAqua(40000, recirc);
  }
  
  function recirc() {
    //lightsOff();
    lights(255, 0, 128);
    arduino.digitalWrite(pins.NOvalve, RELAYOFF); 
    arduino.digitalWrite(pins.NCvalve, RELAYOFF); 
    arduino.digitalWrite(pins.load,    false);
    arduino.digitalWrite(pins.recirc,  RELAYON);
    //colorCycle(20000, recircDone);
    setTimeout(recircDone, 20000);
  }

  function recircDone() {
    //lightsOff();
    arduino.digitalWrite(pins.NOvalve, RELAYOFF); 
    arduino.digitalWrite(pins.NCvalve, RELAYOFF); 
    arduino.digitalWrite(pins.load,    false);
    arduino.digitalWrite(pins.recirc,  RELAYOFF);
    //flashGreen();
  }

  function flashGreen() {
    var flashOnTime =  200;  // milliseconds
    var flashOffTime = 200;
    var numFlashes = 5;      // number of on-off cycles
    var lightOn = false;     // initial state
    var count = 0;

    lightsOff();

    (function recurse() {
      if (lightOn) {
        arduino.analogWrite(pins.RGB+1, 0);
        if (count < numFlashes) setTimeout(recurse, flashOffTime);
        lightOn = !lightOn;
        count++;
      }
      else {
        arduino.analogWrite(pins.RGB+1, 255);
        if (count < numFlashes) setTimeout(recurse, flashOnTime);
        lightOn = !lightOn;
      }
      //if (count >= numFlashes) lightsOff();
    })();
  }

  // steps blue to max, then green
  function blueToAqua(duration, callback) {
    var steps = 255;
    var stepTime = duration / (steps * 2);
    var step = 0;

    (function recurse() {
      if (step <= steps) {
        arduino.analogWrite(pins.RGB+2, step);
        step++;
      }
      else if (step <= 2*steps) {
        arduino.analogWrite(pins.RGB+1, step-steps);
        step++;
      }
      else {
        return callback();
      }
      
      setTimeout(recurse, stepTime);
    })();
  }

  // steps red to max, then green, then blue
  function colorCycle(duration, callback) {
    var steps = 255;
    var stepTime = duration / (3 * steps);
    var step = 0;

    (function recurse() {
      if (step <= steps) {
        arduino.analogWrite(pins.RGB, step);
        step++;
      }
      else if (step <= 2*steps) {
        arduino.analogWrite(pins.RGB+1, step-steps);
        step++;
      }
      else if (step <= 3*steps) {
        arduino.analogWrite(pins.RGB+2, step-2*steps);
        step++;
      }
      else {
        return callback();
      }
      
      setTimeout(recurse, stepTime);
    })();
  }

  // start the chain
  load();
}



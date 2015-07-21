/* globals self */
'use strict';

var background = {
  send: self.port.emit,
  receive: self.port.on
};

var load = (function () {
  var callbacks = [];
  background.receive('show', function () {
    callbacks.forEach(c => c());
  });
  return function (c) {
    callbacks.push(c);
  };
})();
var unload = (function () {
  var callbacks = [];
  background.receive('hide', function () {
    callbacks.forEach(c => c());
  });
  return function (c) {
    callbacks.push(c);
  };
})();

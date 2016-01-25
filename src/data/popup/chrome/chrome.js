/* globals chrome */
'use strict';

var background = {
  send: function (id, data) {
    chrome.extension.sendRequest({method: id, data: data});
  },
  receive: function (id, callback) {
    chrome.extension.onRequest.addListener(function (request) {
      if (request.method === id) {
        callback(request.data);
      }
    });
  }
};

var load = (function () {
  var callbacks = [];
  window.addEventListener('load', function () {
    callbacks.forEach(function (c) {
      c();
    });
  });
  return function (c) {
    callbacks.push(c);
  };
})();

function unload () {}

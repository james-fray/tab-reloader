'use strict';

var isSafari = typeof safari !== 'undefined';
var isChrome = typeof chrome !== 'undefined';

function add (url) {
  var head = document.querySelector('head');
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = url;
  head.appendChild(script);
}

if (isChrome) {
  add('chrome/chrome.js');
  add('index.js');
}
if (isSafari) {
  add('safari/safari.js');
  add('index.js');
}

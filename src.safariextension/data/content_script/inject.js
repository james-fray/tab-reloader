/* globals background, manifest, globals */
'use strict';

/*
  background.send
  background.receive
  manifest.url
*/

background.receive('url-is', function () {
  background.send('url-is', document.location.href);
});
background.send('script-injected');

function initiate (existing) {
  console.error('Content Script is injected, isExisting:', existing);
}

document.addEventListener('DOMContentLoaded', initiate, false);
if (document.readyState !== 'loading') {
  initiate(true);
}

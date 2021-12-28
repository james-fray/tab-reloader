/* plug-in system */
const startup = () => chrome.storage.local.get({
  './plugins/badge/core.js': false
}, prefs => {
  if (prefs['./plugins/badge/core.js']) {
    import('./plugins/badge/core.js').then(o => o.enable());
  }
});
chrome.runtime.onStartup.addListener(startup);
chrome.runtime.onInstalled.addListener(startup);

chrome.storage.onChanged.addListener(ps => {
  // AMO does not like dynamic imports
  if ('./plugins/badge/core.js' in ps) {
    import('./plugins/badge/core.js').then(o => o[ps['./plugins/badge/core.js'].newValue ? 'enable' : 'disable']());
  }
});

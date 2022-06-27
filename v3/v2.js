chrome.tabs.query = new Proxy(chrome.tabs.query, {
  apply(target, self, args) {
    if (args.length === 2) {
      return Reflect.apply(target, self, args);
    }
    else {
      return new Promise(resolve => Reflect.apply(target, self, [...args, resolve]));
    }
  }
});
chrome.tabs.get = new Proxy(chrome.tabs.get, {
  apply(target, self, args) {
    if (args.length === 2) {
      return Reflect.apply(target, self, args);
    }
    else {
      return new Promise(resolve => Reflect.apply(target, self, [...args, resolve]));
    }
  }
});
chrome.windows.get = new Proxy(chrome.windows.get, {
  apply(target, self, args) {
    if (args.length === 2) {
      return Reflect.apply(target, self, args);
    }
    else {
      return new Promise(resolve => Reflect.apply(target, self, [...args, resolve]));
    }
  }
});
chrome.alarms.get = new Proxy(chrome.alarms.get, {
  apply(target, self, args) {
    if (args.length === 2) {
      return Reflect.apply(target, self, args);
    }
    else {
      return new Promise(resolve => Reflect.apply(target, self, [...args, resolve]));
    }
  }
});
chrome.alarms.getAll = new Proxy(chrome.alarms.getAll, {
  apply(target, self, args) {
    if (args.length) {
      return Reflect.apply(target, self, args);
    }
    else {
      return new Promise(resolve => Reflect.apply(target, self, [resolve]));
    }
  }
});
chrome.permissions.contains = new Proxy(chrome.permissions.contains, {
  apply(target, self, args) {
    if (/Firefox/.test(navigator.userAgent)) {
      return Promise.resolve(false);
    }

    if (args.length === 2) {
      return Reflect.apply(target, self, args);
    }
    else {
      return new Promise(resolve => Reflect.apply(target, self, [...args, resolve]));
    }
  }
});
chrome.permissions.request = new Proxy(chrome.permissions.request, {
  apply(target, self, args) {
    if (args.length === 2) {
      return Reflect.apply(target, self, args);
    }
    else {
      return new Promise(resolve => Reflect.apply(target, self, [...args, resolve]));
    }
  }
});


chrome.action = chrome.action || chrome.browserAction;

chrome.scripting = chrome.scripting || {
  executeScript({target, files, func, args = []}) {
    const props = {};

    if (files) {
      props.file = files[0];
    }
    if (func) {
      const s = btoa(JSON.stringify(args));
      props.code = '(' + func.toString() + `)(...JSON.parse(atob('${s}')))`;
    }
    if (target.allFrames) {
      props.allFrames = true;
      props.matchAboutBlank = true;
    }

    return new Promise((resolve, reject) => chrome.tabs.executeScript(target.tabId, props, r => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(lastError);
      }
      else {
        resolve(r.map(result => ({result})));
      }
    }));
  }
};

chrome.contextMenus.create = new Proxy(chrome.contextMenus.create, {
  apply(target, self, [properties, c]) {
    properties.contexts = properties.contexts.map(s => s === 'action' ? 'browser_action' : s);
    Reflect.apply(target, self, [properties, c]);
  }
});

// Firefox
if (typeof URLPattern === 'undefined') {
  import('./polyfill/urlpattern.js').then(o => {
    self.URLPattern = o.URLPattern;
  });
}

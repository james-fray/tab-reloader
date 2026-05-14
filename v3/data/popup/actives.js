/* global api, remaining */

{
  const cache = {};

  api.alarms.keys().then(tabIds => tabIds.map(Number)).then(async tabIds => {
    const ids = [];

    // sort
    tabIds.sort();
    // current tab
    const [current] = await api.tabs.active();

    for (const tabId of tabIds) {
      const tab = await api.tabs.get(tabId);
      if (tab) {
        // do not use "active" property of the tab since we want to exclude only the current tab in the active window
        if (tab.id !== current.id) {
          const div = document.createElement('div');
          div.tabId = tabId;
          div.classList.add('entry', 'button');
          div.title = tab.title + ' -> ' + tab.url;

          const timer = cache[tabId] = document.createElement('span');
          timer.textContent = '00:20';
          timer.classList.add('timer');
          div.append(timer);

          const title = document.createElement('span');
          title.textContent = tab.title || tab.url;
          title.classList.add('title');
          div.append(title);

          document.getElementById('actives').append(div);
        }
      }
      else {
        ids.push(tabId);
      }
    }

    if (ids.length) {
      api.post.bg({
        reason: 'tab-not-found-on-popup',
        method: 'remove-jobs',
        ids
      });
    }

    if (Object.keys(cache).length) {
      let timer;
      const once = () => {
        api.alarms.forEach(o => {
          const tabId = Number(o.name);

          if (cache[tabId]) {
            cache[tabId].textContent = remaining(o);
          }
        });

        clearTimeout(timer);
        timer = setTimeout(once, 1000);
      };
      once();
    }
  });
}
document.getElementById('actives').onclick = e => {
  const tabId = e.target.tabId;

  if (tabId) {
    api.tabs.activate(tabId).then(() => window.close());
  }
};

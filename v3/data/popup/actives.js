/* global api, remaining */

{
  const cache = {};

  api.alarms.forEach(async o => {
    const tabId = Number(o.name);
    const tab = await api.tabs.get(tabId);

    if (tab) {
      if (tab.active !== true) {
        const div = document.createElement('div');
        div.tabId = tabId;
        div.classList.add('entry', 'button');
        div.title = tab.title + ' -> ' + tab.url;

        const timer = document.createElement('span');
        timer.textContent = '00:20';
        timer.classList.add('timer');
        div.append(timer);

        const title = document.createElement('span');
        title.textContent = tab.title || tab.url;
        title.classList.add('title');
        div.append(title);

        document.getElementById('actives').append(div);

        cache[tabId] = timer;
      }
    }
    else {
      api.post.bg({
        reason: 'tab-not-found-on-popup',
        method: 'remove-job',
        id: tabId
      });
    }
  }).then(() => {
    if (Object.keys(cache)) {
      let timer;
      const once = () => {
        api.alarms.forEach(async o => {
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

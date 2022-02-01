/* global api */

api.alarms.forEach(async o => {
  const tabId = Number(o.name);
  const tab = await api.tabs.get(tabId);

  if (tab) {
    const span = document.createElement('span');
    span.textContent = tab.title || tab.url;
    span.title = tab.title + ' -> ' + tab.url;
    span.tabId = tabId;
    span.classList.add('entry', 'button');
    document.getElementById('actives').appendChild(span);
  }
  else {
    api.post.bg({
      reason: 'tab-not-found-on-popup',
      method: 'remove-job',
      id: tabId
    });
  }
});

document.getElementById('actives').onclick = e => {
  const tabId = e.target.tabId;

  if (tabId) {
    api.tabs.activate(tabId);
  }
};

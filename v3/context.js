/* global api, messaging */

api.runtime.started(() => {
  api.context.add({
    title: 'Reload tabs',
    id: 'reload',
    contexts: ['action']
  });
  api.context.add({
    title: 'All tabs',
    id: 'reload.all',
    contexts: ['action'],
    parentId: 'reload'
  });
  api.context.add({
    title: 'All discarded tabs',
    id: 'reload.all.discarded',
    contexts: ['action'],
    parentId: 'reload'
  });
  api.context.add({
    title: 'All tabs in the current window',
    id: 'reload.window',
    contexts: ['action'],
    parentId: 'reload'
  });
  api.context.add({
    title: 'All discarded tabs in the current window',
    id: 'reload.window.discarded',
    contexts: ['action'],
    parentId: 'reload'
  });
  api.context.add({
    title: 'Tabs to the left',
    id: 'reload.tabs.left',
    contexts: ['action'],
    parentId: 'reload'
  });
  api.context.add({
    title: 'Tabs to the right',
    id: 'reload.tabs.right',
    contexts: ['action'],
    parentId: 'reload'
  });
  api.context.add({
    title: 'Stop all Reloading Jobs',
    id: 'stop.all',
    contexts: ['action']
  });
});

api.context.fired(async (info, tab) => {
  if (info.menuItemId.startsWith('reload.')) {
    let tabs = [];
    if (info.menuItemId === 'reload.all' || info.menuItemId === 'reload.all.c') {
      tabs = await api.tabs.query({});
    }
    else if (info.menuItemId === 'reload.all.discarded') {
      tabs = (await api.tabs.query({})).filter(t => t.discarded === true || t.status === 'unloaded');
    }
    else if (info.menuItemId === 'reload.window' || info.menuItemId === 'reload.window.c') {
      tabs = await api.tabs.query({
        currentWindow: true
      });
    }
    else if (info.menuItemId === 'reload.window.discarded') {
      tabs = (await api.tabs.query({
        currentWindow: true
      })).filter(t => t.discarded === true || t.status === 'unloaded');
    }
    else if (info.menuItemId === 'reload.tabs.right') {
      tabs = (await api.tabs.query({
        currentWindow: true
      })).filter(t => t.index > tab.index);
    }
    else if (info.menuItemId === 'reload.tabs.left') {
      tabs = (await api.tabs.query({
        currentWindow: true
      })).filter(t => t.index < tab.index);
    }
    else if (info.menuItemId === 'reload.now') {
      tabs = [tab];
    }
    console.log(tabs);
    tabs.forEach(tab => api.tabs.reload(tab, {bypassCache: true}));
  }
  else if (info.menuItemId === 'stop.all') {
    api.alarms.forEach(o => messaging({
      method: 'remove-job',
      id: Number(o.name.replace('job-', ''))
    }));
  }
});

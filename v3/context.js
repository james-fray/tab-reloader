/* global api, messaging */

api.runtime.started(() => {
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_tabs'),
    id: 'reload',
    contexts: ['action']
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_all_tabs'),
    id: 'reload.all',
    contexts: ['action'],
    parentId: 'reload'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_all_discarded'),
    id: 'reload.all.discarded',
    contexts: ['action'],
    parentId: 'reload'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_window'),
    id: 'reload.window',
    contexts: ['action'],
    parentId: 'reload'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_window_discarded'),
    id: 'reload.window.discarded',
    contexts: ['action'],
    parentId: 'reload'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_tabs_left'),
    id: 'reload.tabs.left',
    contexts: ['action'],
    parentId: 'reload'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_tabs_right'),
    id: 'reload.tabs.right',
    contexts: ['action'],
    parentId: 'reload'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_stop_all'),
    id: 'stop.all',
    contexts: ['action']
  });
});
{
  const observe = async (info, tab) => {
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
      tabs.forEach(tab => api.tabs.reload(tab, {bypassCache: true}));
    }
    else if (info.menuItemId === 'stop.all') {
      api.alarms.forEach(o => messaging({
        reason: 'context-stop-all',
        method: 'remove-job',
        id: Number(o.name.replace('job-', ''))
      }));
    }
  };
  api.context.fired(observe);

  api.commands.fired((menuItemId, tab) => observe({
    menuItemId
  }, tab));
}

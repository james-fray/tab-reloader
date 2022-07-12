/* global api, messaging */

api.runtime.started(() => {
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_every'),
    id: 'reload.every',
    contexts: ['action', 'browser_action', 'tab']
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_every_10s'),
    id: 'reload.every.00:00:10',
    contexts: ['action', 'browser_action', 'tab'],
    parentId: 'reload.every'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_every_30s'),
    id: 'reload.every.00:00:30',
    contexts: ['action', 'browser_action', 'tab'],
    parentId: 'reload.every'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_every_1m'),
    id: 'reload.every.00:01:00',
    contexts: ['action', 'browser_action', 'tab'],
    parentId: 'reload.every'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_every_5m'),
    id: 'reload.every.00:05:00',
    contexts: ['action', 'browser_action', 'tab'],
    parentId: 'reload.every'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_every_15m'),
    id: 'reload.every.00:15:00',
    contexts: ['action', 'browser_action', 'tab'],
    parentId: 'reload.every'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_every_1h'),
    id: 'reload.every.01:00:00',
    contexts: ['action', 'browser_action', 'tab'],
    parentId: 'reload.every'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_tabs'),
    id: 'reload',
    contexts: ['action', 'browser_action', 'tab']
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_all_tabs'),
    id: 'reload.all',
    contexts: ['action', 'browser_action', 'tab'],
    parentId: 'reload'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_all_discarded'),
    id: 'reload.all.discarded',
    contexts: ['action', 'browser_action', 'tab'],
    parentId: 'reload'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_window'),
    id: 'reload.window',
    contexts: ['action', 'browser_action', 'tab'],
    parentId: 'reload'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_window_discarded'),
    id: 'reload.window.discarded',
    contexts: ['action', 'browser_action', 'tab'],
    parentId: 'reload'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_tabs_left'),
    id: 'reload.tabs.left',
    contexts: ['action', 'browser_action', 'tab'],
    parentId: 'reload'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_tabs_right'),
    id: 'reload.tabs.right',
    contexts: ['action', 'browser_action', 'tab'],
    parentId: 'reload'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_stop'),
    id: 'stop',
    contexts: ['action', 'browser_action', 'tab']
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_no_reload'),
    id: 'no.reload',
    contexts: ['action', 'browser_action', 'tab'],
    parentId: 'stop'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_stop_all'),
    id: 'stop.all',
    contexts: ['action', 'browser_action', 'tab'],
    parentId: 'stop'
  });
  api.context.add({
    contexts: ['action', 'browser_action', 'tab'],
    type: 'separator'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_restart'),
    id: 'restart',
    contexts: ['action', 'browser_action', 'tab']
  });
  if (api.firefox) {
    api.context.add({
      title: chrome.i18n.getMessage('bg_options'),
      id: 'options',
      contexts: ['action', 'browser_action']
    });
  }
});
{
  const observe = async (info, tab) => {
    if (info.menuItemId === 'options') {
      chrome.runtime.openOptionsPage();
    }
    else if (info.menuItemId.startsWith('reload.every.')) {
      const period = info.menuItemId.replace('reload.every.', '');

      api.alarms.get(tab.id.toString()).then(alarm => messaging({
        method: 'search-for-profile-anyway',
        url: tab.url,
        alarm
      }, {}, r => {
        r.profile.period = period;
        console.log(r.profile);
        messaging({
          method: 'add-job',
          tab,
          profile: r.profile
        });
      }));
    }
    else if (info.menuItemId.startsWith('reload.')) {
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
    else if (info.menuItemId === 'no.reload') {
      messaging({
        'reason': 'user-request',
        'method': 'remove-job',
        'id': tab.id,
        'skip-echo': true
      });
    }
    else if (info.menuItemId === 'stop.all') {
      api.alarms.forEach(o => messaging({
        reason: 'context-stop-all',
        method: 'remove-job',
        id: Number(o.name.replace('job-', ''))
      }));
    }
    else if (info.menuItemId === 'restart') {
      chrome.runtime.reload();
    }
  };
  api.context.fired(observe);

  api.commands.fired((menuItemId, tab) => observe({
    menuItemId
  }, tab));
}

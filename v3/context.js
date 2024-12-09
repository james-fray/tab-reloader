/* global api, messaging */

api.runtime.started(() => {
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_every'),
    id: 'reload.every',
    contexts: ['action', 'tab']
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_every_10s'),
    id: 'reload.every.00:00:10',
    contexts: ['action', 'tab'],
    parentId: 'reload.every'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_every_30s'),
    id: 'reload.every.00:00:30',
    contexts: ['action', 'tab'],
    parentId: 'reload.every'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_every_1m'),
    id: 'reload.every.00:01:00',
    contexts: ['action', 'tab'],
    parentId: 'reload.every'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_every_5m'),
    id: 'reload.every.00:05:00',
    contexts: ['action', 'tab'],
    parentId: 'reload.every'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_every_15m'),
    id: 'reload.every.00:15:00',
    contexts: ['action', 'tab'],
    parentId: 'reload.every'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_every_1h'),
    id: 'reload.every.01:00:00',
    contexts: ['action', 'tab'],
    parentId: 'reload.every'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_tabs'),
    id: 'reload',
    contexts: ['action', 'tab']
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_all_tabs'),
    id: 'reload.all',
    contexts: ['action', 'tab'],
    parentId: 'reload'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_all_discarded'),
    id: 'reload.all.discarded',
    contexts: ['action', 'tab'],
    parentId: 'reload'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_window'),
    id: 'reload.window',
    contexts: ['action', 'tab'],
    parentId: 'reload'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_window_discarded'),
    id: 'reload.window.discarded',
    contexts: ['action', 'tab'],
    parentId: 'reload'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_tabs_left'),
    id: 'reload.tabs.left',
    contexts: ['action', 'tab'],
    parentId: 'reload'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_reload_tabs_right'),
    id: 'reload.tabs.right',
    contexts: ['action', 'tab'],
    parentId: 'reload'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_stop'),
    id: 'stop',
    contexts: ['action', 'tab']
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_no_reload'),
    id: 'no.reload',
    contexts: ['action', 'tab'],
    parentId: 'stop'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_stop_all'),
    id: 'stop.all',
    contexts: ['action', 'tab'],
    parentId: 'stop'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_csp'),
    id: 'csp',
    contexts: ['action', 'tab']
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_csp_remove'),
    id: 'csp.remove',
    contexts: ['action', 'tab'],
    parentId: 'csp'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_csp_reset'),
    id: 'csp.reset',
    contexts: ['action', 'tab'],
    parentId: 'csp'
  });
  api.context.add({
    contexts: ['action', 'tab'],
    type: 'separator'
  });
  api.context.add({
    title: chrome.i18n.getMessage('bg_restart'),
    id: 'restart',
    contexts: ['action', 'tab']
  });
  if (api.firefox) {
    api.context.add({
      title: chrome.i18n.getMessage('bg_options'),
      id: 'options',
      contexts: ['action']
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

        api.tabs.active().then(tabs => {
          messaging({
            method: 'add-jobs',
            tabs,
            profile: r.profile
          });
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
      api.tabs.active().then(tabs => {
        messaging({
          'reason': 'user-request',
          'method': 'remove-jobs',
          'ids': tabs.map(t => t.id),
          'skip-echo': true
        });
      });
    }
    else if (info.menuItemId === 'stop.all') {
      api.alarms.keys().then(names => {
        const ids = names.map(name => Number(name.replace('job-', '')));
        messaging({
          reason: 'context-stop-all',
          method: 'remove-jobs',
          ids
        });
      });
    }
    else if (info.menuItemId === 'restart') {
      chrome.runtime.reload();
    }
    else if (info.menuItemId === 'csp.remove') {
      if (tab.url.startsWith('http')) {
        let origin = tab.url.replace(/^https*/, '*');
        try {
          origin = '*://' + (new URL(tab.url)).hostname + '/';
        }
        catch (e) {}

        api.permissions.request({
          origins: [origin]
        }).then(async granted => {
          if (granted) {
            try {
              const [{result}] = await api.inject(tab.id, {
                world: 'MAIN',
                func: msg => {
                  return confirm(msg);
                },
                args: [chrome.i18n.getMessage('bg_msg_3')]
              });
              if (result === true) {
                await chrome.declarativeNetRequest.updateSessionRules({
                  removeRuleIds: [tab.id],
                  addRules: [{
                    id: tab.id,
                    action: {
                      type: 'modifyHeaders',
                      responseHeaders: [{
                        header: 'Content-Security-Policy',
                        operation: 'remove'
                      }]
                    },
                    condition: {
                      tabIds: [tab.id],
                      urlFilter: '*/*/*',
                      resourceTypes: ['main_frame']
                    }
                  }]
                });
              }
            }
            catch (e) {
              console.error(e);
              api.notify(tab.id, e);
            }
          }
          else {
            api.notify(tab.id, chrome.i18n.getMessage('bg_msg_2'));
          }
        }).catch(e => api.notify(tab.id, e));
      }
      else {
        api.notify(tab.id, chrome.i18n.getMessage('bg_msg_1'));
      }
    }
    else if (info.menuItemId === 'csp.reset') {
      chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [tab.id],
        addRules: []
      });
    }
  };
  api.context.fired(observe);

  api.commands.fired((menuItemId, tab) => observe({
    menuItemId
  }, tab));
}

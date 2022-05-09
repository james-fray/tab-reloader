const defaults = {};

defaults.profile = {
  'period': '00:05:00',
  'variation': 0,
  'current': false,
  'nofocus': false,
  'cache': false,
  'form': false,
  'offline': false,
  'discarded': false,
  'scroll-to-end': false,
  'switch': false,
  'sound': false,
  'sound-value': 1,
  'blocked-words': '',
  'blocked-period': '00:00:00 - 23:59:59',
  'code': false,
  'code-value': ''
};

defaults.presets = [
  {hh: 0, mm: 0, ss: 30},
  {hh: 0, mm: 5, ss: 0},
  {hh: 0, mm: 15, ss: 0},
  {hh: 0, mm: 30, ss: 0},
  {hh: 1, mm: 0, ss: 0},
  {hh: 5, mm: 0, ss: 0}
];

// how many profiles to keep
defaults['max-number-of-profiles'] = 50;

defaults['schedule-offset'] = 0;

defaults['badge-color'] = '#5e5e5e';

defaults['removed.jobs'] = 5 * 24 * 60 * 60 * 1000; // ms

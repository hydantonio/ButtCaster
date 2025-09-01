// server/tools/connector-selftest.js — v53
const pkg = require('buttplug');
console.log('buttplug keys:', Object.keys(pkg).slice(0,30));
console.log('Node connector present?',
  !!(pkg.ButtplugNodeWebsocketClientConnector));
console.log('Legacy connector present?',
  !!(pkg.ButtplugClientWebsocketConnector));
console.log('Browser connector present?',
  !!(pkg.ButtplugBrowserWebsocketClientConnector));

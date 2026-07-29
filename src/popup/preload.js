'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('standUpBuddy', {
  standing: () => ipcRenderer.send('popup-standing'),
  snooze: () => ipcRenderer.send('popup-snooze'),
});

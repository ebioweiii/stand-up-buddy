'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('standUpBuddy', {
  standing: () => ipcRenderer.send('popup-standing'),
  snooze: () => ipcRenderer.send('popup-snooze'),
  welcomeDismiss: () => ipcRenderer.send('popup-welcome-dismiss'),
  onShow: (callback) => ipcRenderer.on('popup-show', (_event, payload) => callback(payload)),
  onHide: (callback) => ipcRenderer.on('popup-hide', () => callback()),
});

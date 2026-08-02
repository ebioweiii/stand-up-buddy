'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('standUpBuddy', {
  standing: () => ipcRenderer.send('popup-standing'),
  imBack: () => ipcRenderer.send('popup-im-back'),
  snooze: () => ipcRenderer.send('popup-snooze'),
  welcomeDismiss: () => ipcRenderer.send('popup-welcome-dismiss'),
  quit: () => ipcRenderer.send('popup-quit-request'),
  onShow: (callback) => ipcRenderer.on('popup-show', (_event, payload) => callback(payload)),
  onHide: (callback) => ipcRenderer.on('popup-hide', () => callback()),
  onNudge: (callback) => ipcRenderer.on('popup-nudge', () => callback()),
  onMuteChanged: (callback) => ipcRenderer.on('popup-mute-changed', (_event, payload) => callback(payload)),
});

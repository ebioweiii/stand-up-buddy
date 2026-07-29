'use strict';

const { app, Tray, Menu, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { createTrayIcon } = require('./trayIcon');

const INTERVAL_CHOICES = [15, 30, 45, 60];
const SNOOZE_MINUTES = 5;
const POPUP_AUTO_DISMISS_MS = 2 * 60 * 1000;
const POPUP_WIDTH = 340;
const POPUP_HEIGHT = 300;
const POPUP_MARGIN = 20;

const store = new Store({
  defaults: {
    intervalMinutes: 30,
    paused: false,
  },
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let tray = null;
let popupWindow = null;
let timerHandle = null;
let autoDismissHandle = null;
let nextFireAt = null;

function minutesToMs(minutes) {
  return minutes * 60 * 1000;
}

function clearScheduledTimer() {
  if (timerHandle) {
    clearTimeout(timerHandle);
    timerHandle = null;
  }
  nextFireAt = null;
}

function scheduleNext(minutes) {
  clearScheduledTimer();
  if (store.get('paused')) return;
  nextFireAt = Date.now() + minutesToMs(minutes);
  timerHandle = setTimeout(showPopup, minutesToMs(minutes));
  refreshTrayMenu();
}

function getPopupPosition() {
  const display = screen.getPrimaryDisplay();
  const { x, y, width, height } = display.workArea;
  return {
    x: Math.round(x + width - POPUP_WIDTH - POPUP_MARGIN),
    y: Math.round(y + height - POPUP_HEIGHT - POPUP_MARGIN),
  };
}

function createPopupWindow() {
  const { x, y } = getPopupPosition();
  const win = new BrowserWindow({
    width: POPUP_WIDTH,
    height: POPUP_HEIGHT,
    x,
    y,
    frame: false,
    transparent: true,
    hasShadow: true,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'popup', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.setAlwaysOnTop(true, 'floating');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.loadFile(path.join(__dirname, 'popup', 'popup.html'));

  win.on('closed', () => {
    popupWindow = null;
  });

  return win;
}

function showPopup() {
  if (store.get('paused')) return;
  clearScheduledTimer();

  if (!popupWindow || popupWindow.isDestroyed()) {
    popupWindow = createPopupWindow();
  }
  const { x, y } = getPopupPosition();
  popupWindow.setPosition(x, y);
  popupWindow.once('ready-to-show', () => {
    popupWindow.showInactive();
  });
  if (!popupWindow.webContents.isLoading()) {
    popupWindow.showInactive();
  }

  if (autoDismissHandle) clearTimeout(autoDismissHandle);
  autoDismissHandle = setTimeout(() => {
    dismissPopup();
    scheduleNext(store.get('intervalMinutes'));
  }, POPUP_AUTO_DISMISS_MS);
}

function dismissPopup() {
  if (autoDismissHandle) {
    clearTimeout(autoDismissHandle);
    autoDismissHandle = null;
  }
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.hide();
  }
}

ipcMain.on('popup-standing', () => {
  dismissPopup();
  scheduleNext(store.get('intervalMinutes'));
});

ipcMain.on('popup-snooze', () => {
  dismissPopup();
  scheduleNext(SNOOZE_MINUTES);
});

function setPaused(paused) {
  store.set('paused', paused);
  if (paused) {
    clearScheduledTimer();
    dismissPopup();
  } else {
    scheduleNext(store.get('intervalMinutes'));
  }
  refreshTrayMenu();
  updateTrayIcon();
}

function setInterval_(minutes) {
  store.set('intervalMinutes', minutes);
  if (!store.get('paused')) {
    scheduleNext(minutes);
  } else {
    refreshTrayMenu();
  }
}

function updateTrayIcon() {
  if (!tray) return;
  tray.setImage(createTrayIcon({ paused: store.get('paused') }));
}

function formatCountdown() {
  if (store.get('paused') || !nextFireAt) return 'Reminders paused';
  const msLeft = Math.max(0, nextFireAt - Date.now());
  const mins = Math.floor(msLeft / 60000);
  const secs = Math.floor((msLeft % 60000) / 1000);
  return `Next reminder in ${mins}m ${secs.toString().padStart(2, '0')}s`;
}

function refreshTrayMenu() {
  if (!tray) return;
  const paused = store.get('paused');
  const currentInterval = store.get('intervalMinutes');

  const template = [
    { label: 'Stand Up Buddy', enabled: false },
    { label: formatCountdown(), enabled: false },
    { type: 'separator' },
    {
      label: paused ? 'Resume reminders' : 'Pause reminders',
      click: () => setPaused(!paused),
    },
    {
      label: 'Remind me every…',
      submenu: INTERVAL_CHOICES.map((minutes) => ({
        label: `${minutes} minutes`,
        type: 'radio',
        checked: currentInterval === minutes,
        click: () => setInterval_(minutes),
      })),
    },
    { type: 'separator' },
    {
      label: 'Stand up now',
      click: () => showPopup(),
    },
    { type: 'separator' },
    {
      label: 'Quit Stand Up Buddy',
      click: () => app.quit(),
    },
  ];

  tray.setContextMenu(Menu.buildFromTemplate(template));
  tray.setToolTip(`Stand Up Buddy — ${formatCountdown()}`);
}

function createTray() {
  tray = new Tray(createTrayIcon({ paused: store.get('paused') }));
  tray.setToolTip('Stand Up Buddy');
  refreshTrayMenu();

  // Keep the "next reminder in Xm" line reasonably fresh.
  setInterval(refreshTrayMenu, 30 * 1000);

  if (process.platform === 'darwin') {
    tray.on('click', () => tray.popUpContextMenu());
  }
}

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide();
  }
  createTray();
  scheduleNext(store.get('intervalMinutes'));
});

app.on('window-all-closed', (event) => {
  // This is a tray-resident background app; never quit when the popup closes.
  event.preventDefault();
});

app.on('before-quit', () => {
  clearScheduledTimer();
  if (autoDismissHandle) clearTimeout(autoDismissHandle);
});

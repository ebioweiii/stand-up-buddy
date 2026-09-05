'use strict';

const { app, Tray, Menu, BrowserWindow, screen, ipcMain, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');
const { createTrayIcon } = require('./trayIcon');

// The popup is shown via showInactive() (so it never steals focus), which
// means it never gets a user gesture — Chromium's default autoplay policy
// would otherwise leave the Web Audio context permanently suspended.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

const INTERVAL_CHOICES = [15, 30, 45, 60];
const SNOOZE_MINUTES = 5;
const AWAY_SOFT_NUDGE_MS = 10 * 60 * 1000;
const AWAY_HARD_NUDGE_MS = 60 * 60 * 1000;
const POPUP_AUTO_DISMISS_MS = 2 * 60 * 1000;
const POPUP_WIDTH = 340;
const POPUP_HEIGHT = 360;
const POPUP_MARGIN = 20;

const store = new Store({
  defaults: {
    intervalMinutes: 30,
    paused: false,
    muted: false,
  },
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let tray = null;
let popupWindow = null;
let timerHandle = null;
let autoDismissHandle = null;
let awayNudgeHandle = null;
let awayCheckInHandle = null;
let isAway = false;
let popupMinimized = false;
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
    movable: true,
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

// The popup window is created once and reused (hidden/shown) for every
// reminder, so 'ready-to-show'/DOMContentLoaded only ever fire on the very
// first show. Every subsequent presentation has to be pushed to the
// renderer explicitly, or the message and sound would only ever work once.
function presentPopup(mode) {
  popupMinimized = false;
  const intervalMinutes = store.get('intervalMinutes');
  const muted = store.get('muted');
  const send = () => popupWindow.webContents.send('popup-show', { mode, intervalMinutes, muted });
  if (popupWindow.webContents.isLoading()) {
    popupWindow.once('ready-to-show', () => {
      popupWindow.showInactive();
      send();
    });
  } else {
    popupWindow.showInactive();
    send();
  }
}

function showPopup(mode = 'reminder') {
  if (mode === 'reminder') {
    if (store.get('paused')) return;
    clearScheduledTimer();
  }

  if (!popupWindow || popupWindow.isDestroyed()) {
    popupWindow = createPopupWindow();
  }
  const { x, y } = getPopupPosition();
  popupWindow.setPosition(x, y);
  presentPopup(mode);

  if (autoDismissHandle) clearTimeout(autoDismissHandle);
  autoDismissHandle = setTimeout(() => {
    dismissPopup();
    if (mode === 'reminder') scheduleNext(store.get('intervalMinutes'));
  }, POPUP_AUTO_DISMISS_MS);
}

function dismissPopup() {
  popupMinimized = false;
  if (autoDismissHandle) {
    clearTimeout(autoDismissHandle);
    autoDismissHandle = null;
  }
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.webContents.send('popup-hide');
    popupWindow.hide();
  }
}

// Minimize just hides the window — unlike dismissPopup(), it doesn't touch
// the auto-dismiss timer, away state, or reschedule anything, so whatever
// was in progress (a reminder, the away countdown) keeps running exactly as
// if the popup were still on screen. The renderer stops its own alarm sound
// before calling this, so nothing keeps blaring from a hidden window.
function minimizePopup() {
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.hide();
    popupMinimized = true;
    refreshTrayMenu();
  }
}

function restorePopup() {
  if (popupWindow && !popupWindow.isDestroyed() && popupMinimized) {
    popupWindow.showInactive();
    popupMinimized = false;
    refreshTrayMenu();
  }
}

// Clicking "Standing!" doesn't dismiss the popup — it switches to an "away"
// state and waits for an explicit "I'm back" click before starting the next
// countdown, so the interval reflects time actually spent back at the desk,
// not time spent away. A quiet nudge plays after 10 minutes in case you
// forgot to click back in; if a full hour goes by, the popup forces itself
// back on screen (un-minimizing it if needed) and re-sounds the alarm, then
// keeps doing that every hour so it can't be silently forgotten forever.
function enterAwayMode() {
  isAway = true;
  popupMinimized = false;
  if (autoDismissHandle) {
    clearTimeout(autoDismissHandle);
    autoDismissHandle = null;
  }
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.webContents.send('popup-show', {
      mode: 'away',
      intervalMinutes: store.get('intervalMinutes'),
      muted: store.get('muted'),
    });
  }
  if (awayNudgeHandle) clearTimeout(awayNudgeHandle);
  awayNudgeHandle = setTimeout(() => {
    awayNudgeHandle = null;
    if (isAway && popupWindow && !popupWindow.isDestroyed()) {
      popupWindow.webContents.send('popup-nudge');
    }
  }, AWAY_SOFT_NUDGE_MS);

  if (awayCheckInHandle) clearInterval(awayCheckInHandle);
  awayCheckInHandle = setInterval(() => {
    if (!isAway || !popupWindow || popupWindow.isDestroyed()) return;
    popupMinimized = false;
    const { x, y } = getPopupPosition();
    popupWindow.setPosition(x, y);
    popupWindow.showInactive();
    popupWindow.webContents.send('popup-checkin');
    refreshTrayMenu();
  }, AWAY_HARD_NUDGE_MS);
}

function exitAwayMode() {
  isAway = false;
  if (awayNudgeHandle) {
    clearTimeout(awayNudgeHandle);
    awayNudgeHandle = null;
  }
  if (awayCheckInHandle) {
    clearInterval(awayCheckInHandle);
    awayCheckInHandle = null;
  }
}

ipcMain.on('popup-standing', () => {
  enterAwayMode();
});

ipcMain.on('popup-im-back', () => {
  exitAwayMode();
  dismissPopup();
  scheduleNext(store.get('intervalMinutes'));
});

ipcMain.on('popup-snooze', () => {
  dismissPopup();
  scheduleNext(SNOOZE_MINUTES);
});

ipcMain.on('popup-welcome-dismiss', () => {
  dismissPopup();
});

ipcMain.on('popup-minimize', () => {
  minimizePopup();
});

ipcMain.on('popup-quit-request', () => {
  const choice = dialog.showMessageBoxSync(popupWindow, {
    type: 'question',
    buttons: ['Quit', 'Cancel'],
    defaultId: 1,
    cancelId: 1,
    title: 'Quit Stand Up Buddy?',
    message: 'Quit Stand Up Buddy?',
    detail: "You won't get any more reminders until you reopen the app.",
  });
  if (choice === 0) app.quit();
});

// On macOS, Squirrel.Mac requires the running app and the downloaded update
// to share a real code-signing identity. Our build is only ad-hoc signed
// (see README), so installing the update will likely fail there until the
// app is notarized with a proper Apple Developer ID — the errors below are
// handled gracefully rather than left to surface as a crash.
let manualUpdateCheckPending = false;

function checkForUpdates(manual) {
  if (!app.isPackaged) {
    if (manual) {
      dialog.showMessageBox({
        type: 'info',
        title: 'Check for Updates',
        message: "Updates only work in the packaged app, not this dev build.",
      });
    }
    return;
  }
  manualUpdateCheckPending = manual;
  autoUpdater.checkForUpdates().catch((err) => {
    manualUpdateCheckPending = false;
    if (manual) {
      dialog.showMessageBox({
        type: 'error',
        title: "Couldn't check for updates",
        message: "Couldn't reach GitHub to check for updates.",
        detail: String(err && err.message ? err.message : err),
      });
    }
  });
}

autoUpdater.on('update-not-available', () => {
  if (manualUpdateCheckPending) {
    dialog.showMessageBox({
      type: 'info',
      title: 'Up to date',
      message: `You're on the latest version (${app.getVersion()}).`,
    });
  }
  manualUpdateCheckPending = false;
});

autoUpdater.on('error', (err) => {
  if (manualUpdateCheckPending) {
    const macNote = process.platform === 'darwin'
      ? "\n\nOn macOS, installing updates requires the app to be notarized. Until then, grab the latest version from the website instead."
      : '';
    dialog.showMessageBox({
      type: 'error',
      title: "Couldn't check for updates",
      message: "Couldn't check for updates right now.",
      detail: String(err && err.message ? err.message : err) + macNote,
    });
  }
  manualUpdateCheckPending = false;
});

autoUpdater.on('update-downloaded', (info) => {
  manualUpdateCheckPending = false;
  const choice = dialog.showMessageBoxSync({
    type: 'info',
    buttons: ['Restart Now', 'Later'],
    defaultId: 0,
    cancelId: 1,
    title: 'Update ready',
    message: `Stand Up Buddy ${info.version} is ready to install.`,
    detail: "Restart now to finish updating, or keep working — it'll install next time you quit.",
  });
  if (choice === 0) autoUpdater.quitAndInstall();
});

function setPaused(paused) {
  store.set('paused', paused);
  if (paused) {
    clearScheduledTimer();
    exitAwayMode();
    dismissPopup();
  } else {
    scheduleNext(store.get('intervalMinutes'));
  }
  refreshTrayMenu();
  updateTrayIcon();
}

function setMuted(muted) {
  store.set('muted', muted);
  refreshTrayMenu();
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.webContents.send('popup-mute-changed', { muted });
  }
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
  if (popupMinimized) return 'Reminder minimized — click "Show reminder"';
  if (isAway) return "Waiting for you to get back...";
  if (store.get('paused') || !nextFireAt) return 'Reminders paused';
  const msLeft = Math.max(0, nextFireAt - Date.now());
  const mins = Math.floor(msLeft / 60000);
  const secs = Math.floor((msLeft % 60000) / 1000);
  return `Next reminder in ${mins}m ${secs.toString().padStart(2, '0')}s`;
}

function refreshTrayMenu() {
  if (!tray) return;
  const paused = store.get('paused');
  const muted = store.get('muted');
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
      label: muted ? 'Unmute sound' : 'Mute sound',
      click: () => setMuted(!muted),
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
    ...(popupMinimized ? [{ label: 'Show reminder', click: () => restorePopup() }] : []),
    {
      label: 'Stand up now',
      click: () => showPopup(),
    },
    { type: 'separator' },
    {
      label: 'Check for Updates…',
      click: () => checkForUpdates(true),
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
    tray.on('click', () => {
      if (popupMinimized) {
        restorePopup();
      } else {
        tray.popUpContextMenu();
      }
    });
  }
}

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide();
  }
  createTray();
  scheduleNext(store.get('intervalMinutes'));
  showPopup('welcome');

  checkForUpdates(false);
  setInterval(() => checkForUpdates(false), 6 * 60 * 60 * 1000);
});

app.on('window-all-closed', (event) => {
  // This is a tray-resident background app; never quit when the popup closes.
  event.preventDefault();
});

app.on('before-quit', () => {
  clearScheduledTimer();
  if (autoDismissHandle) clearTimeout(autoDismissHandle);
  if (awayNudgeHandle) clearTimeout(awayNudgeHandle);
  if (awayCheckInHandle) clearInterval(awayCheckInHandle);
});

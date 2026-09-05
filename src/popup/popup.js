'use strict';

const REMINDER_MESSAGES = [
  'Time to stretch those legs, hero!',
  'Your chair called — it needs a break too.',
  'Rise up! Blood needs flowing, hero.',
  'Quick stand-up break, adventurer!',
];

const WELCOME_MESSAGES = [
  "Let's get started! I'll check in every {interval} minutes.",
  "Buddy's on duty — stretch breaks every {interval} min from now on.",
  "All set! I'll pop up every {interval} minutes to keep you moving.",
];

const AWAY_MESSAGES = [
  "Nice! Tap the button when you're back at your desk.",
  "Go get 'em! I'll be here when you're back.",
  "Enjoy the stretch — click below once you're back at work.",
];

const AWAY_CHECKIN_MESSAGES = [
  "Still going? It's been a while — tap the button when you're back.",
  "Checking in! Tap below whenever you're back at your desk.",
];

let audioCtx = null;
let blipLoopHandle = null;
let muted = false;

function getAudioContext() {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // The popup is shown via showInactive() and never gets a click, so the
  // context can otherwise get stuck 'suspended' under stricter autoplay
  // policies. Resuming is a no-op once it's already running.
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playBlipOnce() {
  if (muted) return;
  try {
    const ctx = getAudioContext();
    const notes = [660, 880, 1320]; // quick rising 8-bit arpeggio
    const noteLength = 0.07;
    const gap = 0.06;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;

      const startAt = ctx.currentTime + i * gap;
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.18, startAt + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + noteLength);

      osc.connect(gain).connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + noteLength + 0.02);
    });
  } catch (err) {
    // Audio is a nice-to-have; never block the popup on playback failure.
    console.warn('Could not play chiptune blip:', err);
  }
}

function startBlipLoop() {
  stopBlipLoop();
  if (muted) return;
  playBlipOnce();
  blipLoopHandle = setInterval(playBlipOnce, 1500);
}

function stopBlipLoop() {
  if (blipLoopHandle) {
    clearInterval(blipLoopHandle);
    blipLoopHandle = null;
  }
}

function initSprite() {
  const el = document.getElementById('buddy-sprite');
  const frames = ['idle', 'wave', 'cheer'];
  let i = 0;

  const applyFrame = (frame) => {
    el.style.boxShadow = window.BuddySprite.boxShadowForFrame(frame);
  };

  applyFrame('idle');
  setTimeout(() => applyFrame('wave'), 500);

  setInterval(() => {
    i = (i + 1) % frames.length;
    applyFrame(frames[i]);
  }, 1600);
}

function flashCheer() {
  document.getElementById('buddy-sprite').style.boxShadow =
    window.BuddySprite.boxShadowForFrame('cheer');
}

let awayCounterHandle = null;
let awayStartedAt = null;

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

function startAwayCounter() {
  stopAwayCounter();
  awayStartedAt = Date.now();
  const el = document.getElementById('away-counter');
  el.style.display = 'block';
  const tick = () => {
    el.textContent = `⏱ Standing for ${formatDuration(Date.now() - awayStartedAt)}`;
  };
  tick();
  awayCounterHandle = setInterval(tick, 1000);
}

function stopAwayCounter() {
  if (awayCounterHandle) {
    clearInterval(awayCounterHandle);
    awayCounterHandle = null;
  }
  document.getElementById('away-counter').style.display = 'none';
}

function pickMessage(mode, intervalMinutes) {
  if (mode === 'welcome') {
    const text = WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];
    return text.replace('{interval}', intervalMinutes ?? 30);
  }
  if (mode === 'away') {
    return AWAY_MESSAGES[Math.floor(Math.random() * AWAY_MESSAGES.length)];
  }
  return REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)];
}

function applyMode(mode, intervalMinutes) {
  const snoozeBtn = document.getElementById('btn-snooze');
  const standingBtn = document.getElementById('btn-standing');

  document.getElementById('message').textContent = pickMessage(mode, intervalMinutes);

  if (mode === 'welcome') {
    snoozeBtn.style.display = 'none';
    standingBtn.textContent = "Let's go! 👋";
    standingBtn.onclick = () => {
      stopBlipLoop();
      window.standUpBuddy.welcomeDismiss();
    };
    stopAwayCounter();
  } else if (mode === 'away') {
    snoozeBtn.style.display = 'none';
    standingBtn.textContent = "I'm back 👋";
    standingBtn.onclick = () => {
      stopBlipLoop();
      stopAwayCounter();
      window.standUpBuddy.imBack();
    };
    flashCheer();
    startAwayCounter();
  } else {
    snoozeBtn.style.display = '';
    standingBtn.textContent = 'Standing! 🎉';
    standingBtn.onclick = () => {
      stopBlipLoop();
      window.standUpBuddy.standing();
    };
    stopAwayCounter();
  }
}

function updateMuteButton() {
  const btn = document.getElementById('btn-mute');
  btn.textContent = muted ? '🔇' : '🔊';
  const label = muted ? 'Unmute sound' : 'Mute sound';
  btn.title = label;
  btn.setAttribute('aria-label', label);
}

function initButtons() {
  document.getElementById('btn-snooze').addEventListener('click', () => {
    stopBlipLoop();
    window.standUpBuddy.snooze();
  });
  document.getElementById('btn-quit').addEventListener('click', () => {
    window.standUpBuddy.quit();
  });
  document.getElementById('btn-minimize').addEventListener('click', () => {
    // Just get it out of the way — don't touch the reminder/away state at all.
    stopBlipLoop();
    window.standUpBuddy.minimize();
  });
  document.getElementById('btn-mute').addEventListener('click', () => {
    // Wait for main's broadcast to actually flip `muted`, keeping the tray
    // menu label and this button in sync from one source of truth.
    window.standUpBuddy.toggleMute();
  });
  // btn-standing's click handler is (re)assigned per mode in applyMode().
}

window.addEventListener('DOMContentLoaded', () => {
  initSprite();
  initButtons();

  updateMuteButton();

  window.standUpBuddy.onShow(({ mode, intervalMinutes, muted: initialMuted }) => {
    if (typeof initialMuted === 'boolean') muted = initialMuted;
    updateMuteButton();
    applyMode(mode, intervalMinutes);
    // Arriving into "away" mode is silent — the alarm already did its job.
    if (mode === 'away') {
      stopBlipLoop();
    } else {
      startBlipLoop();
    }
  });

  window.standUpBuddy.onHide(() => {
    stopBlipLoop();
    stopAwayCounter();
  });

  window.standUpBuddy.onNudge(() => {
    playBlipOnce();
  });

  window.standUpBuddy.onCheckIn(() => {
    document.getElementById('message').textContent =
      AWAY_CHECKIN_MESSAGES[Math.floor(Math.random() * AWAY_CHECKIN_MESSAGES.length)];
    startBlipLoop();
  });

  window.standUpBuddy.onMuteChanged(({ muted: newMuted }) => {
    muted = newMuted;
    updateMuteButton();
    if (muted) stopBlipLoop();
  });
});

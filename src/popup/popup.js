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

let audioCtx = null;
let blipLoopHandle = null;
let muted = false;

function getAudioContext() {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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
  } else if (mode === 'away') {
    snoozeBtn.style.display = 'none';
    standingBtn.textContent = "I'm back 👋";
    standingBtn.onclick = () => {
      stopBlipLoop();
      window.standUpBuddy.imBack();
    };
    flashCheer();
  } else {
    snoozeBtn.style.display = '';
    standingBtn.textContent = 'Standing! 🎉';
    standingBtn.onclick = () => {
      stopBlipLoop();
      window.standUpBuddy.standing();
    };
  }
}

function initButtons() {
  document.getElementById('btn-snooze').addEventListener('click', () => {
    stopBlipLoop();
    window.standUpBuddy.snooze();
  });
  document.getElementById('btn-quit').addEventListener('click', () => {
    window.standUpBuddy.quit();
  });
  // btn-standing's click handler is (re)assigned per mode in applyMode().
}

window.addEventListener('DOMContentLoaded', () => {
  initSprite();
  initButtons();

  window.standUpBuddy.onShow(({ mode, intervalMinutes, muted: initialMuted }) => {
    if (typeof initialMuted === 'boolean') muted = initialMuted;
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
  });

  window.standUpBuddy.onNudge(() => {
    playBlipOnce();
  });

  window.standUpBuddy.onMuteChanged(({ muted: newMuted }) => {
    muted = newMuted;
    if (muted) stopBlipLoop();
  });
});

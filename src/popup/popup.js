'use strict';

const MESSAGES = [
  'Time to stretch those legs, hero!',
  'Your chair called — it needs a break too.',
  'Rise up! Blood needs flowing, hero.',
  'Quick stand-up break, adventurer!',
];

function playChiptuneBlip() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
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

    setTimeout(() => ctx.close(), (notes.length * gap + noteLength + 0.3) * 1000);
  } catch (err) {
    // Audio is a nice-to-have; never block the popup on playback failure.
    console.warn('Could not play chiptune blip:', err);
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

function initMessage() {
  const el = document.getElementById('message');
  el.textContent = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
}

function initButtons() {
  document.getElementById('btn-standing').addEventListener('click', () => {
    window.standUpBuddy.standing();
  });
  document.getElementById('btn-snooze').addEventListener('click', () => {
    window.standUpBuddy.snooze();
  });
}

window.addEventListener('DOMContentLoaded', () => {
  initMessage();
  initSprite();
  initButtons();
  playChiptuneBlip();
});

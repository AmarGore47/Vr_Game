/**
 * main.js — Cross-Platform Mode Selection & VR Entry
 */

import { AUDIO } from './audio.js';

/* ── Floating particle animation ─────────────────────────────────────────── */
const container = document.getElementById('particles-container');
const COLORS = ['#7c3aed','#06b6d4','#a78bfa','#22d3ee','#f0abfc'];

for (let i = 0; i < 28; i++) {
  const el  = document.createElement('div');
  const sz  = Math.random() * 8 + 3;
  const col = COLORS[Math.floor(Math.random() * COLORS.length)];
  el.classList.add('particle');
  el.style.cssText = `
    width:${sz}px; height:${sz}px;
    left:${Math.random()*100}%;
    background:${col};
    box-shadow:0 0 ${sz*2}px ${col};
    animation-delay:${Math.random()*12}s;
    animation-duration:${Math.random()*10+8}s;
  `;
  container?.appendChild(el);
}

/* ── DOM References ───────────────────────────────────────────────────────── */
const enterVrBtn      = document.getElementById('btn-enter-vr');
const playMobileBtn   = document.getElementById('btn-play-mobile');
const playDesktopBtn  = document.getElementById('btn-play-desktop');
const notSupported    = document.getElementById('vr-not-supported');
const orientScreen    = document.getElementById('orientation-screen');
const nonvrOverlay    = document.getElementById('nonvr-overlay');
const modeBadge       = document.getElementById('mode-badge');
const touchHint       = document.getElementById('touch-drag-hint');
const resetLvlBtn     = document.getElementById('btn-reset-lvl');
const mainMenuBtn     = document.getElementById('btn-main-menu');
const gameCtrl        = document.getElementById('game-controller');

/* ── WebXR support check ──────────────────────────────────────────────────── */
(async () => {
  if (!navigator.xr) { showVRNotice('Meta Quest VR active in Quest Browser. Mobile & Desktop modes ready!'); return; }
  const ok = await navigator.xr.isSessionSupported('immersive-vr').catch(() => false);
  if (!ok) showVRNotice('Meta Quest VR active in Quest Browser. Mobile & Desktop modes ready!');
})();

function showVRNotice(msg) {
  if (notSupported) { notSupported.textContent = `ℹ️ ${msg}`; }
}

function getGameComponent() {
  return gameCtrl?.components?.['angry-birds-game'];
}

function hideOrientationScreen() {
  orientScreen.style.transition = 'opacity 0.6s ease';
  orientScreen.style.opacity    = '0';
  orientScreen.style.pointerEvents = 'none';
  setTimeout(() => { orientScreen.style.display = 'none'; }, 650);
}

function showOrientationScreen() {
  orientScreen.style.display     = 'flex';
  orientScreen.style.opacity     = '1';
  orientScreen.style.pointerEvents = 'auto';
  nonvrOverlay?.classList.remove('active');
}

/* ── 1. Enter VR Mode ─────────────────────────────────────────────────────── */
enterVrBtn?.addEventListener('click', () => {
  const scene = document.getElementById('main-scene');
  if (!scene) return;

  const gameComp = getGameComponent();
  if (gameComp) gameComp.setMode('vr');

  const doEnter = () => {
    if (scene.is('vr-mode')) return;
    scene.enterVR()
      .then(() => {
        hideOrientationScreen();
        nonvrOverlay?.classList.remove('active');
      })
      .catch(err => {
        console.error('[VR] enterVR failed:', err);
        alert(`VR Mode notice: ${err.message}. Switching to Desktop mode!`);
        startNonVRMode('desktop');
      });
  };

  if (scene.hasLoaded) doEnter();
  else scene.addEventListener('loaded', doEnter, { once: true });
});

/* ── 2 & 3. Start Non-VR Mode (Mobile & Desktop) ──────────────────────────── */
function startNonVRMode(mode) {
  AUDIO.init();
  AUDIO.resume();
  AUDIO.startBGM();

  hideOrientationScreen();

  const gameComp = getGameComponent();
  if (gameComp) {
    gameComp.setMode(mode);
  }

  if (nonvrOverlay) {
    nonvrOverlay.classList.add('active');
  }

  if (modeBadge) {
    modeBadge.textContent = mode === 'mobile' ? '📱 Mobile Mode' : '💻 Laptop / PC Mode';
  }

  const hotkeyBar = document.getElementById('desktop-hotkey-bar');
  if (hotkeyBar) {
    hotkeyBar.style.display = mode === 'desktop' ? 'block' : 'none';
  }

  if (touchHint) {
    touchHint.textContent = mode === 'mobile'
      ? '👇 Touch & Drag bird back to aim slingshot'
      : '🖱️ Click & Drag mouse down on screen to pull slingshot back & aim';
  }
}

playMobileBtn?.addEventListener('click', () => startNonVRMode('mobile'));
playDesktopBtn?.addEventListener('click', () => startNonVRMode('desktop'));

/* ── Quick Bird Selection Buttons ─────────────────────────────────────────── */
document.querySelectorAll('.bird-select-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const idx = parseInt(e.currentTarget.getAttribute('data-bird'), 10);
    const gameComp = getGameComponent();
    if (gameComp) gameComp.switchBird(idx);
  });
});

/* ── Overlay Action Buttons ────────────────────────────────────────────────── */
resetLvlBtn?.addEventListener('click', () => {
  const gameComp = getGameComponent();
  if (gameComp) gameComp.restartLevel();
});

mainMenuBtn?.addEventListener('click', () => {
  showOrientationScreen();
});

/* ── Exiting VR restores orientation screen ───────────────────────────────── */
document.getElementById('main-scene')?.addEventListener('exit-vr', () => {
  showOrientationScreen();
});

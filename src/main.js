/**
 * main.js — Orientation screen & VR entry
 * Kept intentionally simple for reliability.
 */

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

/* ── WebXR support check ──────────────────────────────────────────────────── */
const enterBtn        = document.getElementById('btn-enter-vr');
const notSupported    = document.getElementById('vr-not-supported');
const orientScreen    = document.getElementById('orientation-screen');

(async () => {
  if (!navigator.xr) { showNoVR('WebXR not available in this browser.'); return; }
  const ok = await navigator.xr.isSessionSupported('immersive-vr').catch(() => false);
  if (!ok) showNoVR('Immersive VR not supported. Open in Meta Quest Browser.');
})();

function showNoVR(msg) {
  if (enterBtn)     enterBtn.style.display    = 'none';
  if (notSupported) { notSupported.textContent = `⚠️ ${msg}`; notSupported.style.display = 'block'; }
}

/* ── Enter VR ─────────────────────────────────────────────────────────────── */
enterBtn?.addEventListener('click', () => {
  const scene = document.getElementById('main-scene');
  if (!scene) { showNoVR('Scene not found.'); return; }

  // If A-Frame hasn't finished loading yet, wait for it
  const doEnter = () => {
    if (scene.is('vr-mode')) return; // already in VR

    scene.enterVR()
      .then(() => {
        // Successfully entered VR — fade out orientation screen
        orientScreen.style.transition = 'opacity 0.7s ease';
        orientScreen.style.opacity    = '0';
        orientScreen.style.pointerEvents = 'none';
        setTimeout(() => { orientScreen.style.display = 'none'; }, 750);
      })
      .catch(err => {
        console.error('[VR] enterVR failed:', err);
        showNoVR(`Could not enter VR: ${err.message}`);
      });
  };

  if (scene.hasLoaded) {
    doEnter();
  } else {
    scene.addEventListener('loaded', doEnter, { once: true });
  }
});

/* ── Exiting VR restores orientation screen ───────────────────────────────── */
document.getElementById('main-scene')?.addEventListener('exit-vr', () => {
  orientScreen.style.display     = 'flex';
  orientScreen.style.opacity     = '1';
  orientScreen.style.pointerEvents = 'auto';
});

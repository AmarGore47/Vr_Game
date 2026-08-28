/**
 * effects.js
 * Reusable visual effects components:
 *  - impact-burst  : colored particle explosion on box hit
 *  - ball-trail    : fading comet trail behind a launched ball
 *  - launch-dust   : dust puff when slingshot fires
 */

/* ─────────────────────────────────────────────────────────────────────────────
   IMPACT BURST
   Call: EFFECTS.burst(worldPosition, color, count)
   ──────────────────────────────────────────────────────────────────────────── */
window.EFFECTS = {

  /**
   * Spawn `count` debris spheres that fly outward from `pos`.
   */
  burst(pos, color = '#ffcc00', count = 10) {
    const scene = document.querySelector('a-scene');
    if (!scene) return;

    for (let i = 0; i < count; i++) {
      const p = document.createElement('a-sphere');
      const size  = Math.random() * 0.06 + 0.02;
      const speed = Math.random() * 3 + 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.random() * Math.PI;
      const vx = Math.sin(phi) * Math.cos(theta) * speed;
      const vy = Math.abs(Math.cos(phi)) * speed + 1.5; // bias upward
      const vz = Math.sin(phi) * Math.sin(theta) * speed;

      // Choose from palette for variety
      const palette = ['#ef4444','#f97316','#facc15','#4ade80','#60a5fa',color];
      const c = palette[Math.floor(Math.random() * palette.length)];

      p.setAttribute('radius', size);
      p.setAttribute('color',  c);
      p.setAttribute('position', pos);
      p.setAttribute('dynamic-body', `mass: 0.05; linearDamping: 0.3;`);
      p.setAttribute('material', `emissive: ${c}; emissiveIntensity: 0.5; roughness: 0.8`);
      p.setAttribute('shadow', 'cast: true');
      scene.appendChild(p);

      // Apply velocity immediately after physics body is ready
      setTimeout(() => {
        const body = p.components?.['dynamic-body']?.body;
        if (body) {
          body.velocity.set(vx, vy, vz);
          body.wakeUp();
        }
      }, 30);

      // Remove after 3 seconds
      setTimeout(() => {
        if (p.parentNode) p.parentNode.removeChild(p);
      }, 3000);
    }
  },

  /**
   * Spawn a dust-puff ring at `pos` — used on launch.
   */
  dustPuff(pos) {
    const scene = document.querySelector('a-scene');
    if (!scene) return;

    for (let i = 0; i < 8; i++) {
      const p = document.createElement('a-sphere');
      const angle = (i / 8) * Math.PI * 2;
      const r = Math.random() * 0.05 + 0.02;

      p.setAttribute('radius', r);
      p.setAttribute('position', {
        x: pos.x + Math.cos(angle) * 0.05,
        y: pos.y,
        z: pos.z + Math.sin(angle) * 0.05
      });
      p.setAttribute('material',
        'color: #d4b483; opacity: 0.7; transparent: true; ' +
        'emissive: #c4a47c; emissiveIntensity: 0.2;');

      scene.appendChild(p);

      // Animate outward + fade
      let elapsed = 0;
      const tick = setInterval(() => {
        elapsed += 60;
        const t = elapsed / 700;
        const x = pos.x + Math.cos(angle) * t * 0.4;
        const y = pos.y + t * 0.3;
        const z = pos.z + Math.sin(angle) * t * 0.4;
        p.setAttribute('position', { x, y, z });
        p.setAttribute('radius', r * (1 + t));
        p.setAttribute('material',
          `color: #d4b483; opacity: ${0.7 * (1 - t)}; transparent: true;`);
        if (t >= 1) {
          clearInterval(tick);
          if (p.parentNode) p.parentNode.removeChild(p);
        }
      }, 60);
    }
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   BALL TRAIL
   Attach to the active ball: <a-sphere ball-trail>
   ──────────────────────────────────────────────────────────────────────────── */
AFRAME.registerComponent('ball-trail', {
  schema: {
    active:    { type: 'boolean', default: false },
    color:     { type: 'color',   default: '#a78bfa' },
    maxDots:   { type: 'int',     default: 18 },
    interval:  { type: 'int',     default: 30 }, // ms between dots
  },

  init() {
    this.dots      = [];
    this.lastTime  = 0;
    this.tempPos   = new THREE.Vector3();
  },

  tick(time) {
    if (!this.data.active) return;
    if (time - this.lastTime < this.data.interval) return;
    this.lastTime = time;

    this.el.object3D.getWorldPosition(this.tempPos);
    const dot = document.createElement('a-sphere');
    dot.setAttribute('radius', 0.025);
    dot.setAttribute('color',  this.data.color);
    dot.setAttribute('position', {
      x: this.tempPos.x,
      y: this.tempPos.y,
      z: this.tempPos.z
    });
    dot.setAttribute('material',
      `color: ${this.data.color}; emissive: ${this.data.color}; ` +
      `emissiveIntensity: 0.8; opacity: 0.8; transparent: true; shader: flat;`);
    this.el.sceneEl.appendChild(dot);
    this.dots.push({ el: dot, born: time });

    // Fade and remove old dots
    for (let i = this.dots.length - 1; i >= 0; i--) {
      const d   = this.dots[i];
      const age = time - d.born;
      const maxAge = this.data.maxDots * this.data.interval;
      if (age > maxAge) {
        if (d.el.parentNode) d.el.parentNode.removeChild(d.el);
        this.dots.splice(i, 1);
      } else {
        const t = age / maxAge;
        const s = (1 - t) * 0.025;
        d.el.setAttribute('radius', Math.max(s, 0.003));
        d.el.setAttribute('material',
          `color: ${this.data.color}; emissive: ${this.data.color}; ` +
          `emissiveIntensity: ${0.8 * (1-t)}; opacity: ${0.8 * (1-t)}; transparent: true; shader: flat;`);
      }
    }
  },

  clearTrail() {
    this.dots.forEach(d => { if (d.el.parentNode) d.el.parentNode.removeChild(d.el); });
    this.dots = [];
  },

  remove() { this.clearTrail(); }
});

/**
 * target-spawner.js
 * A-Frame component that builds a stack of physics-enabled wooden boxes
 * at the target zone and detects when all boxes have been knocked down.
 */

AFRAME.registerComponent('target-spawner', {
  schema: {
    rows:    { type: 'int',    default: 3 },
    cols:    { type: 'int',    default: 3 },
    layers:  { type: 'int',    default: 2 },
    boxSize: { type: 'number', default: 0.28 },
    gap:     { type: 'number', default: 0.01 },
  },

  init() {
    this.boxes        = [];
    this.knockedCount = 0;
    this.totalBoxes   = 0;
    this.resetTimer   = null;

    // Build once scene is loaded
    this.el.sceneEl.addEventListener('loaded', () => {
      this.spawnBoxes();
    });
  },

  /**
   * Procedurally spawn a grid of boxes at the target location.
   */
  spawnBoxes() {
    // Clear old boxes
    this.boxes.forEach(b => b.parentNode && b.parentNode.removeChild(b));
    this.boxes        = [];
    this.knockedCount = 0;

    const { rows, cols, layers, boxSize, gap } = this.data;
    const step = boxSize + gap;

    // Platform base (static, not a physics object)
    const platform = document.createElement('a-box');
    platform.setAttribute('static-body', '');
    platform.setAttribute('width',  (cols * step) + 0.2);
    platform.setAttribute('height', 0.08);
    platform.setAttribute('depth',  (rows * step) + 0.2);
    platform.setAttribute('position', {
      x: 0,
      y: 0.04,
      z: 0
    });
    platform.setAttribute('color', '#5c4033');
    platform.setAttribute('shadow', 'receive: true; cast: true');
    this.el.appendChild(platform);

    for (let layer = 0; layer < layers; layer++) {
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const box = this.createBox(layer, row, col, step, boxSize);
          this.el.appendChild(box);
          this.boxes.push(box);
        }
      }
    }

    this.totalBoxes = this.boxes.length;
    console.log(`[target-spawner] Spawned ${this.totalBoxes} boxes.`);
  },

  createBox(layer, row, col, step, size) {
    const box = document.createElement('a-box');

    // Alternate layer orientations for stability
    const isOdd = layer % 2 === 1;
    const x = (col - (this.data.cols - 1) / 2) * step * (isOdd ? -1 : 1);
    const y = 0.08 + (size / 2) + layer * (size + 0.005);
    const z = (row - (this.data.rows - 1) / 2) * step;

    box.setAttribute('dynamic-body', `mass: 2; linearDamping: 0.05; angularDamping: 0.1;`);
    box.setAttribute('width',  size);
    box.setAttribute('height', size);
    box.setAttribute('depth',  size);
    box.setAttribute('position', { x, y, z });
    box.setAttribute('shadow', 'cast: true; receive: true');

    // Visual variety: cycle through wood/stone/metal colours
    const palette = ['#c8a26e', '#a0856e', '#8b7355', '#9e8b72', '#b5956a'];
    box.setAttribute('color', palette[Math.floor(Math.random() * palette.length)]);
    box.setAttribute('roughness', '0.8');

    // Listen for collision to mark knocked
    box.addEventListener('collide', (evt) => this.onBoxHit(box, evt), { once: false });

    // Tag so slingshot mechanic can detect hits
    box.dataset.isTarget = 'true';
    box.dataset.knocked  = 'false';

    return box;
  },

  /**
   * Called each time a box participates in a collision.
   * Marks it knocked if moving fast enough, triggers effects.
   */
  onBoxHit(box, evt) {
    if (box.dataset.knocked === 'true') return;

    const body = box.components?.['dynamic-body']?.body || box.body;
    if (!body) return;

    const vel   = body.velocity;
    const speed = Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2);

    if (speed > 0.8) {
      box.dataset.knocked = 'true';
      this.knockedCount++;

      // Get world position for effects
      const pos = new THREE.Vector3();
      box.object3D.getWorldPosition(pos);

      // Vivid hit color ramp
      const hitColors = ['#ef4444','#f97316','#facc15','#a78bfa','#60a5fa'];
      const hitColor  = hitColors[this.knockedCount % hitColors.length];

      // Flash + tint
      box.setAttribute('color', hitColor);
      box.setAttribute('material',
        `color: ${hitColor}; emissive: ${hitColor}; emissiveIntensity: 0.4; roughness: 0.7;`);

      // Particle explosion
      if (window.EFFECTS) {
        window.EFFECTS.burst({ x: pos.x, y: pos.y + 0.1, z: pos.z }, hitColor, 12);
      }

      // Score: bonus for fast impacts
      const pts = speed > 3 ? 20 : 10;
      if (window.GameHUD) window.GameHUD.addScore(pts);

      console.log(`[target-spawner] 💥 ${this.knockedCount}/${this.totalBoxes} speed=${speed.toFixed(1)} +${pts}pts`);

      if (this.knockedCount >= this.totalBoxes) this.onRoundComplete();
    }
  },


  onRoundComplete() {
    console.log('[target-spawner] All boxes knocked! Round complete.');

    const banner = document.getElementById('round-banner');
    if (banner) banner.setAttribute('visible', true);

    // Reset after 4 seconds
    clearTimeout(this.resetTimer);
    this.resetTimer = setTimeout(() => {
      if (banner) banner.setAttribute('visible', false);
      this.spawnBoxes();
      if (window.GameHUD) window.GameHUD.reset();
      // Signal ball manager to reload
      document.getElementById('game-controller')
              ?.components['ball-manager']?.reload();
    }, 4000);
  },

  remove() {
    clearTimeout(this.resetTimer);
    this.boxes.forEach(b => b.parentNode && b.parentNode.removeChild(b));
  }
});

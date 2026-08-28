/**
 * ball-manager.js
 * A-Frame component that cycles through different ball types and
 * resets/reloads the active ball into the slingshot.
 *
 * Ball types:
 *   standard  – medium mass, slight glow, purple
 *   heavy     – high mass, orange, slower but devastating
 *   bouncy    – low mass, high restitution, green
 */

const BALL_TYPES = {
  standard: {
    mass:        1.0,
    radius:      0.06,
    color:       '#a78bfa',
    emissive:    '#7c3aed',
    metalness:   0.1,
    roughness:   0.4,
    restitution: 0.3,
    label:       'Standard'
  },
  heavy: {
    mass:        4.0,
    radius:      0.075,
    color:       '#f97316',
    emissive:    '#9a3412',
    metalness:   0.6,
    roughness:   0.2,
    restitution: 0.05,
    label:       'Heavy Iron'
  },
  bouncy: {
    mass:        0.5,
    radius:      0.065,
    color:       '#22c55e',
    emissive:    '#14532d',
    metalness:   0.0,
    roughness:   0.8,
    restitution: 0.85,
    label:       'Bouncy Rubber'
  }
};

const TYPE_ORDER = ['standard', 'heavy', 'bouncy'];

AFRAME.registerComponent('ball-manager', {
  init() {
    this.currentTypeIndex = 0;
    this.ballEl = document.getElementById('active-ball');

    // Apply the first ball type on init
    this.applyBallType(TYPE_ORDER[this.currentTypeIndex]);
  },

  /**
   * Apply physics + visual properties for a given ball type key.
   */
  applyBallType(typeKey) {
    const def = BALL_TYPES[typeKey];
    if (!def || !this.ballEl) return;

    // ── Visuals only — slingshot-mechanic manages physics body ──
    this.ballEl.setAttribute('radius', def.radius);
    this.ballEl.setAttribute('material', {
      color:             def.color,
      emissive:          def.emissive,
      emissiveIntensity: 0.25,
      metalness:         def.metalness,
      roughness:         def.roughness
    });

    // Store for slingshot mechanic to read at launch time
    this.ballEl._restitution  = def.restitution;
    this.ballEl.dataset.ballType = typeKey;

    // Update in-world HUD
    const indicator = document.getElementById('ball-type-display');
    if (indicator) {
      indicator.setAttribute('text',
        `value: ● ${def.label}; align: left; color: ${def.color}; width: 1.8; wrapCount: 20;`);
    }

    console.log(`[ball-manager] 🎱 Ball type → ${def.label} (mass: ${def.mass})`);
  },

  /**
   * Cycle to the next ball type.
   * Called after each shot by slingshot-mechanic.
   */
  nextType() {
    this.currentTypeIndex = (this.currentTypeIndex + 1) % TYPE_ORDER.length;
    this.applyBallType(TYPE_ORDER[this.currentTypeIndex]);
  },

  /**
   * Return ball to slingshot anchor and zero out its velocity.
   * Uses the anchor entity's world position directly — always accurate.
   */
  reload() {
    const anchor = document.getElementById('ball-anchor');
    if (!this.ballEl) return;

    // Reset physics body velocity
    const body = this.ballEl.components['dynamic-body']?.body;
    if (body) {
      body.velocity.set(0, 0, 0);
      body.angularVelocity.set(0, 0, 0);
      body.force.set(0, 0, 0);
    }

    // Use the anchor entity's world position (the invisible sphere in the slingshot fork)
    const anchorPos = new THREE.Vector3();
    if (anchor) {
      anchor.object3D.getWorldPosition(anchorPos);
    } else {
      // Fallback: compute from slingshot entity
      document.getElementById('slingshot').object3D.getWorldPosition(anchorPos);
      anchorPos.y += 0.32;
    }

    this.ballEl.setAttribute('position', {
      x: anchorPos.x,
      y: anchorPos.y,
      z: anchorPos.z
    });

    // Advance to next ball type
    this.nextType();

    console.log('[ball-manager] 🔄 Ball reloaded into slingshot at', anchorPos);
  }
});

/**
 * slingshot-mechanic.js
 *
 * ── Physics strategy (the only reliable approach) ──────────────────────────
 *
 *  IDLE   : Ball has NO physics component — it is just a floating mesh sitting
 *           at the slingshot anchor. A-Frame position attribute controls it.
 *
 *  GRABBED: Player is pinching and pulling. We just call
 *           ballEl.setAttribute('position', newPos) every frame — no physics
 *           body to fight against.
 *
 *  LAUNCH : We calculate the velocity vector FIRST, then call
 *           ballEl.setAttribute('dynamic-body', ...) to create a fresh Cannon
 *           body at the ball's current position, then apply the velocity once
 *           the body is confirmed ready (retry loop). Physics takes over and
 *           the ball flies to the targets and collides.
 *
 *  RELOAD : removeAttribute('dynamic-body') destroys the body, we snap the
 *           ball back to the anchor, apply next ball type visuals, idle again.
 * ───────────────────────────────────────────────────────────────────────────
 */

const PINCH_THRESHOLD   = 0.045; // metres — thumb to index = pinched
const MAX_PULL_DISTANCE = 0.50;  // metres — max elastic stretch
const LAUNCH_MULTIPLIER = 22;    // velocity = pullDistance * multiplier
const MIN_POWER         = 8;     // minimum m/s even on tiny pull
const RELOAD_DELAY_MS   = 2500;  // ms before next ball appears
const GRAB_RADIUS       = 0.18;  // metres — grab detection sphere

// Per-type mass (used when adding dynamic-body at launch)
const BALL_MASS = { standard: 1.0, heavy: 5.0, bouncy: 0.4 };

AFRAME.registerComponent('slingshot-mechanic', {
  init() {
    this.state = 'idle'; // 'idle' | 'grabbed' | 'launched'

    // Pinch state tracked both via events AND bone distance
    this.pinchR = false;
    this.pinchL = false;

    // Reused THREE vectors (avoid GC)
    this.anchorW = new THREE.Vector3();
    this.ballW   = new THREE.Vector3();
    this.handW   = new THREE.Vector3();
    this.pullV   = new THREE.Vector3();
    this.launchV = new THREE.Vector3();
    this.thumbP  = new THREE.Vector3();
    this.indexP  = new THREE.Vector3();

    // DOM refs (filled on scene load)
    this.ballEl       = null;
    this.anchorEl     = null;
    this.bandLeft     = null;
    this.bandRight    = null;
    this.ballMgr      = null;

    this.el.sceneEl.addEventListener('loaded', () => this.onSceneLoaded());
  },

  // ── Scene ready ───────────────────────────────────────────────────────────
  onSceneLoaded() {
    this.ballEl    = document.getElementById('active-ball');
    this.anchorEl  = document.getElementById('ball-anchor');
    this.bandLeft  = document.getElementById('band-left');
    this.bandRight = document.getElementById('band-right');
    this.ballMgr   = document.getElementById('game-controller')?.components['ball-manager'];

    if (this.ballEl) {
      // Ensure no physics component exists at start — ball is just a mesh
      this.ballEl.removeAttribute('dynamic-body');
      this.ballEl.removeAttribute('static-body');
      // Attach trail component (inactive)
      this.ballEl.setAttribute('ball-trail', 'active: false; color: #a78bfa;');
    }

    this.attachPinchEvents();
    this.snapToAnchor();
    console.log('[slingshot] ✅ Scene ready — ball is a free mesh at anchor.');
  },

  // ── Pinch events ─────────────────────────────────────────────────────────
  attachPinchEvents() {
    const R = document.getElementById('right-hand');
    const L = document.getElementById('left-hand');
    if (R) {
      R.addEventListener('pinchstarted', () => { this.pinchR = true;  });
      R.addEventListener('pinchended',   () => { this.pinchR = false; });
    }
    if (L) {
      L.addEventListener('pinchstarted', () => { this.pinchL = true;  });
      L.addEventListener('pinchended',   () => { this.pinchL = false; });
    }
  },

  // ── Per-frame tick ────────────────────────────────────────────────────────
  tick() {
    if (!this.ballEl || !this.anchorEl) return;
    if (this.state === 'launched') return; // ball is in flight — physics owns it

    const R = document.getElementById('right-hand');
    const L = document.getElementById('left-hand');

    // Combine event-based + bone-distance pinch detection
    const rBone = this.getBonePinchDist(R);
    const lBone = this.getBonePinchDist(L);
    const rPin  = this.pinchR || (rBone !== null && rBone < PINCH_THRESHOLD);
    const lPin  = this.pinchL || (lBone !== null && lBone < PINCH_THRESHOLD);
    const domHand = rPin ? 'right' : (lPin ? 'left' : null);
    const handEl  = domHand === 'right' ? R : L;

    switch (this.state) {
      case 'idle':
        // Ball just sits at anchor as a mesh — nothing to do physics-wise
        if (domHand && handEl) this.tryGrab(handEl);
        break;

      case 'grabbed':
        if (!domHand) {
          // Pinch released → FIRE
          this.launch();
        } else if (handEl) {
          this.dragBall(handEl);
        }
        break;
    }
  },

  // ── Grab detection ────────────────────────────────────────────────────────
  tryGrab(handEl) {
    this.getPinchCenter(handEl, this.handW);
    this.ballEl.object3D.getWorldPosition(this.ballW);
    const dist = this.handW.distanceTo(this.ballW);

    if (dist < GRAB_RADIUS) {
      this.state = 'grabbed';
      this.ballEl.setAttribute('ball-trail', 'active: false');
      console.log(`[slingshot] ✊ Grabbed (dist=${dist.toFixed(3)}m). Pull back to aim!`);
    }
  },

  // ── Pull / drag ───────────────────────────────────────────────────────────
  dragBall(handEl) {
    this.getPinchCenter(handEl, this.handW);
    this.anchorEl.object3D.getWorldPosition(this.anchorW);

    // Vector from anchor to hand
    this.pullV.copy(this.handW).sub(this.anchorW);
    const rawDist  = this.pullV.length();
    if (rawDist < 0.005) return; // ignore micro-jitter

    const pullDist = Math.min(rawDist, MAX_PULL_DISTANCE);
    this.pullV.normalize().multiplyScalar(pullDist);

    const newPos = this.anchorW.clone().add(this.pullV);

    // Simply set the A-Frame position — no physics body to fight against ✓
    this.ballEl.setAttribute('position', { x: newPos.x, y: newPos.y, z: newPos.z });

    this.updateBands(newPos, pullDist);
  },

  // ── Launch ────────────────────────────────────────────────────────────────
  launch() {
    this.state = 'launched';

    // 1. Capture positions BEFORE adding physics
    this.anchorEl.object3D.getWorldPosition(this.anchorW);
    this.ballEl.object3D.getWorldPosition(this.ballW);

    // 2. Velocity = direction(ball → anchor) × power + upward arc
    this.launchV.copy(this.anchorW).sub(this.ballW);
    const pullDist = Math.max(this.launchV.length(), 0.01);
    const power    = Math.max(pullDist * LAUNCH_MULTIPLIER, MIN_POWER);
    this.launchV.normalize();

    const vx = this.launchV.x * power;
    const vy = this.launchV.y * power + 3.0; // slight upward parabola
    const vz = this.launchV.z * power;

    console.log(`[slingshot] 🚀 FIRE! pull=${pullDist.toFixed(3)}m power=${power.toFixed(1)} vel=(${vx.toFixed(1)},${vy.toFixed(1)},${vz.toFixed(1)})`);

    // 3. Determine mass from current ball type
    const ballType = this.ballEl.dataset.ballType || 'standard';
    const mass     = BALL_MASS[ballType] || 1;

    // 4. Add dynamic-body AT the ball's current world position
    //    aframe-physics-system will create a Cannon.js body here.
    this.ballEl.setAttribute('dynamic-body',
      `mass: ${mass}; linearDamping: 0.02; angularDamping: 0.02;`);

    // 5. Apply velocity once the body is confirmed ready (retry loop)
    //    The body may take 1-3 animation frames to initialise.
    const applyVelocity = (attempt = 0) => {
      const body = this.ballEl?.components['dynamic-body']?.body;
      if (body) {
        body.wakeUp();
        body.velocity.set(vx, vy, vz);
        body.angularVelocity.set(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8
        );
        console.log(`[slingshot] ✅ Velocity applied (attempt ${attempt + 1})`);
      } else if (attempt < 15) {
        // Body not ready yet — retry in 30 ms
        setTimeout(() => applyVelocity(attempt + 1), 30);
      } else {
        console.error('[slingshot] ❌ Physics body never became ready! Is aframe-physics-system loaded?');
      }
    };
    setTimeout(() => applyVelocity(), 30);

    // 6. Visual effects
    const launchPos = { x: this.ballW.x, y: this.ballW.y, z: this.ballW.z };
    if (window.EFFECTS) window.EFFECTS.dustPuff(launchPos);

    const trailColors = { standard: '#a78bfa', heavy: '#f97316', bouncy: '#22c55e' };
    const tc = trailColors[ballType] || '#a78bfa';
    this.ballEl.setAttribute('ball-trail', `active: true; color: ${tc};`);
    this.ballEl.setAttribute('material',
      `emissive: ${tc}; emissiveIntensity: 0.9; roughness: 0.4; metalness: 0.1;`);

    this.resetBands();
    if (window.GameHUD) window.GameHUD.useBall();

    // 7. Auto-reload
    setTimeout(() => this.reloadBall(), RELOAD_DELAY_MS);
  },

  // ── Reload ────────────────────────────────────────────────────────────────
  reloadBall() {
    // Destroy physics body — ball returns to being a simple mesh
    this.ballEl?.removeAttribute('dynamic-body');

    // Stop trail
    const trailComp = this.ballEl?.components?.['ball-trail'];
    if (trailComp) {
      this.ballEl.setAttribute('ball-trail', 'active: false');
      trailComp.clearTrail?.();
    }

    // Apply next ball-type visuals and move to anchor
    if (!this.ballMgr) {
      this.ballMgr = document.getElementById('game-controller')?.components['ball-manager'];
    }
    this.ballMgr?.reload();

    // Safety snap — in case reload timing is off
    setTimeout(() => this.snapToAnchor(), 80);

    this.state = 'idle';
    console.log('[slingshot] 🔄 Reloaded — ready for next shot!');
  },

  // ── Helpers ───────────────────────────────────────────────────────────────
  snapToAnchor() {
    if (!this.anchorEl || !this.ballEl) return;
    const p = new THREE.Vector3();
    this.anchorEl.object3D.getWorldPosition(p);
    this.ballEl.setAttribute('position', { x: p.x, y: p.y, z: p.z });
  },

  getBonePinchDist(handEl) {
    if (!handEl) return null;
    const htc = handEl.components?.['hand-tracking-controls'];
    if (!htc?.bones || htc.bones.length < 9) return null;
    const t = htc.bones[4]; // thumb tip
    const i = htc.bones[8]; // index tip
    if (!t || !i) return null;
    t.getWorldPosition(this.thumbP);
    i.getWorldPosition(this.indexP);
    return this.thumbP.distanceTo(this.indexP);
  },

  getPinchCenter(handEl, out) {
    const htc = handEl?.components?.['hand-tracking-controls'];
    if (htc?.bones && htc.bones.length >= 9 && htc.bones[4] && htc.bones[8]) {
      htc.bones[4].getWorldPosition(this.thumbP);
      htc.bones[8].getWorldPosition(this.indexP);
      out.copy(this.thumbP).add(this.indexP).multiplyScalar(0.5);
    } else {
      // Fallback: wrist/hand entity world position
      handEl?.object3D.getWorldPosition(out);
    }
  },

  // ── Elastic bands ─────────────────────────────────────────────────────────
  updateBands(ballWorldPos, pullDist) {
    if (!this.bandLeft || !this.bandRight) return;

    const sObj = document.getElementById('slingshot').object3D;
    sObj.updateMatrixWorld(true);

    const lFork = new THREE.Vector3(-0.135, 0.40, 0).applyMatrix4(sObj.matrixWorld);
    const rFork = new THREE.Vector3( 0.135, 0.40, 0).applyMatrix4(sObj.matrixWorld);

    const setBand = (bandEl, from, to) => {
      const mid = from.clone().add(to).multiplyScalar(0.5);
      const len = from.distanceTo(to);
      if (len < 0.001) return;

      // Orient cylinder from→to
      const dir  = to.clone().sub(from).normalize();
      const up   = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      const euler = new THREE.Euler().setFromQuaternion(quat, 'XYZ');

      // Convert to slingshot local space for the attribute
      const localMid = sObj.worldToLocal(mid.clone());
      bandEl.setAttribute('position', localMid);
      bandEl.setAttribute('height', len);
      bandEl.setAttribute('rotation', {
        x: THREE.MathUtils.radToDeg(euler.x),
        y: THREE.MathUtils.radToDeg(euler.y),
        z: THREE.MathUtils.radToDeg(euler.z)
      });

      // Color ramp: purple (relaxed) → red (max stretch)
      const t = Math.min(pullDist / MAX_PULL_DISTANCE, 1);
      const r = Math.round(80  + t * 175);
      const g = Math.round(0   + t * 30  * (1 - t));
      const b = Math.round(180 * (1 - t));
      const hex = `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
      bandEl.setAttribute('color', hex);
      bandEl.setAttribute('material',
        `emissive: ${hex}; emissiveIntensity: ${(0.3 + t * 0.9).toFixed(2)};`);
    };

    setBand(this.bandLeft,  lFork, ballWorldPos);
    setBand(this.bandRight, rFork, ballWorldPos);
  },

  resetBands() {
    const defaults = [
      { el: this.bandLeft,  pos: '-0.07 0.30 0', rot: '0 0 45'  },
      { el: this.bandRight, pos: '0.07 0.30 0',  rot: '0 0 -45' }
    ];
    defaults.forEach(({ el, pos, rot }) => {
      if (!el) return;
      el.setAttribute('position', pos);
      el.setAttribute('rotation', rot);
      el.setAttribute('height',   '0.24');
      el.setAttribute('color',    '#1a1a2e');
      el.setAttribute('material', 'emissive: #4a0080; emissiveIntensity: 0.4;');
    });
  }
});

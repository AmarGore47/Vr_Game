/**
 * game.js — High-Detail Realistic Angry Birds Island Engine with Audio & 6 Levels
 */

import { TEXTURES } from './textures.js';
import { AUDIO } from './audio.js';

/* ══════════════════════════════════════════════════════════════════════════════
   CONFIG
══════════════════════════════════════════════════════════════════════════════ */
const CFG = {
  GRAVITY:       -9.8,   // m/s²
  MAX_PULL:       0.55,  // max slingshot stretch in metres
  LAUNCH_MULT:    21,    // velocity = pullDist * LAUNCH_MULT * bt.power
  MIN_POWER:      6.8,   // minimum launch speed m/s
  GRAB_DIST:      0.22,  // grab detection radius (metres)
  PINCH_THRESH:   0.048, // thumb-index distance = "pinched"
  RELOAD_DELAY:   2400,  // ms after launch before next ball appears
  TRAJ_DOTS:      24,    // number of trajectory preview dots
  TRAJ_STEP:      0.07,  // seconds between trajectory dots
  BALLS_ROUND:    6,     // balls per round
  BOX_SIZE:       0.32,  // block edge length
};

/* ══════════════════════════════════════════════════════════════════════════════
   ANGRY BIRD CHARACTER DEFINITIONS
══════════════════════════════════════════════════════════════════════════════ */
const BIRD_TYPES = [
  { name:'Red',          color:'#ef4444', emissive:'#b91c1c', radius:0.075, mass:1.2, power:1.1, bounce:0.25, icon:'🔴', type:'red' },
  { name:'Chuck Yellow', color:'#facc15', emissive:'#ca8a04', radius:0.070, mass:1.0, power:1.55, bounce:0.35, icon:'🟡', type:'chuck' },
  { name:'Bomb Black',   color:'#1e293b', emissive:'#0f172a', radius:0.085, mass:3.5, power:1.3, bounce:0.10, explosive:true, icon:'💣', type:'bomb' },
  { name:'Terence Big',  color:'#991b1b', emissive:'#450a0a', radius:0.105, mass:6.0, power:1.85, bounce:0.05, icon:'🟤', type:'terence' },
];

/* ══════════════════════════════════════════════════════════════════════════════
   BLOCK / TARGET TYPES
══════════════════════════════════════════════════════════════════════════════ */
const BLOCK_TYPES = {
  wood:  { name:'Wood',  src: TEXTURES.wood,  color:'#d97706', emissive:'#92400e', mass:1.5, hp:1, score:100, roughness:0.7 },
  stone: { name:'Stone', src: TEXTURES.stone, color:'#64748b', emissive:'#334155', mass:4.0, hp:2, score:200, roughness:0.9 },
  ice:   { name:'Ice',   src: TEXTURES.ice,   color:'#38bdf8', emissive:'#0284c7', mass:0.8, hp:1, score:150, roughness:0.1, opacity:0.80, transparent:true },
  tnt:   { name:'TNT',   src: TEXTURES.tnt,   color:'#dc2626', emissive:'#991b1b', mass:1.0, hp:1, score:300, tnt:true, roughness:0.5 },
  pig:   { name:'Pig',   src: TEXTURES.pig,   color:'#22c55e', emissive:'#15803d', mass:0.5, hp:1, score:500, pig:true, roughness:0.4 }
};

/* ══════════════════════════════════════════════════════════════════════════════
   6 EXCITING LEVEL LAYOUTS
══════════════════════════════════════════════════════════════════════════════ */
const LAYOUTS = [
  // Level 1: Beginner's Outpost
  {
    name: 'Beginner Outpost',
    grid: [
      ['wood','ice','wood'],
      ['ice', 'tnt','ice'],
      ['pig', 'pig','pig']
    ],
    layers: 2
  },
  // Level 2: TNT Fortress
  {
    name: 'TNT Fortress',
    grid: [
      ['stone','tnt','tnt','stone'],
      ['wood', 'pig','pig','wood'],
      ['stone','ice','ice','stone']
    ],
    layers: 3
  },
  // Level 3: Piggy Pyramid
  {
    name: 'Piggy Pyramid',
    grid: [
      ['ice',  'wood', 'ice'],
      ['wood', 'pig',  'wood'],
      ['pig',  'tnt',  'pig'],
      ['stone','wood', 'stone']
    ],
    layers: 3
  },
  // Level 4: King Pig Castle
  {
    name: 'King Pig Castle',
    grid: [
      ['stone','stone','stone','stone'],
      ['wood', 'pig',  'pig',  'wood'],
      ['stone','tnt',  'tnt',  'stone'],
      ['pig',  'ice',  'ice',  'pig']
    ],
    layers: 3
  },
  // Level 5: TNT Chain Reaction
  {
    name: 'TNT Chain Blast',
    grid: [
      ['tnt',  'stone','stone','tnt'],
      ['pig',  'tnt',  'tnt',  'pig'],
      ['stone','pig',  'pig',  'stone'],
      ['wood', 'tnt',  'tnt',  'wood']
    ],
    layers: 4
  },
  // Level 6: Mega Pig Citadel
  {
    name: 'Mega Pig Citadel',
    grid: [
      ['stone','ice',  'tnt',  'ice',  'stone'],
      ['wood', 'pig',  'wood', 'pig',  'wood'],
      ['stone','tnt',  'pig',  'tnt',  'stone'],
      ['pig',  'stone','tnt',  'stone','pig']
    ],
    layers: 4
  }
];

/* ══════════════════════════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
AFRAME.registerComponent('angry-birds-game', {

  init() {
    this.state     = 'idle';   // idle | grabbed | flying | reloading | roundDone
    this.mode      = 'vr';     // vr | mobile | desktop
    this.score     = 0;
    this.ballsLeft = CFG.BALLS_ROUND;
    this.ballIdx   = 0;
    this.round     = 0;

    this.bs = { x:0,y:0,z:0, vx:0,vy:0,vz:0, radius:0.07, mass:1, bounce:0.25, explosive:false };
    this.boxes = [];
    this.particles = [];
    this.popups = [];
    this.trajDots = [];

    this.cars = [];
    this.dog  = null;
    this.skyBirds = [];
    this.ambientPollen = [];

    this.pinchR    = false;
    this.pinchL    = false;
    this.activeHnd = null;

    this.isPointerDragging = false;
    this.raycaster = null;
    this.mouseNDC  = null;
    this.dragPlane = null;

    this.V = {
      hand:   new THREE.Vector3(),
      anchor: new THREE.Vector3(),
      ball:   new THREE.Vector3(),
      pull:   new THREE.Vector3(),
      thumb:  new THREE.Vector3(),
      index:  new THREE.Vector3(),
    };

    this.el.sceneEl.addEventListener('loaded', () => this.onLoad());
  },

  onLoad() {
    this.$ballContainer = document.getElementById('bird-container');
    this.$anchor        = document.getElementById('ball-anchor');
    this.$sling         = document.getElementById('slingshot');
    this.$bandL         = document.getElementById('band-left');
    this.$bandR         = document.getElementById('band-right');
    this.$score         = document.getElementById('hud-score');
    this.$type          = document.getElementById('hud-type');
    this.$banner        = document.getElementById('round-banner');
    this.$banTxt        = document.getElementById('banner-text');
    this.$zone          = document.getElementById('target-zone');

    this.attachHandEvents();
    this.attachPointerEvents();
    this.attachKeyboardEvents();
    this.buildCurrentBirdModel();
    this.snapToAnchor();
    this.spawnStructure();
    this.updateHUD();

    /* Init Audio Engine & Start BGM */
    AUDIO.init();
    AUDIO.startBGM();

    /* Init Island Life */
    this.initRoadTraffic();
    this.initIslandDog();
    this.initSkyBirds();
    this.initAmbientPollen();

    console.log('[AngryBirds VR] 🔊 Cross-Platform Audio & 6 Levels Engine Ready!');
  },

  setMode(mode) {
    this.mode = mode; // 'vr' | 'mobile' | 'desktop'
    const camRig  = document.getElementById('camera-rig');
    const mainCam = document.getElementById('main-camera');

    if (mode === 'mobile' || mode === 'desktop') {
      // Position camera higher (Y=1.70, Z=0.85) and tilted downward (-18deg)
      // This lowers the 3D slingshot into the bottom portion of the screen, giving an unblocked view over the top of the slingshot onto the target boxes!
      if (camRig) camRig.setAttribute('position', '-0.20 1.70 0.85');
      if (mainCam) mainCam.setAttribute('rotation', '-18 0 0');
    } else {
      if (camRig) camRig.setAttribute('position', '0 0 0');
      if (mainCam) mainCam.setAttribute('rotation', '0 0 0');
    }
  },

  restartLevel() {
    this.respawnStructure();
    this.buildCurrentBirdModel();
    this.snapToAnchor();
    this.updateHUD();
    this.state = 'idle';
  },

  switchBird(idx) {
    this.ballIdx = idx % BIRD_TYPES.length;
    this.buildCurrentBirdModel();
    this.snapToAnchor();
    this.updateHUD();

    const btns = document.querySelectorAll('.bird-select-btn');
    btns.forEach((b, i) => {
      if (i === this.ballIdx) b.classList.add('active');
      else b.classList.remove('active');
    });

    AUDIO.playWoodHit();
  },

  autoLaunch() {
    if (this.state !== 'idle') return;
    this.state = 'grabbed';
    this.$anchor.object3D.getWorldPosition(this.V.anchor);

    const pullVec = new THREE.Vector3(0, -0.18, 0.42);
    const dist    = 0.42;
    const np      = this.V.anchor.clone().add(pullVec);

    this.$ballContainer.setAttribute('position', { x: np.x, y: np.y, z: np.z });
    this.updateBands(np, dist);
    this.updateTrajectory(np, dist);
    AUDIO.playStretch(0.8);

    setTimeout(() => {
      if (this.state === 'grabbed') {
        this.fire();
      }
    }, 220);
  },

  attachKeyboardEvents() {
    window.addEventListener('keydown', (e) => {
      if (this.mode === 'vr') return;
      const key = e.key.toLowerCase();

      if (key === '1') this.switchBird(0);
      if (key === '2') this.switchBird(1);
      if (key === '3') this.switchBird(2);
      if (key === '4') this.switchBird(3);

      if ((e.code === 'Space' || key === 'enter') && this.state === 'idle') {
        e.preventDefault();
        this.autoLaunch();
      }

      if (key === 'r') {
        this.restartLevel();
      }

      const camRig  = document.getElementById('camera-rig');
      const mainCam = document.getElementById('main-camera');
      if (camRig && mainCam && (this.mode === 'mobile' || this.mode === 'desktop')) {
        if (key === 'a' || key === 'arrowleft') {
          camRig.setAttribute('position', '-0.80 1.70 0.85');
          mainCam.setAttribute('rotation', '-18 12 0');
        } else if (key === 'd' || key === 'arrowright') {
          camRig.setAttribute('position', '0.40 1.70 0.85');
          mainCam.setAttribute('rotation', '-18 -12 0');
        } else if (key === 'w' || key === 'arrowup') {
          camRig.setAttribute('position', '-0.20 1.95 0.70');
          mainCam.setAttribute('rotation', '-24 0 0');
        } else if (key === 's' || key === 'arrowdown') {
          camRig.setAttribute('position', '-0.20 1.70 0.85');
          mainCam.setAttribute('rotation', '-18 0 0');
        }
      }
    });
  },

  attachHandEvents() {
    const bind = (id, isRight) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('pinchstarted', () => {
        if (isRight) this.pinchR = true; else this.pinchL = true;
        if (!this.activeHnd) this.activeHnd = el;
        AUDIO.resume();
      });
      el.addEventListener('pinchended', () => {
        if (isRight) this.pinchR = false; else this.pinchL = false;
        if (this.activeHnd === el) this.activeHnd = null;
      });
    };
    bind('right-hand', true);
    bind('left-hand',  false);
  },

  attachPointerEvents() {
    this.isPointerDragging = false;
    this.pointerStart = { x: 0, y: 0 };

    const getPos = (e) => {
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      return { x, y };
    };

    const onDown = (e) => {
      if (this.mode === 'vr') return; // VR mode uses hand tracking
      if (this.state !== 'idle') return;
      if (e.target && (e.target.closest('#nonvr-overlay') || e.target.closest('#orientation-screen'))) return;

      const p = getPos(e);
      this.pointerStart.x = p.x;
      this.pointerStart.y = p.y;

      AUDIO.resume();
      this.isPointerDragging = true;
      this.state = 'grabbed';
    };

    const onMove = (e) => {
      if (!this.isPointerDragging || this.state !== 'grabbed') return;
      if (e.touches) e.preventDefault();

      const p = getPos(e);
      const dx = p.x - this.pointerStart.x;
      const dy = p.y - this.pointerStart.y;

      this.dragWithScreenDelta(dx, dy);
    };

    const onUp = () => {
      if (this.isPointerDragging && this.state === 'grabbed') {
        this.isPointerDragging = false;
        this.fire();
      }
    };

    window.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);

    window.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend',   onUp);
  },

  dragWithScreenDelta(dx, dy) {
    if (!this.$anchor || !this.$ballContainer) return;
    this.$anchor.object3D.getWorldPosition(this.V.anchor);

    // Pulling down on screen (dy > 0) pulls the ball backward towards camera (+Z) and downward (-Y)
    // Pulling left/right on screen (dx) shifts pull left/right (X)
    const pullZ = Math.max(0, dy * 0.0025);  // metres backward
    const pullY = -Math.max(0, dy * 0.0016); // metres downward
    const pullX = dx * 0.0020;               // metres left/right

    const pullVec = new THREE.Vector3(pullX, pullY, pullZ);
    const rawDist = pullVec.length();
    const dist    = Math.min(rawDist, CFG.MAX_PULL);

    if (dist < 0.004) {
      this.snapToAnchor();
      this.resetBands();
      this.clearTrajectory();
      return;
    }

    pullVec.normalize().multiplyScalar(dist);
    const np = this.V.anchor.clone().add(pullVec);

    this.$ballContainer.setAttribute('position', { x: np.x, y: np.y, z: np.z });
    this.updateBands(np, dist);
    this.updateTrajectory(np, dist);

    AUDIO.playStretch(dist / CFG.MAX_PULL);
  },

  tick(t, dt) {
    const s = Math.min(dt / 1000, 0.05);

    /* Update Animations */
    this.updateRoadTraffic(s);
    this.updateIslandDog(s, t);
    this.updateSkyBirds(s, t);
    this.updateAmbientPollen(s);

    this.stepParticles(s);
    this.stepPopups(s);

    if (!this.$ballContainer || !this.$anchor) return;

    /* Hand pinch resolving */
    const R  = document.getElementById('right-hand');
    const L  = document.getElementById('left-hand');
    const rp = this.pinchR || this.boneDist(R) < CFG.PINCH_THRESH;
    const lp = this.pinchL || this.boneDist(L) < CFG.PINCH_THRESH;
    if (rp && this.activeHnd !== L) this.activeHnd = R;
    if (lp && this.activeHnd !== R) this.activeHnd = L;
    if (!rp && !lp) this.activeHnd = null;
    const pinching = rp || lp;

    switch (this.state) {
      case 'idle':
        if (pinching && this.activeHnd) this.tryGrab();
        break;

      case 'grabbed':
        if (this.isPointerDragging) {
          // Pointer drag handled directly by pointermove
        } else if (!pinching) {
          this.fire();
        } else if (this.activeHnd) {
          this.drag();
        }
        break;

      case 'flying':
        this.stepBall(s);
        this.stepBoxes(s);
        this.collide();
        break;

      case 'reloading':
        break;
    }
  },

  buildCurrentBirdModel() {
    if (!this.$ballContainer) return;
    while (this.$ballContainer.firstChild) {
      this.$ballContainer.removeChild(this.$ballContainer.firstChild);
    }

    const bDef = BIRD_TYPES[this.ballIdx % BIRD_TYPES.length];
    const r    = bDef.radius;

    if (bDef.type === 'chuck') {
      const body = document.createElement('a-cone');
      body.setAttribute('radius-bottom', r * 1.1);
      body.setAttribute('height', r * 2.2);
      body.setAttribute('rotation', '90 0 0');
      body.setAttribute('material', `color:${bDef.color}; emissive:${bDef.emissive}; emissiveIntensity:0.35; roughness:0.3; metalness:0.1;`);
      body.setAttribute('shadow', 'cast:true');
      this.$ballContainer.appendChild(body);
    } else {
      const body = document.createElement('a-sphere');
      body.setAttribute('radius', r);
      body.setAttribute('material', `color:${bDef.color}; emissive:${bDef.emissive}; emissiveIntensity:0.35; roughness:0.3; metalness:0.1;`);
      body.setAttribute('shadow', 'cast:true');
      this.$ballContainer.appendChild(body);
    }

    const belly = document.createElement('a-sphere');
    belly.setAttribute('radius', r * 0.7);
    belly.setAttribute('position', `0 -${r * 0.3} ${r * 0.45}`);
    belly.setAttribute('scale', '0.9 0.7 0.4');
    belly.setAttribute('color', '#f8fafc');
    this.$ballContainer.appendChild(belly);

    const beak = document.createElement('a-cone');
    beak.setAttribute('radius-bottom', r * 0.28);
    beak.setAttribute('height', r * 0.6);
    beak.setAttribute('position', `0 -${r * 0.05} ${r * 0.95}`);
    beak.setAttribute('rotation', '90 0 0');
    beak.setAttribute('color', '#f59e0b');
    this.$ballContainer.appendChild(beak);

    const eyeL = document.createElement('a-sphere');
    eyeL.setAttribute('radius', r * 0.22);
    eyeL.setAttribute('position', `-${r * 0.35} ${r * 0.22} ${r * 0.85}`);
    eyeL.setAttribute('color', '#ffffff');
    this.$ballContainer.appendChild(eyeL);

    const pupilL = document.createElement('a-sphere');
    pupilL.setAttribute('radius', r * 0.09);
    pupilL.setAttribute('position', `-${r * 0.32} ${r * 0.22} ${r * 1.02}`);
    pupilL.setAttribute('color', '#0f172a');
    this.$ballContainer.appendChild(pupilL);

    const eyeR = document.createElement('a-sphere');
    eyeR.setAttribute('radius', r * 0.22);
    eyeR.setAttribute('position', `${r * 0.35} ${r * 0.22} ${r * 0.85}`);
    eyeR.setAttribute('color', '#ffffff');
    this.$ballContainer.appendChild(eyeR);

    const pupilR = document.createElement('a-sphere');
    pupilR.setAttribute('radius', r * 0.09);
    pupilR.setAttribute('position', `${r * 0.32} ${r * 0.22} ${r * 1.02}`);
    pupilR.setAttribute('color', '#0f172a');
    this.$ballContainer.appendChild(pupilR);

    const browL = document.createElement('a-box');
    browL.setAttribute('width', r * 0.5);
    browL.setAttribute('height', r * 0.12);
    browL.setAttribute('depth', r * 0.08);
    browL.setAttribute('position', `-${r * 0.3} ${r * 0.42} ${r * 0.92}`);
    browL.setAttribute('rotation', '0 0 -22');
    browL.setAttribute('color', '#0f172a');
    this.$ballContainer.appendChild(browL);

    const browR = document.createElement('a-box');
    browR.setAttribute('width', r * 0.5);
    browR.setAttribute('height', r * 0.12);
    browR.setAttribute('depth', r * 0.08);
    browR.setAttribute('position', `${r * 0.3} ${r * 0.42} ${r * 0.92}`);
    browR.setAttribute('rotation', '0 0 22');
    browR.setAttribute('color', '#0f172a');
    this.$ballContainer.appendChild(browR);

    if (bDef.type === 'bomb') {
      const fuse = document.createElement('a-cylinder');
      fuse.setAttribute('radius', 0.015);
      fuse.setAttribute('height', 0.08);
      fuse.setAttribute('position', `0 ${r * 0.95} 0`);
      fuse.setAttribute('color', '#f97316');
      this.$ballContainer.appendChild(fuse);

      const spark = document.createElement('a-sphere');
      spark.setAttribute('radius', 0.025);
      spark.setAttribute('position', `0 ${r * 1.05} 0`);
      spark.setAttribute('material', 'color:#fef08a; emissive:#eab308; emissiveIntensity:1.0; shader:flat;');
      this.$ballContainer.appendChild(spark);
    } else {
      const tuft = document.createElement('a-cone');
      tuft.setAttribute('radius-bottom', 0.03);
      tuft.setAttribute('height', 0.09);
      tuft.setAttribute('position', `0 ${r * 0.9} -0.05`);
      tuft.setAttribute('rotation', '-20 0 0');
      tuft.setAttribute('color', bDef.color);
      this.$ballContainer.appendChild(tuft);
    }

    if (this.$type) {
      this.$type.setAttribute('text',
        `value:${bDef.icon} ${bDef.name}; color:${bDef.color}; width:2.2; align:left; wrapCount:20;`);
    }
  },

  /* ══════════════════════════════════════════════════════════════════════════════
     ROAD TRAFFIC, ANIMALS & POLLEN
  ══════════════════════════════════════════════════════════════════════════════ */
  initRoadTraffic() {
    const scene = this.el.sceneEl;
    const CAR_COLORS = ['#ef4444', '#38bdf8', '#facc15', '#a855f7', '#22c55e'];

    for (let i = 0; i < 4; i++) {
      const carEl = document.createElement('a-entity');
      const startX = -30 + i * 18;
      carEl.setAttribute('position', `${startX} 0.25 -12`);

      const col = CAR_COLORS[i % CAR_COLORS.length];

      const body = document.createElement('a-box');
      body.setAttribute('width', 1.8); body.setAttribute('height', 0.6); body.setAttribute('depth', 0.9);
      body.setAttribute('color', col); body.setAttribute('material', `color:${col}; roughness:0.3; metalness:0.3;`);
      body.setAttribute('position', '0 0.3 0'); body.setAttribute('shadow', 'cast:true');
      carEl.appendChild(body);

      const cabin = document.createElement('a-box');
      cabin.setAttribute('width', 1.0); cabin.setAttribute('height', 0.45); cabin.setAttribute('depth', 0.8);
      cabin.setAttribute('material', 'color:#38bdf8; roughness:0.1; opacity:0.85; transparent:true;');
      cabin.setAttribute('position', '-0.1 0.75 0');
      carEl.appendChild(cabin);

      const wPos = [[-0.5, 0.15, 0.45], [0.5, 0.15, 0.45], [-0.5, 0.15, -0.45], [0.5, 0.15, -0.45]];
      wPos.forEach(p => {
        const wheel = document.createElement('a-cylinder');
        wheel.setAttribute('radius', 0.18); wheel.setAttribute('height', 0.1); wheel.setAttribute('rotation', '90 0 0');
        wheel.setAttribute('position', `${p[0]} ${p[1]} ${p[2]}`); wheel.setAttribute('color', '#0f172a');
        carEl.appendChild(wheel);
      });

      scene.appendChild(carEl);

      this.cars.push({
        el: carEl,
        x: startX,
        speed: 4.8 + Math.random() * 2.2,
        dir: 1
      });
    }
  },

  updateRoadTraffic(s) {
    this.cars.forEach(car => {
      car.x += car.speed * car.dir * s;
      if (car.x > 38) car.x = -38;
      car.el.setAttribute('position', `${car.x} 0.25 -12`);
    });
  },

  initIslandDog() {
    const scene = this.el.sceneEl;
    const dogEl = document.createElement('a-entity');
    dogEl.setAttribute('position', '-4 0.2 -2.5');

    const body = document.createElement('a-box');
    body.setAttribute('width', 0.5); body.setAttribute('height', 0.3); body.setAttribute('depth', 0.25);
    body.setAttribute('color', '#d97706'); body.setAttribute('position', '0 0.3 0');
    dogEl.appendChild(body);

    const head = document.createElement('a-box');
    head.setAttribute('width', 0.22); head.setAttribute('height', 0.22); head.setAttribute('depth', 0.22);
    head.setAttribute('position', '0.3 0.45 0'); head.setAttribute('color', '#b45309');
    dogEl.appendChild(head);

    scene.appendChild(dogEl);
    this.dog = { el: dogEl, angle: 0 };
  },

  updateIslandDog(s, t) {
    if (!this.dog) return;
    this.dog.angle += s * 0.8;
    const x = -4 + Math.sin(this.dog.angle) * 1.5;
    const z = -2.5 + Math.cos(this.dog.angle) * 0.8;
    const rotY = Math.sin(this.dog.angle) * 45;
    this.dog.el.setAttribute('position', `${x} 0.1 ${z}`);
    this.dog.el.setAttribute('rotation', `0 ${rotY} 0`);
  },

  initSkyBirds() {
    const scene = this.el.sceneEl;
    for (let i = 0; i < 4; i++) {
      const birdEl = document.createElement('a-entity');
      birdEl.setAttribute('position', `0 ${14 + i * 2} -20`);

      const wingL = document.createElement('a-plane');
      wingL.setAttribute('width', 0.6); wingL.setAttribute('height', 0.15);
      wingL.setAttribute('rotation', '0 0 25'); wingL.setAttribute('position', '-0.3 0 0');
      wingL.setAttribute('color', '#1e293b'); wingL.setAttribute('material', 'side:double; shader:flat;');
      birdEl.appendChild(wingL);

      const wingR = document.createElement('a-plane');
      wingR.setAttribute('width', 0.6); wingR.setAttribute('height', 0.15);
      wingR.setAttribute('rotation', '0 0 -25'); wingR.setAttribute('position', '0.3 0 0');
      wingR.setAttribute('color', '#1e293b'); wingR.setAttribute('material', 'side:double; shader:flat;');
      birdEl.appendChild(wingR);

      scene.appendChild(birdEl);
      this.skyBirds.push({ el: birdEl, radius: 16 + i * 4, speed: 0.4 + i * 0.1, altitude: 14 + i * 2, angle: i * 1.8 });
    }
  },

  updateSkyBirds(s, t) {
    this.skyBirds.forEach(b => {
      b.angle += b.speed * s;
      const x = Math.sin(b.angle) * b.radius;
      const z = -20 + Math.cos(b.angle) * b.radius;
      const rotY = (b.angle * 180 / Math.PI) + 90;
      b.el.setAttribute('position', `${x} ${b.altitude} ${z}`);
      b.el.setAttribute('rotation', `0 ${rotY} 0`);
    });
  },

  initAmbientPollen() {
    const scene = this.el.sceneEl;
    for (let i = 0; i < 25; i++) {
      const p = document.createElement('a-sphere');
      const x = (Math.random() - 0.5) * 16;
      const y = Math.random() * 4 + 0.5;
      const z = -Math.random() * 12 - 1;

      p.setAttribute('radius', Math.random() * 0.015 + 0.008);
      p.setAttribute('position', { x, y, z });
      p.setAttribute('material', 'color:#fef08a; emissive:#facc15; emissiveIntensity:0.9; opacity:0.75; transparent:true; shader:flat;');
      scene.appendChild(p);

      this.ambientPollen.push({ el: p, x, y, z, vy: Math.random() * 0.2 + 0.1, seed: i });
    }
  },

  updateAmbientPollen(s) {
    this.ambientPollen.forEach(p => {
      p.y += p.vy * s;
      p.x += Math.sin(p.y * 2 + p.seed) * 0.2 * s;
      if (p.y > 4.5) p.y = 0.5;
      p.el.setAttribute('position', { x: p.x, y: p.y, z: p.z });
    });
  },

  /* ══════════════════════════════════════════════════════════════════════════════
     GAME CORE LOGIC WITH AUDIO INTEGRATION
  ══════════════════════════════════════════════════════════════════════════════ */
  tryGrab() {
    this.handPos(this.activeHnd, this.V.hand);
    this.$anchor.object3D.getWorldPosition(this.V.anchor);
    const d = this.V.hand.distanceTo(this.V.anchor);
    if (d < CFG.GRAB_DIST) {
      this.state = 'grabbed';
    }
  },

  drag() {
    this.handPos(this.activeHnd, this.V.hand);
    this.$anchor.object3D.getWorldPosition(this.V.anchor);

    this.V.pull.copy(this.V.hand).sub(this.V.anchor);
    const raw  = this.V.pull.length();
    const dist = Math.min(raw, CFG.MAX_PULL);
    if (dist < 0.004) return;

    this.V.pull.normalize().multiplyScalar(dist);
    const np = this.V.anchor.clone().add(this.V.pull);

    this.$ballContainer.setAttribute('position', { x:np.x, y:np.y, z:np.z });
    this.updateBands(np, dist);
    this.updateTrajectory(np, dist);

    AUDIO.playStretch(dist / CFG.MAX_PULL);
  },

  fire() {
    this.state = 'flying';

    this.$anchor.object3D.getWorldPosition(this.V.anchor);
    this.$ballContainer.object3D.getWorldPosition(this.V.ball);

    const dir = this.V.anchor.clone().sub(this.V.ball);
    const pd  = Math.max(dir.length(), 0.01);
    dir.normalize();

    const bt = BIRD_TYPES[this.ballIdx % BIRD_TYPES.length];
    const pw = Math.max(pd * CFG.LAUNCH_MULT * bt.power, CFG.MIN_POWER);

    this.bs = {
      x: this.V.ball.x, y: this.V.ball.y, z: this.V.ball.z,
      vx: dir.x * pw,
      vy: dir.y * pw + 3.8,
      vz: dir.z * pw,
      radius:    bt.radius,
      mass:      bt.mass,
      bounce:    bt.bounce,
      explosive: bt.explosive || false,
    };

    this.resetBands();
    this.clearTrajectory();
    this.ballsLeft = Math.max(0, this.ballsLeft - 1);
    this.updateHUD();

    AUDIO.playLaunch();
    this.createSmokeRing(this.V.ball, dir);
    setTimeout(() => this.reload(), CFG.RELOAD_DELAY);
  },

  stepBall(s) {
    const b = this.bs;
    b.vy += CFG.GRAVITY * s;
    b.x  += b.vx * s;
    b.y  += b.vy * s;
    b.z  += b.vz * s;

    if (b.y <= b.radius) {
      b.y   = b.radius;
      b.vy  = -b.vy * b.bounce;
      b.vx *= 0.75;
      b.vz *= 0.75;
      if (Math.abs(b.vy) < 0.4) b.vy = 0;
    }

    this.$ballContainer.setAttribute('position', { x:b.x, y:b.y, z:b.z });
  },

  stepBoxes(s) {
    this.boxes.forEach(bx => {
      if (!bx.moving) return;

      bx.vy += CFG.GRAVITY * s;
      bx.x  += bx.vx * s;
      bx.y  += bx.vy * s;
      bx.z  += bx.vz * s;

      bx.rx = (bx.rx || 0) + (bx.avx || 0) * s * 57.3;
      bx.rz = (bx.rz || 0) + (bx.avz || 0) * s * 57.3;
      bx.avx = (bx.avx || 0) * 0.88;
      bx.avz = (bx.avz || 0) * 0.88;

      const hs = bx.size * 0.5;
      if (bx.y <= hs) {
        bx.y   = hs;
        bx.vy *= -0.15;
        bx.vx *= 0.50;
        bx.vz *= 0.50;
        if (Math.abs(bx.vy) < 0.25 && Math.abs(bx.vx) < 0.06 && Math.abs(bx.vz) < 0.06) {
          bx.vx = bx.vy = bx.vz = 0;
          bx.avx = bx.avz = 0;
          bx.moving = false;
        }
      }

      bx.el.setAttribute('position', { x:bx.x, y:bx.y, z:bx.z });
      bx.el.setAttribute('rotation', { x:bx.rx||0, y:bx.ry||0, z:bx.rz||0 });
    });
  },

  collide() {
    const b  = this.bs;
    const br = b.radius;

    this.boxes.forEach(bx => {
      if (bx.destroyed) return;

      const hs = bx.size * 0.5 + br;
      const dx = b.x - bx.x, dy = b.y - bx.y, dz = b.z - bx.z;
      if (Math.abs(dx) >= hs || Math.abs(dy) >= hs || Math.abs(dz) >= hs) return;

      const spd = Math.sqrt(b.vx**2 + b.vy**2 + b.vz**2);
      bx.hp -= (spd > 5.5 ? 2 : 1);

      if (bx.hp <= 0) {
        this.destroyBlock(bx, b);
      } else {
        bx.moving = true;
        bx.vx = (dx / hs) * spd * 0.2;
        bx.vy = 2.0;
        bx.vz = (dz / hs) * spd * 0.2;
        bx.el.setAttribute('material', `src:${bx.type.src}; color:#fef08a; emissive:#eab308; emissiveIntensity:0.8;`);

        if (bx.type.stone) AUDIO.playStoneHit();
        else AUDIO.playWoodHit();

        setTimeout(() => {
          if (!bx.destroyed) bx.el.setAttribute('material', `src:${bx.type.src}; color:${bx.type.color}; emissive:${bx.type.emissive}; emissiveIntensity:0.25; roughness:${bx.type.roughness};`);
        }, 150);
      }

      b.vx *= 0.40; b.vy = Math.max(b.vy * 0.30, 0); b.vz *= 0.40;

      if (b.explosive) {
        this.explodeAt(b.x, b.y, b.z, 2.5);
      }
    });

    const pigsRemaining = this.boxes.filter(x => x.type.pig && !x.destroyed).length;
    if (pigsRemaining === 0 && this.boxes.length > 0) {
      setTimeout(() => this.onRoundComplete(), 800);
    }
  },

  destroyBlock(bx, ball) {
    bx.destroyed = true;
    bx.moving    = false;
    bx.el.setAttribute('visible', false);

    const pos = { x: bx.x, y: bx.y, z: bx.z };

    if (bx.type.pig) {
      AUDIO.playPigPop();
      this.spawnDebris(pos, '#4ade80', 16, 0.04);
      this.spawnDebris(pos, '#ffffff', 8, 0.03);
      this.spawnPopup(pos, '+500 PIG POP!', '#22c55e');
      this.score += 500;
    } else if (bx.type.tnt) {
      AUDIO.playExplosion();
      this.explodeAt(bx.x, bx.y, bx.z, 3.0);
      this.spawnPopup(pos, '💥 TNT BOOM!', '#ef4444');
      this.score += 300;
    } else if (bx.type.ice) {
      AUDIO.playIceHit();
      this.spawnDebris(pos, '#38bdf8', 18, 0.03);
      this.spawnDebris(pos, '#e0f2fe', 10, 0.02);
      this.spawnPopup(pos, '+150', '#38bdf8');
      this.score += 150;
    } else if (bx.type.stone) {
      AUDIO.playStoneHit();
      this.spawnDebris(pos, '#64748b', 14, 0.05);
      this.spawnPopup(pos, '+200', '#94a3b8');
      this.score += 200;
    } else {
      AUDIO.playWoodHit();
      this.spawnDebris(pos, '#d97706', 14, 0.04);
      this.spawnPopup(pos, '+100', '#f59e0b');
      this.score += 100;
    }

    this.updateHUD();
  },

  explodeAt(cx, cy, cz, radius) {
    AUDIO.playExplosion();

    for (let i = 0; i < 16; i++) {
      const p = document.createElement('a-sphere');
      const r = Math.random() * 0.25 + 0.1;
      const c = ['#ef4444','#f97316','#facc15','#ffffff'][Math.floor(Math.random()*4)];
      p.setAttribute('radius', r);
      p.setAttribute('position', {
        x: cx + (Math.random()-0.5)*0.8,
        y: cy + (Math.random()-0.5)*0.8,
        z: cz + (Math.random()-0.5)*0.8
      });
      p.setAttribute('material', `color:${c}; emissive:${c}; emissiveIntensity:0.9; shader:flat; transparent:true; opacity:0.9;`);
      this.el.sceneEl.appendChild(p);

      this.particles.push({
        el: p,
        vx: (Math.random()-0.5)*6,
        vy: Math.random()*5 + 2,
        vz: (Math.random()-0.5)*6,
        life: 0.6,
        age: 0,
        expand: 2.5
      });
    }

    const ring = document.createElement('a-ring');
    ring.setAttribute('radius-inner', '0.1');
    ring.setAttribute('radius-outer', '0.3');
    ring.setAttribute('position', { x: cx, y: cy, z: cz });
    ring.setAttribute('rotation', '-90 0 0');
    ring.setAttribute('material', 'color:#ffedd5; emissive:#f97316; emissiveIntensity:1.0; shader:flat; transparent:true; opacity:0.8;');
    this.el.sceneEl.appendChild(ring);

    this.particles.push({
      el: ring,
      vx:0, vy:0, vz:0,
      life: 0.4,
      age: 0,
      ringExpand: 8.0
    });

    this.boxes.forEach(nb => {
      if (nb.destroyed) return;
      const dist = Math.hypot(nb.x - cx, nb.y - cy, nb.z - cz);
      if (dist < radius) {
        nb.hp -= 2;
        if (nb.hp <= 0) {
          this.destroyBlock(nb, { mass:1 });
        } else {
          nb.moving = true;
          nb.vx = ((nb.x - cx) / dist) * 7.0;
          nb.vy = 4.5 + Math.random()*3;
          nb.vz = ((nb.z - cz) / dist) * 7.0;
          nb.avx = (Math.random() - 0.5) * 16;
          nb.avz = (Math.random() - 0.5) * 16;
        }
      }
    });
  },

  spawnDebris(pos, color, count, size) {
    for (let i = 0; i < count; i++) {
      const p = document.createElement('a-box');
      const s = size * (Math.random() * 0.8 + 0.6);
      p.setAttribute('width', s);
      p.setAttribute('height', s);
      p.setAttribute('depth', s);
      p.setAttribute('position', { x: pos.x, y: pos.y, z: pos.z });
      p.setAttribute('material', `color:${color}; emissive:${color}; emissiveIntensity:0.3; roughness:0.7;`);
      this.el.sceneEl.appendChild(p);

      this.particles.push({
        el: p,
        x: pos.x, y: pos.y, z: pos.z,
        vx: (Math.random() - 0.5) * 5.0,
        vy: Math.random() * 4.0 + 1.5,
        vz: (Math.random() - 0.5) * 5.0,
        rx: Math.random() * 360,
        ry: Math.random() * 360,
        life: 1.2,
        age: 0
      });
    }
  },

  createSmokeRing(pos, dir) {
    for (let i = 0; i < 6; i++) {
      const p = document.createElement('a-sphere');
      p.setAttribute('radius', 0.04);
      p.setAttribute('position', { x: pos.x, y: pos.y, z: pos.z });
      p.setAttribute('material', 'color:#e2e8f0; opacity:0.6; transparent:true; shader:flat;');
      this.el.sceneEl.appendChild(p);

      this.particles.push({
        el: p,
        vx: dir.x * 0.5 + (Math.random()-0.5)*0.4,
        vy: dir.y * 0.5 + (Math.random()-0.5)*0.4,
        vz: dir.z * 0.5 + (Math.random()-0.5)*0.4,
        life: 0.5,
        age: 0,
        expand: 1.5
      });
    }
  },

  spawnPopup(pos, text, color) {
    const el = document.createElement('a-entity');
    el.setAttribute('position', { x: pos.x, y: pos.y + 0.3, z: pos.z });
    el.setAttribute('text', `value: ${text}; align: center; color: ${color}; width: 3.5; wrapCount: 20; font: mozillavr;`);
    this.el.sceneEl.appendChild(el);

    this.popups.push({
      el,
      y: pos.y + 0.3,
      life: 1.2,
      age: 0
    });
  },

  stepParticles(s) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += s;

      if (p.age >= p.life) {
        if (p.el.parentNode) p.el.parentNode.removeChild(p.el);
        this.particles.splice(i, 1);
        continue;
      }

      const progress = p.age / p.life;

      if (p.ringExpand) {
        const rInner = 0.1 + progress * p.ringExpand;
        const rOuter = rInner + 0.2;
        p.el.setAttribute('radius-inner', rInner.toFixed(2));
        p.el.setAttribute('radius-outer', rOuter.toFixed(2));
        p.el.setAttribute('material', `color:#ffedd5; emissive:#f97316; emissiveIntensity:${1-progress}; opacity:${1-progress}; shader:flat; transparent:true;`);
      } else {
        p.vy += CFG.GRAVITY * 0.5 * s;
        if (!p.x) {
          const cur = p.el.getAttribute('position');
          p.x = cur.x; p.y = cur.y; p.z = cur.z;
        }
        p.x += p.vx * s;
        p.y += p.vy * s;
        p.z += p.vz * s;

        p.el.setAttribute('position', { x: p.x, y: p.y, z: p.z });

        if (p.expand) {
          const rad = 0.04 * (1 + progress * p.expand);
          p.el.setAttribute('radius', rad.toFixed(3));
        }

        p.el.setAttribute('material', `opacity: ${(1 - progress).toFixed(2)}; transparent: true;`);
      }
    }
  },

  stepPopups(s) {
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pop = this.popups[i];
      pop.age += s;

      if (pop.age >= pop.life) {
        if (pop.el.parentNode) pop.el.parentNode.removeChild(pop.el);
        this.popups.splice(i, 1);
        continue;
      }

      pop.y += s * 0.6;
      const cur = pop.el.getAttribute('position');
      pop.el.setAttribute('position', { x: cur.x, y: pop.y, z: cur.z });
    }
  },

  onRoundComplete() {
    if (this.state === 'roundDone') return;
    this.state  = 'roundDone';
    const bonus = this.ballsLeft * 500;
    this.score += bonus;
    this.updateHUD();

    AUDIO.playVictory();

    const lvlName = LAYOUTS[this.round % LAYOUTS.length].name;

    if (this.$banner) this.$banner.setAttribute('visible', true);
    if (this.$banTxt) this.$banTxt.setAttribute('value', `🏆 ${lvlName} Clear!\n+${bonus} Bonus Points!`);

    setTimeout(() => {
      if (this.$banner) this.$banner.setAttribute('visible', false);
      this.round = (this.round + 1) % LAYOUTS.length;
      this.ballsLeft = CFG.BALLS_ROUND;
      this.ballIdx   = 0;
      this.respawnStructure();
      this.buildCurrentBirdModel();
      this.snapToAnchor();
      this.updateHUD();
      this.state = 'idle';
    }, 4000);
  },

  reload() {
    if (this.state === 'reloading' || this.state === 'roundDone') return;
    this.state = 'reloading';
    this.ballIdx++;
    this.buildCurrentBirdModel();

    setTimeout(() => {
      this.snapToAnchor();
      this.state = 'idle';
    }, 350);
  },

  spawnStructure() {
    if (!this.$zone) return;
    const layout = LAYOUTS[this.round % LAYOUTS.length];
    const grid   = layout.grid;
    const rows   = grid.length;
    const cols   = grid[0].length;
    const layers = layout.layers;
    const step   = CFG.BOX_SIZE + 0.03;
    const bs     = CFG.BOX_SIZE;

    const plat = document.createElement('a-box');
    plat.setAttribute('width',  cols * step + 0.4);
    plat.setAttribute('height', 0.12);
    plat.setAttribute('depth',  rows * step + 0.4);
    plat.setAttribute('position', '0 0.06 0');
    plat.setAttribute('material', `src:${TEXTURES.stone}; color:#475569; roughness:0.9;`);
    plat.setAttribute('shadow', 'receive:true');
    this.$zone.appendChild(plat);

    const zPos = new THREE.Vector3();
    this.$zone.object3D.getWorldPosition(zPos);

    for (let lay = 0; lay < layers; lay++) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const typeKey = grid[r][c];
          if (!typeKey) continue;
          const bType = BLOCK_TYPES[typeKey] || BLOCK_TYPES.wood;

          const lx = (c - (cols - 1) / 2) * step;
          const ly = 0.12 + bs / 2 + lay * (bs + 0.01);
          const lz = (r  - (rows - 1) / 2) * step;

          let el;

          if (bType.pig) {
            el = document.createElement('a-entity');
            el.setAttribute('position', { x:lx, y:ly, z:lz });

            const pigBody = document.createElement('a-sphere');
            pigBody.setAttribute('radius', bs * 0.42);
            pigBody.setAttribute('material', `src:${bType.src}; color:#22c55e; emissive:#15803d; emissiveIntensity:0.3; roughness:0.4;`);
            pigBody.setAttribute('shadow', 'cast:true');
            el.appendChild(pigBody);

            const snout = document.createElement('a-cylinder');
            snout.setAttribute('radius', bs * 0.18);
            snout.setAttribute('height', 0.06);
            snout.setAttribute('position', `0 0 ${bs*0.38}`);
            snout.setAttribute('rotation', '90 0 0');
            snout.setAttribute('color', '#4ade80');
            el.appendChild(snout);

            const eyeL = document.createElement('a-sphere');
            eyeL.setAttribute('radius', 0.025);
            eyeL.setAttribute('position', `-0.06 0.06 ${bs*0.36}`);
            eyeL.setAttribute('color', '#ffffff');
            el.appendChild(eyeL);

            const eyeR = document.createElement('a-sphere');
            eyeR.setAttribute('radius', 0.025);
            eyeR.setAttribute('position', `0.06 0.06 ${bs*0.36}`);
            eyeR.setAttribute('color', '#ffffff');
            el.appendChild(eyeR);

            const earL = document.createElement('a-cone');
            earL.setAttribute('radius-bottom', 0.035);
            earL.setAttribute('height', 0.08);
            earL.setAttribute('position', `-0.08 0.14 0`);
            earL.setAttribute('color', '#16a34a');
            el.appendChild(earL);

            const earR = document.createElement('a-cone');
            earR.setAttribute('radius-bottom', 0.035);
            earR.setAttribute('height', 0.08);
            earR.setAttribute('position', `0.08 0.14 0`);
            earR.setAttribute('color', '#16a34a');
            el.appendChild(earR);

            this.$zone.appendChild(el);
          } else {
            el = document.createElement('a-box');
            el.setAttribute('width',  bs);
            el.setAttribute('height', bs);
            el.setAttribute('depth',  bs);
            el.setAttribute('position', { x:lx, y:ly, z:lz });
            el.setAttribute('shadow', 'cast:true; receive:true');

            let matStr = `src:${bType.src}; color:${bType.color}; emissive:${bType.emissive}; emissiveIntensity:0.25; roughness:${bType.roughness};`;
            if (bType.transparent) matStr += ` opacity:${bType.opacity}; transparent:true;`;
            el.setAttribute('material', matStr);

            this.$zone.appendChild(el);
          }

          this.boxes.push({
            el,
            type: bType,
            hp:   bType.hp,
            x: zPos.x + lx, y: zPos.y + ly, z: zPos.z + lz,
            vx:0, vy:0, vz:0,
            rx:0, ry: Math.random() * 15, rz:0,
            avx:0, avz:0,
            size: bs,
            moving: false,
            destroyed: false,
          });
        }
      }
    }
  },

  respawnStructure() {
    this.boxes.forEach(bx => bx.el?.parentNode?.removeChild(bx.el));
    this.boxes = [];
    while (this.$zone?.firstChild) this.$zone.removeChild(this.$zone.firstChild);
    this.spawnStructure();
  },

  snapToAnchor() {
    if (!this.$anchor || !this.$ballContainer) return;
    const p = new THREE.Vector3();
    this.$anchor.object3D.getWorldPosition(p);
    this.$ballContainer.setAttribute('position', { x:p.x, y:p.y, z:p.z });
  },

  updateHUD() {
    if (!this.$score) return;
    const lvlName = LAYOUTS[this.round % LAYOUTS.length].name;
    this.$score.setAttribute('text',
      `value:Lvl ${this.round+1}: ${lvlName}  |  Score: ${this.score}  |  Birds: ${this.ballsLeft}; align:center; color:white; width:3.4; wrapCount:38;`);
  },

  updateTrajectory(ballPos, pullDist) {
    if (!this.$anchor) return;
    this.$anchor.object3D.getWorldPosition(this.V.anchor);
    const dir = this.V.anchor.clone().sub(ballPos).normalize();
    const bt  = BIRD_TYPES[this.ballIdx % BIRD_TYPES.length];
    const pw  = Math.max(pullDist * CFG.LAUNCH_MULT * bt.power, CFG.MIN_POWER);

    const bx = ballPos.x, by = ballPos.y, bz = ballPos.z;
    const vx = dir.x * pw, vz = dir.z * pw;
    let   vy = dir.y * pw + 3.8;

    let used = 0;
    for (let i = 0; i < CFG.TRAJ_DOTS; i++) {
      const dt = CFG.TRAJ_STEP * (i + 1);
      const tx = bx + vx * dt;
      const ty = by + vy * dt + 0.5 * CFG.GRAVITY * dt * dt;
      const tz = bz + vz * dt;
      if (ty < 0.04) break;
      used++;

      if (!this.trajDots[i]) {
        const dot = document.createElement('a-sphere');
        dot.setAttribute('radius', '0.022');
        dot.setAttribute('material', 'shader:flat; color:#fef08a; emissive:#eab308; opacity:0.8; transparent:true;');
        this.el.sceneEl.appendChild(dot);
        this.trajDots[i] = dot;
      }
      const op = (0.85 * (1 - i / CFG.TRAJ_DOTS)).toFixed(2);
      const sc = ((1 - i / CFG.TRAJ_DOTS) * 0.025 + 0.008).toFixed(4);
      this.trajDots[i].setAttribute('visible', true);
      this.trajDots[i].setAttribute('position', { x:tx, y:ty, z:tz });
      this.trajDots[i].setAttribute('radius', sc);
      this.trajDots[i].setAttribute('material', `shader:flat; color:#fef08a; emissive:#eab308; opacity:${op}; transparent:true;`);
    }
    for (let i = used; i < this.trajDots.length; i++) {
      this.trajDots[i]?.setAttribute('visible', false);
    }
  },

  clearTrajectory() {
    this.trajDots.forEach(d => d?.setAttribute('visible', false));
  },

  updateBands(ballW, pull) {
    if (!this.$sling || !this.$bandL || !this.$bandR) return;
    const sObj = this.$sling.object3D;
    sObj.updateMatrixWorld(true);

    const lF = new THREE.Vector3(-0.135, 0.42, 0).applyMatrix4(sObj.matrixWorld);
    const rF = new THREE.Vector3( 0.135, 0.42, 0).applyMatrix4(sObj.matrixWorld);
    const bV = new THREE.Vector3(ballW.x, ballW.y, ballW.z);

    const setBand = (el, from, to) => {
      const len = from.distanceTo(to);
      if (len < 0.002) return;
      const mid  = from.clone().add(to).multiplyScalar(0.5);
      const dir  = to.clone().sub(from).normalize();
      const up   = new THREE.Vector3(0, 1, 0);
      const q    = new THREE.Quaternion().setFromUnitVectors(up, dir);
      const eu   = new THREE.Euler().setFromQuaternion(q, 'XYZ');
      const lm   = sObj.worldToLocal(mid.clone());

      el.setAttribute('position', lm);
      el.setAttribute('height',   len);
      el.setAttribute('rotation', {
        x: THREE.MathUtils.radToDeg(eu.x),
        y: THREE.MathUtils.radToDeg(eu.y),
        z: THREE.MathUtils.radToDeg(eu.z),
      });

      const t  = Math.min(pull / CFG.MAX_PULL, 1);
      const r  = Math.round(90  + t * 165);
      const g2 = Math.round(0);
      const b2 = Math.round(180 * (1 - t));
      const hex = `#${r.toString(16).padStart(2,'0')}${g2.toString(16).padStart(2,'0')}${b2.toString(16).padStart(2,'0')}`;
      el.setAttribute('color',    hex);
      el.setAttribute('material', `emissive:${hex}; emissiveIntensity:${(0.4 + t * 0.9).toFixed(2)};`);
    };

    setBand(this.$bandL, lF, bV);
    setBand(this.$bandR, rF, bV);
  },

  resetBands() {
    [{ el:this.$bandL, p:'-0.07 0.30 0', r:'0 0 45'  },
     { el:this.$bandR, p:' 0.07 0.30 0', r:'0 0 -45' }
    ].forEach(({ el, p, r }) => {
      if (!el) return;
      el.setAttribute('position', p);
      el.setAttribute('rotation', r);
      el.setAttribute('height',   '0.25');
      el.setAttribute('color',    '#2a1a4e');
      el.setAttribute('material', 'emissive:#5a0090; emissiveIntensity:0.5;');
    });
  },

  boneDist(handEl) {
    if (!handEl) return Infinity;
    const htc = handEl.components?.['hand-tracking-controls'];
    if (!htc?.bones || htc.bones.length < 9) return Infinity;
    const t = htc.bones[4];
    const i = htc.bones[8];
    if (!t || !i) return Infinity;
    t.getWorldPosition(this.V.thumb);
    i.getWorldPosition(this.V.index);
    return this.V.thumb.distanceTo(this.V.index);
  },

  handPos(handEl, out) {
    const htc = handEl?.components?.['hand-tracking-controls'];
    if (htc?.bones?.length >= 9 && htc.bones[4] && htc.bones[8]) {
      htc.bones[4].getWorldPosition(this.V.thumb);
      htc.bones[8].getWorldPosition(this.V.index);
      out.copy(this.V.thumb).add(this.V.index).multiplyScalar(0.5);
    } else {
      handEl?.object3D.getWorldPosition(out);
    }
  },

  remove() {
    AUDIO.stopBGM();
    this.trajDots.forEach(d => d?.parentNode?.removeChild(d));
    this.particles.forEach(p => p.el?.parentNode?.removeChild(p.el));
    this.popups.forEach(p => p.el?.parentNode?.removeChild(p.el));
    this.boxes.forEach(bx => bx.el?.parentNode?.removeChild(bx.el));
    this.cars.forEach(c => c.el?.parentNode?.removeChild(c.el));
    this.ambientPollen.forEach(p => p.el?.parentNode?.removeChild(p.el));
  }
});

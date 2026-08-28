# 🥽 XR Slingshot – Angry Birds VR for Meta Quest 3S

An immersive, high-performance **WebXR Hand Tracking 3D Slingshot Game** inspired by Angry Birds, designed for Meta Quest 3S.

![WebXR](https://img.shields.br/badge/WebXR-Meta%20Quest%203S-7c3aed?style=for-the-badge&logo=virtual-reality)
![A-Frame](https://img.shields.io/badge/A--Frame-1.6.0-ef4444?style=for-the-badge)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-facc15?style=for-the-badge&logo=javascript)
![Vite](https://img.shields.io/badge/Vite-5.4-646cff?style=for-the-badge&logo=vite)

---

## ✨ Features

- 🖐️ **Controller-Free Bare Hand Tracking**: Pinch thumb and index fingers to grab the slingshot pouch, pull back, and release to fire birds with natural physics!
- 🐦 **3D Angry Birds Characters**:
  - 🔴 **Red Bird**: Balanced launcher with directional stability.
  - 🟡 **Chuck Yellow**: Aerodynamic cone-shaped bird with super speed momentum.
  - 💣 **Bomb Black**: Dark charcoal bird with glowing spark fuse that triggers explosive blasts on impact.
  - 🟤 **Terence Big**: Heavyweight high-mass bird that smashes through fortress pillars.
- 🧱 **5 Interactive Structure Materials**:
  - 🪵 **Wood Crates**: Classic destructible wooden planks.
  - 🪨 **Stone Fortresses**: Heavy granite blocks requiring hard hits.
  - 🧊 **Ice / Glass**: Translucent cyan blocks that shatter into crystal fragments.
  - 💣 **TNT Hazard Barrels**: Explosive barrels triggering chain-reaction fireballs and shockwaves!
  - 🐷 **Bad Piggies Targets**: 3D Pig targets sitting on structures. Popping them awards **+500 points**!
- 🏝️ **Realistic Living Island Environment**:
  - Winding asphalt road with **driving 3D vehicles**.
  - Animated **island dog** roaming the grassy pastures.
  - Flying **birds circling in the sky**.
  - Village cottages with red-tiled roofs, glass windows, and smoking chimneys.
  - Tropical coconut palm trees, flower tufts, and coastal beach ocean.
  - Exponential atmospheric fog, PBR material roughness, and shadow maps.
- 🔊 **Zero-Dependency Web Audio API Sound System**:
  - Rubber stretch tension sounds, launch whooshes, wood smashes, ice clinks, TNT blasts, piggy pops, and victory fanfare.
  - Upbeat tropical background soundtrack loop.
- 🎮 **6 Exciting Progressive Levels**:
  1. *Beginner Outpost*
  2. *TNT Fortress*
  3. *Piggy Pyramid*
  4. *King Pig Castle*
  5. *TNT Chain Blast*
  6. *Mega Pig Citadel*

---

## 🚀 How to Run Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)

### Setup & Launch
```bash
# Clone the repository
git clone https://github.com/AmarGore47/Vr_Game.git
cd Vr_Game

# Install dependencies
npm install

# Start HTTPS dev server (required for WebXR / Quest Browser)
npm run dev
```

Open the HTTPS URL displayed in your terminal (e.g., `https://<YOUR_LOCAL_IP>:5173`) inside your **Meta Quest Browser**.

---

## 🥽 Playing on Meta Quest 3S

1. Put on your Meta Quest 3S headset and enable **Hand Tracking** in *Settings → Hands and Controllers*.
2. Open Meta Quest Browser and navigate to your dev server URL.
3. Tap **Enter VR** on the welcome screen.
4. Reach forward, **pinch your thumb and index fingers** together over the Angry Bird resting in the slingshot.
5. Pull back to aim using the trajectory guide, then **open your fingers** to fire!

---

## 🛠️ Built With

- **[A-Frame 1.6.0](https://aframe.io/)**: WebXR 3D Scene Framework
- **[Three.js](https://threejs.org/)**: 3D Graphics Engine
- **[Vite](https://vitejs.dev/)**: Lightning Fast Web Development Server
- **Web Audio API**: Real-Time Sound Synthesis & Music Engine
- **Custom Procedural Texture Engine**: Zero external texture assets required

---

## 📜 License

MIT License © 2026 Amar Gore

// Dimensions: terrain, sky, props, the kiosk and NPC/pickup models.
// Props are instanced per type, so hundreds of houses, trees and mushrooms cost a
// few draw calls; destroying one just hides its instance.
(function () {
  'use strict';
  const T = THREE;
  const C = window.MMC;
  const P = C.prim;
  const shade = C.shade;

  // ---------- Prop models (unit scale, base on the ground) ----------
  const MODELS = {
    house(s) {
      s.add(P.box, '#f7f1e3', [0, 3, 0], null, [11, 6, 9]);
      const roof = new T.ConeGeometry(8.6, 3.8, 4, 1);
      roof.rotateY(Math.PI / 4);
      s.add(roof, '#b8473b', [0, 7.9, 0], null, [1.0, 1, 0.82]);
      roof.dispose();
      s.add(P.box, '#7a4a2a', [-2.5, 1.4, 4.52], null, [1.6, 2.8, 0.1]);
      s.add(P.box, '#d9d4c6', [2.6, 1.5, 4.52], null, [3.6, 3.0, 0.1]);
      for (const x of [-4.2, -0.6]) s.add(P.box, '#9fd6ff', [x, 3.9, 4.52], null, [1.5, 1.3, 0.1]);
      for (const x of [-3, 3]) s.add(P.box, '#9fd6ff', [x, 3.6, -4.52], null, [1.8, 1.4, 0.1]);
      s.add(P.box, '#a33a30', [3.2, 9.2, -1], null, [0.9, 2.2, 0.9]);
    },
    tree(s) {
      s.add(P.cylLo, '#7a5230', [0, 1.6, 0], null, [0.35, 3.2, 0.35]);
      s.add(P.sphereLo, '#3f9a3a', [0, 4.6, 0], null, [2.2, 2.0, 2.2]);
      s.add(P.sphereLo, '#4db044', [0.9, 5.8, 0.3], null, [1.5, 1.4, 1.5]);
      s.add(P.sphereLo, '#56bf4b', [-0.7, 6.3, -0.4], null, [1.2, 1.2, 1.2]);
    },
    car(s) {
      s.add(P.capsule, '#ffffff', [0, 0.75, 0], [Math.PI / 2, 0, 0], [0.95, 2.0, 0.55]);
      s.add(P.sphere, '#ffffff', [0, 1.35, -0.2], null, [0.85, 0.55, 1.2]);
      s.add(P.sphere, '#a8dcff', [0, 1.45, -0.15], null, [0.8, 0.42, 1.0]);
      for (const x of [-0.85, 0.85]) for (const z of [-1.2, 1.2]) s.add(P.cyl, '#222', [x, 0.4, z], [0, 0, Math.PI / 2], [0.42, 0.3, 0.42]);
      s.add(P.sphereLo, '#fff6b0', [0.5, 0.8, 1.9], null, [0.18, 0.12, 0.08], true);
      s.add(P.sphereLo, '#fff6b0', [-0.5, 0.8, 1.9], null, [0.18, 0.12, 0.08], true);
    },
    mailbox(s) {
      s.add(P.cylLo, '#6b4a2b', [0, 0.55, 0], null, [0.07, 1.1, 0.07]);
      s.add(P.capsule, '#3c6fb5', [0, 1.2, 0], [Math.PI / 2, 0, 0], [0.2, 0.35, 0.2]);
      s.add(P.box, '#e33', [0.22, 1.35, 0.1], null, [0.03, 0.25, 0.1]);
    },
    hedge(s) {
      s.add(P.sphereLo, '#3c8f34', [0, 0.65, 0], null, [1.6, 0.85, 1.0]);
      s.add(P.sphereLo, '#47a33d', [0.8, 0.9, 0], null, [0.8, 0.6, 0.7]);
    },
    fleshpillar(s) {
      for (let i = 0; i < 5; i++) s.add(P.sphere, i % 2 ? '#d9677a' : '#c4505f', [Math.sin(i * 2.1) * 0.25, 1 + i * 1.75, Math.cos(i * 1.7) * 0.2], null, [1.5 - i * 0.12, 1.2, 1.5 - i * 0.12]);
      s.add(P.capsule, '#8a2337', [0.9, 4, 0.9], [0.3, 0, 0.2], [0.12, 4, 0.12]);
      s.add(P.capsule, '#8a2337', [-0.9, 5, 0.6], [-0.2, 0, -0.3], [0.1, 3.5, 0.1]);
      s.add(P.sphere, '#fffaf0', [0, 8.8, 0.9], null, [0.5, 0.5, 0.4]);
      s.add(P.sphereLo, '#1b1b1b', [0, 8.8, 1.25], null, [0.15, 0.15, 0.1]);
    },
    eyestalk(s) {
      s.add(P.cylLo, '#c9576b', [0, 2, 0], [0.1, 0, 0.08], [0.18, 4, 0.18]);
      s.add(P.sphere, '#fffaf0', [0.15, 4.4, 0.2], null, [0.6, 0.6, 0.6]);
      s.add(P.sphere, '#5bc0ff', [0.15, 4.45, 0.72], null, [0.27, 0.27, 0.12]);
      s.add(P.sphereLo, '#111', [0.15, 4.45, 0.8], null, [0.12, 0.12, 0.06]);
    },
    bonearch(s) {
      const arc = new T.TorusGeometry(3.4, 0.45, 8, 18, Math.PI);
      s.add(arc, '#efe6cc', [0, 4.2, 0], null, [1, 1.15, 1]);
      arc.dispose();
      for (const x of [-3.4, 3.4]) { s.add(P.cyl, '#efe6cc', [x, 2.1, 0], null, [0.45, 4.2, 0.45]); s.add(P.sphereLo, '#e2d6b4', [x, 0.3, 0], null, [0.8, 0.5, 0.8]); }
    },
    pustule(s) {
      s.add(P.sphereLo, '#b84a5d', [0, 0.35, 0], null, [1.3, 0.5, 1.3]);
      s.add(P.sphere, '#f4e27a', [0, 0.95, 0], null, [0.8, 0.75, 0.8]);
      s.add(P.sphereLo, '#fff6c0', [0.25, 1.4, 0.3], null, [0.2, 0.15, 0.2]);
    },
    mushroom(s) {
      s.add(P.cyl, '#efe2ff', [0, 4, 0], null, [0.75, 8, 0.75]);
      s.add(P.hemi, '#c04dff', [0, 7.8, 0], null, [4, 2.8, 4]);
      s.add(P.cyl, '#7a2cbf', [0, 7.8, 0], null, [3.9, 0.15, 3.9]);
      for (let i = 0; i < 7; i++) { const a = i * 0.9, r = 1.5 + (i % 3) * 0.7; s.add(P.sphereLo, '#7ffcff', [Math.cos(a) * r, 7.8 + Math.sqrt(Math.max(0, 1 - (r / 4) ** 2)) * 2.75, Math.sin(a) * r], null, [0.38, 0.2, 0.38], true); }
    },
    stall(s) {
      s.add(P.box, '#5e3d8f', [0, 0.55, 0], null, [3.6, 1.1, 1.8]);
      for (const x of [-1.7, 1.7]) for (const z of [-0.8, 0.8]) s.add(P.cylLo, '#2b1b47', [x, 1.6, z], null, [0.08, 3.2, 0.08]);
      for (let i = 0; i < 6; i++) s.add(P.box, i % 2 ? '#ff6fd0' : '#5ff8ff', [-1.5 + i * 0.6, 3.25, 0], [0.25, 0, 0], [0.6, 0.12, 2.3], i % 2 === 0);
      for (let i = 0; i < 4; i++) s.add(P.octa, ['#ffe066', '#6dff8a', '#ff7a5a', '#7ab8ff'][i], [-1.2 + i * 0.8, 1.35, 0.2], null, [0.22, 0.28, 0.22], true);
    },
    crate(s) {
      s.add(P.box, '#a07040', [0, 0.8, 0], null, [1.6, 1.6, 1.6]);
      s.add(P.box, '#6e4a2a', [0, 0.8, 0.81], null, [1.65, 0.2, 0.05]);
      s.add(P.box, '#6e4a2a', [0, 0.8, -0.81], null, [1.65, 0.2, 0.05]);
      s.add(P.box, '#5ff8ff', [0, 1.61, 0], null, [0.5, 0.04, 0.5], true);
    },
    lamp(s) {
      s.add(P.cylLo, '#2b1b47', [0, 2.3, 0], null, [0.1, 4.6, 0.1]);
      s.add(P.sphere, '#ff8af0', [0, 4.8, 0], null, [0.45, 0.45, 0.45], true);
      s.add(P.cone, '#2b1b47', [0, 5.25, 0], null, [0.5, 0.3, 0.5]);
    },
    crystal(s) {
      s.add(P.dodeca, '#6b6b78', [0, 0.3, 0], null, [1.1, 0.6, 1.1]);
      s.add(P.octa, '#7affea', [0, 1.9, 0], null, [0.55, 1.7, 0.55], true);
      s.add(P.octa, '#5ad8ff', [0.6, 1.2, 0.3], [0, 0, -0.5], [0.35, 1.0, 0.35], true);
      s.add(P.octa, '#b48aff', [-0.5, 1.0, -0.3], [0, 0, 0.6], [0.3, 0.9, 0.3], true);
    },
    rock(s) {
      s.add(P.dodeca, '#8c8c98', [0, 1.0, 0], null, [2.0, 1.4, 1.7]);
      s.add(P.dodeca, '#a0a0ac', [0.9, 1.9, 0.2], null, [0.9, 0.7, 0.8]);
    },
    rover(s) {
      s.add(P.box, '#e9e5d8', [0, 1.2, 0], null, [2.4, 0.9, 3.4]);
      s.add(P.box, '#c9a23a', [0, 1.9, -0.6], null, [1.6, 0.6, 1.4]);
      for (const x of [-1.3, 1.3]) for (const z of [-1.2, 0, 1.2]) s.add(P.cyl, '#333', [x, 0.5, z], [0, 0, Math.PI / 2], [0.5, 0.35, 0.5]);
      s.add(P.cylLo, '#888', [0.6, 2.6, 0.8], null, [0.06, 1.4, 0.06]);
      s.add(P.hemi, '#ddd', [0.6, 3.3, 0.8], [2.4, 0, 0], [0.6, 0.25, 0.6]);
      s.add(P.box, '#3a6ac9', [-0.7, 1.66, 1.2], null, [0.8, 0.05, 0.8], true);
    },
    antenna(s) {
      s.add(P.cylLo, '#9a9aa6', [0, 0.2, 0], null, [1, 0.4, 1]);
      s.add(P.cylLo, '#c8c8d0', [0, 4.5, 0], null, [0.18, 9, 0.18]);
      s.add(P.hemi, '#e8e8f0', [0, 7, 0.6], [1.9, 0, 0], [1.6, 0.6, 1.6]);
      s.add(P.sphereLo, '#ff3355', [0, 9.1, 0], null, [0.25, 0.25, 0.25], true);
    },
    // ----- Featherhold -----
    nest(s) {
      for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; s.add(P.capsule, i % 2 ? '#8a6233' : '#a37840', [Math.cos(a) * 2.4, 1.2, Math.sin(a) * 2.4], [0.3, -a, 1.3], [0.22, 1.6, 0.22]); }
      s.add(P.cyl, '#6e4a26', [0, 0.6, 0], null, [2.6, 1.2, 2.6]);
      for (let i = 0; i < 3; i++) s.add(P.sphere, '#f4efe4', [Math.cos(i * 2.1) * 0.8, 1.5, Math.sin(i * 2.1) * 0.8], null, [0.5, 0.65, 0.5]);
    },
    totem(s) {
      const cols = ['#c9733a', '#3c6fb5', '#e2483d', '#ffd84d'];
      for (let i = 0; i < 4; i++) {
        s.add(P.cyl, cols[i], [0, 0.8 + i * 1.5, 0], null, [0.75, 1.5, 0.75]);
        s.add(P.cone, '#f2a12c', [0, 0.9 + i * 1.5, 0.75], [Math.PI / 2, 0, 0], [0.25, 0.6, 0.2]);
        s.add(P.sphereLo, '#fff', [0.3, 1.2 + i * 1.5, 0.65], null, [0.14, 0.14, 0.1]);
        s.add(P.sphereLo, '#fff', [-0.3, 1.2 + i * 1.5, 0.65], null, [0.14, 0.14, 0.1]);
      }
      s.add(P.sphere, '#ffd84d', [1.0, 6.4, 0], [0, 0, -0.4], [1.0, 0.2, 0.4]);
      s.add(P.sphere, '#ffd84d', [-1.0, 6.4, 0], [0, 0, 0.4], [1.0, 0.2, 0.4]);
    },
    featherplant(s) {
      s.add(P.cylLo, '#7a5a2a', [0, 2.2, 0], [0.15, 0, 0], [0.06, 4.4, 0.06]);
      s.add(P.sphere, '#ffcf4d', [0, 3.2, 0.25], [0.15, 0, 0], [0.55, 2.0, 0.12]);
      s.add(P.sphere, '#ff8a3a', [0, 4.6, 0.45], [0.15, 0, 0], [0.35, 0.7, 0.1]);
    },
    rockspire(s) {
      s.add(P.cone, '#b98c4e', [0, 6, 0], null, [2.6, 12, 2.4]);
      s.add(P.dodeca, '#a27a42', [0.6, 1.2, 0.4], null, [2.4, 1.6, 2.2]);
      s.add(P.cyl, '#8fae4a', [0, 9.5, 0], null, [1.0, 0.25, 1.0]);
    },
    // ----- Landmarks -----
    lm_home(s) {
      s.add(P.box, '#f3e4c4', [0, 3.2, 0], null, [12, 6.4, 10]);
      const roof = new T.ConeGeometry(9.2, 4.2, 4, 1); roof.rotateY(Math.PI / 4);
      s.add(roof, '#5a6f96', [0, 8.5, 0], null, [1, 1, 0.84]); roof.dispose();
      s.add(P.box, '#8a5a2a', [0, 1.5, 5.02], null, [1.8, 3, 0.1]);
      for (const x of [-3.6, 3.6]) s.add(P.box, '#ffe9a8', [x, 3.6, 5.02], null, [2, 1.6, 0.1], true);
      s.add(P.box, '#d0c0a0', [0, 0.15, 6.2], null, [3, 0.3, 2.4]);
      s.add(P.box, '#a33a30', [3.6, 9.6, -1.5], null, [1, 2.4, 1]);
    },
    lm_garage(s) {
      s.add(P.box, '#d8d2c4', [0, 2.6, 0], null, [9, 5.2, 8]);
      s.add(P.box, '#6b7280', [0, 5.4, 0], null, [9.6, 0.5, 8.6]);
      s.add(P.box, '#3a3f4a', [0, 2.0, 4.02], null, [6, 4, 0.1]);
      for (let i = 0; i < 4; i++) s.add(P.box, '#59606e', [0, 0.6 + i * 1.0, 4.08], null, [6, 0.08, 0.05]);
      s.add(P.box, '#39ff6a', [0, 4.6, 4.1], null, [3.2, 0.6, 0.05], true);
      s.add(P.cyl, '#39ff6a', [3.6, 6.2, 2], null, [0.15, 1.2, 0.15], true);
      s.add(P.sphere, '#39ff6a', [3.6, 6.9, 2], null, [0.3, 0.3, 0.3], true);
    },
    lm_school(s) {
      s.add(P.box, '#c8504a', [0, 3.5, 0], null, [18, 7, 9]);
      s.add(P.box, '#e9e2d0', [0, 7.2, 0], null, [18.6, 0.5, 9.6]);
      for (let i = -3; i <= 3; i++) for (const y of [2, 5]) s.add(P.box, '#bfe6ff', [i * 2.4, y, 4.52], null, [1.5, 1.4, 0.1]);
      s.add(P.box, '#e9e2d0', [0, 1.6, 4.6], null, [3, 3.2, 0.3]);
      s.add(P.cylLo, '#cccccc', [7, 6, 6.5], null, [0.08, 12, 0.08]);
      s.add(P.box, '#3c6fb5', [7.9, 11, 6.5], null, [1.8, 1.0, 0.05]);
    },
    lm_hospital(s) {
      s.add(P.box, '#f4f6f8', [0, 3.8, 0], null, [14, 7.6, 10]);
      s.add(P.box, '#e2483d', [0, 6.2, 5.05], null, [3, 0.9, 0.08], true);
      s.add(P.box, '#e2483d', [0, 6.2, 5.05], null, [0.9, 3, 0.08], true);
      s.add(P.box, '#9fd6ff', [0, 1.6, 5.02], null, [3.4, 3.2, 0.1]);
      // A horse statue out front, in honour of the patients.
      s.add(P.capsule, '#a0703f', [4.5, 1.6, 7], [0, 0, Math.PI / 2], [0.5, 1.6, 0.5]);
      for (const x of [3.7, 5.3]) for (const z of [6.7, 7.3]) s.add(P.cylLo, '#a0703f', [x, 0.6, z], null, [0.12, 1.2, 0.12]);
      s.add(P.capsule, '#a0703f', [5.6, 2.4, 7], [0, 0, -0.6], [0.3, 0.9, 0.35]);
      s.add(P.box, '#3a2a1a', [5.4, 2.6, 7], [0, 0, -0.6], [0.15, 1.0, 0.1]);
    },
    lm_office(s) {
      s.add(P.box, '#9aa3ab', [0, 3.5, 0], null, [11, 7, 8]);
      for (let i = -2; i <= 2; i++) s.add(P.box, '#6b7280', [i * 2, 4.5, 4.02], null, [1.4, 3.5, 0.1]);
      s.add(P.box, '#59606e', [0, 1.4, 4.02], null, [2.2, 2.8, 0.1]);
      for (let i = 0; i < 5; i++) s.add(P.box, '#c9c9c9', [-3 + i * 1.5, 0.2, 6 + i * 0.1], null, [0.5, 0.4, 0.5]);
    },
    lm_forge(s) {
      s.add(P.sphere, '#b84a5d', [0, 2.6, 0], null, [6, 4, 5.5]);
      for (let i = 0; i < 6; i++) { const a = i * 1.05; s.add(P.sphereLo, '#d9677a', [Math.cos(a) * 4.5, 1.2, Math.sin(a) * 4.2], null, [1.6, 1.3, 1.6]); }
      s.add(P.sphere, '#ffb03a', [0, 2.2, 5.0], null, [2.2, 1.8, 0.8], true);
      s.add(P.cyl, '#7c1e34', [2.5, 6.5, -1], null, [0.8, 3, 0.8]);
      s.add(P.sphere, '#fff2e0', [-2.5, 6.4, 2.5], null, [1.0, 1.0, 1.0]);
      s.add(P.sphereLo, '#111', [-2.5, 6.4, 3.4], null, [0.35, 0.35, 0.2]);
    },
    lm_shipyard(s) {
      s.add(P.cyl, '#2b1b47', [0, 0.4, 0], null, [8, 0.8, 8]);
      s.add(P.cyl, '#5ff8ff', [0, 0.82, 0], null, [8.05, 0.05, 8.05], true);
      for (const x of [-6, 6]) s.add(P.box, '#5e3d8f', [x, 4.5, -4], null, [0.7, 9, 0.7]);
      s.add(P.box, '#5e3d8f', [0, 8.8, -4], null, [13, 0.7, 0.7]);
      s.add(P.cylLo, '#888', [2, 6.5, -4], null, [0.05, 4, 0.05]);
      // A saucer under construction.
      s.add(P.sphere, '#c9cfd6', [0, 2.2, 0], null, [4.5, 0.9, 4.5]);
      s.add(P.hemi, '#7fdcff', [0, 2.6, 0], null, [1.8, 1.4, 1.8], true);
      s.add(P.torus, '#ff6fd0', [0, 1.9, 0], [Math.PI / 2, 0, 0], [4.2, 4.2, 0.6], true);
    },
    lm_market(s) {
      s.add(P.cone, '#2b1b47', [0, 3.2, 0], null, [6, 6.4, 6]);
      s.add(P.cyl, '#1a1030', [0, 1, 0], null, [5, 2, 5]);
      s.add(P.box, '#ff6fd0', [0, 2.4, 5], null, [3, 0.5, 0.1], true);
      for (let i = 0; i < 5; i++) s.add(P.octa, ['#ffe066', '#6dff8a', '#ff7a5a', '#7ab8ff', '#ff6fd0'][i], [-2 + i, 1.2, 4.6], null, [0.25, 0.35, 0.25], true);
    },
    lm_refinery(s) {
      s.add(P.hemi, '#d8dde2', [0, 0, 0], null, [7, 6, 7]);
      s.add(P.cyl, '#7affea', [0, 6.5, 0], null, [0.7, 3, 0.7], true);
      s.add(P.octa, '#7affea', [0, 8.6, 0], null, [1, 1.6, 1], true);
      for (const a of [0, 2.1, 4.2]) s.add(P.cyl, '#9aa3ab', [Math.cos(a) * 6, 2, Math.sin(a) * 6], null, [1, 4, 1]);
      s.add(P.box, '#3a3f4a', [0, 1.4, 6.6], null, [2.6, 2.8, 0.6]);
    },
    lm_aerie(s) {
      s.add(P.cyl, '#c9a25a', [0, 1, 0], null, [7, 2, 7]);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; s.add(P.cyl, '#e8d6a8', [Math.cos(a) * 5.5, 6, Math.sin(a) * 5.5], null, [0.6, 10, 0.6]); }
      s.add(P.cyl, '#b98c4e', [0, 11.4, 0], null, [7.2, 0.8, 7.2]);
      s.add(P.cone, '#e2483d', [0, 13.5, 0], null, [5, 3.5, 5]);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; s.add(P.sphere, '#ffd84d', [Math.cos(a) * 3, 15.5, Math.sin(a) * 3], [0, -a, 0.6], [1.6, 0.25, 0.5]); }
    },
  };

  const modelCache = {};
  function propModel(type) {
    if (modelCache[type]) return modelCache[type];
    const s = new C.Shape();
    MODELS[type](s);
    return (modelCache[type] = s.build());
  }

  // ---------- Sky ----------
  function makeSky(dim) {
    const g = new T.SphereGeometry(600, 24, 12);
    const m = new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new T.Color(dim.sky[0]) }, bot: { value: new T.Color(dim.sky[1]) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y * 1.6 + 0.15, 0.0, 1.0); gl_FragColor = vec4(mix(bot, top, h), 1.0); }',
    });
    const sky = new T.Mesh(g, m);
    sky.renderOrder = -10;
    return sky;
  }

  function stars(n, r, color, size) {
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2;
      const y = Math.abs(u) * 0.95 + 0.05, s = Math.sqrt(1 - y * y);
      pos[i * 3] = Math.cos(a) * s * r; pos[i * 3 + 1] = y * r; pos[i * 3 + 2] = Math.sin(a) * s * r;
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
    return new T.Points(g, new T.PointsMaterial({ color, size, sizeAttenuation: false, fog: false, map: C.dotTexture, transparent: true, depthWrite: false }));
  }

  // Big things in the sky that make each dimension recognisable.
  function skyDecor(dim, group) {
    const add = (shape, pos) => { const m = C.meshOf(shape.build(), 0); m.position.set(pos[0], pos[1], pos[2]); m.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.fog = false; } }); group.add(m); return m; };
    if (dim.id === 'suburbia') {
      for (let i = 0; i < 14; i++) {
        const s = new C.Shape();
        for (let j = 0; j < 4; j++) s.add(P.sphereLo, '#ffffff', [j * 9 - 13, Math.sin(j * 2) * 2, (j % 2) * 4], null, [9, 5, 7], true);
        const a = i / 14 * Math.PI * 2, d = 300 + (i % 3) * 60;
        add(s, [Math.cos(a) * d, 110 + (i % 4) * 25, Math.sin(a) * d]);
      }
    } else if (dim.id === 'meatlands') {
      const s = new C.Shape();
      s.add(P.sphere, '#fff2e0', [0, 0, 0], null, [60, 60, 60], true);
      s.add(P.sphere, '#e0b020', [0, 0, 44], null, [30, 30, 20], true);
      s.add(P.sphere, '#120808', [0, 0, 56], null, [14, 14, 10], true);
      const eye = add(s, [-150, 190, -360]);
      eye.lookAt(0, 0, 0);
      group.userData.eye = eye;
      group.add(stars(300, 560, '#ffb0c0', 2));
    } else if (dim.id === 'bazaar') {
      const s1 = new C.Shape(); s1.add(P.sphere, '#ffd36b', [0, 0, 0], null, [55, 55, 55], true);
      add(s1, [-250, 210, -330]);
      const s2 = new C.Shape(); s2.add(P.sphere, '#7affea', [0, 0, 0], null, [30, 30, 30], true);
      add(s2, [180, 260, -380]);
      const ring = new T.Mesh(new T.TorusGeometry(80, 3, 6, 60), new T.MeshBasicMaterial({ color: '#ffb0f0', fog: false }));
      ring.position.set(-250, 210, -330); ring.rotation.set(1.2, 0.3, 0);
      group.add(ring);
      group.add(stars(900, 560, '#ffffff', 2));
    } else if (dim.id === 'featherhold') {
      for (let i = 0; i < 9; i++) {
        const s = new C.Shape();
        s.add(P.cone, '#b98c4e', [0, -14, 0], [Math.PI, 0, 0], [14, 26, 14], true);
        s.add(P.cyl, '#8fae4a', [0, 0, 0], null, [14, 2, 14], true);
        s.add(P.sphereLo, '#3f9a3a', [4, 4, 2], null, [5, 4, 5], true);
        const a = i / 9 * Math.PI * 2, d = 280 + (i % 3) * 70;
        add(s, [Math.cos(a) * d, 90 + (i % 4) * 30, Math.sin(a) * d]);
      }
      for (let i = 0; i < 10; i++) {
        const s = new C.Shape();
        for (let j = 0; j < 4; j++) s.add(P.sphereLo, '#fff6e0', [j * 9 - 13, Math.sin(j * 2) * 2, (j % 2) * 4], null, [9, 5, 7], true);
        const a = i / 10 * Math.PI * 2 + 0.3;
        add(s, [Math.cos(a) * 340, 150 + (i % 3) * 20, Math.sin(a) * 340]);
      }
    } else if (dim.id === 'moon') {
      const s = new C.Shape();
      s.add(P.sphere, '#2f6fd8', [0, 0, 0], null, [80, 80, 80], true);
      for (let i = 0; i < 9; i++) s.add(P.sphereLo, '#3fae4a', [Math.sin(i * 2.3) * 55, Math.cos(i * 1.7) * 50, 45], null, [26, 18, 14], true);
      s.add(P.sphere, '#ffffff', [0, 74, 10], null, [40, 10, 40], true);
      add(s, [260, 180, -380]);
      group.add(stars(2500, 560, '#ffffff', 2));
    }
  }

  // ---------- Terrain ----------
  function makeTerrain(dim) {
    const size = MM.WORLD_HALF * 2 + 120, seg = 150;
    const g = new T.PlaneGeometry(size, size, seg, seg);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    const c0 = new T.Color(dim.ground[0]), c1 = new T.Color(dim.ground[1]), c2 = new T.Color(dim.ground[2]);
    const road = new T.Color('#55595e'), side = new T.Color('#c9c4b6'), tmp = new T.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const y = MM.heightAt(dim.id, x, z);
      pos.setY(i, y);
      const n = MM.fbm(x * 0.05, z * 0.05, dim.seed + 99, 3);
      tmp.copy(c0).lerp(c1, Math.min(1, Math.max(0, (n - 0.35) * 3)));
      if (n < 0.38) tmp.lerp(c2, Math.min(1, (0.38 - n) * 6));
      if (dim.id === 'suburbia') {
        const rx = Math.abs(((x % 44) + 44) % 44 - 22), rz = Math.abs(((z % 44) + 44) % 44 - 22);
        const dRoad = Math.min(22 - rx, 22 - rz);
        if (dRoad < 3.2 && Math.max(Math.abs(x), Math.abs(z)) < 150) tmp.copy(road);
        else if (dRoad < 4.2 && Math.max(Math.abs(x), Math.abs(z)) < 150) tmp.copy(side);
        if (Math.hypot(x, z) < 12) tmp.copy(side).lerp(c1, 0.3);
      }
      if (dim.id === 'meatlands') {
        const v = Math.abs(Math.sin(x * 0.11 + Math.sin(z * 0.07) * 3) * Math.cos(z * 0.09 + Math.sin(x * 0.05) * 2));
        if (v < 0.05) tmp.set('#7c1e34');
      }
      if (dim.id === 'bazaar') {
        const gx = Math.abs(((x % 8) + 8) % 8 - 4), gz = Math.abs(((z % 8) + 8) % 8 - 4);
        if ((gx > 3.85 || gz > 3.85) && Math.hypot(x, z) < 60) tmp.set('#5ff8ff');
      }
      if (dim.id === 'moon') { const d = y / 10; tmp.multiplyScalar(1 + Math.max(-0.35, Math.min(0.15, d * 0.3))); }
      if (dim.id === 'featherhold') { const sl = Math.abs(MM.heightAt(dim.id, x + 1.5, z) - y) + Math.abs(MM.heightAt(dim.id, x, z + 1.5) - y); if (sl > 1.4) tmp.set(sl > 2.4 ? '#a27a42' : '#b98c4e'); else if (y > 6) tmp.lerp(new T.Color('#8fae4a'), 0.6); }
      for (const l of MM.LANDMARKS) if (l.dim === dim.id) { const d = Math.hypot(x - l.x, z - l.z); if (d < l.r + 3.5) tmp.copy(side).lerp(new T.Color(dim.ground[1]), 0.35); }
      cols[i * 3] = tmp.r; cols[i * 3 + 1] = tmp.g; cols[i * 3 + 2] = tmp.b;
    }
    g.setAttribute('color', new T.BufferAttribute(cols, 3));
    g.computeVertexNormals();
    const m = new T.Mesh(g, C.toonMat);
    return m;
  }

  // ---------- Kiosk ----------
  function makeKiosk(dim) {
    const s = new C.Shape();
    s.add(P.cyl, '#3a3f4a', [0, 0.25, 0], null, [3.2, 0.5, 3.2]);
    s.add(P.cyl, '#ffd84d', [0, 0.52, 0], null, [3.25, 0.08, 3.25]);
    for (const x of [-2.2, 2.2]) s.add(P.box, '#59606e', [x, 2.6, 0], null, [0.6, 4.4, 0.6]);
    s.add(P.box, '#59606e', [0, 4.9, 0], null, [5.0, 0.6, 0.7]);
    s.add(P.box, '#1d2230', [0, 1.6, -1.6], null, [1.4, 2.2, 0.6]);
    s.add(P.box, '#5ff8ff', [0, 2.0, -1.28], null, [1.1, 0.9, 0.04], true);
    const g = C.meshOf(s.build(), 0.06);
    const sign = C.makeTag('PORTAL KIOSK', '', 'Any dimension, free', '#ffd84d');
    sign.sprite.position.set(0, 6.2, 0); sign.sprite.scale.set(5, 1.25, 1);
    sign.draw(-1);
    g.add(sign.sprite);
    const ring = C.portalMesh('#ffd84d', 1.7);
    ring.position.set(0, 2.5, 0);
    g.add(ring);
    g.userData.ring = ring;
    return g;
  }

  // ---------- Portals ----------
  const portalGeo = new T.CircleGeometry(1, 48);
  C.portalMesh = function (color, size) {
    const m = new T.ShaderMaterial({
      transparent: true, side: T.DoubleSide, depthWrite: false,
      uniforms: { col: { value: new T.Color(color) }, t: { value: Math.random() * 10 }, open: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 col; uniform float t; uniform float open; varying vec2 vUv;
        void main(){
          vec2 p = (vUv - 0.5) * 2.0; float r = length(p); float a = atan(p.y, p.x);
          float wob = 0.9 + 0.06 * sin(a * 7.0 + t * 4.0) + 0.04 * sin(a * 13.0 - t * 6.0);
          float edge = wob * open;
          if (r > edge) discard;
          float sw = sin(a * 3.0 + r * 14.0 - t * 6.0) * 0.5 + 0.5;
          vec3 c = mix(col * 0.55, col, sw);
          c = mix(c, vec3(1.0), smoothstep(0.35, 0.0, r) * 0.55);
          float rim = smoothstep(edge - 0.16, edge, r);
          c = mix(c, col * 1.4 + 0.2, rim);
          if (r > edge - 0.035) c = vec3(0.07);
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    const mesh = new T.Mesh(portalGeo, m);
    mesh.scale.set(size, size * 1.35, 1);
    mesh.userData.tick = dt => { m.uniforms.t.value += dt; };
    return mesh;
  };

  // ---------- NPC models ----------
  const npcCache = {};
  // A local's look comes from the seed the server sends, so everyone sees the same person.
  const SKINS = { human: ['#ffe0c8', '#f2d2b6', '#e0b08c', '#c68a62', '#a8724f', '#6b4630'], alien: ['#9ad66b', '#7ec8e3', '#c49bff', '#5fd6b0', '#ff9bd2'],
    blob: ['#e07a85', '#d9677a', '#c4505f'], robot: ['#b4b4c0', '#9aa3ab', '#d8c060'], birdfolk: ['#f0d0a0', '#e8c49a', '#d9b98a'], beanling: ['#ffd447', '#ff9bd2', '#7ec8e3'] };
  C.npcLook = function (type, seed) {
    const H = MM.NPCS[type].human, r = MM.rng(seed >>> 0);
    const pk = a => a[Math.floor(r() * a.length)];
    const col = () => '#' + Math.floor(r() * 0xffffff).toString(16).padStart(6, '0');
    const look = MM.defaultLook();
    look.species = pk(H.species);
    look.top = pk(H.top); look.acc = pk(H.acc);
    look.eyes = H.eyes ? pk(H.eyes) : pk(['normal', 'normal', 'wide', 'sleepy']);
    look.hair = pk(MM.LOOK.hair); look.brow = pk(MM.LOOK.brow); look.mouth = pk(MM.LOOK.mouth);
    look.skin = pk(SKINS[look.species] || SKINS.human);
    for (const k of ['hairColor', 'topColor', 'shirtColor', 'pantsColor', 'shoeColor', 'accColor']) look[k] = col();
    const hr = H.height || [0.9, 1.2];
    look.height = hr[0] + r() * (hr[1] - hr[0]); look.width = 0.85 + r() * 0.4; look.head = 0.9 + r() * 0.35;
    return look;
  };
  C.npcModel = function (type, seed) {
    if (MM.NPCS[type].human) {
      const look = C.npcLook(type, seed || 1);
      const av = C.buildAvatar(look, type === 'invader' ? 'trooper' : type === 'birdcitizen' ? 'birdfolk' : 'joe');
      return { root: av.root, av };
    }
    if (!npcCache[type]) {
      const s = new C.Shape();
      if (type === 'meatblob') {
        s.add(P.sphere, '#d9677a', [0, 0.8, 0], null, [0.95, 0.8, 0.9]);
        for (let i = 0; i < 5; i++) s.add(P.sphereLo, '#c4505f', [Math.sin(i * 1.3) * 0.7, 0.5 + (i % 2) * 0.6, Math.cos(i * 1.3) * 0.6], null, [0.4, 0.35, 0.4]);
        s.add(P.sphere, '#fff', [0.3, 1.25, 0.7], null, [0.25, 0.25, 0.15]); s.add(P.sphere, '#fff', [-0.25, 1.1, 0.75], null, [0.18, 0.18, 0.12]);
        s.add(P.sphereLo, '#111', [0.3, 1.25, 0.82], null, [0.08, 0.08, 0.05]); s.add(P.sphereLo, '#111', [-0.25, 1.1, 0.86], null, [0.06, 0.06, 0.04]);
        s.add(P.sphereLo, '#3a0d0d', [0, 0.65, 0.82], null, [0.35, 0.18, 0.1]);
        for (let i = -1; i <= 1; i++) s.add(P.cone, '#fff8e0', [i * 0.14, 0.75, 0.86], [Math.PI, 0, 0], [0.05, 0.12, 0.05]);
      } else if (type === 'jelly') {
        s.add(P.hemi, '#7ffcff', [0, 0.7, 0], null, [0.95, 0.85, 0.95], true);
        s.add(P.sphereLo, '#ff8af0', [0, 0.95, 0], null, [0.35, 0.3, 0.35], true);
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; C.capsuleAt(s, '#5ad8ff', 0.06, 1.3, [Math.cos(a) * 0.55, -0.55, Math.sin(a) * 0.55], null, true); }
        s.add(P.sphereLo, '#111', [0.25, 1.0, 0.75], null, [0.08, 0.08, 0.05]); s.add(P.sphereLo, '#111', [-0.25, 1.0, 0.75], null, [0.08, 0.08, 0.05]);
      } else if (type === 'skyserpent') {
        for (let i = 0; i < 7; i++) s.add(P.sphere, i % 2 ? '#3fb6a8' : '#2a8f86', [0, 0.6 + Math.sin(i * 0.9) * 0.3, -i * 0.55], null, [0.45 - i * 0.04, 0.42 - i * 0.04, 0.5]);
        s.add(P.sphere, '#3fb6a8', [0, 0.75, 0.55], null, [0.55, 0.45, 0.65]);
        s.add(P.cone, '#ffd84d', [0, 1.15, 0.3], [-0.4, 0, 0], [0.12, 0.5, 0.12]);
        s.add(P.sphereLo, '#fff', [0.25, 0.9, 0.95], null, [0.12, 0.12, 0.08]); s.add(P.sphereLo, '#fff', [-0.25, 0.9, 0.95], null, [0.12, 0.12, 0.08]);
        s.add(P.sphereLo, '#111', [0.25, 0.9, 1.02], null, [0.05, 0.05, 0.03]); s.add(P.sphereLo, '#111', [-0.25, 0.9, 1.02], null, [0.05, 0.05, 0.03]);
        s.add(P.sphere, '#ffcf4d', [0.6, 0.8, 0.1], [0, 0, -0.5], [0.6, 0.1, 0.3]); s.add(P.sphere, '#ffcf4d', [-0.6, 0.8, 0.1], [0, 0, 0.5], [0.6, 0.1, 0.3]);
      } else if (type === 'mooncrab') {
        s.add(P.sphere, '#c9c9d6', [0, 0.55, 0], null, [0.85, 0.35, 0.7]);
        for (const sx of [-1, 1]) {
          for (let i = 0; i < 3; i++) s.add(P.capsule, '#9a9aa6', [sx * 0.9, 0.3, -0.35 + i * 0.35], [0, 0, sx * 1.0], [0.06, 0.4, 0.06]);
          s.add(P.sphereLo, '#e86b6b', [sx * 0.75, 0.6, 0.85], null, [0.28, 0.2, 0.32]);
          s.add(P.cylLo, '#9a9aa6', [sx * 0.2, 0.95, 0.45], null, [0.04, 0.4, 0.04]);
          s.add(P.sphereLo, '#fff', [sx * 0.2, 1.18, 0.45], null, [0.12, 0.12, 0.12]);
          s.add(P.sphereLo, '#111', [sx * 0.2, 1.18, 0.55], null, [0.05, 0.05, 0.03]);
        }
      }
      npcCache[type] = s.build();
    }
    const root = new T.Group();
    const m = C.meshOf(npcCache[type], 0.05);
    root.add(m);
    const sh = C.blobShadow(1.8); sh.position.y = 0.03; root.add(sh);
    root.userData.model = m;
    return { root };
  };

  // ---------- Pickups ----------
  let pickupModels = null;
  C.pickupModel = function (kind) {
    if (!pickupModels) {
      const s = new C.Shape();
      s.add(P.torus, '#aab3bd', [0, 0, 0], null, [0.32, 0.32, 0.6]);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; s.add(P.box, '#aab3bd', [Math.cos(a) * 0.38, Math.sin(a) * 0.38, 0], [0, 0, a], [0.14, 0.16, 0.12]); }
      s.add(P.cylLo, '#ffd84d', [0, 0, 0], [Math.PI / 2, 0, 0], [0.12, 0.14, 0.12], true);
      const c = new C.Shape();
      c.add(P.octa, '#7affea', [0, 0, 0], null, [0.3, 0.5, 0.3], true);
      const g = new C.Shape();
      g.add(P.sphere, '#ff7a8a', [0, 0, 0], null, [0.38, 0.32, 0.38]);
      g.add(P.sphereLo, '#ffb0ba', [0.12, 0.15, 0.2], null, [0.1, 0.08, 0.08], true);
      const pl = new C.Shape();
      pl.add(P.octa, '#ff6fd0', [0, 0, 0], null, [0.42, 0.42, 0.18], true);
      pl.add(P.octa, '#ffd0f4', [0, 0, 0], [0, 0, Math.PI / 4], [0.3, 0.3, 0.2], true);
      const f = new C.Shape();
      f.add(P.sphere, '#ffcf4d', [0, 0, 0], [0, 0, 0.4], [0.16, 0.55, 0.05]);
      f.add(P.cylLo, '#8a6233', [0.12, -0.45, 0], [0, 0, 0.4], [0.02, 0.4, 0.02]);
      pickupModels = { s: s.build(), c: c.build(), g: g.build(), p: pl.build(), f: f.build() };
    }
    const g = new T.Group();
    const m = C.meshOf(pickupModels[kind] || pickupModels.s, 0.03);
    g.add(m);
    g.userData.spin = m;
    return g;
  };

  // ---------- Turret ----------
  let turretModel = null;
  C.turretModel = function () {
    if (!turretModel) {
      const b = new C.Shape();
      b.add(P.cyl, '#59606e', [0, 0.3, 0], null, [0.7, 0.6, 0.7]);
      for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; b.add(P.cylLo, '#3a3f4a', [Math.cos(a) * 0.6, 0.15, Math.sin(a) * 0.6], [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5], [0.08, 0.6, 0.08]); }
      const h = new C.Shape();
      h.add(P.sphere, '#d8dde2', [0, 0, 0], null, [0.5, 0.42, 0.5]);
      h.add(P.cyl, '#3a3f4a', [0, 0.05, 0.55], [Math.PI / 2, 0, 0], [0.1, 0.7, 0.1]);
      h.add(P.sphereLo, '#ff4d4d', [0, 0.18, 0.35], null, [0.12, 0.08, 0.08], true);
      turretModel = { base: b.build(), head: h.build() };
    }
    const g = new T.Group();
    g.add(C.meshOf(turretModel.base, 0.04));
    const head = C.meshOf(turretModel.head, 0.04);
    head.position.y = 1.0;
    g.add(head);
    g.userData.head = head;
    return g;
  };

  // ---------- A whole dimension ----------
  C.buildDimension = function (dimId, quality) {
    const dim = MM.DIM_BY_ID[dimId];
    const group = new T.Group();
    group.add(makeSky(dim));
    skyDecor(dim, group);
    group.add(makeTerrain(dim));

    // Instanced props
    const props = MM.genProps(dimId);
    const byType = {};
    for (const p of props) (byType[p.type] || (byType[p.type] = [])).push(p);
    const slots = [];   // prop id -> { meshes, index, matrix }
    const m4 = new T.Matrix4(), q = new T.Quaternion(), v = new T.Vector3(), sc = new T.Vector3(), up = new T.Vector3(0, 1, 0);
    const tint = new T.Color(), white = new T.Color(1, 1, 1);
    const rand = MM.rng(dim.seed + 5);
    for (const type in byType) {
      const list = byType[type];
      const model = propModel(type);
      const meshes = [];
      const thick = type === 'house' ? 0.09 : 0.06;
      for (const [geo, mat] of [[model.lit, C.toonMat], [model.glow, C.glowMat]]) {
        if (!geo) continue;
        const im = new T.InstancedMesh(geo, mat, list.length);
        const om = new T.InstancedMesh(geo, C.outlineMat(thick), list.length);
        meshes.push(im, om);
      }
      list.forEach((p, i) => {
        q.setFromAxisAngle(up, p.rot);
        m4.compose(v.set(p.x, p.y - 0.05, p.z), q, sc.set(p.s, p.s, p.s));
        for (const im of meshes) im.setMatrixAt(i, m4);
        // Every lit and glowing instance gets a colour (white = as modelled): three.js
        // r149 shares one shader between instanced meshes of a material, so they must
        // all have instance colours or none.
        if (type === 'house' || type === 'car') tint.setHSL(rand(), type === 'car' ? 0.7 : 0.45, type === 'car' ? 0.55 : 0.82);
        else tint.setRGB(1, 1, 1);
        for (let k = 0; k < meshes.length; k += 2) meshes[k].setColorAt(i, k === 0 && model.lit ? tint : white);
        slots[p.id] = { meshes, index: i, matrix: m4.clone() };
      });
      for (const im of meshes) { im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; group.add(im); }
    }
    const zero = new T.Matrix4().makeScale(0, 0, 0);

    // Name signs over the landmarks.
    for (const l of MM.LANDMARKS) {
      if (l.dim !== dimId) continue;
      const tag = C.makeTag(l.name, '', '', '#ffd84d');
      tag.draw(-1);
      tag.sprite.scale.set(6, 1.5, 1);
      tag.sprite.position.set(l.x, MM.heightAt(dimId, l.x, l.z) + l.h + 2.2, l.z);
      group.add(tag.sprite);
    }

    const kiosk = makeKiosk(dim);
    kiosk.position.set(MM.KIOSK.x, MM.heightAt(dimId, MM.KIOSK.x, MM.KIOSK.z), MM.KIOSK.z);
    group.add(kiosk);

    // Lights
    const sun = new T.DirectionalLight(dim.sun, 0.9);
    sun.position.set(80, 140, 60);
    group.add(sun);
    group.add(new T.HemisphereLight(dim.ambient, shade(dim.ground[0], 0.6), 0.75));

    return {
      dim, group, kiosk,
      setAlive(id, alive) {
        const s = slots[id];
        if (!s) return;
        for (const im of s.meshes) { im.setMatrixAt(s.index, alive ? s.matrix : zero); im.instanceMatrix.needsUpdate = true; }
      },
      update(dt, t, camPos) {
        kiosk.userData.ring.userData.tick(dt);
        kiosk.userData.ring.rotation.y = Math.sin(t * 0.5) * 0.3;
        if (group.userData.eye && camPos) group.userData.eye.lookAt(camPos);
        group.children[0].position.copy(camPos || v.set(0, 0, 0));
      },
      dispose() {
        group.traverse(o => {
          if (o.geometry && !Object.values(C.prim).includes(o.geometry) && !o.userData.shared) {
            let shared = false;
            for (const k in modelCache) if (modelCache[k].lit === o.geometry || modelCache[k].glow === o.geometry) shared = true;
            if (!shared) o.geometry.dispose();
          }
        });
      },
    };
  };
})();

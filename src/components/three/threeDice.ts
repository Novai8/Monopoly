import * as THREE from 'three';
import { audio } from '../../utils/audio';

/**
 * Real Physical 3D Dice Simulation.
 * Provides authentic 6-sided dice with physical pips and dynamic tumbling physics
 * that naturally settle on server-authoritative numbers without screen scrolling.
 */
export class ThreeDiceSimulator {
  public die1Mesh: THREE.Mesh;
  public die2Mesh: THREE.Mesh;
  public group: THREE.Group;

  // Real-time dynamic physics variables
  private physics = {
    d1: { y: 1.2, vy: 0, x: -1.8, vx: 0, z: 0, vz: 0, rx: 0, ry: 0, rz: 0, bounces: 0 },
    d2: { y: 1.2, vy: 0, x: 1.8, vx: 0, z: 0, vz: 0, rx: 0, ry: 0, rz: 0, bounces: 0 },
    settled: true,
  };

  constructor() {
    this.group = new THREE.Group();
    const dieGeo = new THREE.BoxGeometry(2.1, 2.1, 2.1);
    const materials = this.createDiceMaterials();

    this.die1Mesh = new THREE.Mesh(dieGeo, materials);
    this.die1Mesh.castShadow = true;
    this.die1Mesh.receiveShadow = true;
    this.die1Mesh.position.set(-1.8, 1.1, 0);
    this.group.add(this.die1Mesh);

    this.die2Mesh = new THREE.Mesh(dieGeo, materials);
    this.die2Mesh.castShadow = true;
    this.die2Mesh.receiveShadow = true;
    this.die2Mesh.position.set(1.8, 1.1, 0);
    this.group.add(this.die2Mesh);
  }

  /**
   * Generates authentic physical textures with recessed dots.
   */
  private createDiceTexture(dots: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Polished ivory body with subtle beveled border
    ctx.fillStyle = '#fefce8';
    ctx.fillRect(0, 0, 128, 128);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 122, 122);

    const c = 64;
    const l = 34;
    const r = 94;
    const t = 34;
    const b = 94;

    const drawPip = (x: number, y: number, isCenterRed: boolean = false) => {
      // Drop shadow in pip hole
      ctx.fillStyle = '#00000033';
      ctx.beginPath();
      ctx.arc(x + 1.5, y + 1.5, 12, 0, Math.PI * 2);
      ctx.fill();

      // Pip fill
      ctx.fillStyle = isCenterRed ? '#e11d48' : '#0f172a';
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.fill();
    };

    if (dots === 1) {
      drawPip(c, c, true); // Crimson red ace
    } else if (dots === 2) {
      drawPip(l, t);
      drawPip(r, b);
    } else if (dots === 3) {
      drawPip(l, t);
      drawPip(c, c);
      drawPip(r, b);
    } else if (dots === 4) {
      drawPip(l, t);
      drawPip(r, t);
      drawPip(l, b);
      drawPip(r, b);
    } else if (dots === 5) {
      drawPip(l, t);
      drawPip(r, t);
      drawPip(c, c);
      drawPip(l, b);
      drawPip(r, b);
    } else if (dots === 6) {
      drawPip(l, t);
      drawPip(r, t);
      drawPip(l, c);
      drawPip(r, c);
      drawPip(l, b);
      drawPip(r, b);
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  private createDiceMaterials(): THREE.MeshStandardMaterial[] {
    // Standard cube face order in Three.js BoxGeometry:
    // [0]: +X (2), [1]: -X (5), [2]: +Y (3), [3]: -Y (4), [4]: +Z (1), [5]: -Z (6)
    return [
      new THREE.MeshStandardMaterial({ map: this.createDiceTexture(2), roughness: 0.25, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ map: this.createDiceTexture(5), roughness: 0.25, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ map: this.createDiceTexture(3), roughness: 0.25, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ map: this.createDiceTexture(4), roughness: 0.25, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ map: this.createDiceTexture(1), roughness: 0.25, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ map: this.createDiceTexture(6), roughness: 0.25, metalness: 0.05 }),
    ];
  }

  /**
   * Returns exact Euler angles [rx, ry, rz] to orient target face UP (+Y).
   */
  public getTargetRotation(val: number): [number, number, number] {
    switch (val) {
      case 1:
        return [-Math.PI / 2, 0, 0];
      case 6:
        return [Math.PI / 2, 0, 0];
      case 2:
        return [0, 0, Math.PI / 2];
      case 5:
        return [0, 0, -Math.PI / 2];
      case 3:
        return [0, 0, 0];
      case 4:
        return [Math.PI, 0, 0];
      default:
        return [0, 0, 0];
    }
  }

  /**
   * Physics update called on every animation frame.
   */
  public update(isRolling: boolean, targetDice: [number, number], time: number) {
    const p1 = this.physics.d1;
    const p2 = this.physics.d2;

    if (isRolling) {
      if (this.physics.settled) {
        // Spawn dice in mid-air with throw velocity & tumbling angular velocity
        p1.y = 13.5;
        p1.vy = -0.35;
        p1.x = -2.2;
        p1.z = (Math.random() - 0.5) * 1.5;
        p1.vx = 0.03 + (Math.random() - 0.5) * 0.04;
        p1.vz = 0.02 + (Math.random() - 0.5) * 0.04;
        p1.rx = 0.4 + Math.random() * 0.3;
        p1.ry = 0.3 + Math.random() * 0.3;
        p1.rz = 0.35 + Math.random() * 0.3;
        p1.bounces = 0;

        p2.y = 15.0;
        p2.vy = -0.45;
        p2.x = 2.2;
        p2.z = (Math.random() - 0.5) * 1.5;
        p2.vx = -0.03 + (Math.random() - 0.5) * 0.04;
        p2.vz = -0.02 + (Math.random() - 0.5) * 0.04;
        p2.rx = -0.4 - Math.random() * 0.3;
        p2.ry = 0.4 + Math.random() * 0.3;
        p2.rz = -0.35 - Math.random() * 0.3;
        p2.bounces = 0;

        this.physics.settled = false;
      }

      // Dynamic gravity & tumbling
      [p1, p2].forEach((p) => {
        p.vy -= 0.65; // Gravity
        p.y += p.vy * 0.16;
        p.x += p.vx;
        p.z += p.vz;

        // Table surface bounce at Y = 1.05
        if (p.y <= 1.05) {
          p.y = 1.05;
          if (p.bounces < 3 && Math.abs(p.vy) > 0.6) {
            p.vy = -p.vy * 0.42;
            p.bounces++;
            audio.play('dice-bounce');
          } else {
            p.vy = 0;
          }
        }

        p.rx *= 0.985;
        p.ry *= 0.985;
        p.rz *= 0.985;
      });

      this.die1Mesh.position.set(p1.x, p1.y, p1.z);
      this.die1Mesh.rotation.x += p1.rx;
      this.die1Mesh.rotation.y += p1.ry;
      this.die1Mesh.rotation.z += p1.rz;

      this.die2Mesh.position.set(p2.x, p2.y, p2.z);
      this.die2Mesh.rotation.x += p2.rx;
      this.die2Mesh.rotation.y += p2.ry;
      this.die2Mesh.rotation.z += p2.rz;
    } else {
      if (!this.physics.settled) {
        this.physics.settled = true;
        audio.play('dice-settle');
      }

      // Smooth settling towards authoritative values
      const rot1 = this.getTargetRotation(targetDice[0]);
      const rot2 = this.getTargetRotation(targetDice[1]);

      this.die1Mesh.position.y += (1.05 - this.die1Mesh.position.y) * 0.25;
      this.die1Mesh.position.x += (-1.8 - this.die1Mesh.position.x) * 0.2;
      this.die1Mesh.position.z += (0 - this.die1Mesh.position.z) * 0.2;
      this.die1Mesh.rotation.x += (rot1[0] - this.die1Mesh.rotation.x) * 0.25;
      this.die1Mesh.rotation.y += (rot1[1] - this.die1Mesh.rotation.y) * 0.25;
      this.die1Mesh.rotation.z += (rot1[2] - this.die1Mesh.rotation.z) * 0.25;

      this.die2Mesh.position.y += (1.05 - this.die2Mesh.position.y) * 0.25;
      this.die2Mesh.position.x += (1.8 - this.die2Mesh.position.x) * 0.2;
      this.die2Mesh.position.z += (0 - this.die2Mesh.position.z) * 0.2;
      this.die2Mesh.rotation.x += (rot2[0] - this.die2Mesh.rotation.x) * 0.25;
      this.die2Mesh.rotation.y += (rot2[1] - this.die2Mesh.rotation.y) * 0.25;
      this.die2Mesh.rotation.z += (rot2[2] - this.die2Mesh.rotation.z) * 0.25;
    }
  }
}

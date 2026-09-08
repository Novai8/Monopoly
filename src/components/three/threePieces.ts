import * as THREE from 'three';
import { CharacterId } from '../../types';
import { ThreeMaterialsManager } from './threeMaterials';

/**
 * High-detail 3D Player Miniature Figurines.
 * Gives each character piece a distinct physical silhouette and weighted metallic token base.
 */
export class ThreePieceBuilder {
  private materials = ThreeMaterialsManager.getInstance();

  public buildPawn(character: CharacterId, playerColor: string): THREE.Group {
    const root = new THREE.Group();

    // 1. Weighted Metallic Token Pedestal Base
    const baseMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(playerColor),
      roughness: 0.25,
      metalness: 0.35,
    });

    const pedestalGeo = new THREE.CylinderGeometry(0.48, 0.58, 0.18, 20);
    const pedestal = new THREE.Mesh(pedestalGeo, baseMat);
    pedestal.position.y = 0.09;
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    root.add(pedestal);

    // Polished Brass Rim Trim on Pedestal
    const rimGeo = new THREE.TorusGeometry(0.53, 0.045, 8, 24);
    const rim = new THREE.Mesh(rimGeo, this.materials.goldMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.14;
    root.add(rim);

    // 2. Character Model on top of Pedestal
    const model = this.createCharacterFigure(character, baseMat);
    model.position.y = 0.18;
    root.add(model);

    return root;
  }

  private createCharacterFigure(character: CharacterId, playerMat: THREE.MeshStandardMaterial): THREE.Group {
    const figure = new THREE.Group();

    switch (character) {
      case 'duck': {
        const duckMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 });
        const billMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 });

        // Body
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), duckMat);
        body.position.y = 0.36;
        body.scale.set(1, 0.85, 1.15);
        body.castShadow = true;
        figure.add(body);

        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), duckMat);
        head.position.set(0, 0.72, 0.18);
        head.castShadow = true;
        figure.add(head);

        // Orange Bill
        const bill = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.25, 8), billMat);
        bill.rotation.x = Math.PI / 2;
        bill.position.set(0, 0.68, 0.44);
        bill.castShadow = true;
        figure.add(bill);

        // Tail feather
        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.22, 6), duckMat);
        tail.rotation.x = -Math.PI / 3;
        tail.position.set(0, 0.45, -0.42);
        figure.add(tail);
        break;
      }

      case 'cat': {
        // Body
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.38, 0.65, 16), playerMat);
        body.position.y = 0.35;
        body.castShadow = true;
        figure.add(body);

        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), playerMat);
        head.position.set(0, 0.78, 0);
        head.castShadow = true;
        figure.add(head);

        // Pointy Ears
        const earGeo = new THREE.ConeGeometry(0.1, 0.22, 4);
        [-0.15, 0.15].forEach((ex) => {
          const ear = new THREE.Mesh(earGeo, playerMat);
          ear.position.set(ex, 1.08, 0);
          figure.add(ear);
        });

        // Curled Tail
        const tail = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 8, 16, Math.PI), playerMat);
        tail.position.set(0, 0.35, -0.32);
        tail.rotation.y = Math.PI / 2;
        figure.add(tail);
        break;
      }

      case 'penguin': {
        const coatMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });
        const bellyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
        const beakMat = new THREE.MeshStandardMaterial({ color: 0xf97316 });

        // Body
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 16), coatMat);
        body.position.y = 0.42;
        body.scale.set(0.9, 1.25, 0.9);
        body.castShadow = true;
        figure.add(body);

        // White Belly Patch
        const belly = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), bellyMat);
        belly.position.set(0, 0.38, 0.1);
        belly.scale.set(0.75, 1.15, 0.75);
        figure.add(belly);

        // Head & Beak
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), coatMat);
        head.position.set(0, 0.88, 0);
        figure.add(head);

        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 6), beakMat);
        beak.rotation.x = Math.PI / 2;
        beak.position.set(0, 0.84, 0.26);
        figure.add(beak);

        // Flippers
        [-0.32, 0.32].forEach((fx) => {
          const flipper = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.18), coatMat);
          flipper.position.set(fx, 0.48, 0);
          flipper.rotation.z = fx > 0 ? -0.2 : 0.2;
          figure.add(flipper);
        });
        break;
      }

      case 'robot': {
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.85, roughness: 0.25 });
        // Body
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.42), metalMat);
        body.position.y = 0.38;
        body.castShadow = true;
        figure.add(body);

        // Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.35), metalMat);
        head.position.set(0, 0.82, 0);
        head.castShadow = true;
        figure.add(head);

        // Antenna with glowing tip
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.28, 6), this.materials.goldMat);
        ant.position.set(0, 1.1, 0);
        figure.add(ant);

        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), this.materials.lampGlowMat);
        tip.position.set(0, 1.25, 0);
        figure.add(tip);

        // Visor Eyes
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.04), this.materials.lampGlowMat);
        visor.position.set(0, 0.84, 0.18);
        figure.add(visor);
        break;
      }

      case 'rocket': {
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
        const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 });

        // Fuselage
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 0.85, 12), bodyMat);
        body.position.y = 0.52;
        body.castShadow = true;
        figure.add(body);

        // Nosecone
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.45, 12), redMat);
        cone.position.set(0, 1.15, 0);
        cone.castShadow = true;
        figure.add(cone);

        // 3 Stabilizer Fins
        for (let i = 0; i < 3; i++) {
          const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.25), redMat);
          fin.position.set(0, 0.28, 0.25);
          const pivot = new THREE.Group();
          pivot.rotation.y = (i * Math.PI * 2) / 3;
          pivot.add(fin);
          figure.add(pivot);
        }
        break;
      }

      case 'car': {
        const carMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
        const wheelMat = this.materials.ironMat;

        // Chassis
        const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.22, 0.82), carMat);
        chassis.position.y = 0.24;
        chassis.castShadow = true;
        figure.add(chassis);

        // Cabin / Roof
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.44), carMat);
        cabin.position.set(0, 0.45, -0.05);
        cabin.castShadow = true;
        figure.add(cabin);

        // 4 Wheels
        [-0.26, 0.26].forEach((wx) => {
          [-0.24, 0.24].forEach((wz) => {
            const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 12), wheelMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(wx, 0.12, wz);
            figure.add(wheel);
          });
        });
        break;
      }

      case 'dino': {
        const dinoMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.4 });
        // Body
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 14, 14), dinoMat);
        body.position.set(0, 0.45, -0.08);
        body.scale.set(0.9, 1.2, 1.1);
        body.castShadow = true;
        figure.add(body);

        // Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.4), dinoMat);
        head.position.set(0, 0.85, 0.15);
        head.castShadow = true;
        figure.add(head);

        // Spines
        for (let s = 0; s < 4; s++) {
          const spine = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 4), this.materials.goldMat);
          spine.position.set(0, 0.5 + s * 0.14, -0.28);
          spine.rotation.x = -Math.PI / 4;
          figure.add(spine);
        }
        break;
      }

      case 'crown': {
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.45, 8), this.materials.goldMat);
        crown.position.y = 0.32;
        crown.castShadow = true;
        figure.add(crown);

        // Velvet Inner Cushion
        const cushionMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.6 });
        const cushion = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 14), cushionMat);
        cushion.position.y = 0.35;
        figure.add(cushion);

        // Crown Spikes
        for (let i = 0; i < 6; i++) {
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.25, 4), this.materials.goldMat);
          const angle = (i * Math.PI * 2) / 6;
          spike.position.set(Math.cos(angle) * 0.38, 0.62, Math.sin(angle) * 0.38);
          figure.add(spike);
        }
        break;
      }

      case 'mushroom': {
        // Stem
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.55, 12), this.materials.sidewalkMat);
        stem.position.y = 0.32;
        stem.castShadow = true;
        figure.add(stem);

        // Red Cap with White Dots
        const capMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 });
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
        cap.position.y = 0.58;
        cap.castShadow = true;
        figure.add(cap);
        break;
      }

      case 'chest': {
        const chest = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.4), this.materials.doorWoodMat);
        chest.position.y = 0.28;
        chest.castShadow = true;
        figure.add(chest);

        const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.55, 12, 1, false, 0, Math.PI), this.materials.doorWoodMat);
        lid.rotation.z = Math.PI / 2;
        lid.position.y = 0.48;
        figure.add(lid);

        // Gold Bands
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.08, 0.42), this.materials.goldMat);
        band.position.y = 0.32;
        figure.add(band);
        break;
      }

      default: {
        // Classic Chess-Pawn Figurine silhouette
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 0.65, 16), playerMat);
        stem.position.y = 0.42;
        stem.castShadow = true;
        figure.add(stem);

        const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), playerMat);
        sphere.position.y = 0.88;
        sphere.castShadow = true;
        figure.add(sphere);
        break;
      }
    }

    return figure;
  }
}

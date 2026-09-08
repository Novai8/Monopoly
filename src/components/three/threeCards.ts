import * as THREE from 'three';
import { Card } from '../../types';

/**
 * Physical 3D Card Object.
 * Renders a physical card with thickness and shadow that rises, rotates, flips,
 * and reveals the card title and event info when drawn.
 */
export class ThreeCardAnimator {
  public group: THREE.Group;
  private cardMesh: THREE.Mesh | null = null;
  private currentCardId: string | null = null;
  private animProgress: number = 0; // 0 = hidden, 1 = fully revealed & hovering

  constructor() {
    this.group = new THREE.Group();
  }

  public update(drawnCard: Card | null, delta: number) {
    if (drawnCard) {
      if (this.currentCardId !== drawnCard.id) {
        this.currentCardId = drawnCard.id;
        this.animProgress = 0;
        this.recreateCard(drawnCard);
      }

      // Smooth rise & flip animation
      this.animProgress = Math.min(1, this.animProgress + delta * 2.2);
    } else {
      this.animProgress = Math.max(0, this.animProgress - delta * 3.5);
      if (this.animProgress <= 0) {
        this.currentCardId = null;
      }
    }

    if (this.cardMesh) {
      this.cardMesh.visible = this.animProgress > 0.01;

      // Parabolic elevation
      const targetY = 0.5 + this.animProgress * 4.2;
      this.cardMesh.position.y = targetY;

      // Smooth 180 flip around Y from back to front
      const flipAngle = Math.PI * (1 - this.animProgress);
      // Subtle float wobble
      const wobble = Math.sin(Date.now() * 0.003) * 0.08;
      this.cardMesh.rotation.y = flipAngle + wobble;
      this.cardMesh.rotation.x = -Math.PI / 10; // angled toward camera
    }
  }

  private recreateCard(card: Card) {
    this.group.clear();

    const cardW = 3.6;
    const cardH = 4.8;
    const cardDepth = 0.08;

    const geo = new THREE.BoxGeometry(cardW, cardH, cardDepth);

    // Front texture: Canvas with parchment, title, icon, and description
    const frontTex = this.createCardFrontTexture(card);
    const backTex = this.createCardBackTexture(card.deck);

    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.8,
      roughness: 0.3,
    });

    const frontMat = new THREE.MeshStandardMaterial({
      map: frontTex,
      roughness: 0.35,
      metalness: 0.1,
    });

    const backMat = new THREE.MeshStandardMaterial({
      map: backTex,
      roughness: 0.35,
      metalness: 0.1,
    });

    const materials = [
      edgeMat, // Right
      edgeMat, // Left
      edgeMat, // Top
      edgeMat, // Bottom
      frontMat, // Front (+Z)
      backMat, // Back (-Z)
    ];

    const mesh = new THREE.Mesh(geo, materials);
    mesh.castShadow = true;
    mesh.position.set(0, 0.5, 0);
    this.group.add(mesh);
    this.cardMesh = mesh;
  }

  private createCardFrontTexture(card: Card): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 480;
    const ctx = canvas.getContext('2d')!;

    // Parchment cream card background
    ctx.fillStyle = '#fefce8';
    ctx.fillRect(0, 0, 360, 480);

    // Rich ornate gold border
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 344, 464);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 14, 332, 452);

    // Header Deck Badge
    const isEvent = card.deck === 'event';
    ctx.fillStyle = isEvent ? '#be185d' : '#0284c7';
    ctx.beginPath();
    ctx.roundRect(40, 24, 280, 42, 8);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Cinzel", "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isEvent ? 'LUCKY EVENT CARD' : 'TOWN COUNCIL PERK', 180, 52);

    // Title
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 24px "Cinzel", "Outfit", sans-serif';
    ctx.fillText(card.title, 180, 115);

    // Divider
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 135);
    ctx.lineTo(320, 135);
    ctx.stroke();

    // Description text (wrapped)
    ctx.fillStyle = '#475569';
    ctx.font = '18px "Outfit", sans-serif';
    ctx.textAlign = 'center';

    const words = card.description.split(' ');
    let line = '';
    let y = 175;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > 280 && n > 0) {
        ctx.fillText(line, 180, y);
        line = words[n] + ' ';
        y += 28;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 180, y);

    // Bottom decorative seal
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(180, 410, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('★', 180, 416);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  private createCardBackTexture(deck: 'event' | 'community'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 480;
    const ctx = canvas.getContext('2d')!;

    // Deep jewel tone back (burgundy for event, sapphire for community)
    ctx.fillStyle = deck === 'event' ? '#831843' : '#0c4a6e';
    ctx.fillRect(0, 0, 360, 480);

    // Golden frame
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, 340, 460);

    // Center Emblem
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(180, 240, 65, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = deck === 'event' ? '#831843' : '#0c4a6e';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(deck === 'event' ? '?' : '🏛', 180, 240);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }
}

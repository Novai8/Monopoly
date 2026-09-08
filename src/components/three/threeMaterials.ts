import * as THREE from 'three';
import { PropertyGroupColor } from '../../types';

// Materials and texture cache for high performance
export class ThreeMaterialsManager {
  private static instance: ThreeMaterialsManager;

  // Shared basic materials
  public tableWoodMat: THREE.MeshStandardMaterial;
  public tableRimMat: THREE.MeshStandardMaterial;
  public roadAsphaltMat: THREE.MeshStandardMaterial;
  public roadLineMat: THREE.MeshBasicMaterial;
  public crosswalkMat: THREE.MeshBasicMaterial;
  public sidewalkMat: THREE.MeshStandardMaterial;
  public curbMat: THREE.MeshStandardMaterial;
  public grassMat: THREE.MeshStandardMaterial;
  public dirtMat: THREE.MeshStandardMaterial;
  public sandMat: THREE.MeshStandardMaterial;
  public snowMat: THREE.MeshStandardMaterial;
  public waterMat: THREE.MeshStandardMaterial;
  public windowGlassMat: THREE.MeshStandardMaterial;
  public windowLitMat: THREE.MeshStandardMaterial;
  public doorWoodMat: THREE.MeshStandardMaterial;
  public chimneyMat: THREE.MeshStandardMaterial;
  public brassMat: THREE.MeshStandardMaterial;
  public ironMat: THREE.MeshStandardMaterial;
  public goldMat: THREE.MeshStandardMaterial;
  public lampGlowMat: THREE.MeshStandardMaterial;
  public picketFenceMat: THREE.MeshStandardMaterial;

  // Textures cache
  private signTextureCache = new Map<string, THREE.CanvasTexture>();

  private constructor() {
    // Tabletop
    this.tableWoodMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      roughness: 0.6,
      metalness: 0.1,
    });

    this.tableRimMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.45,
      metalness: 0.25,
    });

    // Roads & Pedestrians
    this.roadAsphaltMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.85,
      metalness: 0.05,
    });

    this.roadLineMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
    });

    this.crosswalkMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });

    this.sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.75,
      metalness: 0.05,
    });

    this.curbMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.8,
    });

    // Grounds
    this.grassMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.9,
    });

    this.dirtMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.95,
    });

    this.sandMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      roughness: 0.85,
    });

    this.snowMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.4,
      metalness: 0.1,
    });

    this.waterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.15,
      metalness: 0.4,
      transparent: true,
      opacity: 0.85,
    });

    // Buildings & Details
    this.windowGlassMat = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      roughness: 0.1,
      metalness: 0.7,
      transparent: true,
      opacity: 0.8,
    });

    this.windowLitMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfef08a,
      emissiveIntensity: 0.65,
      roughness: 0.3,
    });

    this.doorWoodMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.65,
    });

    this.chimneyMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      roughness: 0.8,
    });

    this.brassMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.85,
      roughness: 0.25,
    });

    this.ironMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.75,
      roughness: 0.35,
    });

    this.goldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.9,
      roughness: 0.2,
    });

    this.lampGlowMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfef08a,
      emissiveIntensity: 1.0,
      roughness: 0.2,
    });

    this.picketFenceMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.6,
    });
  }

  public static getInstance(): ThreeMaterialsManager {
    if (!ThreeMaterialsManager.instance) {
      ThreeMaterialsManager.instance = new ThreeMaterialsManager();
    }
    return ThreeMaterialsManager.instance;
  }

  /**
   * Creates a crisp physical 3D street sign or building plaque with the property name.
   */
  public getSignTexture(text: string, groupColor?: PropertyGroupColor): THREE.CanvasTexture {
    const key = `${text}_${groupColor || 'none'}`;
    if (this.signTextureCache.has(key)) {
      return this.signTextureCache.get(key)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 72;
    const ctx = canvas.getContext('2d')!;

    const groupHexMap: Record<string, string> = {
      amber: '#b45309',
      cyan: '#0284c7',
      rose: '#be185d',
      orange: '#c2410c',
      crimson: '#b91c1c',
      emerald: '#047857',
      violet: '#6d28d9',
      indigo: '#4338ca',
      teal: '#0f766e',
      slate: '#334155',
    };

    const headerColor = groupColor ? groupHexMap[groupColor] || '#475569' : '#1e293b';

    // Sign background (rich enamel / brass plaque look)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(2, 2, 252, 68, 8);
    ctx.fill();

    // Metallic gold or silver border
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Top group color banner strip
    ctx.fillStyle = headerColor;
    ctx.beginPath();
    ctx.roundRect(6, 6, 244, 16, [6, 6, 0, 0]);
    ctx.fill();

    // Gold divider
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(6, 23);
    ctx.lineTo(250, 23);
    ctx.stroke();

    // Property name text
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px "Cinzel", "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let displayTitle = text.toUpperCase();
    if (displayTitle.length > 18) {
      ctx.font = 'bold 16px "Outfit", sans-serif';
    }
    if (displayTitle.length > 24) {
      displayTitle = displayTitle.slice(0, 22) + '...';
    }

    ctx.fillText(displayTitle, 128, 48);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    this.signTextureCache.set(key, texture);
    return texture;
  }
}

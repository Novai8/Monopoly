import * as THREE from 'three';
import { BoardTile, PropertyGroupColor } from '../../types';
import { ThreeMaterialsManager } from './threeMaterials';

/**
 * Procedural miniature building and prop generator.
 * Builds rich, varied 3D tabletop miniatures for properties, stations, utilities, and landmarks.
 */
export class ThreeBuildingBuilder {
  private materials = ThreeMaterialsManager.getInstance();

  // Roof color palettes per property group
  private groupRoofPalette: Record<string, number[]> = {
    amber: [0xb45309, 0x92400e, 0x78350f],
    cyan: [0x0284c7, 0x0369a1, 0x075985],
    rose: [0xbe185d, 0x9d174d, 0x831843],
    orange: [0xc2410c, 0x9a3412, 0x7c2d12],
    crimson: [0xb91c1c, 0x991b1b, 0x7f1d1d],
    emerald: [0x047857, 0x065f46, 0x064e3b],
    violet: [0x6d28d9, 0x5b21b6, 0x4c1d95],
    indigo: [0x4338ca, 0x3730a3, 0x312e81],
    teal: [0x0f766e, 0x115e59, 0x134e4a],
    slate: [0x334155, 0x1e293b, 0x0f172a],
  };

  // Wall color palettes
  private wallColors: number[] = [
    0xf8fafc, // warm white plaster
    0xf1f5f9, // cream
    0xe2e8f0, // pale stone
    0xfef08a, // pastel buttercup
    0xfed7aa, // warm terracotta
    0xdbeafe, // pale blue
    0xdcfce7, // mint
  ];

  /**
   * Main builder method for a board tile location.
   */
  public buildTileLocation(
    tile: BoardTile,
    level: number = 0, // 0 = plot, 1-4 = houses, 5 = hotel/landmark
    theme: string = 'classic-town',
    tileSize: number = 2.1,
    ownerColor?: string
  ): THREE.Group {
    const root = new THREE.Group();
    root.userData = { tileId: tile.id };

    // 1. Physical Location Signboard / Plaque
    const sign = this.buildPropertySign(tile.name, tile.group, tileSize);
    root.add(sign);

    // 2. Base Ground & Foundation
    const ground = this.buildTileGround(tile, tileSize, theme);
    root.add(ground);

    // 3. Location specific 3D architecture
    let structure: THREE.Group;

    if (tile.type === 'start') {
      structure = this.buildStartArch(tileSize);
    } else if (tile.type === 'detention') {
      structure = this.buildDetentionBuilding(tileSize);
    } else if (tile.type === 'rest') {
      structure = this.buildRestPark(tileSize);
    } else if (tile.type === 'go-to-detention') {
      structure = this.buildGoToDetentionBooth(tileSize);
    } else if (tile.type === 'station') {
      structure = this.buildStation(tile.name, tileSize);
    } else if (tile.type === 'utility') {
      structure = this.buildUtility(tile.name, tileSize);
    } else if (tile.type === 'community') {
      structure = this.buildTownCouncilBuilding(tileSize);
    } else if (tile.type === 'event') {
      structure = this.buildLuckyEventPedestal(tileSize);
    } else if (tile.type === 'tax') {
      structure = this.buildTaxOffice(tileSize);
    } else {
      // Standard Property: Categorize by name & group
      const name = tile.name.toLowerCase();
      if (name.includes('harbor') || name.includes('lake') || name.includes('bay')) {
        structure = this.buildHarborLocation(level, tile.group, tileSize, ownerColor);
      } else if (name.includes('market') || name.includes('bazaar') || name.includes('plaza')) {
        structure = this.buildMarketLocation(level, tile.group, tileSize, ownerColor);
      } else if (name.includes('shop') || name.includes('court') || name.includes('boulevard')) {
        structure = this.buildCommercialShop(level, tile.group, tileSize, ownerColor);
      } else {
        structure = this.buildResidentialHouse(level, tile.group, tileSize, tile.id, ownerColor);
      }
    }

    root.add(structure);
    return root;
  }

  /**
   * Generates a physical wooden or metal street sign plaque directly in the 3D world.
   */
  private buildPropertySign(name: string, group?: PropertyGroupColor, tileSize: number = 2.1): THREE.Group {
    const groupNode = new THREE.Group();

    const signWidth = tileSize * 0.88;
    const signHeight = tileSize * 0.26;
    const signDepth = 0.05;

    // Post / Stake
    const postGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.5, 8);
    const postMat = this.materials.ironMat;
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(0, 0.25, tileSize * 0.42);
    post.castShadow = true;
    groupNode.add(post);

    // Physical Sign Plaque
    const plaqueGeo = new THREE.BoxGeometry(signWidth, signHeight, signDepth);
    const signTexture = this.materials.getSignTexture(name, group);

    const plaqueMaterials = [
      this.materials.brassMat, // Right
      this.materials.brassMat, // Left
      this.materials.brassMat, // Top
      this.materials.brassMat, // Bottom
      new THREE.MeshStandardMaterial({
        map: signTexture,
        roughness: 0.25,
        metalness: 0.15,
      }), // Front (+Z)
      this.materials.brassMat, // Back (-Z)
    ];

    const plaque = new THREE.Mesh(plaqueGeo, plaqueMaterials);
    plaque.position.set(0, 0.48, tileSize * 0.42);
    plaque.rotation.x = -Math.PI / 12; // Slight upward tilt for camera readability
    plaque.castShadow = true;
    groupNode.add(plaque);

    return groupNode;
  }

  /**
   * Builds the foundation ground plot, sidewalk curb, and road cross-section for the tile.
   */
  private buildTileGround(tile: BoardTile, tileSize: number, theme: string): THREE.Group {
    const group = new THREE.Group();

    const isCorner =
      tile.type === 'start' ||
      tile.type === 'detention' ||
      tile.type === 'rest' ||
      tile.type === 'go-to-detention';

    const width = isCorner ? tileSize * 1.3 : tileSize;
    const depth = isCorner ? tileSize * 1.3 : tileSize;
    const height = 0.4;

    // 1. Tabletop Slot / Foundation slab
    const slabGeo = new THREE.BoxGeometry(width * 0.98, height, depth * 0.98);
    let slabColor = 0xdbeafe;
    if (theme === 'winter-town') slabColor = 0xf8fafc;
    else if (theme === 'seaside' || theme === 'island') slabColor = 0xfef08a;
    else if (theme === 'countryside') slabColor = 0x78350f;
    else slabColor = 0x1e293b;

    const slabMat = new THREE.MeshStandardMaterial({
      color: slabColor,
      roughness: 0.7,
      metalness: 0.1,
    });
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.position.y = height / 2;
    slab.receiveShadow = true;
    group.add(slab);

    // 2. Sidewalk paving border
    const sidewalkGeo = new THREE.BoxGeometry(width * 0.94, 0.05, depth * 0.94);
    const sidewalk = new THREE.Mesh(sidewalkGeo, this.materials.sidewalkMat);
    sidewalk.position.y = height + 0.025;
    sidewalk.receiveShadow = true;
    group.add(sidewalk);

    // 3. Mini road strip along the front of the tile
    const roadGeo = new THREE.BoxGeometry(width * 0.94, 0.06, depth * 0.22);
    const road = new THREE.Mesh(roadGeo, this.materials.roadAsphaltMat);
    road.position.set(0, height + 0.03, depth * 0.35);
    road.receiveShadow = true;
    group.add(road);

    // 4. White road lane dashed markings
    if (!isCorner) {
      const lineGeo = new THREE.BoxGeometry(width * 0.3, 0.07, 0.04);
      const line = new THREE.Mesh(lineGeo, this.materials.roadLineMat);
      line.position.set(0, height + 0.04, depth * 0.35);
      group.add(line);
    }

    return group;
  }

  // ==========================================
  // RESIDENTIAL PROPERTIES (Houses / Manors)
  // ==========================================
  private buildResidentialHouse(
    level: number,
    group?: PropertyGroupColor,
    tileSize: number = 2.1,
    seed: number = 0,
    ownerColor?: string
  ): THREE.Group {
    const houseGroup = new THREE.Group();
    const roofColor = this.getRoofColor(group, seed);
    const wallColor = this.wallColors[seed % this.wallColors.length];

    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.5 });
    const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.3 });

    // Center building on the property plot (back half, away from the road sign)
    const backZ = -tileSize * 0.12;

    if (level === 0) {
      // Level 0: Unimproved building plot with surveyor pegs, green lawn & "FOR SALE" marker
      const lawnGeo = new THREE.BoxGeometry(tileSize * 0.8, 0.04, tileSize * 0.55);
      const lawn = new THREE.Mesh(lawnGeo, this.materials.grassMat);
      lawn.position.set(0, 0.45, backZ);
      lawn.receiveShadow = true;
      houseGroup.add(lawn);

      // 4 wooden surveyor boundary stakes
      const stakeGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.25, 6);
      const stakeMat = this.materials.doorWoodMat;
      [
        [-tileSize * 0.36, backZ - tileSize * 0.22],
        [tileSize * 0.36, backZ - tileSize * 0.22],
        [-tileSize * 0.36, backZ + tileSize * 0.22],
        [tileSize * 0.36, backZ + tileSize * 0.22],
      ].forEach(([sx, sz]) => {
        const stake = new THREE.Mesh(stakeGeo, stakeMat);
        stake.position.set(sx, 0.55, sz);
        houseGroup.add(stake);
      });

      // Small stone pathway & bush
      const bush = this.createBush(tileSize * 0.25, 0.45, backZ - 0.1, 0.25);
      houseGroup.add(bush);
      return houseGroup;
    }

    // LEVEL 1: Cozy Cottage
    if (level === 1) {
      const houseW = 0.55;
      const houseH = 0.5;
      const houseD = 0.5;

      const walls = new THREE.Mesh(new THREE.BoxGeometry(houseW, houseH, houseD), wallMat);
      walls.position.set(0, 0.45 + houseH / 2, backZ);
      walls.castShadow = true;
      walls.receiveShadow = true;
      houseGroup.add(walls);

      // Pitched Gable Roof
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.38, 4), roofMat);
      roof.rotation.y = Math.PI / 4;
      roof.position.set(0, 0.45 + houseH + 0.19, backZ);
      roof.castShadow = true;
      houseGroup.add(roof);

      // Chimney
      const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.12), this.materials.chimneyMat);
      chimney.position.set(0.18, 0.45 + houseH + 0.2, backZ + 0.1);
      chimney.castShadow = true;
      houseGroup.add(chimney);

      // Front door with step
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.25, 0.04), this.materials.doorWoodMat);
      door.position.set(0, 0.45 + 0.13, backZ + houseD / 2 + 0.02);
      houseGroup.add(door);

      // Windows
      const win1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.03), this.materials.windowLitMat);
      win1.position.set(-0.16, 0.45 + 0.24, backZ + houseD / 2 + 0.02);
      const win2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.03), this.materials.windowLitMat);
      win2.position.set(0.16, 0.45 + 0.24, backZ + houseD / 2 + 0.02);
      houseGroup.add(win1);
      houseGroup.add(win2);

      // Front garden bush & fence
      houseGroup.add(this.createBush(-0.3, 0.45, backZ + 0.18, 0.18));
      if (ownerColor) houseGroup.add(this.createMailbox(0.3, 0.45, backZ + 0.25, ownerColor));

      return houseGroup;
    }

    // LEVEL 2: Improved Two-Story Family Home with Porch
    if (level === 2) {
      const houseW = 0.72;
      const houseH = 0.75;
      const houseD = 0.58;

      const walls = new THREE.Mesh(new THREE.BoxGeometry(houseW, houseH, houseD), wallMat);
      walls.position.set(-0.05, 0.45 + houseH / 2, backZ);
      walls.castShadow = true;
      walls.receiveShadow = true;
      houseGroup.add(walls);

      // Roof
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.68, 0.45, 4), roofMat);
      roof.rotation.y = Math.PI / 4;
      roof.position.set(-0.05, 0.45 + houseH + 0.22, backZ);
      roof.castShadow = true;
      houseGroup.add(roof);

      // Front Porch Veranda
      const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 0.22), roofMat);
      porchRoof.position.set(0.08, 0.45 + 0.4, backZ + houseD / 2 + 0.1);
      houseGroup.add(porchRoof);

      const pillarMat = this.materials.picketFenceMat;
      const pillar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), pillarMat);
      pillar1.position.set(-0.07, 0.45 + 0.2, backZ + houseD / 2 + 0.19);
      const pillar2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), pillarMat);
      pillar2.position.set(0.23, 0.45 + 0.2, backZ + houseD / 2 + 0.19);
      houseGroup.add(pillar1);
      houseGroup.add(pillar2);

      // Chimney
      const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.45, 0.14), this.materials.chimneyMat);
      chimney.position.set(-0.25, 0.45 + houseH + 0.25, backZ - 0.1);
      chimney.castShadow = true;
      houseGroup.add(chimney);

      // Multiple Windows
      for (let w = 0; w < 4; w++) {
        const wx = w % 2 === 0 ? -0.22 : 0.18;
        const wy = w < 2 ? 0.22 : 0.52;
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.03), this.materials.windowLitMat);
        win.position.set(wx, 0.45 + wy, backZ + houseD / 2 + 0.02);
        houseGroup.add(win);
      }

      houseGroup.add(this.createBush(0.35, 0.45, backZ, 0.22));
      if (ownerColor) houseGroup.add(this.createMailbox(0.35, 0.45, backZ + 0.25, ownerColor));
      return houseGroup;
    }

    // LEVEL 3: Multi-Story Elegant Townhouse / Villa
    if (level === 3) {
      const houseW = 0.88;
      const houseH = 1.05;
      const houseD = 0.65;

      const walls = new THREE.Mesh(new THREE.BoxGeometry(houseW, houseH, houseD), wallMat);
      walls.position.set(0, 0.45 + houseH / 2, backZ);
      walls.castShadow = true;
      walls.receiveShadow = true;
      houseGroup.add(walls);

      // Mansard / Gambrel Roof structure
      const roofLower = new THREE.Mesh(new THREE.BoxGeometry(houseW * 1.05, 0.28, houseD * 1.05), roofMat);
      roofLower.position.set(0, 0.45 + houseH + 0.14, backZ);
      roofLower.castShadow = true;
      houseGroup.add(roofLower);

      const roofTop = new THREE.Mesh(new THREE.ConeGeometry(0.65, 0.35, 4), roofMat);
      roofTop.rotation.y = Math.PI / 4;
      roofTop.position.set(0, 0.45 + houseH + 0.45, backZ);
      roofTop.castShadow = true;
      houseGroup.add(roofTop);

      // Balcony
      const balcony = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.06, 0.16), this.materials.ironMat);
      balcony.position.set(0, 0.45 + 0.55, backZ + houseD / 2 + 0.08);
      houseGroup.add(balcony);

      // 6 Windows with architectural frames
      [-0.26, 0, 0.26].forEach((wx) => {
        [0.26, 0.68].forEach((wy) => {
          const win = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.03), this.materials.windowLitMat);
          win.position.set(wx, 0.45 + wy, backZ + houseD / 2 + 0.02);
          houseGroup.add(win);
        });
      });

      // Dual Chimneys
      [-0.32, 0.32].forEach((cx) => {
        const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.12), this.materials.chimneyMat);
        chimney.position.set(cx, 0.45 + houseH + 0.3, backZ);
        chimney.castShadow = true;
        houseGroup.add(chimney);
      });

      if (ownerColor) houseGroup.add(this.createOwnershipBanner(0.38, 0.45, backZ + 0.28, ownerColor));
      return houseGroup;
    }

    // LEVEL 4: Luxury Manor Estate
    if (level === 4) {
      const houseW = 1.05;
      const houseH = 1.25;
      const houseD = 0.72;

      const walls = new THREE.Mesh(new THREE.BoxGeometry(houseW, houseH, houseD), wallMat);
      walls.position.set(0, 0.45 + houseH / 2, backZ);
      walls.castShadow = true;
      walls.receiveShadow = true;
      houseGroup.add(walls);

      // Grand Roof with Front Pediment
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.55, 4), roofMat);
      roof.rotation.y = Math.PI / 4;
      roof.position.set(0, 0.45 + houseH + 0.28, backZ);
      roof.castShadow = true;
      houseGroup.add(roof);

      // Classical Portico Columns at Entrance
      const porticoRoof = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.2), roofMat);
      porticoRoof.position.set(0, 0.45 + 0.52, backZ + houseD / 2 + 0.1);
      houseGroup.add(porticoRoof);

      [-0.18, 0.18].forEach((px) => {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.52, 8), this.materials.sidewalkMat);
        pillar.position.set(px, 0.45 + 0.26, backZ + houseD / 2 + 0.18);
        houseGroup.add(pillar);
      });

      // Flanking Topiary Shrubs
      houseGroup.add(this.createBush(-0.45, 0.45, backZ + 0.15, 0.26));
      houseGroup.add(this.createBush(0.45, 0.45, backZ + 0.15, 0.26));

      if (ownerColor) houseGroup.add(this.createOwnershipBanner(0.45, 0.45, backZ + 0.32, ownerColor));
      return houseGroup;
    }

    // LEVEL 5: Grand Landmark Skyscraper / Grand Palace Hotel
    const hotelW = 1.15;
    const hotelH = 1.7;
    const hotelD = 0.8;

    const hotelMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626, // Iconic ruby hotel
      roughness: 0.3,
      metalness: 0.2,
    });
    const hotelMesh = new THREE.Mesh(new THREE.BoxGeometry(hotelW, hotelH, hotelD), hotelMat);
    hotelMesh.position.set(0, 0.45 + hotelH / 2, backZ);
    hotelMesh.castShadow = true;
    hotelMesh.receiveShadow = true;
    houseGroup.add(hotelMesh);

    // Decorative Hotel Cornice Lines
    for (let c = 1; c <= 3; c++) {
      const cornice = new THREE.Mesh(new THREE.BoxGeometry(hotelW * 1.04, 0.06, hotelD * 1.04), this.materials.goldMat);
      cornice.position.set(0, 0.45 + (hotelH / 4) * c, backZ);
      houseGroup.add(cornice);
    }

    // Tower Rooftop Cupola & Golden Spire
    const cupola = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.4, 8), this.materials.brassMat);
    cupola.position.set(0, 0.45 + hotelH + 0.2, backZ);
    cupola.castShadow = true;
    houseGroup.add(cupola);

    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.65, 8), this.materials.goldMat);
    spire.position.set(0, 0.45 + hotelH + 0.65, backZ);
    spire.castShadow = true;
    houseGroup.add(spire);

    // Grand Entrance Awning with lights
    const grandAwning = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.28), this.materials.goldMat);
    grandAwning.position.set(0, 0.45 + 0.42, backZ + hotelD / 2 + 0.14);
    houseGroup.add(grandAwning);

    if (ownerColor) {
      houseGroup.add(this.createOwnershipBanner(-0.52, 0.45, backZ + 0.3, ownerColor));
      houseGroup.add(this.createOwnershipBanner(0.52, 0.45, backZ + 0.3, ownerColor));
    }

    return houseGroup;
  }

  // ==========================================
  // COMMERCIAL SHOPS / RESTAURANTS
  // ==========================================
  private buildCommercialShop(
    level: number,
    group?: PropertyGroupColor,
    tileSize: number = 2.1,
    ownerColor?: string
  ): THREE.Group {
    const shopGroup = new THREE.Group();
    const backZ = -tileSize * 0.12;

    if (level === 0) {
      // Small market stall / open plaza
      const stall = this.createMarketStall(0, 0.45, backZ, 0.8, 0x0284c7);
      shopGroup.add(stall);
      return shopGroup;
    }

    const shopW = 0.85;
    const shopH = 0.85 + Math.min(3, level) * 0.25;
    const shopD = 0.65;

    // Building body
    const shopMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.5 });
    const shopBody = new THREE.Mesh(new THREE.BoxGeometry(shopW, shopH, shopD), shopMat);
    shopBody.position.set(0, 0.45 + shopH / 2, backZ);
    shopBody.castShadow = true;
    shopBody.receiveShadow = true;
    shopGroup.add(shopBody);

    // Storefront Picture Window Display
    const displayWindow = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.04), this.materials.windowLitMat);
    displayWindow.position.set(-0.16, 0.45 + 0.32, backZ + shopD / 2 + 0.02);
    shopGroup.add(displayWindow);

    // Entrance Door
    const shopDoor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.38, 0.04), this.materials.doorWoodMat);
    shopDoor.position.set(0.24, 0.45 + 0.22, backZ + shopD / 2 + 0.02);
    shopGroup.add(shopDoor);

    // Striped Fabric Awning over the shop front
    const awningGeo = new THREE.BoxGeometry(shopW * 0.95, 0.08, 0.28);
    const awningMat = new THREE.MeshStandardMaterial({
      color: level >= 4 ? 0xb91c1c : 0x0284c7,
      roughness: 0.4,
    });
    const awning = new THREE.Mesh(awningGeo, awningMat);
    awning.position.set(0, 0.45 + 0.58, backZ + shopD / 2 + 0.14);
    awning.rotation.x = Math.PI / 16;
    awning.castShadow = true;
    shopGroup.add(awning);

    // Delivery Crates on the sidewalk
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), this.materials.doorWoodMat);
    crate.position.set(-shopW / 2 - 0.12, 0.45 + 0.09, backZ + 0.15);
    crate.castShadow = true;
    shopGroup.add(crate);

    if (ownerColor) shopGroup.add(this.createOwnershipBanner(shopW / 2 + 0.12, 0.45, backZ + 0.25, ownerColor));
    return shopGroup;
  }

  // ==========================================
  // HARBOR / DOCKS / BAYSIDE LOCATIONS
  // ==========================================
  private buildHarborLocation(
    level: number,
    group?: PropertyGroupColor,
    tileSize: number = 2.1,
    ownerColor?: string
  ): THREE.Group {
    const harborGroup = new THREE.Group();
    const backZ = -tileSize * 0.12;

    // 1. Water Basin
    const waterGeo = new THREE.BoxGeometry(tileSize * 0.88, 0.08, tileSize * 0.58);
    const water = new THREE.Mesh(waterGeo, this.materials.waterMat);
    water.position.set(0, 0.45, backZ);
    harborGroup.add(water);

    // 2. Wooden Dock / Pier Boardwalk
    const pierGeo = new THREE.BoxGeometry(tileSize * 0.35, 0.1, tileSize * 0.58);
    const pier = new THREE.Mesh(pierGeo, this.materials.doorWoodMat);
    pier.position.set(-tileSize * 0.22, 0.52, backZ);
    pier.castShadow = true;
    harborGroup.add(pier);

    // Dock Pilings
    [-tileSize * 0.35, -tileSize * 0.09].forEach((px) => {
      [backZ - tileSize * 0.22, backZ + tileSize * 0.22].forEach((pz) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 6), this.materials.doorWoodMat);
        post.position.set(px, 0.6, pz);
        harborGroup.add(post);
      });
    });

    // 3. Mini Sailboat or Dinghy moored in the water
    const boat = new THREE.Group();
    const hullGeo = new THREE.BoxGeometry(0.35, 0.14, 0.2);
    const hull = new THREE.Mesh(hullGeo, this.materials.picketFenceMat);
    hull.position.y = 0.52;
    boat.add(hull);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 6), this.materials.doorWoodMat);
    mast.position.set(0, 0.78, 0);
    boat.add(mast);

    const sail = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 3), this.materials.picketFenceMat);
    sail.position.set(0.08, 0.78, 0);
    sail.rotation.z = -Math.PI / 10;
    boat.add(sail);

    boat.position.set(tileSize * 0.16, 0, backZ);
    harborGroup.add(boat);

    // 4. If upgraded (Level > 0): Add Wharf warehouse or lighthouse
    if (level >= 1) {
      const beaconH = 0.6 + level * 0.2;
      const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, beaconH, 8), this.materials.picketFenceMat);
      beacon.position.set(-tileSize * 0.25, 0.52 + beaconH / 2, backZ - tileSize * 0.1);
      beacon.castShadow = true;
      harborGroup.add(beacon);

      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.16, 8), this.materials.lampGlowMat);
      lamp.position.set(-tileSize * 0.25, 0.52 + beaconH + 0.08, backZ - tileSize * 0.1);
      harborGroup.add(lamp);
    }

    if (ownerColor) harborGroup.add(this.createOwnershipBanner(tileSize * 0.35, 0.45, backZ + 0.25, ownerColor));
    return harborGroup;
  }

  // ==========================================
  // MARKET PLAZA LOCATIONS
  // ==========================================
  private buildMarketLocation(
    level: number,
    group?: PropertyGroupColor,
    tileSize: number = 2.1,
    ownerColor?: string
  ): THREE.Group {
    const marketGroup = new THREE.Group();
    const backZ = -tileSize * 0.12;

    // Cobblestone ground
    const plaza = new THREE.Mesh(new THREE.BoxGeometry(tileSize * 0.88, 0.04, tileSize * 0.55), this.materials.curbMat);
    plaza.position.set(0, 0.45, backZ);
    marketGroup.add(plaza);

    // Two Market Canopies
    marketGroup.add(this.createMarketStall(-tileSize * 0.2, 0.45, backZ, 0.42, 0xb91c1c));
    marketGroup.add(this.createMarketStall(tileSize * 0.2, 0.45, backZ, 0.42, 0x047857));

    if (level >= 2) {
      // Central Clock Pillar or fountain
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.9, 8), this.materials.brassMat);
      pillar.position.set(0, 0.45 + 0.45, backZ);
      pillar.castShadow = true;
      marketGroup.add(pillar);
    }

    if (ownerColor) marketGroup.add(this.createOwnershipBanner(tileSize * 0.38, 0.45, backZ + 0.25, ownerColor));
    return marketGroup;
  }

  // ==========================================
  // TRANSIT STATIONS / DEPOTS
  // ==========================================
  private buildStation(name: string, tileSize: number = 2.1): THREE.Group {
    const stationGroup = new THREE.Group();
    const backZ = -tileSize * 0.12;

    // Raised train platform
    const platform = new THREE.Mesh(new THREE.BoxGeometry(tileSize * 0.9, 0.2, tileSize * 0.42), this.materials.curbMat);
    platform.position.set(0, 0.45 + 0.1, backZ);
    platform.castShadow = true;
    stationGroup.add(platform);

    // Railway tracks running along the front of the platform
    const railMat = this.materials.ironMat;
    [-0.08, 0.08].forEach((rz) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(tileSize * 0.92, 0.04, 0.03), railMat);
      rail.position.set(0, 0.45 + 0.02, backZ + tileSize * 0.25 + rz);
      stationGroup.add(rail);
    });

    // Station Clock Tower
    const towerW = 0.32;
    const towerH = 1.1;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(towerW, towerH, towerW), this.materials.sidewalkMat);
    tower.position.set(-tileSize * 0.28, 0.45 + towerH / 2, backZ);
    tower.castShadow = true;
    stationGroup.add(tower);

    const clockRoof = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.35, 4), this.materials.brassMat);
    clockRoof.position.set(-tileSize * 0.28, 0.45 + towerH + 0.17, backZ);
    clockRoof.rotation.y = Math.PI / 4;
    stationGroup.add(clockRoof);

    // Station Canopy Shelter
    const canopyRoof = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.35), this.materials.ironMat);
    canopyRoof.position.set(0.12, 0.45 + 0.65, backZ);
    stationGroup.add(canopyRoof);

    [-0.1, 0.34].forEach((cx) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 6), this.materials.ironMat);
      col.position.set(cx, 0.45 + 0.35, backZ);
      stationGroup.add(col);
    });

    return stationGroup;
  }

  // ==========================================
  // UTILITY BUILDINGS (Solar & Water Works)
  // ==========================================
  private buildUtility(name: string, tileSize: number = 2.1): THREE.Group {
    const utilGroup = new THREE.Group();
    const backZ = -tileSize * 0.12;

    if (name.toLowerCase().includes('solar') || name.toLowerCase().includes('electric')) {
      // SOLAR STATION: Solar panel arrays + transformer
      const transformer = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.3), this.materials.curbMat);
      transformer.position.set(-tileSize * 0.25, 0.45 + 0.2, backZ);
      transformer.castShadow = true;
      utilGroup.add(transformer);

      // Angled Blue Photovoltaic Solar Panels
      const panelMat = new THREE.MeshStandardMaterial({
        color: 0x1d4ed8,
        metalness: 0.8,
        roughness: 0.2,
      });

      [-0.05, 0.25].forEach((px) => {
        const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6), this.materials.ironMat);
        stand.position.set(px, 0.45 + 0.15, backZ);
        utilGroup.add(stand);

        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.4), panelMat);
        panel.position.set(px, 0.45 + 0.32, backZ);
        panel.rotation.x = Math.PI / 6; // 30 deg sunlight angle
        panel.castShadow = true;
        utilGroup.add(panel);
      });
    } else {
      // WATER WORKS: Water Storage Tower + Pump House
      const pumpHouse = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.35), this.materials.chimneyMat);
      pumpHouse.position.set(tileSize * 0.2, 0.45 + 0.22, backZ);
      pumpHouse.castShadow = true;
      utilGroup.add(pumpHouse);

      // Elevated Water Tower
      const legMat = this.materials.ironMat;
      [-0.12, 0.12].forEach((lx) => {
        [-0.12, 0.12].forEach((lz) => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6), legMat);
          leg.position.set(-tileSize * 0.2 + lx, 0.45 + 0.4, backZ + lz);
          utilGroup.add(leg);
        });
      });

      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.45, 12), this.materials.sidewalkMat);
      tank.position.set(-tileSize * 0.2, 0.45 + 0.95, backZ);
      tank.castShadow = true;
      utilGroup.add(tank);

      const tankCap = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.2, 12), this.materials.curbMat);
      tankCap.position.set(-tileSize * 0.2, 0.45 + 1.25, backZ);
      utilGroup.add(tankCap);
    }

    return utilGroup;
  }

  // ==========================================
  // SPECIAL CORNER & BOARD SPACES
  // ==========================================
  private buildStartArch(tileSize: number): THREE.Group {
    const startGroup = new THREE.Group();
    const cornerSize = tileSize * 1.3;

    // Grand Entrance Gateway Arch across the corner
    const archMat = this.materials.sidewalkMat;
    const pillarH = 1.6;

    // 2 Grand Stone Columns
    [-cornerSize * 0.32, cornerSize * 0.32].forEach((px) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.25, pillarH, 0.25), archMat);
      col.position.set(px, 0.45 + pillarH / 2, 0);
      col.castShadow = true;
      startGroup.add(col);
    });

    // Arch Crossbeam
    const beam = new THREE.Mesh(new THREE.BoxGeometry(cornerSize * 0.85, 0.28, 0.32), archMat);
    beam.position.set(0, 0.45 + pillarH + 0.14, 0);
    beam.castShadow = true;
    startGroup.add(beam);

    // Golden "GO" Banner Crest
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.08), this.materials.goldMat);
    crest.position.set(0, 0.45 + pillarH + 0.4, 0);
    crest.castShadow = true;
    startGroup.add(crest);

    // Decorative Corner Street Lamps
    startGroup.add(this.createStreetLight(-cornerSize * 0.4, 0.45, -cornerSize * 0.35));
    startGroup.add(this.createStreetLight(cornerSize * 0.4, 0.45, -cornerSize * 0.35));

    return startGroup;
  }

  private buildDetentionBuilding(tileSize: number): THREE.Group {
    const jailGroup = new THREE.Group();
    const jailH = 1.3;
    const jailW = 0.85;

    // Heavy Stone Prison Keep
    const jailMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
    const keep = new THREE.Mesh(new THREE.BoxGeometry(jailW, jailH, 0.7), jailMat);
    keep.position.set(0, 0.45 + jailH / 2, -0.15);
    keep.castShadow = true;
    jailGroup.add(keep);

    // Iron Barred Gate Door
    const gate = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 0.05), this.materials.ironMat);
    gate.position.set(0, 0.45 + 0.25, 0.22);
    jailGroup.add(gate);

    // Barred Windows
    [-0.26, 0.26].forEach((wx) => {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.04), this.materials.ironMat);
      win.position.set(wx, 0.45 + 0.85, 0.22);
      jailGroup.add(win);
    });

    // Searchlight Lamp on Watchtower roof
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.25, 8), this.materials.lampGlowMat);
    lamp.position.set(0, 0.45 + jailH + 0.15, -0.15);
    jailGroup.add(lamp);

    return jailGroup;
  }

  private buildRestPark(tileSize: number): THREE.Group {
    const parkGroup = new THREE.Group();

    // Octagonal Park Gazebo with roof & benches
    const gazeboMat = this.materials.picketFenceMat;
    const roofMat = this.materials.doorWoodMat;

    // Gazebo Platform
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.7, 0.15, 8), this.materials.curbMat);
    base.position.set(0, 0.45 + 0.075, 0);
    base.castShadow = true;
    parkGroup.add(base);

    // Pillars
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.8, 6), gazeboMat);
      pillar.position.set(Math.cos(angle) * 0.5, 0.45 + 0.55, Math.sin(angle) * 0.5);
      parkGroup.add(pillar);
    }

    // Gazebo Peaked Roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.5, 8), roofMat);
    roof.position.set(0, 0.45 + 1.15, 0);
    roof.castShadow = true;
    parkGroup.add(roof);

    // Surrounding Weeping Bushes
    parkGroup.add(this.createBush(-0.65, 0.45, -0.5, 0.28));
    parkGroup.add(this.createBush(0.65, 0.45, -0.5, 0.28));

    return parkGroup;
  }

  private buildGoToDetentionBooth(tileSize: number): THREE.Group {
    const boothGroup = new THREE.Group();

    // Police Sentry Kiosk
    const kioskMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.4 });
    const kiosk = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.55), kioskMat);
    kiosk.position.set(0, 0.45 + 0.45, -0.1);
    kiosk.castShadow = true;
    boothGroup.add(kiosk);

    // Flashing Beacon Sirens (Red & Blue)
    const sirenRed = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.14, 8),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 1 })
    );
    sirenRed.position.set(-0.12, 0.45 + 0.98, -0.1);
    boothGroup.add(sirenRed);

    const sirenBlue = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.14, 8),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x3b82f6, emissiveIntensity: 1 })
    );
    sirenBlue.position.set(0.12, 0.45 + 0.98, -0.1);
    boothGroup.add(sirenBlue);

    // Barrier Gate Arm
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.06), this.materials.roadLineMat);
    arm.position.set(0, 0.45 + 0.35, 0.28);
    arm.rotation.z = Math.PI / 12;
    boothGroup.add(arm);

    return boothGroup;
  }

  private buildTownCouncilBuilding(tileSize: number): THREE.Group {
    const councilGroup = new THREE.Group();
    const backZ = -tileSize * 0.12;

    // Neoclassical Municipal Hall with Doric pillars
    const hallMat = this.materials.sidewalkMat;
    const hall = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.75, 0.55), hallMat);
    hall.position.set(0, 0.45 + 0.375, backZ);
    hall.castShadow = true;
    councilGroup.add(hall);

    // Pediment Roof
    const pediment = new THREE.Mesh(new THREE.ConeGeometry(0.65, 0.35, 4), this.materials.curbMat);
    pediment.rotation.y = Math.PI / 4;
    pediment.position.set(0, 0.45 + 0.92, backZ);
    councilGroup.add(pediment);

    // 4 Front Pillars
    [-0.3, -0.1, 0.1, 0.3].forEach((px) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.65, 8), this.materials.picketFenceMat);
      col.position.set(px, 0.45 + 0.325, backZ + 0.3);
      councilGroup.add(col);
    });

    return councilGroup;
  }

  private buildLuckyEventPedestal(tileSize: number): THREE.Group {
    const eventGroup = new THREE.Group();
    const backZ = -tileSize * 0.12;

    // Starburst Pedestal
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.5, 8), this.materials.curbMat);
    pedestal.position.set(0, 0.45 + 0.25, backZ);
    pedestal.castShadow = true;
    eventGroup.add(pedestal);

    // Iconic 3D Lucky Question Mark Box (Floating & Rotating)
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), this.materials.goldMat);
    box.position.set(0, 0.45 + 0.78, backZ);
    box.rotation.y = Math.PI / 4;
    box.castShadow = true;
    eventGroup.add(box);

    return eventGroup;
  }

  private buildTaxOffice(tileSize: number): THREE.Group {
    const taxGroup = new THREE.Group();
    const backZ = -tileSize * 0.12;

    const office = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.65, 0.5), this.materials.curbMat);
    office.position.set(0, 0.45 + 0.325, backZ);
    office.castShadow = true;
    taxGroup.add(office);

    // Teller Window Grille
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.04), this.materials.brassMat);
    grille.position.set(0, 0.45 + 0.35, backZ + 0.26);
    taxGroup.add(grille);

    // Strongbox / Chest on counter
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.15), this.materials.goldMat);
    chest.position.set(0.24, 0.45 + 0.15, backZ + 0.28);
    taxGroup.add(chest);

    return taxGroup;
  }

  // ==========================================
  // HELPER PROP GENERATORS
  // ==========================================
  private createBush(x: number, y: number, z: number, scale: number = 0.25): THREE.Mesh {
    const bushGeo = new THREE.DodecahedronGeometry(scale, 1);
    const bush = new THREE.Mesh(bushGeo, this.materials.grassMat);
    bush.position.set(x, y + scale * 0.85, z);
    bush.castShadow = true;
    return bush;
  }

  private createMarketStall(x: number, y: number, z: number, size: number, canopyColor: number): THREE.Group {
    const stall = new THREE.Group();
    stall.position.set(x, y, z);

    // Wooden Trestle Table
    const table = new THREE.Mesh(new THREE.BoxGeometry(size, 0.25, size * 0.6), this.materials.doorWoodMat);
    table.position.y = 0.15;
    table.castShadow = true;
    stall.add(table);

    // 4 Corner Wooden Posts
    [-size / 2 + 0.04, size / 2 - 0.04].forEach((px) => {
      [-size * 0.3 + 0.04, size * 0.3 - 0.04].forEach((pz) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6), this.materials.doorWoodMat);
        post.position.set(px, 0.3, pz);
        stall.add(post);
      });
    });

    // Striped Canvas Awning Canopy
    const canopyMat = new THREE.MeshStandardMaterial({ color: canopyColor, roughness: 0.5 });
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(size * 1.05, 0.05, size * 0.7), canopyMat);
    canopy.position.y = 0.62;
    canopy.castShadow = true;
    stall.add(canopy);

    return stall;
  }

  private createMailbox(x: number, y: number, z: number, colorHex: string): THREE.Group {
    const mb = new THREE.Group();
    mb.position.set(x, y, z);

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6), this.materials.doorWoodMat);
    post.position.y = 0.15;
    mb.add(post);

    const boxMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(colorHex), roughness: 0.3 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.16), boxMat);
    box.position.y = 0.34;
    box.castShadow = true;
    mb.add(box);

    return mb;
  }

  private createOwnershipBanner(x: number, y: number, z: number, colorHex: string): THREE.Group {
    const flag = new THREE.Group();
    flag.position.set(x, y, z);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.85, 8), this.materials.ironMat);
    pole.position.y = 0.425;
    pole.castShadow = true;
    flag.add(pole);

    const clothMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex),
      roughness: 0.4,
    });
    const banner = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.02), clothMat);
    banner.position.set(0.16, 0.7, 0);
    banner.castShadow = true;
    flag.add(banner);

    return flag;
  }

  private createStreetLight(x: number, y: number, z: number): THREE.Group {
    const lamp = new THREE.Group();
    lamp.position.set(x, y, z);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 1.4, 8), this.materials.ironMat);
    pole.position.y = 0.7;
    pole.castShadow = true;
    lamp.add(pole);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.18), this.materials.lampGlowMat);
    head.position.y = 1.42;
    lamp.add(head);

    return lamp;
  }

  private getRoofColor(group?: PropertyGroupColor, seed: number = 0): number {
    if (group && this.groupRoofPalette[group]) {
      const palette = this.groupRoofPalette[group];
      return palette[seed % palette.length];
    }
    return 0x991b1b; // Default classic terracotta
  }
}

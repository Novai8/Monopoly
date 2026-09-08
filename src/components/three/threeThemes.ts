import * as THREE from 'three';
import { ThreeMaterialsManager } from './threeMaterials';

/**
 * Procedural environmental decorator for the 8 map themes.
 * Adds authentic miniature world dioramas in the central plaza and surrounding environment.
 */
export class ThreeThemeDecorator {
  private materials = ThreeMaterialsManager.getInstance();

  public decorateTheme(
    scene: THREE.Scene,
    themeId: string,
    centerSize: number,
    boardScale: number
  ): THREE.Group {
    const group = new THREE.Group();

    switch (themeId) {
      case 'seaside':
        this.buildSeasideEnvironment(group, centerSize, boardScale);
        break;
      case 'countryside':
        this.buildCountrysideEnvironment(group, centerSize, boardScale);
        break;
      case 'winter-town':
        this.buildWinterTownEnvironment(group, centerSize, boardScale);
        break;
      case 'festival-town':
        this.buildFestivalTownEnvironment(group, centerSize, boardScale);
        break;
      case 'old-town':
        this.buildOldTownEnvironment(group, centerSize, boardScale);
        break;
      case 'island':
        this.buildIslandEnvironment(group, centerSize, boardScale);
        break;
      case 'mountain-town':
        this.buildMountainTownEnvironment(group, centerSize, boardScale);
        break;
      case 'classic-town':
      default:
        this.buildClassicTownEnvironment(group, centerSize, boardScale);
        break;
    }

    return group;
  }

  // ==========================================
  // 1. CLASSIC TOWN: Town Square Park & Fountain
  // ==========================================
  private buildClassicTownEnvironment(group: THREE.Group, centerSize: number, scale: number) {
    // Center Circular Fountain
    const fountain = this.createFountain(0, 0, scale * 1.1);
    group.add(fountain);

    // Radial Cobblestone Paths
    const pathMat = this.materials.sidewalkMat;
    const pathGeo = new THREE.BoxGeometry(centerSize * 0.82, 0.05, 1.2 * scale);
    const path1 = new THREE.Mesh(pathGeo, pathMat);
    path1.position.y = 0.02;
    path1.receiveShadow = true;
    group.add(path1);

    const path2 = new THREE.Mesh(pathGeo, pathMat);
    path2.position.y = 0.02;
    path2.rotation.y = Math.PI / 2;
    path2.receiveShadow = true;
    group.add(path2);

    // Park Quadrant Trees (Oak & Pine)
    const dist = centerSize * 0.28;
    group.add(this.createOakTree(-dist, -dist, scale * 1.0));
    group.add(this.createOakTree(dist, dist, scale * 1.05));
    group.add(this.createPineTree(-dist, dist, scale * 1.1));
    group.add(this.createPineTree(dist, -dist, scale * 0.95));

    // Vintage Gas Street Lamps
    const lampDist = centerSize * 0.38;
    group.add(this.createStreetLamp(-lampDist, 0, scale));
    group.add(this.createStreetLamp(lampDist, 0, scale));
    group.add(this.createStreetLamp(0, -lampDist, scale));
    group.add(this.createStreetLamp(0, lampDist, scale));

    // Park Benches
    group.add(this.createParkBench(0, dist * 0.75, 0, scale));
    group.add(this.createParkBench(0, -dist * 0.75, Math.PI, scale));
  }

  // ==========================================
  // 2. SEASIDE RESORT: Ocean, Docks, Lighthouse & Palms
  // ==========================================
  private buildSeasideEnvironment(group: THREE.Group, centerSize: number, scale: number) {
    // Center Tropical Lagoon Basin
    const lagoonGeo = new THREE.CylinderGeometry(centerSize * 0.38, centerSize * 0.42, 0.3, 24);
    const lagoonMat = this.materials.waterMat;
    const lagoon = new THREE.Mesh(lagoonGeo, lagoonMat);
    lagoon.position.y = 0.15;
    group.add(lagoon);

    // Sandy Shoreline Ring
    const sandGeo = new THREE.RingGeometry(centerSize * 0.36, centerSize * 0.46, 24);
    const sandMat = this.materials.sandMat;
    const sand = new THREE.Mesh(sandGeo, sandMat);
    sand.rotation.x = -Math.PI / 2;
    sand.position.y = 0.18;
    sand.receiveShadow = true;
    group.add(sand);

    // Central Miniature Lighthouse
    const lighthouse = this.createLighthouse(0, 0, scale * 1.2);
    group.add(lighthouse);

    // Palm Trees along the beach
    const palmDist = centerSize * 0.26;
    group.add(this.createPalmTree(-palmDist, -palmDist * 0.7, scale * 1.1));
    group.add(this.createPalmTree(palmDist, palmDist * 0.6, scale * 1.0));
    group.add(this.createPalmTree(-palmDist * 0.8, palmDist * 0.8, scale * 1.2));
    group.add(this.createPalmTree(palmDist * 0.7, -palmDist * 0.9, scale * 0.95));

    // Tiny Sailboat in the center lagoon
    const boat = this.createSailboat(palmDist * 0.4, -palmDist * 0.3, scale);
    group.add(boat);
  }

  // ==========================================
  // 3. COUNTRYSIDE: Red Barn, Windmill & Hay Bales
  // ==========================================
  private buildCountrysideEnvironment(group: THREE.Group, centerSize: number, scale: number) {
    // Red Timber Barn
    const barn = this.createBarn(-centerSize * 0.2, -centerSize * 0.15, scale * 1.1);
    group.add(barn);

    // Wooden Windmill
    const windmill = this.createWindmill(centerSize * 0.22, centerSize * 0.18, scale * 1.2);
    group.add(windmill);

    // Hay Bales scattered on pasture
    const baleMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.9 });
    const baleGeo = new THREE.CylinderGeometry(0.35 * scale, 0.35 * scale, 0.6 * scale, 10);
    [
      [-centerSize * 0.1, centerSize * 0.2, Math.PI / 2],
      [-centerSize * 0.05, centerSize * 0.25, Math.PI / 2],
      [centerSize * 0.15, -centerSize * 0.15, 0],
    ].forEach(([bx, bz, rotZ]) => {
      const bale = new THREE.Mesh(baleGeo, baleMat);
      bale.position.set(bx, 0.35 * scale, bz);
      bale.rotation.z = rotZ;
      bale.castShadow = true;
      group.add(bale);
    });

    // Country Split-Rail Fences & Apple Trees
    group.add(this.createOakTree(centerSize * 0.32, -centerSize * 0.22, scale * 1.1));
    group.add(this.createOakTree(-centerSize * 0.3, centerSize * 0.25, scale * 1.0));
  }

  // ==========================================
  // 4. WINTER TOWN: Ice Skating Rink & Frosted Pines
  // ==========================================
  private buildWinterTownEnvironment(group: THREE.Group, centerSize: number, scale: number) {
    // Frozen Ice Skating Rink in center
    const rinkGeo = new THREE.CylinderGeometry(centerSize * 0.34, centerSize * 0.36, 0.15, 24);
    const iceMat = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      roughness: 0.1,
      metalness: 0.5,
    });
    const rink = new THREE.Mesh(rinkGeo, iceMat);
    rink.position.y = 0.08;
    group.add(rink);

    // Snow Berm around rink
    const snowRingGeo = new THREE.TorusGeometry(centerSize * 0.35, 0.25 * scale, 8, 24);
    const snowRing = new THREE.Mesh(snowRingGeo, this.materials.snowMat);
    snowRing.rotation.x = Math.PI / 2;
    snowRing.position.y = 0.12;
    group.add(snowRing);

    // Frosted Snow Pine Trees with Snow Caps
    const dist = centerSize * 0.28;
    group.add(this.createSnowPineTree(-dist, -dist, scale * 1.2));
    group.add(this.createSnowPineTree(dist, dist, scale * 1.1));
    group.add(this.createSnowPineTree(-dist, dist, scale * 1.15));
    group.add(this.createSnowPineTree(dist, -dist, scale * 1.05));

    // Miniature Snowman in the park
    const snowman = this.createSnowman(dist * 0.6, -dist * 0.4, scale);
    group.add(snowman);
  }

  // ==========================================
  // 5. FESTIVAL TOWN: Carousel, Pennants & Carnival Stalls
  // ==========================================
  private buildFestivalTownEnvironment(group: THREE.Group, centerSize: number, scale: number) {
    // Central Carnival Carousel
    const carousel = this.createCarousel(0, 0, scale * 1.2);
    group.add(carousel);

    // Festive Street Lamps with Colorful Banners
    const dist = centerSize * 0.35;
    [-dist, dist].forEach((lx) => {
      [-dist, dist].forEach((lz) => {
        const lamp = this.createStreetLamp(lx, lz, scale);
        group.add(lamp);
      });
    });

    // Colorful Pennant Poles
    const pennantMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.4 });
    [-centerSize * 0.22, centerSize * 0.22].forEach((px) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2 * scale, 6), this.materials.ironMat);
      pole.position.set(px, 1.1 * scale, centerSize * 0.22);
      group.add(pole);

      const flag = new THREE.Mesh(new THREE.ConeGeometry(0.3 * scale, 0.5 * scale, 3), pennantMat);
      flag.position.set(px, 2.0 * scale, centerSize * 0.22);
      flag.rotation.z = Math.PI / 2;
      group.add(flag);
    });
  }

  // ==========================================
  // 6. OLD TOWN: Ancient Clock Tower & Cobblestones
  // ==========================================
  private buildOldTownEnvironment(group: THREE.Group, centerSize: number, scale: number) {
    // Grand Medieval Stone Clock Tower
    const towerH = 3.6 * scale;
    const towerW = 1.1 * scale;
    const towerGeo = new THREE.BoxGeometry(towerW, towerH, towerW);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.85 });
    const tower = new THREE.Mesh(towerGeo, stoneMat);
    tower.position.set(0, towerH / 2, 0);
    tower.castShadow = true;
    group.add(tower);

    // Spire Roof
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.85 * scale, 1.6 * scale, 4), this.materials.brassMat);
    spire.rotation.y = Math.PI / 4;
    spire.position.set(0, towerH + 0.8 * scale, 0);
    spire.castShadow = true;
    group.add(spire);

    // Clock Face (Golden Disc)
    [
      [0, towerH - 0.4 * scale, towerW / 2 + 0.02, 0],
      [0, towerH - 0.4 * scale, -towerW / 2 - 0.02, Math.PI],
      [towerW / 2 + 0.02, towerH - 0.4 * scale, 0, Math.PI / 2],
      [-towerW / 2 - 0.02, towerH - 0.4 * scale, 0, -Math.PI / 2],
    ].forEach(([cx, cy, cz, rotY]) => {
      const clockDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.32 * scale, 0.32 * scale, 0.04, 16), this.materials.goldMat);
      clockDisc.rotation.x = Math.PI / 2;
      clockDisc.rotation.y = rotY;
      clockDisc.position.set(cx, cy, cz);
      group.add(clockDisc);
    });

    // Surrounding Wrought Iron Lanterns
    const dist = centerSize * 0.32;
    group.add(this.createStreetLamp(-dist, -dist, scale));
    group.add(this.createStreetLamp(dist, dist, scale));
  }

  // ==========================================
  // 7. ISLAND: Tropical Atoll, Tiki Huts & Reef
  // ==========================================
  private buildIslandEnvironment(group: THREE.Group, centerSize: number, scale: number) {
    // Center Turquoise Lagoon
    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(centerSize * 0.42, centerSize * 0.44, 0.25, 24),
      this.materials.waterMat
    );
    water.position.y = 0.12;
    group.add(water);

    // Sandbar Atoll
    const atoll = new THREE.Mesh(
      new THREE.CylinderGeometry(centerSize * 0.22, centerSize * 0.26, 0.3, 16),
      this.materials.sandMat
    );
    atoll.position.y = 0.16;
    group.add(atoll);

    // Thatched Tiki Hut in center
    const hut = this.createTikiHut(0, 0.16, scale * 1.1);
    group.add(hut);

    // Palm Trees around the atoll
    const palmDist = centerSize * 0.24;
    group.add(this.createPalmTree(-palmDist, -palmDist * 0.5, scale * 1.15));
    group.add(this.createPalmTree(palmDist, palmDist * 0.5, scale * 1.0));
    group.add(this.createPalmTree(0, -palmDist * 0.9, scale * 0.95));
  }

  // ==========================================
  // 8. MOUNTAIN TOWN: Granite Peaks & Timber Chalet
  // ==========================================
  private buildMountainTownEnvironment(group: THREE.Group, centerSize: number, scale: number) {
    // Rocky Granite Mountain Ridge in center
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
    const peak1 = new THREE.Mesh(new THREE.ConeGeometry(centerSize * 0.22, 2.4 * scale, 5), rockMat);
    peak1.position.set(-centerSize * 0.15, 1.2 * scale, -centerSize * 0.1);
    peak1.castShadow = true;
    group.add(peak1);

    const peak2 = new THREE.Mesh(new THREE.ConeGeometry(centerSize * 0.18, 1.8 * scale, 5), rockMat);
    peak2.position.set(centerSize * 0.18, 0.9 * scale, centerSize * 0.1);
    peak2.castShadow = true;
    group.add(peak2);

    // Snow Caps on the mountain peaks
    const cap1 = new THREE.Mesh(new THREE.ConeGeometry(centerSize * 0.09, 0.8 * scale, 5), this.materials.snowMat);
    cap1.position.set(-centerSize * 0.15, 2.0 * scale, -centerSize * 0.1);
    group.add(cap1);

    // Alpine Timber Log Chalet
    const chalet = this.createBarn(centerSize * 0.05, -centerSize * 0.18, scale * 0.9);
    group.add(chalet);

    // Mountain Fir Trees
    const dist = centerSize * 0.28;
    group.add(this.createPineTree(-dist, dist * 0.5, scale * 1.2));
    group.add(this.createPineTree(dist * 0.8, -dist * 0.6, scale * 1.1));
  }

  // ==========================================
  // ARCHITECTURAL ATOMICS
  // ==========================================
  private createFountain(x: number, z: number, scale: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const stoneMat = this.materials.sidewalkMat;
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.2 * scale, 2.5 * scale, 0.45 * scale, 24), stoneMat);
    basin.position.y = 0.225 * scale;
    basin.castShadow = true;
    group.add(basin);

    const water = new THREE.Mesh(new THREE.CylinderGeometry(1.9 * scale, 1.9 * scale, 0.2 * scale, 24), this.materials.waterMat);
    water.position.y = 0.35 * scale;
    group.add(water);

    const centerPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.45 * scale, 0.6 * scale, 1.1 * scale, 16), stoneMat);
    centerPillar.position.y = 0.65 * scale;
    centerPillar.castShadow = true;
    group.add(centerPillar);

    const upperBowl = new THREE.Mesh(new THREE.CylinderGeometry(1.1 * scale, 0.4 * scale, 0.35 * scale, 16), stoneMat);
    upperBowl.position.y = 1.25 * scale;
    upperBowl.castShadow = true;
    group.add(upperBowl);

    return group;
  }

  private createLighthouse(x: number, z: number, scale: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9 * scale, 1.2 * scale, 0.4 * scale, 12), this.materials.sidewalkMat);
    base.position.y = 0.2 * scale;
    group.add(base);

    // Tower shaft with red/white bands
    const towerH = 3.2 * scale;
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.55 * scale, 0.85 * scale, towerH, 12), this.materials.picketFenceMat);
    tower.position.y = 0.2 * scale + towerH / 2;
    tower.castShadow = true;
    group.add(tower);

    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.68 * scale, 0.75 * scale, 0.8 * scale, 12), this.materials.chimneyMat);
    band.position.y = 0.2 * scale + towerH * 0.55;
    group.add(band);

    // Lantern room with rotating glow
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * scale, 0.5 * scale, 0.5 * scale, 8), this.materials.lampGlowMat);
    lantern.position.y = 0.2 * scale + towerH + 0.25 * scale;
    group.add(lantern);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.65 * scale, 0.6 * scale, 12), this.materials.doorWoodMat);
    roof.position.y = 0.2 * scale + towerH + 0.7 * scale;
    group.add(roof);

    return group;
  }

  private createBarn(x: number, z: number, scale: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const barnMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.6 });
    const barnW = 1.8 * scale;
    const barnH = 1.4 * scale;
    const barnD = 1.3 * scale;

    const walls = new THREE.Mesh(new THREE.BoxGeometry(barnW, barnH, barnD), barnMat);
    walls.position.y = barnH / 2;
    walls.castShadow = true;
    group.add(walls);

    // Gambrel roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.4 * scale, 0.85 * scale, 4), this.materials.sidewalkMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = barnH + 0.42 * scale;
    roof.castShadow = true;
    group.add(roof);

    // Silo next to barn
    const siloMat = this.materials.sidewalkMat;
    const silo = new THREE.Mesh(new THREE.CylinderGeometry(0.4 * scale, 0.4 * scale, 2.0 * scale, 12), siloMat);
    silo.position.set(-barnW / 2 - 0.35 * scale, 1.0 * scale, 0);
    silo.castShadow = true;
    group.add(silo);

    const siloDome = new THREE.Mesh(new THREE.SphereGeometry(0.4 * scale, 12, 12), siloMat);
    siloDome.position.set(-barnW / 2 - 0.35 * scale, 2.0 * scale, 0);
    group.add(siloDome);

    return group;
  }

  private createWindmill(x: number, z: number, scale: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const millH = 2.8 * scale;
    const mill = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45 * scale, 0.8 * scale, millH, 8),
      this.materials.sidewalkMat
    );
    mill.position.y = millH / 2;
    mill.castShadow = true;
    group.add(mill);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.65 * scale, 0.6 * scale, 8), this.materials.doorWoodMat);
    roof.position.y = millH + 0.3 * scale;
    group.add(roof);

    // 4 Blades
    const bladeMat = this.materials.doorWoodMat;
    const rotor = new THREE.Group();
    rotor.position.set(0, millH - 0.2 * scale, 0.55 * scale);

    for (let b = 0; b < 4; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18 * scale, 1.6 * scale, 0.04 * scale), bladeMat);
      blade.position.y = 0.8 * scale;
      const bladePivot = new THREE.Group();
      bladePivot.rotation.z = (b * Math.PI) / 2;
      bladePivot.add(blade);
      rotor.add(bladePivot);
    }
    group.add(rotor);

    return group;
  }

  private createCarousel(x: number, z: number, scale: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Base platform
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6 * scale, 1.8 * scale, 0.25 * scale, 16),
      this.materials.brassMat
    );
    platform.position.y = 0.125 * scale;
    group.add(platform);

    // Peaked Tent Roof
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(1.9 * scale, 1.1 * scale, 16),
      new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.3 })
    );
    roof.position.y = 2.2 * scale;
    roof.castShadow = true;
    group.add(roof);

    // Center Pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * scale, 0.2 * scale, 2.2 * scale, 8), this.materials.goldMat);
    pole.position.y = 1.1 * scale;
    group.add(pole);

    return group;
  }

  private createTikiHut(x: number, y: number, scale: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, y, 0);

    // Bamboo posts
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const px = Math.cos(angle) * 0.7 * scale;
      const pz = Math.sin(angle) * 0.7 * scale;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * scale, 0.04 * scale, 1.2 * scale, 6), this.materials.doorWoodMat);
      post.position.set(px, 0.6 * scale, pz);
      group.add(post);
    }

    // Thatched Straw Cone Roof
    const thatchMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.95 });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.2 * scale, 0.85 * scale, 8), thatchMat);
    roof.position.y = 1.5 * scale;
    roof.castShadow = true;
    group.add(roof);

    return group;
  }

  private createSnowman(x: number, z: number, scale: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const snowMat = this.materials.snowMat;
    const b1 = new THREE.Mesh(new THREE.SphereGeometry(0.45 * scale, 12, 12), snowMat);
    b1.position.y = 0.45 * scale;
    b1.castShadow = true;
    group.add(b1);

    const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.32 * scale, 12, 12), snowMat);
    b2.position.y = 1.0 * scale;
    b2.castShadow = true;
    group.add(b2);

    const b3 = new THREE.Mesh(new THREE.SphereGeometry(0.22 * scale, 12, 12), snowMat);
    b3.position.y = 1.45 * scale;
    b3.castShadow = true;
    group.add(b3);

    // Carrot nose
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.06 * scale, 0.25 * scale, 6), new THREE.MeshStandardMaterial({ color: 0xf97316 }));
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 1.45 * scale, 0.28 * scale);
    group.add(nose);

    return group;
  }

  private createSailboat(x: number, z: number, scale: number): THREE.Group {
    const boat = new THREE.Group();
    boat.position.set(x, 0.18, z);

    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.55 * scale, 0.18 * scale, 0.25 * scale), this.materials.picketFenceMat);
    hull.position.y = 0.09 * scale;
    boat.add(hull);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02 * scale, 0.02 * scale, 0.9 * scale, 6), this.materials.doorWoodMat);
    mast.position.y = 0.5 * scale;
    boat.add(mast);

    const sail = new THREE.Mesh(new THREE.ConeGeometry(0.35 * scale, 0.7 * scale, 3), this.materials.picketFenceMat);
    sail.position.set(0.12 * scale, 0.5 * scale, 0);
    sail.rotation.z = -Math.PI / 10;
    boat.add(sail);

    return boat;
  }

  // ==========================================
  // TREES & VEGETATION ATOMICS
  // ==========================================
  private createOakTree(x: number, z: number, scale: number = 1): THREE.Group {
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18 * scale, 0.28 * scale, 1.4 * scale, 8),
      this.materials.dirtMat
    );
    trunk.position.y = 0.7 * scale;
    trunk.castShadow = true;
    tree.add(trunk);

    const canopy = new THREE.Mesh(new THREE.DodecahedronGeometry(1.05 * scale, 1), this.materials.grassMat);
    canopy.position.y = 1.9 * scale;
    canopy.castShadow = true;
    tree.add(canopy);

    return tree;
  }

  private createPineTree(x: number, z: number, scale: number = 1): THREE.Group {
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15 * scale, 0.24 * scale, 1.2 * scale, 8),
      this.materials.dirtMat
    );
    trunk.position.y = 0.6 * scale;
    trunk.castShadow = true;
    tree.add(trunk);

    const pineMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.6 });
    for (let i = 0; i < 3; i++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry((1.0 - i * 0.22) * scale, 0.9 * scale, 8), pineMat);
      cone.position.y = (1.2 + i * 0.5) * scale;
      cone.castShadow = true;
      tree.add(cone);
    }

    return tree;
  }

  private createSnowPineTree(x: number, z: number, scale: number = 1): THREE.Group {
    const tree = this.createPineTree(x, z, scale);
    // Snow cone cap on top
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.4 * scale, 0.45 * scale, 8), this.materials.snowMat);
    cap.position.y = 2.65 * scale;
    tree.add(cap);
    return tree;
  }

  private createPalmTree(x: number, z: number, scale: number = 1): THREE.Group {
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);

    // Curved trunk
    const trunkMat = this.materials.dirtMat;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.2 * scale, 2.2 * scale, 8), trunkMat);
    trunk.position.y = 1.1 * scale;
    trunk.rotation.z = Math.PI / 18;
    trunk.castShadow = true;
    tree.add(trunk);

    // Palm fronds
    const frondMat = this.materials.grassMat;
    for (let i = 0; i < 5; i++) {
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.45 * scale, 1.2 * scale, 4), frondMat);
      frond.position.set(0, 2.2 * scale, 0);
      frond.rotation.y = (i * Math.PI * 2) / 5;
      frond.rotation.x = Math.PI / 3;
      frond.castShadow = true;
      tree.add(frond);
    }

    return tree;
  }

  private createStreetLamp(x: number, z: number, scale: number = 1): THREE.Group {
    const lamp = new THREE.Group();
    lamp.position.set(x, 0, z);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * scale, 0.08 * scale, 1.9 * scale, 8), this.materials.ironMat);
    pole.position.y = 0.95 * scale;
    pole.castShadow = true;
    lamp.add(pole);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3 * scale, 0.38 * scale, 0.3 * scale), this.materials.lampGlowMat);
    head.position.y = 1.95 * scale;
    lamp.add(head);

    return lamp;
  }

  private createParkBench(x: number, z: number, rotY: number, scale: number = 1): THREE.Group {
    const bench = new THREE.Group();
    bench.position.set(x, 0, z);
    bench.rotation.y = rotY;

    const woodMat = this.materials.doorWoodMat;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.2 * scale, 0.08 * scale, 0.4 * scale), woodMat);
    seat.position.y = 0.3 * scale;
    seat.castShadow = true;
    bench.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(1.2 * scale, 0.35 * scale, 0.06 * scale), woodMat);
    back.position.set(0, 0.5 * scale, -0.16 * scale);
    back.castShadow = true;
    bench.add(back);

    return bench;
  }
}

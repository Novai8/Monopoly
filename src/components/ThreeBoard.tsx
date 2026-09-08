import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { BoardTile, Card, OwnershipMap, Player } from '../types';
import { BOARD_THEMES, ThemeConfig } from '../data/boardData';
import { getGridCoordinates } from '../utils/gameHelpers';
import { audio } from '../utils/audio';
import { Eye, RotateCcw, ZoomIn, ZoomOut, Sparkles } from 'lucide-react';
import { ThreeMaterialsManager } from './three/threeMaterials';
import { ThreeBuildingBuilder } from './three/threeBuildings';
import { ThreeThemeDecorator } from './three/threeThemes';
import { ThreePieceBuilder } from './three/threePieces';
import { ThreeDiceSimulator } from './three/threeDice';
import { ThreeCardAnimator } from './three/threeCards';

export interface ThreeBoardProps {
  tiles: BoardTile[];
  players: Player[];
  activePlayer: Player;
  ownership: OwnershipMap;
  dice: [number, number];
  isRolling: boolean;
  theme: string;
  reducedMotion?: boolean;
  cameraMode: 'perspective' | 'top-down';
  onTileClick: (tile: BoardTile) => void;
  highlightedTileId?: number | null;
  drawnCard?: Card | null;
}

export const ThreeBoard: React.FC<ThreeBoardProps> = ({
  tiles,
  players,
  activePlayer,
  ownership,
  dice,
  isRolling,
  theme,
  reducedMotion = false,
  cameraMode,
  onTileClick,
  highlightedTileId,
  drawnCard = null,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [camMode, setCamMode] = useState<'perspective' | 'top-down'>(cameraMode);
  const [hoveredTile, setHoveredTile] = useState<BoardTile | null>(null);

  // Subsystem instances
  const materialsManager = useRef(ThreeMaterialsManager.getInstance());
  const buildingBuilder = useRef(new ThreeBuildingBuilder());
  const themeDecorator = useRef(new ThreeThemeDecorator());
  const pieceBuilder = useRef(new ThreePieceBuilder());
  const diceSimulator = useRef<ThreeDiceSimulator | null>(null);
  const cardAnimator = useRef<ThreeCardAnimator | null>(null);

  // Scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Scene graph groups
  const tilesGroupRef = useRef<THREE.Group | null>(null);
  const buildingsGroupRef = useRef<THREE.Group | null>(null);
  const flagsGroupRef = useRef<THREE.Group | null>(null);
  const pawnsGroupRef = useRef<THREE.Group | null>(null);
  const themeEnvGroupRef = useRef<THREE.Group | null>(null);
  const diceGroupRef = useRef<THREE.Group | null>(null);
  const cardGroupRef = useRef<THREE.Group | null>(null);

  // Camera Orbit Controls state
  const orbitState = useRef({
    isDragging: false,
    prevX: 0,
    prevY: 0,
    theta: 0, // azimuthal
    phi: 0.72, // polar angle
    radius: 65,
    target: new THREE.Vector3(0, -0.5, 0),
  });

  // Animated positions for player pawns
  const pawnAnimatedPositions = useRef<
    Record<string, { currentTile: number; x: number; z: number; y: number; targetTile: number }>
  >({});

  const totalTiles = tiles.length;
  const sideLength = Math.floor(totalTiles / 4);
  const boardScale = 24 / sideLength;
  const themeConfig: ThemeConfig =
    BOARD_THEMES[theme as keyof typeof BOARD_THEMES] || BOARD_THEMES['classic-town'];

  // Helper to convert tile ID to world position (X, Z)
  const getTileWorldPosition = (tileId: number): [number, number] => {
    const { col, row } = getGridCoordinates(tileId, totalTiles);
    const halfSide = sideLength / 2;
    const spacing = 2.45 * boardScale;
    const x = (col - halfSide) * spacing;
    const z = (row - halfSide) * spacing;
    return [x, z];
  };

  // Reset Camera View
  const handleResetCamera = () => {
    audio.play('button-click');
    orbitState.current.theta = 0;
    orbitState.current.phi = camMode === 'top-down' ? 0.05 : 0.72;
    orbitState.current.radius = camMode === 'top-down' ? 75 : 65;
    orbitState.current.target.set(0, -0.5, 0);
  };

  // Toggle Camera View
  const handleToggleCamera = () => {
    audio.play('button-click');
    const nextMode = camMode === 'perspective' ? 'top-down' : 'perspective';
    setCamMode(nextMode);
    if (nextMode === 'top-down') {
      orbitState.current.theta = 0;
      orbitState.current.phi = 0.05;
      orbitState.current.radius = 75;
    } else {
      orbitState.current.theta = 0;
      orbitState.current.phi = 0.72;
      orbitState.current.radius = 65;
    }
  };

  // Zoom Controls
  const handleZoomIn = () => {
    audio.play('button-click');
    orbitState.current.radius = Math.max(28, orbitState.current.radius - 8);
  };

  const handleZoomOut = () => {
    audio.play('button-click');
    orbitState.current.radius = Math.min(95, orbitState.current.radius + 8);
  };

  // ========================================================
  // INITIALIZE THREE.JS SCENE, LIGHTS & CONTROLS
  // ========================================================
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 600;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(themeConfig.boardBg);
    scene.fog = new THREE.FogExp2(themeConfig.boardBg, 0.0075);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 600);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting (Warm Key sunlight + Sky Ambient + Rim light)
    const ambientLight = new THREE.AmbientLight(0xffeedd, 0.85);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.45);
    sunLight.position.set(32, 55, 28);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 200;
    sunLight.shadow.camera.left = -45;
    sunLight.shadow.camera.right = 45;
    sunLight.shadow.camera.top = 45;
    sunLight.shadow.camera.bottom = -45;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);

    const skyFill = new THREE.DirectionalLight(0x93c5fd, 0.45);
    skyFill.position.set(-28, 25, -28);
    scene.add(skyFill);

    // Groups
    const tilesGroup = new THREE.Group();
    scene.add(tilesGroup);
    tilesGroupRef.current = tilesGroup;

    const buildingsGroup = new THREE.Group();
    scene.add(buildingsGroup);
    buildingsGroupRef.current = buildingsGroup;

    const flagsGroup = new THREE.Group();
    scene.add(flagsGroup);
    flagsGroupRef.current = flagsGroup;

    const pawnsGroup = new THREE.Group();
    scene.add(pawnsGroup);
    pawnsGroupRef.current = pawnsGroup;

    const themeEnvGroup = new THREE.Group();
    scene.add(themeEnvGroup);
    themeEnvGroupRef.current = themeEnvGroup;

    // 3D Physical Dice Simulator
    const diceSim = new ThreeDiceSimulator();
    scene.add(diceSim.group);
    diceGroupRef.current = diceSim.group;
    diceSimulator.current = diceSim;

    // 3D Card Animator
    const cardAnim = new ThreeCardAnimator();
    scene.add(cardAnim.group);
    cardGroupRef.current = cardAnim.group;
    cardAnimator.current = cardAnim;

    // Beveled Wooden Tabletop Perimeter Rim
    const boardWidth = (sideLength + 1.25) * 2.45 * boardScale;
    const tableRimGeo = new THREE.BoxGeometry(boardWidth + 3.2, 0.9, boardWidth + 3.2);
    const tableRimMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      roughness: 0.55,
      metalness: 0.15,
    });
    const tableRim = new THREE.Mesh(tableRimGeo, tableRimMat);
    tableRim.position.set(0, -0.65, 0);
    tableRim.receiveShadow = true;
    scene.add(tableRim);

    // Inset Brass Table Border Bevel
    const tableBevelGeo = new THREE.BoxGeometry(boardWidth + 0.8, 0.1, boardWidth + 0.8);
    const tableBevelMat = materialsManager.current.goldMat;
    const tableBevel = new THREE.Mesh(tableBevelGeo, tableBevelMat);
    tableBevel.position.set(0, -0.16, 0);
    scene.add(tableBevel);

    // Center Park Base Terrain
    const centerSize = (sideLength - 1.15) * 2.45 * boardScale;
    const centerGeo = new THREE.BoxGeometry(centerSize, 0.55, centerSize);
    const centerMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(themeConfig.centerBg),
      roughness: 0.7,
      metalness: 0.05,
    });
    const centerMesh = new THREE.Mesh(centerGeo, centerMat);
    centerMesh.position.set(0, -0.28, 0);
    centerMesh.receiveShadow = true;
    scene.add(centerMesh);

    // Decorate Central Plaza with Theme Specific Miniatures
    const envDiorama = themeDecorator.current.decorateTheme(scene, theme, centerSize, boardScale);
    themeEnvGroup.add(envDiorama);

    // Raycaster for Interactive Tile Selection & Hovering
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: PointerEvent) => {
      if ((event.target as HTMLElement).closest('button')) return;

      orbitState.current.isDragging = true;
      orbitState.current.prevX = event.clientX;
      orbitState.current.prevY = event.clientY;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(tilesGroup.children, true);
      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && !(obj.userData && obj.userData.tileId !== undefined)) {
          obj = obj.parent;
        }
        if (obj && obj.userData.tileId !== undefined) {
          const tile = tiles.find((t) => t.id === obj!.userData.tileId);
          if (tile) {
            audio.play('ui-click');
            onTileClick(tile);
          }
        }
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      // Raycast hover check
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(tilesGroup.children, true);
      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && !(obj.userData && obj.userData.tileId !== undefined)) {
          obj = obj.parent;
        }
        if (obj && obj.userData.tileId !== undefined) {
          const found = tiles.find((t) => t.id === obj!.userData.tileId);
          setHoveredTile(found || null);
        }
      } else {
        setHoveredTile(null);
      }

      if (!orbitState.current.isDragging) return;
      const deltaX = event.clientX - orbitState.current.prevX;
      const deltaY = event.clientY - orbitState.current.prevY;
      orbitState.current.prevX = event.clientX;
      orbitState.current.prevY = event.clientY;

      orbitState.current.theta -= deltaX * 0.008;
      orbitState.current.phi = Math.max(
        0.05,
        Math.min(Math.PI / 2 - 0.05, orbitState.current.phi + deltaY * 0.008)
      );
    };

    const handlePointerUp = () => {
      orbitState.current.isDragging = false;
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      orbitState.current.radius = Math.max(
        28,
        Math.min(95, orbitState.current.radius + event.deltaY * 0.05)
      );
    };

    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', handlePointerDown);
    dom.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    dom.addEventListener('wheel', handleWheel, { passive: false });

    // Responsive Canvas Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    // Animation Loop
    let animId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      const delta = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;

      // Update camera position from spherical orbit coordinates
      const { theta, phi, radius, target } = orbitState.current;
      const camX = target.x + radius * Math.sin(phi) * Math.sin(theta);
      const camY = target.y + radius * Math.cos(phi);
      const camZ = target.z + radius * Math.sin(phi) * Math.cos(theta);

      camera.position.x += (camX - camera.position.x) * 0.15;
      camera.position.y += (camY - camera.position.y) * 0.15;
      camera.position.z += (camZ - camera.position.z) * 0.15;
      camera.lookAt(target);

      // Update 3D Physical Dice Simulation
      if (diceSimulator.current) {
        diceSimulator.current.update(isRolling, dice, time);
      }

      // Update 3D Drawn Card Animator
      if (cardAnimator.current) {
        cardAnimator.current.update(drawnCard, delta);
      }

      // Smooth step-by-step pawn hops with arc & squash
      if (pawnsGroupRef.current) {
        pawnsGroupRef.current.children.forEach((pawnObj) => {
          const pId = pawnObj.userData.playerId;
          const animState = pawnAnimatedPositions.current[pId];
          if (animState) {
            const [targetX, targetZ] = getTileWorldPosition(animState.targetTile);

            const dx = targetX - animState.x;
            const dz = targetZ - animState.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist > 0.05) {
              const speed = reducedMotion ? 0.35 : 0.18;
              animState.x += dx * speed;
              animState.z += dz * speed;
              // Parabolic Hop Arc
              animState.y = reducedMotion
                ? 0
                : Math.sin((1 - Math.min(1, dist / 2.45)) * Math.PI) * 1.4;
              pawnObj.scale.set(1, 1, 1);
            } else {
              animState.x = targetX;
              animState.z = targetZ;
              animState.y = 0;
              animState.currentTile = animState.targetTile;
            }

            // Radial distribution if multiple pawns share a tile
            const playersOnSameTile = players.filter(
              (p) => !p.bankrupt && p.position === animState.targetTile
            );
            const myIndexOnTile = playersOnSameTile.findIndex((p) => p.id === pId);
            const angle =
              myIndexOnTile >= 0
                ? (myIndexOnTile / Math.max(1, playersOnSameTile.length)) * Math.PI * 2
                : 0;
            const radiusOffset = playersOnSameTile.length > 1 ? 0.65 : 0;
            const offsetX = Math.cos(angle) * radiusOffset;
            const offsetZ = Math.sin(angle) * radiusOffset;

            pawnObj.position.set(
              animState.x + offsetX,
              0.55 + animState.y,
              animState.z + offsetZ
            );
          }
        });
      }

      // Hover tile elevation animation
      if (tilesGroupRef.current) {
        tilesGroupRef.current.children.forEach((child) => {
          const tId = child.userData.tileId;
          const isTargetHovered = hoveredTile?.id === tId || highlightedTileId === tId;
          const targetLift = isTargetHovered ? 0.22 : 0;
          child.position.y += (targetLift - child.position.y) * 0.2;
        });
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      dom.removeEventListener('pointerdown', handlePointerDown);
      dom.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      dom.removeEventListener('wheel', handleWheel);
      renderer.dispose();
    };
  }, [sideLength, themeConfig, totalTiles, theme]);

  // ========================================================
  // 3D TILES & ROAD LAYOUT WITH PEDESTRIAN CROSSINGS
  // ========================================================
  useEffect(() => {
    if (!tilesGroupRef.current) return;
    const tilesGroup = tilesGroupRef.current;
    tilesGroup.clear();

    const tileSize = 2.35 * boardScale;
    const tileHeight = 0.5;

    tiles.forEach((tile) => {
      const [x, z] = getTileWorldPosition(tile.id);
      const isCorner =
        tile.type === 'start' ||
        tile.type === 'detention' ||
        tile.type === 'rest' ||
        tile.type === 'go-to-detention';

      const tileRoot = new THREE.Group();
      tileRoot.position.set(x, 0, z);
      tileRoot.userData = { tileId: tile.id };

      // Base stone foundation slab
      const geo = new THREE.BoxGeometry(
        isCorner ? tileSize * 1.25 : tileSize,
        tileHeight,
        isCorner ? tileSize * 1.25 : tileSize
      );

      // Color coding
      let tileColor = '#ffffff';
      if (tile.type === 'start') tileColor = '#bbf7d0';
      else if (tile.type === 'detention') tileColor = '#fed7aa';
      else if (tile.type === 'rest') tileColor = '#e0e7ff';
      else if (tile.type === 'go-to-detention') tileColor = '#fecaca';
      else if (tile.type === 'tax') tileColor = '#fef08a';
      else if (tile.type === 'station') tileColor = '#e2e8f0';
      else if (tile.type === 'utility') tileColor = '#f3e8ff';
      else if (tile.type === 'event') tileColor = '#fef3c7';
      else if (tile.type === 'community') tileColor = '#dbeafe';

      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(tileColor),
        roughness: 0.35,
        metalness: 0.08,
      });

      const baseMesh = new THREE.Mesh(geo, mat);
      baseMesh.position.set(0, tileHeight / 2, 0);
      baseMesh.castShadow = true;
      baseMesh.receiveShadow = true;
      baseMesh.userData = { tileId: tile.id };
      tileRoot.add(baseMesh);

      // Asphalt Road Surface layer with curbs
      const roadGeo = new THREE.BoxGeometry(
        isCorner ? tileSize * 1.2 : tileSize * 0.96,
        0.04,
        isCorner ? tileSize * 1.2 : tileSize * 0.96
      );
      const roadMesh = new THREE.Mesh(roadGeo, materialsManager.current.roadAsphaltMat);
      roadMesh.position.set(0, tileHeight + 0.02, 0);
      roadMesh.receiveShadow = true;
      roadMesh.userData = { tileId: tile.id };
      tileRoot.add(roadMesh);

      // Sidewalk Paved Strip on the property side
      const sidewalkGeo = new THREE.BoxGeometry(tileSize * 0.94, 0.06, tileSize * 0.45);
      const sidewalkMesh = new THREE.Mesh(sidewalkGeo, materialsManager.current.sidewalkMat);
      sidewalkMesh.position.set(0, tileHeight + 0.04, -tileSize * 0.24);
      sidewalkMesh.receiveShadow = true;
      tileRoot.add(sidewalkMesh);

      // Painted Road Markings (Zebra pedestrian crossing at corners or lane dashes)
      if (isCorner) {
        // Pedestrian Crosswalk stripes
        const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
        for (let s = -2; s <= 2; s++) {
          const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.18 * boardScale, 0.01, 1.2 * boardScale), stripeMat);
          stripe.position.set(s * 0.35 * boardScale, tileHeight + 0.05, 0);
          tileRoot.add(stripe);
        }
      } else {
        // Road centerline dash
        const dashMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
        const dash = new THREE.Mesh(new THREE.BoxGeometry(0.12 * boardScale, 0.01, 0.8 * boardScale), dashMat);
        dash.position.set(0, tileHeight + 0.05, tileSize * 0.22);
        tileRoot.add(dash);
      }

      // Group header banner for property tiles
      if (tile.group) {
        const headerGeo = new THREE.BoxGeometry(tileSize * 0.92, 0.12, tileSize * 0.26);
        const groupColors: Record<string, string> = {
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
        const headerMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(groupColors[tile.group] || '#475569'),
          roughness: 0.25,
        });
        const headerMesh = new THREE.Mesh(headerGeo, headerMat);
        headerMesh.position.set(0, tileHeight + 0.08, -tileSize * 0.34);
        tileRoot.add(headerMesh);
      }

      tilesGroup.add(tileRoot);
    });
  }, [tiles, boardScale, sideLength, totalTiles]);

  // ========================================================
  // 3D MINIATURE BUILDINGS & PHYSICAL PROPERTY SIGNS
  // ========================================================
  useEffect(() => {
    if (!buildingsGroupRef.current) return;
    const group = buildingsGroupRef.current;
    group.clear();

    tiles.forEach((tile) => {
      const [x, z] = getTileWorldPosition(tile.id);
      const houses = ownership[tile.id]?.houses || 0;

      // Build 3D location model (houses, shops, harbors, stations, parks, etc.)
      const buildingModel = buildingBuilder.current.buildTileLocation(
        tile,
        houses,
        theme,
        boardScale
      );
      buildingModel.position.set(x, 0.55, z);
      group.add(buildingModel);
    });
  }, [tiles, ownership, theme, boardScale, sideLength, totalTiles]);

  // ========================================================
  // PROPERTY OWNERSHIP FLAGS
  // ========================================================
  useEffect(() => {
    if (!flagsGroupRef.current) return;
    const group = flagsGroupRef.current;
    group.clear();

    const flagpoleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.3, 8);
    const flagpoleMat = materialsManager.current.brassMat;
    const flagBannerGeo = new THREE.BoxGeometry(0.55, 0.32, 0.04);

    Object.entries(ownership).forEach(([idStr, prop]) => {
      const tileId = Number(idStr);
      if (!prop.ownerId) return;

      const owner = players.find((p) => p.id === prop.ownerId);
      if (!owner) return;

      const [x, z] = getTileWorldPosition(tileId);
      const flagGroup = new THREE.Group();

      const pole = new THREE.Mesh(flagpoleGeo, flagpoleMat);
      pole.position.y = 0.65;
      pole.castShadow = true;
      flagGroup.add(pole);

      const bannerColor = prop.isMortgaged ? '#6b7280' : owner.color;
      const bannerMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(bannerColor),
        roughness: 0.35,
      });
      const banner = new THREE.Mesh(flagBannerGeo, bannerMat);
      banner.position.set(0.28, 1.05, 0);
      banner.castShadow = true;
      flagGroup.add(banner);

      // Gold spearhead finial
      const finial = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 6), materialsManager.current.goldMat);
      finial.position.y = 1.35;
      flagGroup.add(finial);

      flagGroup.position.set(x + 0.85, 0.55, z + 0.75);
      group.add(flagGroup);
    });
  }, [ownership, players, boardScale, sideLength, totalTiles]);

  // ========================================================
  // 3D PLAYER MINIATURE FIGURINES
  // ========================================================
  useEffect(() => {
    if (!pawnsGroupRef.current) return;
    const pawnsGroup = pawnsGroupRef.current;
    pawnsGroup.clear();

    players.forEach((player) => {
      if (player.bankrupt) return;

      if (!pawnAnimatedPositions.current[player.id]) {
        const [initX, initZ] = getTileWorldPosition(player.position);
        pawnAnimatedPositions.current[player.id] = {
          currentTile: player.position,
          targetTile: player.position,
          x: initX,
          z: initZ,
          y: 0,
        };
      } else {
        pawnAnimatedPositions.current[player.id].targetTile = player.position;
      }

      // Sculpt detailed figurine on weighted metallic token pedestal
      const pawnRoot = pieceBuilder.current.buildPawn(player.character, player.color);
      pawnRoot.userData = { playerId: player.id };
      pawnsGroup.add(pawnRoot);
    });
  }, [players, boardScale, sideLength, totalTiles]);

  return (
    <div className="relative w-full h-[540px] md:h-[640px] lg:h-[700px] rounded-2xl overflow-hidden shadow-2xl border border-stone-800 bg-stone-950 select-none group">
      {/* 3D WebGL Canvas Viewport */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating HUD Badges: Active Theme & Hovered Location */}
      <div className="absolute top-3 left-3 flex flex-col gap-2 pointer-events-none z-10">
        <div className="bg-stone-900/90 border border-stone-700/80 px-3.5 py-1.5 rounded-xl shadow-lg backdrop-blur-md flex items-center gap-2 text-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold text-stone-200 uppercase tracking-wider">
            {themeConfig.name}
          </span>
          <span className="text-stone-500 font-mono">({sideLength * 4} Tiles)</span>
        </div>

        {hoveredTile && (
          <div className="bg-stone-900/95 border border-amber-500/50 px-3.5 py-2 rounded-xl shadow-xl backdrop-blur-md flex flex-col gap-0.5 text-xs text-stone-200">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-300 text-sm">{hoveredTile.name}</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-stone-800 text-stone-400">
                {hoveredTile.type}
              </span>
            </div>
            {hoveredTile.cost && (
              <span className="text-emerald-400 font-semibold font-mono">
                ${hoveredTile.cost.toLocaleString()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Floating Viewport Orbit Controls (Top-Right) */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-stone-900/90 border border-stone-700/80 p-1.5 rounded-2xl shadow-xl backdrop-blur-md z-10">
        <button
          onClick={handleToggleCamera}
          title={camMode === 'perspective' ? 'Switch to Top-Down View' : 'Switch to 3D Orbit View'}
          className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            camMode === 'top-down'
              ? 'bg-amber-500 text-stone-950 shadow-md'
              : 'text-stone-300 hover:text-white hover:bg-stone-800'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline">{camMode === 'top-down' ? 'Top-Down' : '3D Orbit'}</span>
        </button>

        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-2 rounded-xl text-stone-300 hover:text-white hover:bg-stone-800 transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-2 rounded-xl text-stone-300 hover:text-white hover:bg-stone-800 transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          onClick={handleResetCamera}
          title="Reset Camera Angle"
          className="p-2 rounded-xl text-stone-300 hover:text-white hover:bg-stone-800 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Subtle Interaction Tip */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none text-[11px] text-stone-400 bg-stone-900/80 px-3 py-1 rounded-full border border-stone-800 backdrop-blur-xs">
        Drag to orbit • Scroll to zoom • Click properties to inspect
      </div>
    </div>
  );
};

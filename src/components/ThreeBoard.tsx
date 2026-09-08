import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { BoardTile, CharacterId, OwnershipMap, Player } from '../types';
import { BOARD_THEMES, ThemeConfig } from '../data/boardData';
import { getGridCoordinates } from '../utils/gameHelpers';
import { audio } from '../utils/audio';
import { Eye, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

interface ThreeBoardProps {
  tiles: BoardTile[];
  players: Player[];
  activePlayer: Player;
  ownership: OwnershipMap;
  dice: [number, number];
  isRolling: boolean;
  theme: string;
  reducedMotion: boolean;
  cameraMode: 'perspective' | 'top-down';
  onTileClick: (tile: BoardTile) => void;
  highlightedTileId?: number | null;
}

// Face orientations for standard 6-sided die:
// 1 (+Z), 6 (-Z), 2 (+X), 5 (-X), 3 (+Y), 4 (-Y)
function getDiceRotationForValue(val: number): [number, number, number] {
  switch (val) {
    case 1:
      return [0, 0, 0];
    case 6:
      return [Math.PI, 0, 0];
    case 2:
      return [0, -Math.PI / 2, 0];
    case 5:
      return [0, Math.PI / 2, 0];
    case 3:
      return [-Math.PI / 2, 0, 0];
    case 4:
      return [Math.PI / 2, 0, 0];
    default:
      return [0, 0, 0];
  }
}

// Generate canvas texture for die faces with authentic dot pips
function createDiceTexture(dots: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Warm cream background
  ctx.fillStyle = '#fefce8';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 124, 124);

  // Dots
  ctx.fillStyle = '#1e293b';
  const drawPip = (x: number, y: number) => {
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fill();
  };

  const c = 64;
  const l = 34;
  const r = 94;
  const t = 34;
  const b = 94;

  if (dots === 1) {
    ctx.fillStyle = '#e11d48'; // Rich red center pip
    drawPip(c, c);
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

// Create materials for a 6-sided die
const diceMaterialsCache: THREE.MeshStandardMaterial[] = [
  new THREE.MeshStandardMaterial({ map: createDiceTexture(2), roughness: 0.25 }), // +X
  new THREE.MeshStandardMaterial({ map: createDiceTexture(5), roughness: 0.25 }), // -X
  new THREE.MeshStandardMaterial({ map: createDiceTexture(3), roughness: 0.25 }), // +Y
  new THREE.MeshStandardMaterial({ map: createDiceTexture(4), roughness: 0.25 }), // -Y
  new THREE.MeshStandardMaterial({ map: createDiceTexture(1), roughness: 0.25 }), // +Z
  new THREE.MeshStandardMaterial({ map: createDiceTexture(6), roughness: 0.25 }), // -Z
];

export const ThreeBoard: React.FC<ThreeBoardProps> = ({
  tiles,
  players,
  activePlayer,
  ownership,
  dice,
  isRolling,
  theme,
  reducedMotion,
  cameraMode,
  onTileClick,
  highlightedTileId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [camMode, setCamMode] = useState<'perspective' | 'top-down'>(cameraMode);
  const [hoveredTile, setHoveredTile] = useState<BoardTile | null>(null);

  // References to keep across render loops
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const tilesGroupRef = useRef<THREE.Group | null>(null);
  const buildingsGroupRef = useRef<THREE.Group | null>(null);
  const flagsGroupRef = useRef<THREE.Group | null>(null);
  const pawnsGroupRef = useRef<THREE.Group | null>(null);
  const decorationsGroupRef = useRef<THREE.Group | null>(null);
  const diceGroupRef = useRef<THREE.Group | null>(null);
  const die1MeshRef = useRef<THREE.Mesh | null>(null);
  const die2MeshRef = useRef<THREE.Mesh | null>(null);

  // Physics state for 3D falling dice
  const dicePhysics = useRef({
    d1: { y: 1.2, vy: 0, x: -1.8, vx: 0, z: 0, vz: 0, rx: 0, ry: 0, rz: 0, bounces: 0 },
    d2: { y: 1.2, vy: 0, x: 1.8, vx: 0, z: 0, vz: 0, rx: 0, ry: 0, rz: 0, bounces: 0 },
    settled: true,
  });

  // Camera Orbit Controls state
  const orbitState = useRef({
    isDragging: false,
    prevX: 0,
    prevY: 0,
    theta: 0, // azimuthal
    phi: 0.75, // polar angle
    radius: 65,
    target: new THREE.Vector3(0, -1, 0),
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
    const spacing = 2.4 * boardScale;
    const x = (col - halfSide) * spacing;
    const z = (row - halfSide) * spacing;
    return [x, z];
  };

  // Reset Camera View
  const handleResetCamera = () => {
    audio.play('button-click');
    orbitState.current.theta = 0;
    orbitState.current.phi = camMode === 'top-down' ? 0.05 : 0.75;
    orbitState.current.radius = camMode === 'top-down' ? 75 : 65;
    orbitState.current.target.set(0, -1, 0);
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
      orbitState.current.phi = 0.75;
      orbitState.current.radius = 65;
    }
  };

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 580;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(themeConfig.boardBg);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.5, 500);
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
    container.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff7ed, 1.4);
    dirLight.position.set(30, 50, 25);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.45);
    fillLight.position.set(-25, 25, -25);
    scene.add(fillLight);

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

    const decorationsGroup = new THREE.Group();
    scene.add(decorationsGroup);
    decorationsGroupRef.current = decorationsGroup;

    const diceGroup = new THREE.Group();
    scene.add(diceGroup);
    diceGroupRef.current = diceGroup;

    // Outer Wooden Tabletop Border (Physical tabletop feel)
    const boardWidth = (sideLength + 1.2) * 2.4 * boardScale;
    const tableRimGeo = new THREE.BoxGeometry(boardWidth + 2.5, 0.8, boardWidth + 2.5);
    const tableRimMat = new THREE.MeshStandardMaterial({
      color: 0x292524,
      roughness: 0.5,
      metalness: 0.15,
    });
    const tableRim = new THREE.Mesh(tableRimGeo, tableRimMat);
    tableRim.position.set(0, -0.6, 0);
    tableRim.receiveShadow = true;
    scene.add(tableRim);

    // Center Park Table
    const centerSize = (sideLength - 1.2) * 2.4 * boardScale;
    const centerGeo = new THREE.BoxGeometry(centerSize, 0.6, centerSize);
    const centerMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(themeConfig.centerBg),
      roughness: 0.6,
      metalness: 0.1,
    });
    const centerMesh = new THREE.Mesh(centerGeo, centerMat);
    centerMesh.position.set(0, -0.3, 0);
    centerMesh.receiveShadow = true;
    scene.add(centerMesh);

    // 3D Physical Tabletop Miniatures: Fountain, Trees, Lamps, Benches in center park
    // 1. Center Water Fountain
    const fountainGroup = new THREE.Group();
    const basinGeo = new THREE.CylinderGeometry(2.4, 2.6, 0.5, 24);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.8 });
    const basinMesh = new THREE.Mesh(basinGeo, stoneMat);
    basinMesh.position.y = 0.25;
    basinMesh.castShadow = true;
    basinMesh.receiveShadow = true;
    fountainGroup.add(basinMesh);

    const waterGeo = new THREE.CylinderGeometry(2.1, 2.1, 0.15, 24);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.1,
      metalness: 0.3,
      transparent: true,
      opacity: 0.85,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = 0.45;
    fountainGroup.add(waterMesh);

    const pillarGeo = new THREE.CylinderGeometry(0.5, 0.7, 0.8, 16);
    const pillarMesh = new THREE.Mesh(pillarGeo, stoneMat);
    pillarMesh.position.y = 0.7;
    pillarMesh.castShadow = true;
    fountainGroup.add(pillarMesh);

    const topBowlGeo = new THREE.CylinderGeometry(1.0, 0.3, 0.3, 16);
    const topBowlMesh = new THREE.Mesh(topBowlGeo, stoneMat);
    topBowlMesh.position.y = 1.15;
    topBowlMesh.castShadow = true;
    fountainGroup.add(topBowlMesh);
    decorationsGroup.add(fountainGroup);

    // 2. Stylized Park Trees (Oak & Pine)
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const oakLeavesMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
    const pineLeavesMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.6 });

    const createOakTree = (x: number, z: number, scale: number = 1) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18 * scale, 0.25 * scale, 1.2 * scale, 8),
        treeTrunkMat
      );
      trunk.position.y = 0.6 * scale;
      trunk.castShadow = true;
      tree.add(trunk);

      const foliage = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.85 * scale, 1),
        oakLeavesMat
      );
      foliage.position.y = 1.6 * scale;
      foliage.castShadow = true;
      tree.add(foliage);

      tree.position.set(x, 0, z);
      return tree;
    };

    const createPineTree = (x: number, z: number, scale: number = 1) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15 * scale, 0.22 * scale, 1.0 * scale, 8),
        treeTrunkMat
      );
      trunk.position.y = 0.5 * scale;
      trunk.castShadow = true;
      tree.add(trunk);

      for (let i = 0; i < 3; i++) {
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry((0.9 - i * 0.2) * scale, 0.8 * scale, 8),
          pineLeavesMat
        );
        cone.position.y = (1.0 + i * 0.45) * scale;
        cone.castShadow = true;
        tree.add(cone);
      }
      tree.position.set(x, 0, z);
      return tree;
    };

    // Place trees in park quadrants
    const parkOffset = centerSize * 0.28;
    decorationsGroup.add(createOakTree(-parkOffset, -parkOffset, 1.1));
    decorationsGroup.add(createOakTree(parkOffset, parkOffset, 1.0));
    decorationsGroup.add(createPineTree(-parkOffset, parkOffset, 1.15));
    decorationsGroup.add(createPineTree(parkOffset, -parkOffset, 1.05));

    // 3. Vintage Street Lamps
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
    const lightGlowMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfef08a,
      emissiveIntensity: 0.8,
    });

    const createStreetLamp = (x: number, z: number) => {
      const lamp = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1.8, 8), lampMat);
      pole.position.y = 0.9;
      pole.castShadow = true;
      lamp.add(pole);

      const lampHead = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.3), lightGlowMat);
      lampHead.position.y = 1.85;
      lamp.add(lampHead);

      lamp.position.set(x, 0, z);
      return lamp;
    };

    const lampDist = centerSize * 0.38;
    decorationsGroup.add(createStreetLamp(-lampDist, 0));
    decorationsGroup.add(createStreetLamp(lampDist, 0));
    decorationsGroup.add(createStreetLamp(0, -lampDist));
    decorationsGroup.add(createStreetLamp(0, lampDist));

    // 4. Park Benches
    const benchWoodMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.6 });
    const createBench = (x: number, z: number, rotY: number) => {
      const bench = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.4), benchWoodMat);
      seat.position.y = 0.3;
      seat.castShadow = true;
      bench.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 0.06), benchWoodMat);
      back.position.set(0, 0.5, -0.16);
      back.castShadow = true;
      bench.add(back);

      bench.position.set(x, 0, z);
      bench.rotation.y = rotY;
      return bench;
    };

    decorationsGroup.add(createBench(0, 3.8, 0));
    decorationsGroup.add(createBench(0, -3.8, Math.PI));

    // 3D Physical Dice setup
    const dieGeo = new THREE.BoxGeometry(2.2, 2.2, 2.2);
    const die1 = new THREE.Mesh(dieGeo, diceMaterialsCache);
    die1.castShadow = true;
    die1.position.set(-2.0, 1.2, 0);
    diceGroup.add(die1);
    die1MeshRef.current = die1;

    const die2 = new THREE.Mesh(dieGeo, diceMaterialsCache);
    die2.castShadow = true;
    die2.position.set(2.0, 1.2, 0);
    diceGroup.add(die2);
    die2MeshRef.current = die2;

    // Raycaster for tile clicking
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: PointerEvent) => {
      // Don't drag if clicking buttons
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
      if (!orbitState.current.isDragging) return;
      const deltaX = event.clientX - orbitState.current.prevX;
      const deltaY = event.clientY - orbitState.current.prevY;
      orbitState.current.prevX = event.clientX;
      orbitState.current.prevY = event.clientY;

      // Orbit sensitivity
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
      // Prevent browser scroll
      event.preventDefault();
      orbitState.current.radius = Math.max(
        28,
        Math.min(95, orbitState.current.radius + event.deltaY * 0.05)
      );
    };

    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    dom.addEventListener('wheel', handleWheel, { passive: false });

    // Resize observer
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

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);

      // Update camera position from spherical orbit coordinates
      const { theta, phi, radius, target } = orbitState.current;
      const camX = target.x + radius * Math.sin(phi) * Math.sin(theta);
      const camY = target.y + radius * Math.cos(phi);
      const camZ = target.z + radius * Math.sin(phi) * Math.cos(theta);

      // Smooth camera motion
      camera.position.x += (camX - camera.position.x) * 0.15;
      camera.position.y += (camY - camera.position.y) * 0.15;
      camera.position.z += (camZ - camera.position.z) * 0.15;
      camera.lookAt(target);

      // Physical Falling Dice Simulation
      const p1 = dicePhysics.current.d1;
      const p2 = dicePhysics.current.d2;

      if (isRolling) {
        if (dicePhysics.current.settled) {
          // Spawn dice high above with downward velocity and tumbling rotations
          p1.y = 15.0;
          p1.vy = -0.4;
          p1.x = -2.2;
          p1.z = -0.5;
          p1.vx = 0.04;
          p1.vz = 0.02;
          p1.rx = 0.45;
          p1.ry = 0.35;
          p1.rz = 0.25;
          p1.bounces = 0;

          p2.y = 17.0;
          p2.vy = -0.5;
          p2.x = 2.0;
          p2.z = 0.5;
          p2.vx = -0.04;
          p2.vz = -0.02;
          p2.rx = -0.4;
          p2.ry = 0.5;
          p2.rz = -0.3;
          p2.bounces = 0;

          dicePhysics.current.settled = false;
        }

        // Apply gravity and update positions
        [p1, p2].forEach((p, idx) => {
          p.vy -= 0.65; // gravity
          p.y += p.vy * 0.16;
          p.x += p.vx;
          p.z += p.vz;

          // Bounce floor at y = 1.1
          if (p.y <= 1.1) {
            p.y = 1.1;
            if (p.bounces < 3 && Math.abs(p.vy) > 0.8) {
              p.vy = -p.vy * 0.42; // restitution
              p.bounces++;
              audio.play('dice-bounce');
            } else {
              p.vy = 0;
            }
          }

          // Spin rotations
          p.rx *= 0.98;
          p.ry *= 0.98;
          p.rz *= 0.98;
        });

        if (die1MeshRef.current) {
          die1MeshRef.current.position.set(p1.x, p1.y, p1.z);
          die1MeshRef.current.rotation.x += p1.rx;
          die1MeshRef.current.rotation.y += p1.ry;
          die1MeshRef.current.rotation.z += p1.rz;
        }
        if (die2MeshRef.current) {
          die2MeshRef.current.position.set(p2.x, p2.y, p2.z);
          die2MeshRef.current.rotation.x += p2.rx;
          die2MeshRef.current.rotation.y += p2.ry;
          die2MeshRef.current.rotation.z += p2.rz;
        }
      } else {
        if (!dicePhysics.current.settled) {
          dicePhysics.current.settled = true;
          audio.play('dice-settle');
        }

        // Settle dice smoothly to server-authoritative numbers
        const rot1 = getDiceRotationForValue(dice[0]);
        const rot2 = getDiceRotationForValue(dice[1]);

        if (die1MeshRef.current) {
          die1MeshRef.current.position.y += (1.1 - die1MeshRef.current.position.y) * 0.25;
          die1MeshRef.current.position.x += (-2.0 - die1MeshRef.current.position.x) * 0.2;
          die1MeshRef.current.position.z += (0 - die1MeshRef.current.position.z) * 0.2;
          die1MeshRef.current.rotation.x += (rot1[0] - die1MeshRef.current.rotation.x) * 0.25;
          die1MeshRef.current.rotation.y += (rot1[1] - die1MeshRef.current.rotation.y) * 0.25;
          die1MeshRef.current.rotation.z += (rot1[2] - die1MeshRef.current.rotation.z) * 0.25;
        }
        if (die2MeshRef.current) {
          die2MeshRef.current.position.y += (1.1 - die2MeshRef.current.position.y) * 0.25;
          die2MeshRef.current.position.x += (2.0 - die2MeshRef.current.position.x) * 0.2;
          die2MeshRef.current.position.z += (0 - die2MeshRef.current.position.z) * 0.2;
          die2MeshRef.current.rotation.x += (rot2[0] - die2MeshRef.current.rotation.x) * 0.25;
          die2MeshRef.current.rotation.y += (rot2[1] - die2MeshRef.current.rotation.y) * 0.25;
          die2MeshRef.current.rotation.z += (rot2[2] - die2MeshRef.current.rotation.z) * 0.25;
        }
      }

      // Smooth step-by-step animation for pawns with hop arc and landing squash
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
              // Hop Arc
              animState.y = reducedMotion
                ? 0
                : Math.sin((1 - Math.min(1, dist / 2.4)) * Math.PI) * 1.3;
              pawnObj.scale.set(1, 1, 1);
            } else {
              animState.x = targetX;
              animState.z = targetZ;
              animState.y = 0;
              animState.currentTile = animState.targetTile;
            }

            // Offset pawns if multiple players share the tile
            const playersOnSameTile = players.filter(
              (p) => !p.bankrupt && p.position === animState.targetTile
            );
            const myIndexOnTile = playersOnSameTile.findIndex((p) => p.id === pId);
            const angle =
              myIndexOnTile >= 0
                ? (myIndexOnTile / Math.max(1, playersOnSameTile.length)) * Math.PI * 2
                : 0;
            const radius = playersOnSameTile.length > 1 ? 0.6 : 0;
            const offsetX = Math.cos(angle) * radius;
            const offsetZ = Math.sin(angle) * radius;

            pawnObj.position.set(
              animState.x + offsetX,
              1.2 + animState.y,
              animState.z + offsetZ
            );
          }
        });
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      dom.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      dom.removeEventListener('wheel', handleWheel);
      renderer.dispose();
    };
  }, [sideLength, themeConfig, totalTiles]);

  // Update 3D Tiles when tiles or theme changes
  useEffect(() => {
    if (!tilesGroupRef.current) return;
    const tilesGroup = tilesGroupRef.current;
    tilesGroup.clear();

    const tileSize = 2.1 * boardScale;
    const tileHeight = 0.5;

    tiles.forEach((tile) => {
      const [x, z] = getTileWorldPosition(tile.id);
      const isCorner =
        tile.type === 'start' ||
        tile.type === 'detention' ||
        tile.type === 'rest' ||
        tile.type === 'go-to-detention';

      const isHighlighted = highlightedTileId === tile.id;

      // Base tile mesh
      const geo = new THREE.BoxGeometry(
        isCorner ? tileSize * 1.3 : tileSize,
        tileHeight,
        isCorner ? tileSize * 1.3 : tileSize
      );

      // Color coding
      let tileColor = '#ffffff';
      if (isHighlighted) tileColor = '#fef08a';
      else if (tile.type === 'start') tileColor = '#bbf7d0';
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
        roughness: 0.3,
        metalness: 0.1,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, tileHeight / 2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { tileId: tile.id };

      // Add group header banner for property tiles
      if (tile.group) {
        const headerGeo = new THREE.BoxGeometry(tileSize * 0.92, 0.12, tileSize * 0.3);
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
          roughness: 0.2,
        });
        const headerMesh = new THREE.Mesh(headerGeo, headerMat);
        headerMesh.position.set(0, tileHeight / 2 + 0.06, -tileSize * 0.28);
        mesh.add(headerMesh);
      }

      tilesGroup.add(mesh);
    });
  }, [tiles, boardScale, sideLength, totalTiles, highlightedTileId]);

  // Update Buildings (Houses & Hotels)
  useEffect(() => {
    if (!buildingsGroupRef.current) return;
    const group = buildingsGroupRef.current;
    group.clear();

    Object.entries(ownership).forEach(([idStr, prop]) => {
      const tileId = Number(idStr);
      if (prop.houses > 0 && !prop.isMortgaged) {
        const [x, z] = getTileWorldPosition(tileId);

        if (prop.houses === 5) {
          // Hotel Tower: Red/Gold tall building
          const hotelGeo = new THREE.BoxGeometry(0.8, 1.4, 0.8);
          const hotelMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 });
          const hotelMesh = new THREE.Mesh(hotelGeo, hotelMat);
          hotelMesh.position.set(x, 1.2, z);
          hotelMesh.castShadow = true;
          group.add(hotelMesh);

          // Roof pyramid
          const roofGeo = new THREE.ConeGeometry(0.65, 0.5, 4);
          const roofMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.2 });
          const roofMesh = new THREE.Mesh(roofGeo, roofMat);
          roofMesh.position.set(x, 2.15, z);
          roofMesh.rotation.y = Math.PI / 4;
          roofMesh.castShadow = true;
          group.add(roofMesh);
        } else {
          // 1 to 4 Small Cottages
          for (let h = 0; h < prop.houses; h++) {
            const offset = (h - (prop.houses - 1) / 2) * 0.45;
            const houseGeo = new THREE.BoxGeometry(0.35, 0.4, 0.35);
            const houseMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.3 });
            const houseMesh = new THREE.Mesh(houseGeo, houseMat);
            houseMesh.position.set(x + offset, 0.7, z - 0.4);
            houseMesh.castShadow = true;
            group.add(houseMesh);
          }
        }
      }
    });
  }, [ownership, boardScale, sideLength, totalTiles]);

  // Update Property Ownership Flags on 3D board (Requirement 5)
  useEffect(() => {
    if (!flagsGroupRef.current) return;
    const group = flagsGroupRef.current;
    group.clear();

    const flagpoleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8);
    const flagpoleMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      metalness: 0.7,
      roughness: 0.3,
    });
    const flagBannerGeo = new THREE.BoxGeometry(0.48, 0.28, 0.04);

    Object.entries(ownership).forEach(([idStr, prop]) => {
      const tileId = Number(idStr);
      if (!prop.ownerId) return;

      const owner = players.find((p) => p.id === prop.ownerId);
      if (!owner) return;

      const [x, z] = getTileWorldPosition(tileId);

      const flagGroup = new THREE.Group();

      // Flagpole
      const pole = new THREE.Mesh(flagpoleGeo, flagpoleMat);
      pole.position.y = 0.6;
      pole.castShadow = true;
      flagGroup.add(pole);

      // Cloth banner in owner color
      const bannerColor = prop.isMortgaged ? '#6b7280' : owner.color;
      const bannerMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(bannerColor),
        roughness: 0.4,
      });
      const banner = new THREE.Mesh(flagBannerGeo, bannerMat);
      banner.position.set(0.24, 0.95, 0);
      banner.castShadow = true;
      flagGroup.add(banner);

      // Position flag at tile corner so it doesn't block pawns or houses
      flagGroup.position.set(x + 0.75, 0.4, z + 0.65);
      group.add(flagGroup);
    });
  }, [ownership, players, boardScale, sideLength, totalTiles]);

  // Update 3D Character Pawns
  useEffect(() => {
    if (!pawnsGroupRef.current) return;
    const pawnsGroup = pawnsGroupRef.current;
    pawnsGroup.clear();

    players.forEach((player) => {
      if (player.bankrupt) return;

      // Track animated positions
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

      // Create distinct 3D pawn model for character
      const pawnRoot = new THREE.Group();
      pawnRoot.userData = { playerId: player.id };

      const baseMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(player.color),
        roughness: 0.2,
        metalness: 0.1,
      });

      if (player.character === 'duck') {
        const bodyGeo = new THREE.SphereGeometry(0.45, 16, 16);
        const duckMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 });
        const body = new THREE.Mesh(bodyGeo, duckMat);
        body.position.y = 0.45;
        pawnRoot.add(body);

        const headGeo = new THREE.SphereGeometry(0.28, 16, 16);
        const head = new THREE.Mesh(headGeo, duckMat);
        head.position.set(0, 0.8, 0.2);
        pawnRoot.add(head);

        const beakGeo = new THREE.ConeGeometry(0.12, 0.25, 8);
        const beakMat = new THREE.MeshStandardMaterial({ color: 0xf97316 });
        const beak = new THREE.Mesh(beakGeo, beakMat);
        beak.rotation.x = Math.PI / 2;
        beak.position.set(0, 0.8, 0.45);
        pawnRoot.add(beak);
      } else if (player.character === 'cat') {
        const bodyGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.7, 16);
        const body = new THREE.Mesh(bodyGeo, baseMat);
        body.position.y = 0.35;
        pawnRoot.add(body);

        const headGeo = new THREE.SphereGeometry(0.32, 16, 16);
        const head = new THREE.Mesh(headGeo, baseMat);
        head.position.set(0, 0.8, 0);
        pawnRoot.add(head);

        const earGeo = new THREE.ConeGeometry(0.1, 0.2, 4);
        const ear1 = new THREE.Mesh(earGeo, baseMat);
        ear1.position.set(-0.16, 1.1, 0);
        const ear2 = new THREE.Mesh(earGeo, baseMat);
        ear2.position.set(0.16, 1.1, 0);
        pawnRoot.add(ear1);
        pawnRoot.add(ear2);
      } else if (player.character === 'robot') {
        const bodyGeo = new THREE.BoxGeometry(0.5, 0.6, 0.5);
        const body = new THREE.Mesh(bodyGeo, baseMat);
        body.position.y = 0.4;
        pawnRoot.add(body);

        const headGeo = new THREE.BoxGeometry(0.4, 0.35, 0.4);
        const head = new THREE.Mesh(headGeo, baseMat);
        head.position.set(0, 0.85, 0);
        pawnRoot.add(head);

        const antGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8);
        const ant = new THREE.Mesh(antGeo, new THREE.MeshStandardMaterial({ color: 0xffffff }));
        ant.position.set(0, 1.12, 0);
        pawnRoot.add(ant);
      } else if (player.character === 'rocket') {
        const bodyGeo = new THREE.CylinderGeometry(0.15, 0.3, 0.9, 12);
        const body = new THREE.Mesh(bodyGeo, baseMat);
        body.position.y = 0.55;
        pawnRoot.add(body);

        const coneGeo = new THREE.ConeGeometry(0.25, 0.4, 12);
        const coneMat = new THREE.MeshStandardMaterial({ color: 0xdc2626 });
        const cone = new THREE.Mesh(coneGeo, coneMat);
        cone.position.set(0, 1.15, 0);
        pawnRoot.add(cone);
      } else {
        const baseGeo = new THREE.CylinderGeometry(0.4, 0.5, 0.2, 16);
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.1;
        pawnRoot.add(base);

        const stemGeo = new THREE.CylinderGeometry(0.18, 0.3, 0.65, 16);
        const stem = new THREE.Mesh(stemGeo, baseMat);
        stem.position.y = 0.5;
        pawnRoot.add(stem);

        const headGeo = new THREE.SphereGeometry(0.3, 16, 16);
        const head = new THREE.Mesh(headGeo, baseMat);
        head.position.y = 0.95;
        pawnRoot.add(head);
      }

      // Base ring marker
      const ringGeo = new THREE.RingGeometry(0.45, 0.6, 16);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(player.color),
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02;
      pawnRoot.add(ring);

      pawnsGroup.add(pawnRoot);
    });
  }, [players, boardScale, sideLength, totalTiles]);

  return (
    <div className="relative w-full h-full min-h-[380px] rounded-3xl overflow-hidden shadow-2xl border border-stone-800 bg-stone-950 flex flex-col items-center justify-center select-none">
      {/* Three.js Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Floating 3D Camera Controls Bar */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-stone-950/70 p-1 rounded-2xl border border-stone-800 backdrop-blur-md shadow-lg">
        <button
          type="button"
          onClick={handleToggleCamera}
          className="px-2.5 py-1 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          title="Toggle Camera View"
        >
          <Eye className="w-3.5 h-3.5 text-amber-400" />
          <span>{camMode === 'perspective' ? '3D View' : 'Top-Down'}</span>
        </button>

        <button
          type="button"
          onClick={handleResetCamera}
          className="p-1 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 transition cursor-pointer"
          title="Reset Camera Angle"
        >
          <RotateCcw className="w-3.5 h-3.5 text-stone-300" />
        </button>
      </div>

      {/* Active Theme & Hint Badge */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        <div className="px-2.5 py-1 rounded-xl bg-stone-950/80 border border-stone-800 text-[11px] font-bold text-stone-300 backdrop-blur-md flex items-center gap-1.5 shadow-md">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: themeConfig.accentColor }}
          />
          {themeConfig.name}
        </div>
      </div>

      {/* Subtle bottom hint */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 pointer-events-none z-10 text-[10px] text-stone-500/70 uppercase tracking-widest font-mono hidden sm:block">
        Drag to orbit • Scroll to zoom • Click property for deed
      </div>
    </div>
  );
};


import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  BoardSize,
  BoardTheme,
  BoardTile,
  Card,
  CharacterId,
  ChatMessage,
  GameLogEntry,
  GameMode,
  GamePhase,
  GameSettings,
  MultiplayerRoom,
  OpeningRollState,
  OwnershipMap,
  Player,
  TradeOffer,
} from './types';
import { generateBoard, BOARD_THEMES } from './data/boardData';
import { CHARACTERS, CHARACTER_LIST } from './data/charactersData';
import {
  calculateRent,
  getNearestStation,
  getNearestUtility,
  initializeOwnership,
  ownsFullGroup,
} from './utils/gameHelpers';
import {
  evaluateAITrade,
  findAIPropertiesToBuild,
  findAIPropertyToMortgage,
  shouldAIBuyProperty,
} from './utils/aiLogic';
import { audio } from './utils/audio';
import { GameEngine } from './engine/gameEngine';
import { MultiplayerClient } from './utils/multiplayerClient';

import { Board } from './components/Board';
import { PlayerBar } from './components/PlayerBar';
import { GameLog } from './components/GameLog';
import { PropertyPanel } from './components/PropertyPanel';
import { PlayerInspectorModal } from './components/PlayerInspectorModal';
import { ChatPanel } from './components/ChatPanel';
import { PropertyModal } from './components/PropertyModal';
import { TradeModal } from './components/TradeModal';
import { RulesModal } from './components/RulesModal';
import { SettingsModal } from './components/SettingsModal';
import { AuctionModal } from './components/AuctionModal';
import { VoiceChatBar } from './components/VoiceChatBar';
import { Dice } from './components/Dice';
import { ActionBanner } from './components/ActionBanner';
import { MainMenu } from './components/MainMenu';
import { SinglePlayerSetupModal } from './components/SinglePlayerSetupModal';
import { MultiplayerLobbyModal } from './components/MultiplayerLobbyModal';
import { OpeningRollModal } from './components/OpeningRollModal';

import {
  RotateCcw,
  BookOpen,
  ArrowLeftRight,
  Dices,
  Settings,
  Eye,
  Building2,
  Users,
  ScrollText,
  MessageSquare,
  Home,
} from 'lucide-react';

const DEFAULT_SETTINGS: GameSettings = {
  mode: 'classic',
  gameMode: 'classic',
  boardSize: 'standard',
  boardName: 'Classic Town',
  theme: 'classic-town',
  boardTheme: 'classic-town',
  difficulty: 'normal',
  botDifficulty: 'normal',
  playerLimit: 4,
  startingMoney: 1500,
  turnTimer: 45,
  auctionsEnabled: true,
  tradingEnabled: true,
  voiceEnabled: true,
  reducedMotion: false,
  cameraMode: 'perspective',
  soundVolume: 80,
  sfxVolume: 80,
  voiceVolume: 80,
  sfxEnabled: true,
};

export default function App() {
  // Application Screen State: 'menu' | 'single-setup' | 'multiplayer-lobby' | 'playing'
  const [appScreen, setAppScreen] = useState<'menu' | 'single-setup' | 'multiplayer-lobby' | 'playing'>('menu');
  const [gameSessionType, setGameSessionType] = useState<'single' | 'multiplayer'>('single');

  // Player Name Identity (saved in localStorage)
  const [playerName, setPlayerName] = useState<string>(() => {
    try {
      return localStorage.getItem('town_tycoon_player_name') || 'Tycoon';
    } catch (_) {
      return 'Tycoon';
    }
  });

  const handleUpdatePlayerName = (name: string) => {
    setPlayerName(name);
    try {
      localStorage.setItem('town_tycoon_player_name', name);
    } catch (_) {}
  };

  // Game Configuration & Settings
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [boardTiles, setBoardTiles] = useState<BoardTile[]>(() =>
    generateBoard(DEFAULT_SETTINGS.boardSize, DEFAULT_SETTINGS.boardTheme)
  );

  // View state: '3d' or '2d'
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');

  // Modals & Panels
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTradeOpen, setIsTradeOpen] = useState(false);
  const [tradePartnerId, setTradePartnerId] = useState<string | undefined>(undefined);
  const [selectedTileModal, setSelectedTileModal] = useState<BoardTile | null>(null);
  const [inspectedPlayer, setInspectedPlayer] = useState<Player | null>(null);

  // Layout & Navigation State
  const [sidebarTab, setSidebarTab] = useState<'players' | 'properties' | 'log' | 'chat'>('players');
  const [highlightedTileId, setHighlightedTileId] = useState<number | null>(null);
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [turnTimerSeconds, setTurnTimerSeconds] = useState<number>(45);

  // Active Auction State (local or multiplayer)
  const [auctionTile, setAuctionTile] = useState<BoardTile | null>(null);

  // Opening Roll State
  const [openingRollState, setOpeningRollState] = useState<OpeningRollState | null>(null);

  // Multiplayer Network State
  const mpClient = useRef(MultiplayerClient.getInstance());
  const [mpRoom, setMpRoom] = useState<MultiplayerRoom | null>(null);
  const [mpError, setMpError] = useState<string | null>(null);

  // Town Chat Messages State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      senderId: 'system',
      senderName: 'Town Mayor',
      senderColor: '#f59e0b',
      senderEmoji: '🏛️',
      text: 'Welcome to Town Tycoon 3D! Build, trade, and dominate the board.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true,
    },
  ]);

  // Players State
  const [players, setPlayers] = useState<Player[]>([
    {
      id: 'p1',
      name: playerName,
      isBot: false,
      isAI: false,
      color: '#ef4444',
      character: 'duck',
      balance: 1500,
      position: 0,
      inDetention: false,
      detentionTurns: 0,
      detentionPasses: 0,
      bankrupt: false,
      voiceState: 'quiet',
      isHost: true,
      ready: true,
    },
    {
      id: 'p2',
      name: 'Barnaby Bot',
      isBot: true,
      isAI: true,
      difficulty: 'normal',
      color: '#3b82f6',
      character: 'cat',
      balance: 1500,
      position: 0,
      inDetention: false,
      detentionTurns: 0,
      detentionPasses: 0,
      bankrupt: false,
      voiceState: 'quiet',
    },
    {
      id: 'p3',
      name: 'Cleo Bot',
      isBot: true,
      isAI: true,
      difficulty: 'hard',
      color: '#10b981',
      character: 'penguin',
      balance: 1500,
      position: 0,
      inDetention: false,
      detentionTurns: 0,
      detentionPasses: 0,
      bankrupt: false,
      voiceState: 'quiet',
    },
    {
      id: 'p4',
      name: 'Darius Bot',
      isBot: true,
      isAI: true,
      difficulty: 'normal',
      color: '#f59e0b',
      character: 'robot',
      balance: 1500,
      position: 0,
      inDetention: false,
      detentionTurns: 0,
      detentionPasses: 0,
      bankrupt: false,
      voiceState: 'quiet',
    },
  ]);

  const [activePlayerIndex, setActivePlayerIndex] = useState<number>(0);
  const activePlayer = players[activePlayerIndex] || players[0];

  // Board Ownership Map
  const [ownership, setOwnership] = useState<OwnershipMap>(() =>
    initializeOwnership(generateBoard(DEFAULT_SETTINGS.boardSize, DEFAULT_SETTINGS.boardTheme))
  );

  // Dice and Movement Phase
  const [dice, setDice] = useState<[number, number]>([1, 1]);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [gamePhase, setGamePhase] = useState<GamePhase>('ready-to-roll');
  const [doublesCount, setDoublesCount] = useState<number>(0);
  const [rollSummary, setRollSummary] = useState<string | null>(null);

  // Turn Action State
  const [drawnCard, setDrawnCard] = useState<Card | null>(null);
  const [pendingRent, setPendingRent] = useState<{ amount: number; recipient: Player } | null>(null);
  const [pendingTax, setPendingTax] = useState<number | null>(null);
  const [canBuyProperty, setCanBuyProperty] = useState<boolean>(false);

  // Game Conclusion State
  const [winner, setWinner] = useState<Player | null>(null);

  // Event Logs
  const [gameLogs, setGameLogs] = useState<GameLogEntry[]>([
    {
      id: 'init-1',
      text: 'Match started! Build your real estate empire.',
      type: 'info',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const addLog = useCallback((text: string, type: GameLogEntry['type'] = 'info') => {
    setGameLogs((prev) => [
      {
        id: Math.random().toString(36).substring(2, 9),
        text,
        type,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev,
    ]);
  }, []);

  // Sync player name changes to Player 1 if currently in local mode
  useEffect(() => {
    if (gameSessionType === 'single') {
      setPlayers((prev) =>
        prev.map((p, idx) => (idx === 0 && !p.isBot ? { ...p, name: playerName } : p))
      );
    }
  }, [playerName, gameSessionType]);

  // ========================================================
  // MULTIPLAYER CLIENT INTEGRATION
  // ========================================================
  useEffect(() => {
    const client = mpClient.current;
    client.connect();

    const cleanup = client.addListener({
      onRoomCreated: (data) => {
        setMpRoom(data.room);
        setMpError(null);
        audio.play('ui-click');
      },
      onRoomJoined: (data) => {
        setMpRoom(data.room);
        setMpError(null);
        audio.play('ui-click');
      },
      onRoomUpdated: (room) => {
        setMpRoom(room);
        setMpError(null);
      },
      onGameStarted: (data) => {
        setMpRoom(data.room);
        setGameSessionType('multiplayer');
        const tiles = generateBoard(data.room.settings.boardSize, data.room.settings.boardTheme);
        setBoardTiles(tiles);
        setSettings(data.room.settings);
        setPlayers(data.gameState.players);
        setActivePlayerIndex(data.gameState.activePlayerIndex);
        setOwnership(data.gameState.ownership);
        setDice(data.gameState.dice);
        setGamePhase(data.gameState.gamePhase);
        setOpeningRollState(data.gameState.openingRoll || null);
        setAppScreen('playing');
        audio.play('auction-win');
      },
      onStateUpdate: (gs) => {
        setPlayers(gs.players);
        setActivePlayerIndex(gs.activePlayerIndex);
        setOwnership(gs.ownership);
        setDice(gs.dice);
        setIsRolling(gs.isRolling);
        setGamePhase(gs.gamePhase);
        setDoublesCount(gs.doublesCount);
        setRollSummary(gs.rollSummary);
        setDrawnCard(gs.drawnCard);
        if (gs.pendingRent) {
          const recipient = gs.players.find((p) => p.id === gs.pendingRent!.recipientId) || gs.players[0];
          setPendingRent({ amount: gs.pendingRent.amount, recipient });
        } else {
          setPendingRent(null);
        }
        setPendingTax(gs.pendingTax);
        setCanBuyProperty(gs.canBuyProperty);
        setWinner(gs.winner);
        setTurnTimerSeconds(gs.turnTimer);
        setOpeningRollState(gs.openingRoll || null);
        if (gs.logs && gs.logs.length > 0) {
          setGameLogs((prev) => {
            const existingIds = new Set(prev.map((l) => l.id));
            const newLogs = gs.logs.filter((l) => !existingIds.has(l.id));
            return [...newLogs, ...prev];
          });
        }
      },
      onChatMessage: (msg) => {
        setChatMessages((prev) => [...prev, msg]);
        audio.play('button-click');
      },
      onEmote: () => {
        audio.play('button-click');
      },
      onPlayerDisconnected: (data) => {
        addLog(`${data.playerName} temporarily disconnected.`, 'info');
      },
      onPlayerReconnected: (data) => {
        addLog(`${data.playerName} reconnected to the match.`, 'info');
      },
      onError: (err) => {
        setMpError(err);
        audio.play('ui-error');
      },
    });

    return () => {
      cleanup();
    };
  }, [addLog]);

  // ========================================================
  // SINGLE PLAYER MATCH LAUNCH & OPENING ROLL
  // ========================================================
  const handleStartSinglePlayerMatch = (config: {
    playerName: string;
    character: CharacterId;
    aiCount: number;
    difficulty: any;
    boardSize: BoardSize;
    theme: BoardTheme;
    mode: GameMode;
    startingMoney: number;
    turnTimer: number;
    rules: any;
  }) => {
    const tiles = generateBoard(config.boardSize, config.theme);
    setBoardTiles(tiles);

    const newSettings: GameSettings = {
      ...DEFAULT_SETTINGS,
      boardSize: config.boardSize,
      boardTheme: config.theme,
      theme: config.theme,
      mode: config.mode,
      gameMode: config.mode,
      botDifficulty: config.difficulty,
      startingMoney: config.startingMoney,
      turnTimer: config.turnTimer,
      auctionsEnabled: config.rules.auctions,
      tradingEnabled: config.rules.trading,
    };
    setSettings(newSettings);

    const botNames = [
      'Barnaby Bot',
      'Cleo Bot',
      'Darius Bot',
      'Eliza Bot',
      'Finley Bot',
      'Gideon Bot',
      'Hattie Bot',
      'Ignatius Bot',
      'Jules Bot',
    ];
    const botCharacters = CHARACTER_LIST.filter((c) => c.id !== config.character);
    const botColors = [
      '#3b82f6',
      '#10b981',
      '#f59e0b',
      '#8b5cf6',
      '#ec4899',
      '#06b6d4',
      '#84cc16',
      '#f97316',
      '#6366f1',
    ];

    const humanPlayer: Player = {
      id: 'p1',
      name: config.playerName,
      isBot: false,
      isAI: false,
      color: '#ef4444',
      character: config.character,
      balance: config.startingMoney,
      position: 0,
      inDetention: false,
      detentionTurns: 0,
      detentionPasses: 0,
      bankrupt: false,
      voiceState: 'quiet',
      isHost: true,
      ready: true,
    };

    const newPlayers: Player[] = [humanPlayer];
    for (let i = 0; i < config.aiCount; i++) {
      const charDef = botCharacters[i % botCharacters.length];
      newPlayers.push({
        id: `bot-${i + 1}`,
        name: botNames[i % botNames.length],
        isBot: true,
        isAI: true,
        difficulty: config.difficulty,
        color: botColors[i % botColors.length],
        character: charDef.id,
        balance: config.startingMoney,
        position: 0,
        inDetention: false,
        detentionTurns: 0,
        detentionPasses: 0,
        bankrupt: false,
        voiceState: 'quiet',
      });
    }

    setPlayers(newPlayers);
    setOwnership(initializeOwnership(tiles));
    setDice([1, 1]);
    setWinner(null);
    setAuctionTile(null);
    setGameSessionType('single');

    // Run authoritative opening roll step
    const initialRoll = GameEngine.conductOpeningRollStep(newPlayers);
    setOpeningRollState(initialRoll);

    if (initialRoll.winnerId) {
      const winnerIdx = newPlayers.findIndex((p) => p.id === initialRoll.winnerId);
      setActivePlayerIndex(winnerIdx >= 0 ? winnerIdx : 0);
    } else {
      setActivePlayerIndex(0);
    }

    setGamePhase('opening-roll');
    setAppScreen('playing');
    addLog('Opening Roll underway to decide turn order!', 'roll');
  };

  const handleProceedFromOpeningRoll = () => {
    if (!openingRollState || !openingRollState.winnerId) return;
    const winnerIdx = players.findIndex((p) => p.id === openingRollState.winnerId);
    setActivePlayerIndex(winnerIdx >= 0 ? winnerIdx : 0);
    setGamePhase('ready-to-roll');
    setOpeningRollState(null);
    audio.play('ui-click');
    addLog(
      `${players[winnerIdx]?.name || 'Player'} won the opening roll and starts Turn 1!`,
      'info'
    );
  };

  const handleRerollOpeningRollTie = () => {
    if (!openingRollState) return;
    if (gameSessionType === 'multiplayer') {
      mpClient.current.rollOpeningRoll();
    } else {
      const nextRoll = GameEngine.conductOpeningRollStep(
        players,
        openingRollState.rolls,
        openingRollState.tiedPlayerIds
      );
      setOpeningRollState(nextRoll);
      if (nextRoll.winnerId) {
        const winnerIdx = players.findIndex((p) => p.id === nextRoll.winnerId);
        setActivePlayerIndex(winnerIdx >= 0 ? winnerIdx : 0);
      }
    }
  };

  // ========================================================
  // CORE GAME ACTIONS: DICE ROLL, MOVEMENT, BUY, AUCTION
  // ========================================================
  const handleRollDice = useCallback(() => {
    if (isRolling || gamePhase !== 'ready-to-roll' || winner) return;

    if (gameSessionType === 'multiplayer') {
      mpClient.current.rollDice();
      return;
    }

    // Local Single Player Simulation
    setIsRolling(true);
    audio.play('dice-roll');

    setTimeout(() => {
      const [d1, d2] = GameEngine.rollDice();
      const total = d1 + d2;
      const isDoubles = d1 === d2;

      setDice([d1, d2]);
      setIsRolling(false);
      audio.play('dice-stop');

      addLog(`${activePlayer.name} rolled [${d1}, ${d2}] = ${total}${isDoubles ? ' (DOUBLES!)' : ''}`, 'roll');

      // Check Detention
      if (activePlayer.inDetention) {
        if (isDoubles) {
          setPlayers((prev) =>
            prev.map((p) =>
              p.id === activePlayer.id ? { ...p, inDetention: false, detentionTurns: 0 } : p
            )
          );
          addLog(`${activePlayer.name} rolled doubles and broke out of Detention!`, 'detention');
          const moveRes = GameEngine.calculateMovementPath(activePlayer.position, total, boardTiles.length);
          setPlayers((prev) =>
            prev.map((p) => (p.id === activePlayer.id ? { ...p, position: moveRes.targetPos } : p))
          );
          handleTileLanding(activePlayer, moveRes.targetPos, total);
        } else {
          const turns = activePlayer.detentionTurns + 1;
          if (turns >= 3) {
            if (activePlayer.balance < 50) {
              declareBankruptcy(activePlayer);
              return;
            }
            setPlayers((prev) =>
              prev.map((p) =>
                p.id === activePlayer.id
                  ? { ...p, balance: p.balance - 50, inDetention: false, detentionTurns: 0 }
                  : p
              )
            );
            addLog(`${activePlayer.name} served 3 turns, paid $50 fine, and was discharged.`, 'detention');
            const moveRes = GameEngine.calculateMovementPath(activePlayer.position, total, boardTiles.length);
            setPlayers((prev) =>
              prev.map((p) => (p.id === activePlayer.id ? { ...p, position: moveRes.targetPos } : p))
            );
            handleTileLanding(activePlayer, moveRes.targetPos, total);
          } else {
            setPlayers((prev) =>
              prev.map((p) => (p.id === activePlayer.id ? { ...p, detentionTurns: turns } : p))
            );
            addLog(`${activePlayer.name} rolled no doubles. Remains in Detention.`, 'detention');
            setGamePhase('turn-end');
          }
        }
        return;
      }

      // Check 3 consecutive doubles
      if (isDoubles) {
        const nextDoubles = doublesCount + 1;
        setDoublesCount(nextDoubles);
        if (nextDoubles >= 3) {
          const detentionIdx = boardTiles.findIndex((t) => t.type === 'detention');
          setPlayers((prev) =>
            prev.map((p) =>
              p.id === activePlayer.id
                ? {
                    ...p,
                    position: detentionIdx >= 0 ? detentionIdx : 0,
                    inDetention: true,
                    detentionTurns: 0,
                  }
                : p
            )
          );
          audio.play('detention');
          addLog(`${activePlayer.name} rolled 3 DOUBLES consecutively! Sent to Detention!`, 'detention');
          setDoublesCount(0);
          setGamePhase('turn-end');
          return;
        }
      } else {
        setDoublesCount(0);
      }

      // Movement Path
      const moveRes = GameEngine.calculateMovementPath(activePlayer.position, total, boardTiles.length);
      setPlayers((prev) =>
        prev.map((p) => (p.id === activePlayer.id ? { ...p, position: moveRes.targetPos } : p))
      );

      if (moveRes.passedGo) {
        const salary = GameEngine.getGoSalary(settings.mode);
        setPlayers((prev) =>
          prev.map((p) => (p.id === activePlayer.id ? { ...p, balance: p.balance + salary } : p))
        );
        audio.play('salary-collect');
        addLog(`${activePlayer.name} passed Town Square (GO) and collected $${salary} salary!`, 'buy');
      }

      handleTileLanding(activePlayer, moveRes.targetPos, total);
    }, 850);
  }, [activePlayer, boardTiles, doublesCount, gamePhase, gameSessionType, isRolling, settings.mode, winner, addLog]);

  // Tile Landing Resolution (Single Player)
  const handleTileLanding = (player: Player, tilePos: number, diceSum: number) => {
    const tile = boardTiles[tilePos];
    if (!tile) return;

    const landing = GameEngine.resolveLanding(
      player,
      tile,
      boardTiles,
      ownership,
      players,
      settings,
      diceSum
    );

    setRollSummary(landing.description);

    if (landing.type === 'unowned') {
      setCanBuyProperty(true);
      setGamePhase('action-required');
    } else if (landing.type === 'rent' && landing.recipientId && landing.amount) {
      const recipient = players.find((p) => p.id === landing.recipientId);
      if (recipient) {
        setPendingRent({ amount: landing.amount, recipient });
        setGamePhase('action-required');
      } else {
        setGamePhase('turn-end');
      }
    } else if (landing.type === 'tax' && landing.amount) {
      setPendingTax(landing.amount);
      setGamePhase('action-required');
    } else if (landing.type === 'card' && landing.card) {
      setDrawnCard(landing.card);
      setGamePhase('card-choice');
    } else if (landing.type === 'detention') {
      const detentionIdx = boardTiles.findIndex((t) => t.type === 'detention');
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === player.id
            ? {
                ...p,
                position: detentionIdx >= 0 ? detentionIdx : 0,
                inDetention: true,
                detentionTurns: 0,
              }
            : p
        )
      );
      audio.play('detention');
      setGamePhase('turn-end');
    } else {
      // Free Parking or Safe
      setGamePhase('turn-end');
    }
  };

  // Buy Property Handler
  const handleBuyProperty = useCallback(() => {
    if (gameSessionType === 'multiplayer') {
      const currentTile = boardTiles[activePlayer.position];
      if (currentTile) mpClient.current.buyProperty(currentTile.id);
      return;
    }

    const tile = boardTiles[activePlayer.position];
    if (!tile || !tile.cost || activePlayer.balance < tile.cost) return;

    const buyRes = GameEngine.buyProperty(activePlayer, tile, ownership);
    if (buyRes.success) {
      setPlayers((prev) => prev.map((p) => (p.id === activePlayer.id ? buyRes.updatedPlayer : p)));
      setOwnership(buyRes.updatedOwnership);
      setCanBuyProperty(false);
      audio.play('property-buy');
      addLog(`${activePlayer.name} acquired ${tile.name} for $${tile.cost}!`, 'buy');
      setGamePhase('turn-end');
    }
  }, [activePlayer, boardTiles, gameSessionType, ownership, addLog]);

  // Decline Property Handler
  const handlePassProperty = useCallback(() => {
    if (gameSessionType === 'multiplayer') {
      const currentTile = boardTiles[activePlayer.position];
      if (currentTile) mpClient.current.declineProperty(currentTile.id);
      return;
    }

    const tile = boardTiles[activePlayer.position];
    if (settings.auctionsEnabled && tile) {
      addLog(`${activePlayer.name} passed on ${tile.name}. Town Hall Auction begun!`, 'auction');
      audio.play('auction-start');
      setCanBuyProperty(false);
      setAuctionTile(tile);
    } else {
      setCanBuyProperty(false);
      setGamePhase('turn-end');
    }
  }, [activePlayer, boardTiles, gameSessionType, settings.auctionsEnabled, addLog]);

  // Auction Resolution
  const handleAuctionEnd = (winnerId: string | null, winningBid: number) => {
    if (auctionTile && winnerId && winningBid > 0) {
      const winnerPlayer = players.find((p) => p.id === winnerId);
      if (winnerPlayer) {
        setPlayers((prev) =>
          prev.map((p) => (p.id === winnerId ? { ...p, balance: p.balance - winningBid } : p))
        );
        setOwnership((prev) => ({
          ...prev,
          [auctionTile.id]: { ownerId: winnerId, houses: 0, isMortgaged: false },
        }));
        audio.play('auction-win');
        addLog(
          `🔨 AUCTION WON: ${winnerPlayer.name} acquired ${auctionTile.name} for $${winningBid}!`,
          'auction'
        );
      }
    } else if (auctionTile) {
      addLog(`Auction for ${auctionTile.name} closed with no bids.`, 'auction');
    }
    setAuctionTile(null);
    setGamePhase('turn-end');
  };

  // Pay Rent Handler
  const handlePayRent = useCallback(() => {
    if (!pendingRent) return;
    const { amount, recipient } = pendingRent;

    if (activePlayer.balance < amount) {
      declareBankruptcy(activePlayer, recipient.id);
    } else {
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id === activePlayer.id) return { ...p, balance: p.balance - amount };
          if (p.id === recipient.id) return { ...p, balance: p.balance + amount };
          return p;
        })
      );
      audio.play('rent-paid');
      addLog(`${activePlayer.name} paid $${amount} rent to ${recipient.name}.`, 'rent');
      setPendingRent(null);
      setGamePhase('turn-end');
    }
  }, [activePlayer, pendingRent, addLog]);

  // Pay Tax Handler
  const handlePayTax = useCallback(() => {
    if (!pendingTax) return;

    if (activePlayer.balance < pendingTax) {
      declareBankruptcy(activePlayer);
    } else {
      setPlayers((prev) =>
        prev.map((p) => (p.id === activePlayer.id ? { ...p, balance: p.balance - pendingTax } : p))
      );
      audio.play('rent-paid');
      addLog(`${activePlayer.name} paid $${pendingTax} municipal assessment.`, 'rent');
      setPendingTax(null);
      setGamePhase('turn-end');
    }
  }, [activePlayer, pendingTax, addLog]);

  // Dismiss / Execute Card
  const handleDismissCard = useCallback(() => {
    if (!drawnCard) return;
    if (gameSessionType === 'multiplayer') {
      mpClient.current.drawCard();
      setDrawnCard(null);
      return;
    }

    const cardRes = GameEngine.executeCard(
      drawnCard,
      activePlayer,
      players,
      boardTiles,
      ownership,
      boardTiles.length
    );

    setPlayers(cardRes.updatedAllPlayers);
    setOwnership(cardRes.updatedOwnership);
    addLog(cardRes.message, 'card');
    setDrawnCard(null);
    setGamePhase('turn-end');
  }, [activePlayer, boardTiles, drawnCard, gameSessionType, ownership, players, addLog]);

  // Pay Detention Bail
  const handlePayDetentionBail = useCallback(() => {
    if (activePlayer.balance < 50) return;
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === activePlayer.id
          ? { ...p, balance: p.balance - 50, inDetention: false, detentionTurns: 0 }
          : p
      )
    );
    audio.play('button-click');
    addLog(`${activePlayer.name} paid $50 bail and was discharged from Detention.`, 'detention');
  }, [activePlayer, addLog]);

  // Use Detention Free Pass
  const handleUseFreePass = useCallback(() => {
    const currentPasses = activePlayer.detentionPasses ?? activePlayer.freePasses ?? 0;
    if (currentPasses <= 0) return;
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === activePlayer.id
          ? {
              ...p,
              detentionPasses: Math.max(0, currentPasses - 1),
              freePasses: Math.max(0, currentPasses - 1),
              inDetention: false,
              detentionTurns: 0,
            }
          : p
      )
    );
    audio.play('button-click');
    addLog(`${activePlayer.name} redeemed a Free Pass card to depart Detention!`, 'detention');
  }, [activePlayer, addLog]);

  // Declare Bankruptcy
  const declareBankruptcy = (bankruptPlayer: Player, creditorId?: string | null) => {
    const bRes = GameEngine.handleBankruptcy(bankruptPlayer, creditorId || null, players, ownership);
    setPlayers(bRes.updatedPlayers);
    setOwnership(bRes.updatedOwnership);
    setWinner(bRes.winner);
    audio.play('card-bad');
    addLog(bRes.message, 'bankruptcy');

    if (bRes.winner) {
      setGamePhase('game-over');
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    } else {
      handleEndTurn();
    }
  };

  // End Turn Handler
  const handleEndTurn = useCallback(() => {
    if (winner) return;

    if (gameSessionType === 'multiplayer') {
      mpClient.current.endTurn();
      return;
    }

    const rolledDoubles = dice[0] === dice[1] && doublesCount > 0 && !activePlayer.inDetention;
    if (rolledDoubles) {
      addLog(`${activePlayer.name} rolled DOUBLES and gets another roll!`, 'roll');
      setGamePhase('ready-to-roll');
      setRollSummary(null);
      return;
    }

    setDoublesCount(0);
    setRollSummary(null);
    setDrawnCard(null);
    setPendingRent(null);
    setPendingTax(null);
    setCanBuyProperty(false);

    let nextIdx = (activePlayerIndex + 1) % players.length;
    let loops = 0;
    while (players[nextIdx]?.bankrupt && loops < players.length) {
      nextIdx = (nextIdx + 1) % players.length;
      loops++;
    }

    if (nextIdx <= activePlayerIndex) {
      setRoundNumber((r) => r + 1);
    }

    setActivePlayerIndex(nextIdx);
    setGamePhase('ready-to-roll');
    addLog(`--- Turn passed to ${players[nextIdx].name} ---`, 'info');
  }, [activePlayer, activePlayerIndex, dice, doublesCount, gameSessionType, players, winner, addLog]);

  // House / Hotel Construction
  const handleBuyHouse = (tileId: number) => {
    if (gameSessionType === 'multiplayer') {
      mpClient.current.upgradeProperty(tileId);
      return;
    }

    const tile = boardTiles[tileId];
    if (!tile) return;
    const upRes = GameEngine.upgradeProperty(activePlayer, tile, boardTiles, ownership);
    if (upRes.success) {
      setPlayers((prev) => prev.map((p) => (p.id === activePlayer.id ? upRes.updatedPlayer : p)));
      setOwnership(upRes.updatedOwnership);
      audio.play('property-buy');
      const newHouses = upRes.updatedOwnership[tileId]?.houses || 0;
      addLog(
        `${activePlayer.name} upgraded ${tile.name} to ${newHouses === 5 ? 'a Luxury Hotel' : `Level ${newHouses}`}!`,
        'buy'
      );
    }
  };

  // Mortgage & Unmortgage
  const handleMortgage = (tileId: number) => {
    if (gameSessionType === 'multiplayer') {
      mpClient.current.mortgageProperty(tileId);
      return;
    }

    const tile = boardTiles[tileId];
    if (!tile) return;
    const mRes = GameEngine.mortgageProperty(activePlayer, tile, boardTiles, ownership);
    if (mRes.success) {
      setPlayers((prev) => prev.map((p) => (p.id === activePlayer.id ? mRes.updatedPlayer : p)));
      setOwnership(mRes.updatedOwnership);
      audio.play('button-click');
      addLog(`${activePlayer.name} mortgaged ${tile.name} for $${tile.mortgageValue || 50}.`, 'rent');
    }
  };

  const handleUnmortgage = (tileId: number) => {
    if (gameSessionType === 'multiplayer') {
      mpClient.current.unmortgageProperty(tileId);
      return;
    }

    const tile = boardTiles[tileId];
    if (!tile) return;
    const uRes = GameEngine.unmortgageProperty(activePlayer, tile, ownership);
    if (uRes.success) {
      setPlayers((prev) => prev.map((p) => (p.id === activePlayer.id ? uRes.updatedPlayer : p)));
      setOwnership(uRes.updatedOwnership);
      audio.play('property-buy');
      addLog(`${activePlayer.name} lifted mortgage on ${tile.name}.`, 'rent');
    }
  };

  // Trade Execution
  const handleExecuteTrade = (offer: TradeOffer): { success: boolean; message: string } => {
    if (gameSessionType === 'multiplayer') {
      mpClient.current.proposeTrade(offer);
      return { success: true, message: 'Trade proposal dispatched across room network!' };
    }

    const fromPlayer = players.find((p) => p.id === offer.fromPlayerId);
    const toPlayer = players.find((p) => p.id === offer.toPlayerId);
    if (!fromPlayer || !toPlayer) return { success: false, message: 'Invalid trade parties' };

    if (toPlayer.isBot) {
      const evalRes = evaluateAITrade(offer, toPlayer, boardTiles, ownership);
      if (!evalRes.accept) {
        return { success: false, message: `${toPlayer.name} declined: "${evalRes.reason}"` };
      }
    }

    const tradeRes = GameEngine.executeTrade(offer, players, ownership);
    if (tradeRes.success) {
      setPlayers(tradeRes.updatedPlayers);
      setOwnership(tradeRes.updatedOwnership);
      addLog(`Deal finalized! ${fromPlayer.name} and ${toPlayer.name} exchanged properties.`, 'trade');
      return { success: true, message: `${toPlayer.name} accepted the trade proposal!` };
    }
    return { success: false, message: tradeRes.error || 'Trade could not be finalized.' };
  };

  // Chat message sender
  const handleSendMessage = (text: string) => {
    if (gameSessionType === 'multiplayer') {
      mpClient.current.sendChat(text);
    } else {
      const msg: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        senderId: activePlayer.id,
        senderName: activePlayer.name,
        senderColor: activePlayer.color,
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, msg]);
      audio.play('button-click');
    }
  };

  const handleSendEmote = (emoji: string) => {
    if (gameSessionType === 'multiplayer') {
      mpClient.current.sendEmote(emoji);
    }
    audio.play('button-click');
  };

  // Automated Single-Player AI Turn Loop
  useEffect(() => {
    if (gameSessionType !== 'single' || !activePlayer.isBot || activePlayer.bankrupt || winner || auctionTile) {
      return;
    }

    let isMounted = true;

    // 1. Ready to Roll
    if (gamePhase === 'ready-to-roll' && !isRolling) {
      const timer = setTimeout(() => {
        if (isMounted) {
          if (activePlayer.inDetention && activePlayer.balance > 350) {
            handlePayDetentionBail();
          }
          handleRollDice();
        }
      }, 950);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }

    // 2. Action Required
    if (gamePhase === 'action-required') {
      const timer = setTimeout(() => {
        if (!isMounted) return;

        if (canBuyProperty) {
          const currentTile = boardTiles[activePlayer.position];
          if (shouldAIBuyProperty(activePlayer, currentTile, boardTiles, ownership)) {
            handleBuyProperty();
          } else {
            handlePassProperty();
          }
        } else if (pendingRent) {
          if (activePlayer.balance < pendingRent.amount) {
            const propToMortgage = findAIPropertyToMortgage(
              activePlayer,
              pendingRent.amount,
              boardTiles,
              ownership
            );
            if (propToMortgage !== null) {
              handleMortgage(propToMortgage);
            } else {
              declareBankruptcy(activePlayer, pendingRent.recipient.id);
              return;
            }
          }
          handlePayRent();
        } else if (pendingTax) {
          if (activePlayer.balance < pendingTax) {
            declareBankruptcy(activePlayer);
            return;
          }
          handlePayTax();
        }
      }, 1100);

      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }

    // 3. Turn End
    if (gamePhase === 'turn-end') {
      const timer = setTimeout(() => {
        if (!isMounted) return;
        const candidate = findAIPropertiesToBuild(activePlayer, boardTiles, ownership);
        if (candidate !== null) {
          handleBuyHouse(candidate);
        }
        handleEndTurn();
      }, 1000);

      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, [
    activePlayer,
    auctionTile,
    boardTiles,
    canBuyProperty,
    gamePhase,
    gameSessionType,
    handleBuyHouse,
    handleBuyProperty,
    handleEndTurn,
    handleMortgage,
    handlePassProperty,
    handlePayDetentionBail,
    handlePayRent,
    handlePayTax,
    handleRollDice,
    isRolling,
    ownership,
    pendingRent,
    pendingTax,
    winner,
  ]);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950">
      {/* 1. MAIN MENU SCREEN */}
      {appScreen === 'menu' && (
        <MainMenu
          playerName={playerName}
          onUpdatePlayerName={handleUpdatePlayerName}
          onPlaySinglePlayer={() => {
            setAppScreen('single-setup');
            audio.play('ui-click');
          }}
          onPlayMultiplayer={() => {
            setAppScreen('multiplayer-lobby');
            audio.play('ui-click');
          }}
          onOpenRules={() => setIsRulesOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {/* 2. SINGLE PLAYER SETUP MODAL */}
      {appScreen === 'single-setup' && (
        <SinglePlayerSetupModal
          playerName={playerName}
          onUpdatePlayerName={handleUpdatePlayerName}
          onStartGame={handleStartSinglePlayerMatch}
          onClose={() => setAppScreen('menu')}
        />
      )}

      {/* 3. MULTIPLAYER LOBBY MODAL */}
      {appScreen === 'multiplayer-lobby' && (
        <MultiplayerLobbyModal
          room={mpRoom}
          playerId={mpClient.current.playerId}
          playerName={playerName}
          onUpdatePlayerName={handleUpdatePlayerName}
          onCreateRoom={(character) => mpClient.current.createRoom(playerName, character)}
          onJoinRoom={(code, character) => mpClient.current.joinRoom(code, playerName, character)}
          onToggleReady={(ready) => mpClient.current.setReady(ready)}
          onChangeCharacter={(char) => mpClient.current.changeCharacter(char)}
          onKickPlayer={(pId) => mpClient.current.kickPlayer(pId)}
          onUpdateSettings={(s) => mpClient.current.updateSettings(s)}
          onStartGame={() => mpClient.current.startGame()}
          onLeaveRoom={() => {
            mpClient.current.leaveRoom();
            setMpRoom(null);
          }}
          onClose={() => setAppScreen('menu')}
          errorMessage={mpError}
        />
      )}

      {/* 4. OPENING ROLL MODAL */}
      {openingRollState && (
        <OpeningRollModal
          openingRoll={openingRollState}
          players={players}
          onProceed={handleProceedFromOpeningRoll}
          onRerollTie={handleRerollOpeningRollTie}
        />
      )}

      {/* TOP HEADER BAR (VISIBLE IN PLAYING SCREEN) */}
      <header className="w-full bg-stone-900 border-b border-stone-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-md">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              audio.play('button-click');
              setAppScreen('menu');
            }}
            className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 hover:scale-105 transition-transform"
            title="Return to Main Menu"
          >
            <Dices className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-stone-100 flex items-center gap-2">
              <span>Town Tycoon 3D</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase">
                {gameSessionType === 'multiplayer' ? 'Online Room' : settings.mode || 'Classic'}
              </span>
            </h1>
            <p className="text-[10px] text-stone-400 hidden sm:block">
              {BOARD_THEMES[settings.boardTheme || 'classic-town']?.name || 'Classic'} • {boardTiles.length} Spaces • {players.length} Players
            </p>
          </div>
        </div>

        {/* Turn Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-950 border border-stone-800 shadow-xs">
          <div
            className="w-3 h-3 rounded-full animate-pulse shadow-xs"
            style={{ backgroundColor: activePlayer?.color || '#ef4444' }}
          />
          <span className="text-xs font-bold text-stone-200">
            {activePlayer?.name || 'Player'}'s Turn
          </span>
          <span className="text-[11px] text-amber-400 font-mono font-bold hidden md:inline">
            (${activePlayer?.balance || 0})
          </span>
        </div>

        {/* Header Tools */}
        <div className="flex items-center gap-2">
          {/* 3D vs 2D Toggle */}
          <button
            onClick={() => {
              audio.play('button-click');
              setViewMode((prev) => (prev === '3d' ? '2d' : '3d'));
            }}
            className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border border-stone-700"
            title="Toggle between 3D physics view and 2D classic board"
          >
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">{viewMode === '3d' ? '3D Board' : '2D Board'}</span>
          </button>

          {/* Trade Button */}
          <button
            onClick={() => {
              audio.play('button-click');
              setTradePartnerId(undefined);
              setIsTradeOpen(true);
            }}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition cursor-pointer"
            title="Propose Trade Deal"
          >
            <ArrowLeftRight className="w-4 h-4 text-amber-400" />
          </button>

          {/* Rules Button */}
          <button
            onClick={() => {
              audio.play('button-click');
              setIsRulesOpen(true);
            }}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition cursor-pointer"
            title="Rules & Guide"
          >
            <BookOpen className="w-4 h-4 text-stone-300" />
          </button>

          {/* Settings Button */}
          <button
            onClick={() => {
              audio.play('button-click');
              setIsSettingsOpen(true);
            }}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition cursor-pointer"
            title="Game Settings"
          >
            <Settings className="w-4 h-4 text-stone-300" />
          </button>

          {/* Main Menu Exit Button */}
          <button
            onClick={() => {
              audio.play('button-click');
              setAppScreen('menu');
            }}
            className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition border border-stone-700 flex items-center gap-1.5"
            title="Return to Main Menu"
          >
            <Home className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Menu</span>
          </button>
        </div>
      </header>

      {/* Voice Chat & Presence Bar */}
      <div className="w-full max-w-7xl mx-auto px-3 md:px-6 pt-3">
        <VoiceChatBar
          players={players}
          activePlayer={activePlayer}
          onLogMessage={(msg) => addLog(msg, 'info')}
        />
      </div>

      {/* Main Game Arena */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-3 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 3D or 2D Board (cols 1-8) */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center gap-4">
          {viewMode === '3d' ? (
            <div className="w-full flex flex-col items-center gap-4">
              <ThreeBoard
                tiles={boardTiles}
                players={players}
                activePlayer={activePlayer}
                ownership={ownership}
                dice={dice}
                isRolling={isRolling}
                theme={settings.theme || settings.boardTheme || 'classic-town'}
                reducedMotion={settings.reducedMotion}
                cameraMode="perspective"
                onTileClick={(tile) => setSelectedTileModal(tile)}
                drawnCard={drawnCard}
              />

              {/* 3D View Interactive Controls Deck */}
              <div className="w-full max-w-2xl bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-xs">
                {/* Dice Roller */}
                <div className="flex items-center gap-3">
                  <Dice
                    dice={dice}
                    isRolling={isRolling}
                    canRoll={gamePhase === 'ready-to-roll' && !isRolling && !activePlayer.isBot}
                    onRoll={handleRollDice}
                    rollSummary={rollSummary}
                  />
                </div>

                {/* Action Banner */}
                <div className="flex-1 w-full min-w-0">
                  <ActionBanner
                    activePlayer={activePlayer}
                    currentTile={boardTiles[activePlayer.position] || boardTiles[0]}
                    ownership={ownership}
                    drawnCard={drawnCard}
                    pendingRent={pendingRent}
                    pendingTax={pendingTax}
                    canBuyProperty={canBuyProperty}
                    players={players}
                    onBuyProperty={handleBuyProperty}
                    onPassProperty={handlePassProperty}
                    onPayRent={handlePayRent}
                    onPayTax={handlePayTax}
                    onDismissCard={handleDismissCard}
                    onPayDetentionBail={handlePayDetentionBail}
                    onUseFreePass={handleUseFreePass}
                    onEndTurn={handleEndTurn}
                    canEndTurn={gamePhase === 'turn-end'}
                    isBotTurn={!!activePlayer.isBot}
                  />
                </div>
              </div>
            </div>
          ) : (
            <Board
              tiles={boardTiles}
              players={players}
              activePlayer={activePlayer}
              ownership={ownership}
              dice={dice}
              isRolling={isRolling}
              canRoll={gamePhase === 'ready-to-roll' && !isRolling && !activePlayer.isBot}
              onRoll={handleRollDice}
              rollSummary={rollSummary}
              drawnCard={drawnCard}
              pendingRent={pendingRent}
              pendingTax={pendingTax}
              canBuyProperty={canBuyProperty}
              onBuyProperty={handleBuyProperty}
              onPassProperty={handlePassProperty}
              onPayRent={handlePayRent}
              onPayTax={handlePayTax}
              onDismissCard={handleDismissCard}
              onPayDetentionBail={handlePayDetentionBail}
              onUseFreePass={handleUseFreePass}
              onEndTurn={handleEndTurn}
              canEndTurn={gamePhase === 'turn-end'}
              onTileClick={(tile) => setSelectedTileModal(tile)}
            />
          )}
        </div>

        {/* Right Sidebar: Players Roster, Properties, Chronicle & Town Chat (cols 9-12) */}
        <div className="lg:col-span-4 flex flex-col gap-3 w-full">
          {/* Navigation Tabs - Never scrolls the main webpage */}
          <div className="flex items-center gap-1 p-1 bg-stone-900 border border-stone-800 rounded-2xl shrink-0">
            <button
              id="sidebar-tab-players"
              type="button"
              onClick={(e) => {
                (e.currentTarget as HTMLElement)?.blur();
                setSidebarTab('players');
              }}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                sidebarTab === 'players'
                  ? 'bg-amber-400 text-stone-950 shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Standings</span>
            </button>
            <button
              id="sidebar-tab-properties"
              type="button"
              onClick={(e) => {
                (e.currentTarget as HTMLElement)?.blur();
                setSidebarTab('properties');
              }}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                sidebarTab === 'properties'
                  ? 'bg-amber-400 text-stone-950 shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Deeds</span>
            </button>
            <button
              id="sidebar-tab-log"
              type="button"
              onClick={(e) => {
                (e.currentTarget as HTMLElement)?.blur();
                setSidebarTab('log');
              }}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                sidebarTab === 'log'
                  ? 'bg-amber-400 text-stone-950 shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <ScrollText className="w-3.5 h-3.5" />
              <span>Chronicle</span>
            </button>
            <button
              id="sidebar-tab-chat"
              type="button"
              onClick={(e) => {
                (e.currentTarget as HTMLElement)?.blur();
                setSidebarTab('chat');
              }}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                sidebarTab === 'chat'
                  ? 'bg-amber-400 text-stone-950 shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat</span>
            </button>
          </div>

          {/* Sidebar Tab Panels */}
          <div className="h-[520px] w-full">
            {sidebarTab === 'players' && (
              <PlayerBar
                players={players}
                activePlayerIndex={activePlayerIndex}
                tiles={boardTiles}
                ownership={ownership}
                onOpenTrade={(targetPlayerId?: string) => {
                  setTradePartnerId(targetPlayerId);
                  setIsTradeOpen(true);
                }}
                onTileClick={(tileId: number) => {
                  const tile = boardTiles[tileId];
                  if (tile) setSelectedTileModal(tile);
                }}
                onPlayerClick={(player: Player) => setInspectedPlayer(player)}
              />
            )}

            {sidebarTab === 'properties' && (
              <PropertyPanel
                tiles={boardTiles}
                ownership={ownership}
                players={players}
                activePlayer={activePlayer}
                onSelectTile={(tileId: number) => {
                  const tile = boardTiles[tileId];
                  if (tile) setSelectedTileModal(tile);
                }}
                onHighlightTile={(tileId: number | null) => setHighlightedTileId(tileId)}
              />
            )}

            {sidebarTab === 'log' && <GameLog entries={gameLogs} />}

            {sidebarTab === 'chat' && (
              <ChatPanel
                messages={chatMessages}
                players={players}
                activePlayer={activePlayer}
                onSendMessage={handleSendMessage}
                onSendEmote={handleSendEmote}
              />
            )}
          </div>
        </div>
      </main>

      {/* MODALS */}
      {/* 1. Property Deed Inspector Modal */}
      {selectedTileModal && (
        <PropertyModal
          tile={selectedTileModal}
          tiles={boardTiles}
          ownership={ownership}
          players={players}
          activePlayer={activePlayer}
          onClose={() => setSelectedTileModal(null)}
          onBuyHouse={handleBuyHouse}
          onMortgage={handleMortgage}
          onUnmortgage={handleUnmortgage}
        />
      )}

      {/* 2. Player Inspector Modal */}
      {inspectedPlayer && (
        <PlayerInspectorModal
          player={inspectedPlayer}
          activePlayer={activePlayer}
          tiles={boardTiles}
          ownership={ownership}
          onClose={() => setInspectedPlayer(null)}
          onOpenTrade={(targetPlayerId: string) => {
            setTradePartnerId(targetPlayerId);
            setInspectedPlayer(null);
            setIsTradeOpen(true);
          }}
          onTileClick={(tileId: number) => {
            const tile = boardTiles[tileId];
            if (tile) {
              setInspectedPlayer(null);
              setSelectedTileModal(tile);
            }
          }}
        />
      )}

      {/* 3. Trade Modal */}
      {isTradeOpen && (
        <TradeModal
          activePlayer={activePlayer}
          players={players}
          tiles={boardTiles}
          ownership={ownership}
          onClose={() => setIsTradeOpen(false)}
          onExecuteTrade={handleExecuteTrade}
        />
      )}

      {/* 4. Live Town Auction Modal */}
      {auctionTile && (
        <AuctionModal
          auction={{
            active: true,
            tileId: auctionTile.id,
            currentBid: Math.max(10, Math.floor((auctionTile.cost || 100) * 0.5)),
            highestBidderId: null,
            timeLeft: 20,
            bidders: players.filter((p) => !p.bankrupt).map((p) => p.id),
            history: [],
          }}
          tile={auctionTile}
          players={players}
          currentUserId={activePlayer.id}
          onAuctionEnd={handleAuctionEnd}
          onClose={() => setAuctionTile(null)}
        />
      )}

      {/* 5. Rules & Guide Modal */}
      {isRulesOpen && <RulesModal onClose={() => setIsRulesOpen(false)} />}

      {/* 6. Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onUpdateSettings={(newSettings: Partial<GameSettings>) => {
            setSettings((prev) => {
              const merged: GameSettings = { ...prev, ...newSettings };
              if (newSettings.boardTheme && newSettings.boardTheme !== prev.boardTheme) {
                setBoardTiles(generateBoard(merged.boardSize, merged.boardTheme));
              }
              return merged;
            });
          }}
        />
      )}
    </div>
  );
}

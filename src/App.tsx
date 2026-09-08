import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  BoardSize,
  BoardTheme,
  BoardTile,
  Card,
  ChatMessage,
  GameLogEntry,
  GameMode,
  GamePhase,
  GameSettings,
  OwnershipMap,
  Player,
  TradeOffer,
} from './types';
import { generateBoard, BOARD_THEMES } from './data/boardData';
import { drawCard } from './data/cardsData';
import { CHARACTERS } from './data/charactersData';
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
  calculateAIBid,
  shouldAIBidInAuction,
} from './utils/aiLogic';
import { audio } from './utils/audio';

import { ThreeBoard } from './components/ThreeBoard';
import { Board } from './components/Board';
import { PlayerBar } from './components/PlayerBar';
import { GameLog } from './components/GameLog';
import { PropertyPanel } from './components/PropertyPanel';
import { PlayerInspectorModal } from './components/PlayerInspectorModal';
import { ChatPanel } from './components/ChatPanel';
import { PropertyModal } from './components/PropertyModal';
import { TradeModal } from './components/TradeModal';
import { SetupModal } from './components/SetupModal';
import { RulesModal } from './components/RulesModal';
import { SettingsModal } from './components/SettingsModal';
import { AuctionModal } from './components/AuctionModal';
import { VoiceChatBar } from './components/VoiceChatBar';
import { Dice } from './components/Dice';
import { ActionBanner } from './components/ActionBanner';

import {
  Volume2,
  VolumeX,
  RotateCcw,
  BookOpen,
  ArrowLeftRight,
  Trophy,
  Dices,
  Settings,
  Eye,
  Gavel,
  Shield,
  Coins,
  Building2,
  Users,
  ScrollText,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
  Timer,
  ChevronRight,
  Flag,
  Home,
  ShieldAlert,
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
  // Game Configuration & Settings
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [boardTiles, setBoardTiles] = useState<BoardTile[]>(() =>
    generateBoard(DEFAULT_SETTINGS.boardSize, DEFAULT_SETTINGS.boardTheme)
  );

  // View state: '3d' or '2d'
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');

  // Modals & Panels
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTradeOpen, setIsTradeOpen] = useState(false);
  const [tradePartnerId, setTradePartnerId] = useState<string | undefined>(undefined);
  const [selectedTileModal, setSelectedTileModal] = useState<BoardTile | null>(null);
  const [inspectedPlayer, setInspectedPlayer] = useState<Player | null>(null);

  // Layout & Navigation State
  const [sidebarTab, setSidebarTab] = useState<'players' | 'properties' | 'log' | 'chat'>('players');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [highlightedTileId, setHighlightedTileId] = useState<number | null>(null);
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [turnTimer, setTurnTimer] = useState<number>(45);

  // Active Auction State
  const [auctionTile, setAuctionTile] = useState<BoardTile | null>(null);

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

  // Players State (Default 4 players, expandable 2-10)
  const [players, setPlayers] = useState<Player[]>([
    {
      id: 'p1',
      name: 'Player 1',
      isBot: false,
      isAI: false,
      color: '#ef4444',
      character: 'duck',
      balance: 1500,
      position: 0,
      inDetention: false,
      detentionTurns: 0,
      detentionPasses: 0,
      freePasses: 0,
      bankrupt: false,
      voiceState: 'quiet',
      isHost: true,
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
      freePasses: 0,
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
      freePasses: 0,
      bankrupt: false,
      voiceState: 'quiet',
    },
    {
      id: 'p4',
      name: 'Rusty Bot',
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
      freePasses: 0,
      bankrupt: false,
      voiceState: 'quiet',
    },
  ]);

  const [activePlayerIndex, setActivePlayerIndex] = useState<number>(0);
  const [ownership, setOwnership] = useState<OwnershipMap>(() =>
    initializeOwnership(boardTiles)
  );

  // Dice & Turn state
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
  const [winner, setWinner] = useState<Player | null>(null);

  // Event Feed Log
  const [logs, setLogs] = useState<GameLogEntry[]>([
    {
      id: 'init',
      text: 'Town Tycoon 3D ready! Roll the physical dice to start building your town.',
      type: 'info',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const activePlayer = players[activePlayerIndex] || players[0];

  const addLog = useCallback((text: string, type: GameLogEntry['type'] = 'info') => {
    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        text,
        type,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, []);

  // Update board tiles when boardSize or boardTheme changes
  const handleUpdateSettings = (newSettings: Partial<GameSettings>) => {
    const merged: GameSettings = { ...settings, ...newSettings };
    setSettings(merged);
    audio.setEnabled(merged.sfxEnabled ?? true);
    audio.setVolume(merged.sfxVolume ?? 80);

    const size = merged.boardSize;
    const theme = merged.boardTheme || merged.theme || 'classic-town';

    if (size !== settings.boardSize || theme !== settings.boardTheme) {
      const newTiles = generateBoard(size, theme);
      setBoardTiles(newTiles);
      setOwnership(initializeOwnership(newTiles));
      setPlayers((prev) => prev.map((p) => ({ ...p, position: 0 })));
      addLog(`Board updated to ${theme} (${size} size)`, 'info');
    }
  };

  // Check victory condition
  const checkVictory = useCallback(
    (currentPlayers: Player[]) => {
      const active = currentPlayers.filter((p) => !p.bankrupt);
      if (active.length === 1 && currentPlayers.length > 1) {
        setWinner(active[0]);
        setGamePhase('game-over');
        audio.play('victory-fanfare');
        confetti({
          particleCount: 160,
          spread: 80,
          origin: { y: 0.6 },
        });
        addLog(`🎉 VICTORY! ${active[0].name} has conquered Town Tycoon!`, 'info');
      }
    },
    [addLog]
  );

  // Handle Bankruptcy
  const declareBankruptcy = useCallback(
    (bankruptPlayer: Player) => {
      addLog(`🚨 ${bankruptPlayer.name} has gone BANKRUPT and is eliminated!`, 'bankruptcy');
      audio.play('detention');

      setOwnership((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((idStr) => {
          const id = Number(idStr);
          if (next[id]?.ownerId === bankruptPlayer.id) {
            next[id] = { ownerId: null, houses: 0, isMortgaged: false };
          }
        });
        return next;
      });

      setPlayers((prev) => {
        const updated = prev.map((p) => (p.id === bankruptPlayer.id ? { ...p, bankrupt: true } : p));
        checkVictory(updated);
        return updated;
      });

      setPendingRent(null);
      setPendingTax(null);
      setCanBuyProperty(false);
      setDrawnCard(null);
      setGamePhase('turn-end');
    },
    [addLog, checkVictory]
  );

  // Card Action Executor
  const executeCardAction = useCallback(
    (card: Card, player: Player, rollSum: number) => {
      setDrawnCard(card);
      addLog(`${player.name} drew: "${card.title}" — ${card.description}`, 'card');

      if (card.category === 'good') {
        audio.play('card-good');
      } else if (card.category === 'bad') {
        audio.play('card-bad');
      } else if (card.category === 'chaos') {
        audio.play('dice-roll');
      }

      if (card.actionType === 'collect' && card.value) {
        setPlayers((prev) =>
          prev.map((p) => (p.id === player.id ? { ...p, balance: p.balance + card.value! } : p))
        );
      } else if (card.actionType === 'pay' && card.value) {
        if (player.balance < card.value) {
          declareBankruptcy(player);
        } else {
          setPlayers((prev) =>
            prev.map((p) => (p.id === player.id ? { ...p, balance: p.balance - card.value! } : p))
          );
        }
      } else if (card.actionType === 'free-pass') {
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === player.id
              ? {
                  ...p,
                  freePasses: (p.freePasses ?? 0) + 1,
                  detentionPasses: (p.detentionPasses ?? 0) + 1,
                }
              : p
          )
        );
      } else if (card.actionType === 'go-detention' || (card.actionType as string) === 'detention') {
        const detentionIdx = boardTiles.findIndex((t) => t.type === 'detention');
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === player.id
              ? { ...p, position: detentionIdx >= 0 ? detentionIdx : 0, inDetention: true, detentionTurns: 0 }
              : p
          )
        );
        audio.play('detention');
      } else if (card.actionType === 'move-to' && card.targetTileId !== undefined) {
        const currentPos = player.position;
        const targetPos = card.targetTileId % boardTiles.length;
        const passedStart = targetPos < currentPos;
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === player.id
              ? { ...p, position: targetPos, balance: passedStart ? p.balance + 200 : p.balance }
              : p
          )
        );
        if (passedStart) {
          addLog(`${player.name} passed START and collected $200!`, 'rent');
          audio.play('salary-collect');
        }
      } else if (card.actionType === 'move-spaces' && card.value) {
        const newPos = (player.position + card.value + boardTiles.length) % boardTiles.length;
        setPlayers((prev) =>
          prev.map((p) => (p.id === player.id ? { ...p, position: newPos } : p))
        );
      } else if (card.actionType === 'nearest-station') {
        const targetPos = getNearestStation(player.position, boardTiles);
        const passedStart = targetPos < player.position;
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === player.id
              ? { ...p, position: targetPos, balance: passedStart ? p.balance + 200 : p.balance }
              : p
          )
        );
        if (passedStart) {
          audio.play('salary-collect');
        }
      } else if (card.actionType === 'nearest-utility') {
        const targetPos = getNearestUtility(player.position, boardTiles);
        const passedStart = targetPos < player.position;
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === player.id
              ? { ...p, position: targetPos, balance: passedStart ? p.balance + 200 : p.balance }
              : p
          )
        );
        if (passedStart) {
          audio.play('salary-collect');
        }
      } else if (card.actionType === 'collect-from-players' && card.value) {
        let totalCollected = 0;
        setPlayers((prev) =>
          prev.map((p) => {
            if (p.id === player.id || p.bankrupt) return p;
            const deduction = Math.min(p.balance, card.value!);
            totalCollected += deduction;
            return { ...p, balance: p.balance - deduction };
          })
        );
        setPlayers((prev) =>
          prev.map((p) => (p.id === player.id ? { ...p, balance: p.balance + totalCollected } : p))
        );
      } else if (card.actionType === 'pay-players' && card.value) {
        const activeOthers = players.filter((p) => p.id !== player.id && !p.bankrupt);
        const totalNeeded = card.value * activeOthers.length;
        if (player.balance < totalNeeded) {
          declareBankruptcy(player);
        } else {
          setPlayers((prev) =>
            prev.map((p) => {
              if (p.id === player.id) return { ...p, balance: p.balance - totalNeeded };
              if (p.bankrupt) return p;
              return { ...p, balance: p.balance + card.value! };
            })
          );
        }
      }
    },
    [addLog, boardTiles, declareBankruptcy, players]
  );

  // Dismiss Card Handler (with optional player target selection for chaos cards)
  const handleDismissCard = (targetPlayerId?: string) => {
    if (
      drawnCard &&
      (drawnCard.actionType === 'swap-positions' ||
        drawnCard.actionType === 'player-choice-swap' ||
        (drawnCard.actionType as string) === 'swap-position') &&
      targetPlayerId
    ) {
      const target = players.find((p) => p.id === targetPlayerId);
      if (target) {
        const activePos = activePlayer.position;
        const targetPos = target.position;
        setPlayers((prev) =>
          prev.map((p) => {
            if (p.id === activePlayer.id) return { ...p, position: targetPos };
            if (p.id === target.id) return { ...p, position: activePos };
            return p;
          })
        );
        addLog(`🌀 ${activePlayer.name} swapped spaces with ${target.name}!`, 'chaos');
      }
    }
    setDrawnCard(null);
    setGamePhase('turn-end');
  };

  // Process Tile Landing Actions
  const handleTileLanding = useCallback(
    (player: Player, tileId: number, diceSum: number, isDoubleRent: boolean = false) => {
      const tile = boardTiles[tileId];
      if (!tile) return;

      audio.play('pawn-step');

      // 1. Property / Station / Utility
      if (tile.type === 'property' || tile.type === 'station' || tile.type === 'utility') {
        const prop = ownership[tileId];
        if (!prop || !prop.ownerId) {
          // Unowned -> Option to Buy or Pass (Auction)
          setCanBuyProperty(true);
          setGamePhase('action-required');
        } else if (prop.ownerId !== player.id && !prop.isMortgaged) {
          // Owned by opponent -> Pay Rent
          const recipient = players.find((p) => p.id === prop.ownerId);
          if (recipient && !recipient.bankrupt) {
            const rent = calculateRent(tile, boardTiles, ownership, diceSum, isDoubleRent);
            if (rent > 0) {
              setPendingRent({ amount: rent, recipient });
              setGamePhase('action-required');
              addLog(
                `${player.name} landed on ${tile.name} — rent of $${rent} due to ${recipient.name}.`,
                'rent'
              );
            } else {
              setGamePhase('turn-end');
            }
          } else {
            setGamePhase('turn-end');
          }
        } else {
          setGamePhase('turn-end');
        }
      } else if (tile.type === 'tax' || (tile.type as string) === 'municipal-fee') {
        const taxVal = tile.taxAmount || 100;
        setPendingTax(taxVal);
        setGamePhase('action-required');
        addLog(`${player.name} landed on ${tile.name} — tax fee of $${taxVal} due.`, 'rent');
      } else if (tile.type === 'go-to-detention') {
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
        addLog(`${player.name} committed a violation and was sent to Detention!`, 'detention');
        setGamePhase('turn-end');
      } else if (tile.type === 'event' || (tile.type as string) === 'lucky-event') {
        const card = drawCard('event', settings.gameMode);
        executeCardAction(card, player, diceSum);
      } else if (tile.type === 'community' || (tile.type as string) === 'town-council') {
        const card = drawCard('community', settings.gameMode);
        executeCardAction(card, player, diceSum);
      } else {
        // Safe tiles (START, Park, Visiting Detention)
        setGamePhase('turn-end');
      }
    },
    [addLog, boardTiles, executeCardAction, ownership, players, settings.gameMode]
  );

  // Roll Dice Engine
  const handleRollDice = useCallback(() => {
    if (isRolling || gamePhase !== 'ready-to-roll' || winner) return;

    setIsRolling(true);
    audio.play('dice-roll');

    setTimeout(() => {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const total = d1 + d2;
      const isDoubles = d1 === d2;

      setDice([d1, d2]);
      setIsRolling(false);
      audio.play('dice-stop');

      addLog(`${activePlayer.name} rolled [${d1}, ${d2}] = ${total}${isDoubles ? ' (DOUBLES!)' : ''}`, 'roll');

      // Check Detention Logic
      if (activePlayer.inDetention) {
        if (isDoubles) {
          setPlayers((prev) =>
            prev.map((p) =>
              p.id === activePlayer.id
                ? { ...p, inDetention: false, detentionTurns: 0 }
                : p
            )
          );
          addLog(`${activePlayer.name} rolled doubles and broke out of Detention!`, 'detention');
          // Move forward the rolled amount
          const newPos = (activePlayer.position + total) % boardTiles.length;
          setPlayers((prev) =>
            prev.map((p) => (p.id === activePlayer.id ? { ...p, position: newPos } : p))
          );
          handleTileLanding(activePlayer, newPos, total);
        } else {
          const turns = activePlayer.detentionTurns + 1;
          if (turns >= 3) {
            // Must pay $50 bail on 3rd turn
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
            addLog(`${activePlayer.name} served 3 turns, paid $50 bail, and was released.`, 'detention');
            const newPos = (activePlayer.position + total) % boardTiles.length;
            setPlayers((prev) =>
              prev.map((p) => (p.id === activePlayer.id ? { ...p, position: newPos } : p))
            );
            handleTileLanding(activePlayer, newPos, total);
          } else {
            setPlayers((prev) =>
              prev.map((p) =>
                p.id === activePlayer.id ? { ...p, detentionTurns: turns } : p
              )
            );
            addLog(`${activePlayer.name} failed to roll doubles and remains in Detention.`, 'detention');
            setGamePhase('turn-end');
          }
        }
        return;
      }

      // Check 3 consecutive doubles -> Detention
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
          addLog(`${activePlayer.name} rolled 3 DOUBLES in a row! Sent directly to Detention!`, 'detention');
          setDoublesCount(0);
          setGamePhase('turn-end');
          return;
        }
      } else {
        setDoublesCount(0);
      }

      // Advance Player on Board
      const oldPos = activePlayer.position;
      const newPos = (oldPos + total) % boardTiles.length;
      const passedStart = newPos < oldPos;

      setPlayers((prev) =>
        prev.map((p) =>
          p.id === activePlayer.id
            ? { ...p, position: newPos, balance: passedStart ? p.balance + 200 : p.balance }
            : p
        )
      );

      if (passedStart) {
        addLog(`${activePlayer.name} completed a full lap! Collected $200 salary.`, 'rent');
        audio.play('salary-collect');
      }

      setRollSummary(`Rolled ${total}${isDoubles ? ' (Doubles!)' : ''}`);
      handleTileLanding(activePlayer, newPos, total);
    }, 900);
  }, [
    activePlayer,
    boardTiles,
    declareBankruptcy,
    doublesCount,
    gamePhase,
    handleTileLanding,
    isRolling,
    winner,
  ]);

  // Buy Property Handler
  const handleBuyProperty = useCallback(() => {
    const tile = boardTiles[activePlayer.position];
    if (!tile || !tile.cost || activePlayer.balance < tile.cost) return;

    setPlayers((prev) =>
      prev.map((p) => (p.id === activePlayer.id ? { ...p, balance: p.balance - tile.cost! } : p))
    );

    setOwnership((prev) => ({
      ...prev,
      [tile.id]: { ownerId: activePlayer.id, houses: 0, isMortgaged: false },
    }));

    audio.play('property-buy');
    addLog(`${activePlayer.name} purchased ${tile.name} for $${tile.cost}.`, 'buy');
    setCanBuyProperty(false);
    setGamePhase('turn-end');
  }, [activePlayer, boardTiles, addLog]);

  // Pass Property -> Initiates Live Public Auction!
  const handlePassProperty = useCallback(() => {
    const tile = boardTiles[activePlayer.position];
    addLog(
      `${activePlayer.name} passed on purchasing ${tile.name}. Starting public auction!`,
      'auction'
    );
    audio.play('auction-start');
    setCanBuyProperty(false);
    setAuctionTile(tile);
  }, [activePlayer, boardTiles, addLog]);

  // Auction Finished Handler
  const handleAuctionEnd = (winnerId: string | null, winningBid: number) => {
    if (auctionTile && winnerId && winningBid > 0) {
      const winnerPlayer = players.find((p) => p.id === winnerId);
      if (winnerPlayer) {
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === winnerId ? { ...p, balance: p.balance - winningBid } : p
          )
        );
        setOwnership((prev) => ({
          ...prev,
          [auctionTile.id]: { ownerId: winnerId, houses: 0, isMortgaged: false },
        }));
        audio.play('auction-win');
        addLog(
          `🔨 AUCTION WON: ${winnerPlayer.name} purchased ${auctionTile.name} for $${winningBid}!`,
          'auction'
        );
      }
    } else if (auctionTile) {
      addLog(`Auction for ${auctionTile.name} ended with no bids.`, 'auction');
    }
    setAuctionTile(null);
    setGamePhase('turn-end');
  };

  // Pay Rent Handler
  const handlePayRent = useCallback(() => {
    if (!pendingRent) return;
    const { amount, recipient } = pendingRent;

    if (activePlayer.balance < amount) {
      declareBankruptcy(activePlayer);
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
  }, [activePlayer, addLog, declareBankruptcy, pendingRent]);

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
  }, [activePlayer, addLog, declareBankruptcy, pendingTax]);

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
    addLog(`${activePlayer.name} paid $50 bail and was released from Detention.`, 'detention');
  }, [activePlayer, addLog]);

  // Use Free Pass Card
  const handleUseFreePass = useCallback(() => {
    const currentPasses = activePlayer.detentionPasses ?? activePlayer.freePasses ?? 0;
    if (currentPasses <= 0) return;
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === activePlayer.id
          ? {
              ...p,
              freePasses: Math.max(0, currentPasses - 1),
              detentionPasses: Math.max(0, currentPasses - 1),
              inDetention: false,
              detentionTurns: 0,
            }
          : p
      )
    );
    audio.play('button-click');
    addLog(`${activePlayer.name} used a Free Pass card to leave Detention!`, 'detention');
  }, [activePlayer, addLog]);

  // End Turn Handler
  const handleEndTurn = useCallback(() => {
    if (winner) return;

    const rolledDoubles = dice[0] === dice[1] && doublesCount > 0 && !activePlayer.inDetention;
    if (rolledDoubles) {
      addLog(`${activePlayer.name} rolled DOUBLES and gets another turn!`, 'roll');
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
    let attempts = 0;
    while (players[nextIdx]?.bankrupt && attempts < players.length) {
      nextIdx = (nextIdx + 1) % players.length;
      attempts++;
    }

    setActivePlayerIndex(nextIdx);
    setGamePhase('ready-to-roll');
    addLog(`--- Turn passed to ${players[nextIdx].name} ---`, 'info');
  }, [activePlayer, activePlayerIndex, dice, doublesCount, players, addLog, winner]);

  // Property Building / Mortgaging Handlers
  const handleBuyHouse = (tileId: number) => {
    const tile = boardTiles[tileId];
    if (!tile || !tile.houseCost || activePlayer.balance < tile.houseCost) return;
    const prop = ownership[tileId];
    if (!prop || prop.houses >= 5 || prop.isMortgaged) return;

    setPlayers((prev) =>
      prev.map((p) => (p.id === activePlayer.id ? { ...p, balance: p.balance - tile.houseCost! } : p))
    );
    setOwnership((prev) => ({
      ...prev,
      [tileId]: { ...prop, houses: prop.houses + 1 },
    }));
    audio.play('property-buy');
    addLog(
      `${activePlayer.name} built a ${prop.houses + 1 === 5 ? 'Hotel' : 'House'} on ${tile.name} for $${tile.houseCost}.`,
      'buy'
    );
  };

  const handleSellHouse = (tileId: number) => {
    const tile = boardTiles[tileId];
    if (!tile || !tile.houseCost) return;
    const prop = ownership[tileId];
    if (!prop || prop.houses <= 0) return;

    const refund = tile.houseCost / 2;
    setPlayers((prev) =>
      prev.map((p) => (p.id === activePlayer.id ? { ...p, balance: p.balance + refund } : p))
    );
    setOwnership((prev) => ({
      ...prev,
      [tileId]: { ...prop, houses: prop.houses - 1 },
    }));
    audio.play('property-buy');
    addLog(`${activePlayer.name} sold a building on ${tile.name} for $${refund}.`, 'buy');
  };

  const handleMortgage = (tileId: number) => {
    const tile = boardTiles[tileId];
    if (!tile || !tile.mortgageValue) return;
    const prop = ownership[tileId];
    if (!prop || prop.isMortgaged || prop.houses > 0) return;

    setPlayers((prev) =>
      prev.map((p) => (p.id === activePlayer.id ? { ...p, balance: p.balance + tile.mortgageValue! } : p))
    );
    setOwnership((prev) => ({
      ...prev,
      [tileId]: { ...prop, isMortgaged: true },
    }));
    audio.play('button-click');
    addLog(`${activePlayer.name} mortgaged ${tile.name} for $${tile.mortgageValue}.`, 'rent');
  };

  const handleUnmortgage = (tileId: number) => {
    const tile = boardTiles[tileId];
    if (!tile || !tile.mortgageValue) return;
    const prop = ownership[tileId];
    if (!prop || !prop.isMortgaged) return;

    const cost = Math.round(tile.mortgageValue * 1.1);
    if (activePlayer.balance < cost) return;

    setPlayers((prev) =>
      prev.map((p) => (p.id === activePlayer.id ? { ...p, balance: p.balance - cost } : p))
    );
    setOwnership((prev) => ({
      ...prev,
      [tileId]: { ...prop, isMortgaged: false },
    }));
    audio.play('property-buy');
    addLog(`${activePlayer.name} unmortgaged ${tile.name} for $${cost}.`, 'rent');
  };

  // Trade Execution
  const handleExecuteTrade = (offer: TradeOffer): { success: boolean; message: string } => {
    const fromPlayer = players.find((p) => p.id === offer.fromPlayerId);
    const toPlayer = players.find((p) => p.id === offer.toPlayerId);

    if (!fromPlayer || !toPlayer) return { success: false, message: 'Invalid trade players' };

    if (toPlayer.isBot) {
      const evaluation = evaluateAITrade(offer, toPlayer, boardTiles, ownership);
      if (!evaluation.accept) {
        return { success: false, message: `${toPlayer.name} declined: "${evaluation.reason}"` };
      }
    }

    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === fromPlayer.id) {
          return {
            ...p,
            balance: p.balance - offer.offeredMoney + offer.requestedMoney,
          };
        }
        if (p.id === toPlayer.id) {
          return {
            ...p,
            balance: p.balance - offer.requestedMoney + offer.offeredMoney,
          };
        }
        return p;
      })
    );

    setOwnership((prev) => {
      const next = { ...prev };
      offer.offeredTileIds.forEach((id) => {
        if (next[id]) next[id] = { ...next[id], ownerId: toPlayer.id };
      });
      offer.requestedTileIds.forEach((id) => {
        if (next[id]) next[id] = { ...next[id], ownerId: fromPlayer.id };
      });
      return next;
    });

    addLog(
      `🤝 Deal finalized! ${fromPlayer.name} and ${toPlayer.name} traded properties.`,
      'trade'
    );

    return { success: true, message: `${toPlayer.name} accepted the trade!` };
  };

  // Automated Bot Turn Loop
  useEffect(() => {
    if (!activePlayer.isBot || activePlayer.bankrupt || winner || auctionTile) return;

    let isMounted = true;

    // 1. Ready to Roll
    if (gamePhase === 'ready-to-roll' && !isRolling) {
      const timer = setTimeout(() => {
        if (isMounted) {
          if (activePlayer.inDetention && activePlayer.balance > 400) {
            handlePayDetentionBail();
          }
          handleRollDice();
        }
      }, 1000);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }

    // 2. Action Required (Deciding on purchase, rent, tax)
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
              declareBankruptcy(activePlayer);
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
      }, 1200);

      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }

    // 3. Turn End (Check if Bot wants to build houses before passing)
    if (gamePhase === 'turn-end') {
      const timer = setTimeout(() => {
        if (!isMounted) return;

        const houseCandidate = findAIPropertiesToBuild(activePlayer, boardTiles, ownership);
        if (houseCandidate !== null) {
          handleBuyHouse(houseCandidate);
        }

        handleEndTurn();
      }, 1100);

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
    declareBankruptcy,
    gamePhase,
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

  // Start Custom Game via SetupModal
  const handleStartCustomGame = (newPlayers: Player[], newSettings: GameSettings) => {
    setSettings(newSettings);
    const newTiles = generateBoard(newSettings.boardSize, newSettings.boardTheme);
    setBoardTiles(newTiles);
    setPlayers(newPlayers);
    setActivePlayerIndex(0);
    setOwnership(initializeOwnership(newTiles));
    setDice([1, 1]);
    setGamePhase('ready-to-roll');
    setDoublesCount(0);
    setRollSummary(null);
    setDrawnCard(null);
    setPendingRent(null);
    setPendingTax(null);
    setCanBuyProperty(false);
    setWinner(null);
    setAuctionTile(null);
    setIsSetupOpen(false);
    const activeMode = newSettings.mode || newSettings.gameMode || 'classic';
    addLog(
      `New game initiated with ${newPlayers.length} players in ${activeMode.toUpperCase()} mode!`,
      'info'
    );
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950">
      {/* Top Header Bar */}
      <header className="w-full bg-stone-900 border-b border-stone-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-md">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-xs">
            <Dices className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-stone-100 flex items-center gap-2">
              <span>Town Tycoon 3D</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase">
                {settings.mode || settings.gameMode || 'classic'}
              </span>
            </h1>
            <p className="text-[10px] text-stone-400 hidden sm:block">
              {BOARD_THEMES[settings.boardTheme || settings.theme || 'classic-town']?.name || 'Classic'} • {boardTiles.length} Spaces • {players.length} Players
            </p>
          </div>
        </div>

        {/* Turn Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-950 border border-stone-800 shadow-xs">
          <div
            className="w-3 h-3 rounded-full animate-pulse shadow-xs"
            style={{ backgroundColor: activePlayer.color }}
          />
          <span className="text-xs font-bold text-stone-200">
            {activePlayer.name}'s Turn
          </span>
          <span className="text-[11px] text-amber-400 font-mono font-bold hidden md:inline">
            (${activePlayer.balance})
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

          {/* New Game Setup Button */}
          <button
            onClick={() => {
              audio.play('button-click');
              setIsSetupOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black transition shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Game</span>
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
              />

              {/* 3D View Interactive Controls Deck */}
              <div className="w-full max-w-2xl bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-xs">
                {/* Dice Roller */}
                <div className="flex items-center gap-3">
                  <Dice
                    dice={dice}
                    isRolling={isRolling}
                    canRoll={gamePhase === 'ready-to-roll' && !isRolling && !activePlayer.isBot && !activePlayer.isAI}
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
                    isBotTurn={!!(activePlayer.isBot || activePlayer.isAI)}
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
              canRoll={gamePhase === 'ready-to-roll' && !isRolling && !activePlayer.isBot && !activePlayer.isAI}
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

        {/* Right Sidebar: Players Roster & Live Chronicle Feed (cols 9-12) */}
        <div className="lg:col-span-4 flex flex-col gap-4 w-full">
          {/* Players Roster */}
          <div className="flex flex-col gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 px-1 flex items-center justify-between">
              <span>Tycoons & Standings ({players.length})</span>
              <span className="text-[10px] text-amber-400 font-mono">Ranked by Net Worth</span>
            </h2>
            <PlayerBar
              players={players}
              activePlayerIndex={activePlayerIndex}
              tiles={boardTiles}
              ownership={ownership}
              onOpenTrade={(targetId) => {
                setTradePartnerId(targetId);
                setIsTradeOpen(true);
              }}
              onTileClick={(tileId) => setSelectedTileModal(boardTiles[tileId])}
            />
          </div>

          {/* Chronicle Event Feed */}
          <div className="h-64 lg:h-80">
            <GameLog entries={logs} />
          </div>
        </div>
      </main>

      {/* Live Auction Modal */}
      {auctionTile && (
        <AuctionModal
          auction={{
            active: true,
            tileId: auctionTile.id,
            currentBid: 0,
            highestBidderId: null,
            timeLeft: 15,
            bidders: players.filter((p) => !p.bankrupt).map((p) => p.id),
            passedPlayerIds: [],
            history: [],
          }}
          tile={auctionTile}
          tiles={boardTiles}
          players={players}
          currentUserId={players.find((p) => !p.isBot && !p.isAI)?.id || players[0]?.id}
          onAuctionEnd={handleAuctionEnd}
          onClose={() => setAuctionTile(null)}
        />
      )}

      {/* Winner Banner Modal */}
      {winner && (
        <div className="fixed inset-0 z-50 bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border-2 border-amber-400 text-stone-100 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-400">
              <Trophy className="w-10 h-10 animate-bounce" />
            </div>
            <h2 className="text-3xl font-black text-amber-400 tracking-tight">
              VICTORY!
            </h2>
            <p className="text-sm text-stone-300">
              <span className="font-bold text-white text-base">{winner.name}</span> has acquired the
              wealthiest portfolio and conquered the Town!
            </p>
            <button
              onClick={() => setIsSetupOpen(true)}
              className="mt-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-sm tracking-wider uppercase transition shadow-lg shadow-amber-500/30 cursor-pointer"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* Property Deed Modal */}
      {selectedTileModal && (
        <PropertyModal
          tile={selectedTileModal}
          tiles={boardTiles}
          ownership={ownership}
          players={players}
          activePlayer={activePlayer}
          onClose={() => setSelectedTileModal(null)}
          onBuyHouse={handleBuyHouse}
          onSellHouse={handleSellHouse}
          onMortgage={handleMortgage}
          onUnmortgage={handleUnmortgage}
        />
      )}

      {/* Trade Modal */}
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

      {/* Rules Modal */}
      {isRulesOpen && <RulesModal onClose={() => setIsRulesOpen(false)} />}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => setIsSettingsOpen(false)}
          isHost={true}
        />
      )}

      {/* Setup / New Game Modal */}
      {isSetupOpen && <SetupModal onStartGame={handleStartCustomGame} />}
    </div>
  );
}

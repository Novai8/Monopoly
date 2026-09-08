import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  BoardSize,
  BoardTheme,
  BoardTile,
  BotDifficulty,
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
  AuctionState,
} from './types';
import { generateClassicBoard } from './data/classicBoard';
import { BOARD_THEMES } from './data/themeConfig';
import { CHARACTER_LIST } from './data/charactersData';
import { initializeOwnership } from './utils/gameHelpers';
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
import { MainMenu } from './components/MainMenu';
import { SinglePlayerSetupModal } from './components/SinglePlayerSetupModal';
import { MultiplayerLobbyModal } from './components/MultiplayerLobbyModal';
import { OpeningRollModal } from './components/OpeningRollModal';
import { Dices, Settings, BookOpen, ArrowLeftRight, Home, Users, Building2, ScrollText, MessageSquare } from 'lucide-react';

const DEFAULT_SETTINGS: GameSettings = {
  mode: 'classic', gameMode: 'classic', boardSize: 'standard', boardName: 'Classic Town',
  theme: 'classic-town', boardTheme: 'classic-town', difficulty: 'normal', botDifficulty: 'normal',
  playerLimit: 4, startingMoney: 1500, turnTimer: 45, auctionsEnabled: true, tradingEnabled: true,
  voiceEnabled: true, reducedMotion: false, cameraMode: 'top-down', soundVolume: 80, sfxVolume: 80,
  voiceVolume: 80, sfxEnabled: true,
};

type SetupConfig = {
  playerName: string;
  character: CharacterId;
  aiCount: number;
  difficulty: BotDifficulty;
  boardSize: BoardSize;
  theme: BoardTheme;
  mode: GameMode;
  startingMoney: number;
  turnTimer: number;
  rules: {
    auctions: boolean;
    trading: boolean;
    events: boolean;
    community: boolean;
    specialSpaces: boolean;
    quickChat: boolean;
    emotes: boolean;
  };
};

function createPlayer(id: string, name: string, character: CharacterId, balance: number, color: string, isBot: boolean, difficulty?: BotDifficulty): Player {
  return {
    id, name, character, balance, color, isBot, isAI: isBot, difficulty, position: 0,
    inDetention: false, detentionTurns: 0, detentionPasses: 0, bankrupt: false, voiceState: 'quiet',
  };
}

function nextEligibleAuctionIndex(auction: AuctionState, players: Player[], fromIndex: number): number | null {
  if (auction.bidders.length === 0) return null;
  for (let offset = 1; offset <= auction.bidders.length; offset += 1) {
    const index = (fromIndex + offset) % auction.bidders.length;
    const id = auction.bidders[index];
    const player = players.find((p) => p.id === id);
    if (player && !player.bankrupt && !auction.passedPlayerIds.includes(id)) return index;
  }
  return null;
}

export default function App() {
  const [appScreen, setAppScreen] = useState<'menu' | 'single-setup' | 'multiplayer-lobby' | 'playing'>('menu');
  const [gameSessionType, setGameSessionType] = useState<'single' | 'multiplayer'>('single');
  const [playerName, setPlayerName] = useState(() => {
    try { return localStorage.getItem('town_tycoon_player_name') || 'Tycoon'; } catch { return 'Tycoon'; }
  });
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [boardTiles, setBoardTiles] = useState<BoardTile[]>(() => generateClassicBoard('standard', 'classic-town'));
  const [players, setPlayers] = useState<Player[]>([
    createPlayer('p1', 'Tycoon', 'duck', 1500, '#ef4444', false),
    createPlayer('bot-1', 'Barnaby Bot', 'cat', 1500, '#3b82f6', true, 'normal'),
    createPlayer('bot-2', 'Cleo Bot', 'penguin', 1500, '#10b981', true, 'hard'),
    createPlayer('bot-3', 'Darius Bot', 'robot', 1500, '#f59e0b', true, 'normal'),
  ]);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [ownership, setOwnership] = useState<OwnershipMap>(() => initializeOwnership(boardTiles));
  const [dice, setDice] = useState<[number, number]>([1, 1]);
  const [isRolling, setIsRolling] = useState(false);
  const [gamePhase, setGamePhase] = useState<GamePhase>('ready-to-roll');
  const [doublesCount, setDoublesCount] = useState(0);
  const [rollSummary, setRollSummary] = useState<string | null>(null);
  const [drawnCard, setDrawnCard] = useState<Card | null>(null);
  const [pendingRent, setPendingRent] = useState<{ amount: number; recipient: Player } | null>(null);
  const [pendingTax, setPendingTax] = useState<number | null>(null);
  const [canBuyProperty, setCanBuyProperty] = useState(false);
  const [auction, setAuction] = useState<AuctionState | null>(null);
  const [winner, setWinner] = useState<Player | null>(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [openingRollState, setOpeningRollState] = useState<OpeningRollState | null>(null);
  const [selectedTile, setSelectedTile] = useState<BoardTile | null>(null);
  const [inspectedPlayer, setInspectedPlayer] = useState<Player | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'players' | 'properties' | 'log' | 'chat'>('players');
  const [tradeOpen, setTradeOpen] = useState(false);
  const [tradePartnerId, setTradePartnerId] = useState<string | undefined>();
  const [rulesOpen, setRulesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [logs, setLogs] = useState<GameLogEntry[]>([]);
  const [turnTimer, setTurnTimer] = useState(DEFAULT_SETTINGS.turnTimer);
  const [mpRoom, setMpRoom] = useState<MultiplayerRoom | null>(null);
  const [mpError, setMpError] = useState<string | null>(null);
  const mpClient = useRef(MultiplayerClient.getInstance());
  const auctionCompletionRef = useRef(false);
  const activePlayer = players[activePlayerIndex] || players[0];

  const addLog = useCallback((text: string, type: GameLogEntry['type'] = 'info') => {
    setLogs((previous) => [{
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text, type, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }, ...previous]);
  }, []);

  const updatePlayerName = useCallback((name: string) => {
    setPlayerName(name);
    try { localStorage.setItem('town_tycoon_player_name', name); } catch { /* storage can be unavailable */ }
    setPlayers((previous) => previous.map((player, index) => index === 0 && !player.isBot ? { ...player, name } : player));
  }, []);

  useEffect(() => {
    const client = mpClient.current;
    client.connect();
    return client.addListener({
      onRoomCreated: ({ room }) => { setMpRoom(room); setMpError(null); },
      onRoomJoined: ({ room }) => { setMpRoom(room); setMpError(null); },
      onRoomUpdated: (room) => setMpRoom(room),
      onGameStarted: ({ room, gameState }) => {
        setMpRoom(room); setGameSessionType('multiplayer'); setAppScreen('playing');
        setBoardTiles(generateClassicBoard(room.settings.boardSize, room.settings.boardTheme));
        setSettings(room.settings); setPlayers(gameState.players); setActivePlayerIndex(gameState.activePlayerIndex);
        setOwnership(gameState.ownership); setDice(gameState.dice); setGamePhase(gameState.gamePhase);
        setOpeningRollState(gameState.openingRoll); setAuction(gameState.auction); setWinner(gameState.winner);
      },
      onStateUpdate: (state) => {
        setPlayers(state.players); setActivePlayerIndex(state.activePlayerIndex); setOwnership(state.ownership);
        setDice(state.dice); setIsRolling(state.isRolling); setGamePhase(state.gamePhase); setDoublesCount(state.doublesCount);
        setRollSummary(state.rollSummary); setDrawnCard(state.drawnCard); setCanBuyProperty(state.canBuyProperty);
        setWinner(state.winner); setTurnTimer(state.turnTimer); setOpeningRollState(state.openingRoll); setAuction(state.auction);
        if (state.pendingRent) {
          const recipient = state.players.find((player) => player.id === state.pendingRent?.recipientId);
          setPendingRent(recipient ? { amount: state.pendingRent.amount, recipient } : null);
        } else setPendingRent(null);
        setPendingTax(state.pendingTax);
        if (state.logs.length) setLogs((previous) => [...state.logs.filter((entry) => !previous.some((old) => old.id === entry.id)), ...previous]);
      },
      onChatMessage: (message) => setChatMessages((previous) => [...previous, message]),
      onPlayerDisconnected: ({ playerName: name }) => addLog(`${name} disconnected.`, 'info'),
      onPlayerReconnected: ({ playerName: name }) => addLog(`${name} reconnected.`, 'info'),
      onError: setMpError,
    });
  }, [addLog]);

  const finishTurn = useCallback(() => {
    if (winner) return;
    if (gameSessionType === 'multiplayer') { mpClient.current.endTurn(); return; }
    const getsAnotherRoll = dice[0] === dice[1] && doublesCount > 0 && !activePlayer.inDetention;
    setDrawnCard(null); setPendingRent(null); setPendingTax(null); setCanBuyProperty(false); setRollSummary(null);
    if (getsAnotherRoll) {
      setGamePhase('ready-to-roll');
      return;
    }
    let next = (activePlayerIndex + 1) % players.length;
    while (players[next]?.bankrupt && next !== activePlayerIndex) next = (next + 1) % players.length;
    if (next <= activePlayerIndex) setRoundNumber((value) => value + 1);
    setActivePlayerIndex(next); setDoublesCount(0); setGamePhase('ready-to-roll'); setTurnTimer(settings.turnTimer);
  }, [activePlayer, activePlayerIndex, dice, doublesCount, gameSessionType, players, settings.turnTimer, winner]);

  const declareBankruptcy = useCallback((player: Player, creditorId?: string | null) => {
    const result = GameEngine.handleBankruptcy(player, creditorId || null, players, ownership);
    setPlayers(result.updatedPlayers); setOwnership(result.updatedOwnership); setWinner(result.winner); addLog(result.message, 'bankruptcy');
    if (result.winner) { setGamePhase('game-over'); confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 } }); }
    else finishTurn();
  }, [addLog, finishTurn, ownership, players]);

  const resolveLanding = useCallback((player: Player, tile: BoardTile, total: number) => {
    const result = GameEngine.resolveLanding(player, tile, boardTiles, ownership, players, settings, total);
    setRollSummary(result.description);
    if (result.type === 'unowned') { setCanBuyProperty(true); setGamePhase('action-required'); }
    else if (result.type === 'rent' && result.recipientId && result.amount) {
      const recipient = players.find((candidate) => candidate.id === result.recipientId);
      if (recipient) { setPendingRent({ amount: result.amount, recipient }); setGamePhase('action-required'); }
      else setGamePhase('turn-end');
    } else if (result.type === 'tax' && result.amount) { setPendingTax(result.amount); setGamePhase('action-required'); }
    else if (result.type === 'card' && result.card) { setDrawnCard(result.card); setGamePhase('card-choice'); }
    else if (result.type === 'detention') {
      const jail = boardTiles.find((candidate) => candidate.type === 'detention');
      setPlayers((previous) => previous.map((candidate) => candidate.id === player.id ? { ...candidate, position: jail?.id ?? 0, inDetention: true, detentionTurns: 0 } : candidate));
      setGamePhase('turn-end');
    } else setGamePhase('turn-end');
  }, [boardTiles, ownership, players, settings]);

  const rollDice = useCallback(() => {
    if (gameSessionType === 'multiplayer') { mpClient.current.rollDice(); return; }
    if (isRolling || gamePhase !== 'ready-to-roll' || activePlayer.bankrupt || winner) return;
    setIsRolling(true); audio.play('dice-roll');
    window.setTimeout(() => {
      const [d1, d2] = GameEngine.rollDice(); const total = d1 + d2; const doubles = d1 === d2;
      setDice([d1, d2]); setIsRolling(false); audio.play('dice-stop'); addLog(`${activePlayer.name} rolled ${d1} + ${d2} = ${total}${doubles ? ' (DOUBLES)' : ''}`, 'roll');
      if (activePlayer.inDetention && !doubles) {
        const turns = activePlayer.detentionTurns + 1;
        if (turns >= 3 && activePlayer.balance >= 50) {
          setPlayers((previous) => previous.map((player) => player.id === activePlayer.id ? { ...player, balance: player.balance - 50, inDetention: false, detentionTurns: 0 } : player));
        } else {
          setPlayers((previous) => previous.map((player) => player.id === activePlayer.id ? { ...player, detentionTurns: turns } : player));
          setGamePhase('turn-end'); return;
        }
      } else if (activePlayer.inDetention && doubles) {
        setPlayers((previous) => previous.map((player) => player.id === activePlayer.id ? { ...player, inDetention: false, detentionTurns: 0 } : player));
      }
      if (doubles) {
        const nextDoubles = doublesCount + 1; setDoublesCount(nextDoubles);
        if (nextDoubles >= 3) {
          const jail = boardTiles.find((candidate) => candidate.type === 'detention');
          setPlayers((previous) => previous.map((player) => player.id === activePlayer.id ? { ...player, position: jail?.id ?? 0, inDetention: true, detentionTurns: 0 } : player));
          setGamePhase('turn-end'); setDoublesCount(0); return;
        }
      } else setDoublesCount(0);
      const movement = GameEngine.calculateMovementPath(activePlayer.position, total, boardTiles.length);
      setPlayers((previous) => previous.map((player) => player.id === activePlayer.id ? { ...player, position: movement.targetPos, balance: movement.passedGo ? player.balance + GameEngine.getGoSalary(settings.mode) : player.balance } : player));
      resolveLanding(activePlayer, boardTiles[movement.targetPos], total);
    }, 650);
  }, [activePlayer, boardTiles, doublesCount, gamePhase, gameSessionType, isRolling, resolveLanding, settings.mode, winner]);

  const buyProperty = useCallback(() => {
    const tile = boardTiles[activePlayer.position];
    if (!tile) return;
    if (gameSessionType === 'multiplayer') { mpClient.current.buyProperty(tile.id); return; }
    const result = GameEngine.buyProperty(activePlayer, tile, ownership);
    if (result.success) {
      setPlayers((previous) => previous.map((player) => player.id === activePlayer.id ? result.updatedPlayer : player));
      setOwnership(result.updatedOwnership); setCanBuyProperty(false); addLog(`${activePlayer.name} bought ${tile.name} for $${tile.cost}.`, 'buy'); setGamePhase('turn-end');
    }
  }, [activePlayer, boardTiles, gameSessionType, ownership, addLog]);

  const startAuction = useCallback(() => {
    const tile = boardTiles[activePlayer.position];
    if (!tile || !settings.auctionsEnabled) { setCanBuyProperty(false); setGamePhase('turn-end'); return; }
    if (gameSessionType === 'multiplayer') { mpClient.current.declineProperty(tile.id); return; }
    const bidders = players.filter((player) => !player.bankrupt).map((player) => player.id);
    const startIndex = Math.max(0, bidders.indexOf(activePlayer.id));
    const nextIndex = bidders.length > 1 ? (startIndex + 1) % bidders.length : startIndex;
    const state: AuctionState = {
      active: true, tileId: tile.id, currentBid: Math.max(10, Math.floor((tile.cost || 100) * 0.5)),
      highestBidderId: null, currentBidderId: bidders[nextIndex] ?? null, currentBidderIndex: nextIndex,
      timeLeft: 20, bidders, passedPlayerIds: [], history: [],
    };
    auctionCompletionRef.current = false; setAuction(state); setCanBuyProperty(false); setGamePhase('auction'); addLog(`${activePlayer.name} declined ${tile.name}; auction started.`, 'auction');
  }, [activePlayer, boardTiles, gameSessionType, players, settings.auctionsEnabled, addLog]);

  const completeAuction = useCallback((state: AuctionState) => {
    if (!state.active || auctionCompletionRef.current) return;
    auctionCompletionRef.current = true;
    const winnerId = state.highestBidderId;
    const tile = boardTiles.find((candidate) => candidate.id === state.tileId);
    if (winnerId && tile) {
      const bidder = players.find((player) => player.id === winnerId);
      if (bidder && bidder.balance >= state.currentBid) {
        setPlayers((previous) => previous.map((player) => player.id === winnerId ? { ...player, balance: player.balance - state.currentBid } : player));
        setOwnership((previous) => ({ ...previous, [tile.id]: { ownerId: winnerId, houses: 0, isMortgaged: false } }));
        addLog(`${bidder.name} won ${tile.name} for $${state.currentBid}.`, 'auction'); audio.play('auction-win');
      }
    } else if (tile) addLog(`Auction for ${tile.name} closed with no qualifying bid.`, 'auction');
    setAuction({ ...state, active: false });
  }, [boardTiles, players, addLog]);

  const placeBid = useCallback((amount: number) => {
    if (!auction || !auction.active) return;
    if (gameSessionType === 'multiplayer') { mpClient.current.placeBid(amount); return; }
    if (auction.currentBidderId !== activePlayer.id || auction.passedPlayerIds.includes(activePlayer.id)) return;
    if (amount <= auction.currentBid || amount > activePlayer.balance) return;
    const bidderIndex = auction.bidders.indexOf(activePlayer.id);
    const next = nextEligibleAuctionIndex({ ...auction, highestBidderId: activePlayer.id }, players, bidderIndex);
    setAuction({ ...auction, currentBid: amount, highestBidderId: activePlayer.id, currentBidderIndex: next ?? bidderIndex, currentBidderId: next === null ? null : auction.bidders[next], timeLeft: 15, history: [...auction.history, { playerId: activePlayer.id, amount, time: new Date().toISOString() }] });
  }, [activePlayer, auction, gameSessionType, players]);

  const passAuction = useCallback(() => {
    if (!auction || !auction.active) return;
    if (gameSessionType === 'multiplayer') { mpClient.current.passAuction(); return; }
    if (auction.currentBidderId !== activePlayer.id) return;
    const passed = auction.passedPlayerIds.includes(activePlayer.id) ? auction.passedPlayerIds : [...auction.passedPlayerIds, activePlayer.id];
    const remaining = auction.bidders.filter((id) => !passed.includes(id) && !players.find((player) => player.id === id)?.bankrupt);
    if (remaining.length === 0 || (remaining.length === 1 && auction.highestBidderId && remaining[0] === auction.highestBidderId)) {
      completeAuction({ ...auction, passedPlayerIds: passed }); return;
    }
    const bidderIndex = auction.bidders.indexOf(activePlayer.id);
    const next = nextEligibleAuctionIndex({ ...auction, passedPlayerIds: passed }, players, bidderIndex);
    if (next === null) completeAuction({ ...auction, passedPlayerIds: passed });
    else setAuction({ ...auction, passedPlayerIds: passed, currentBidderIndex: next, currentBidderId: auction.bidders[next], timeLeft: 15 });
  }, [activePlayer, auction, completeAuction, gameSessionType, players]);

  const auctionEnded = useCallback((_winnerId: string | null, _winningBid: number) => {
    if (!auction) return;
    setAuction(null); setGamePhase('turn-end'); setCanBuyProperty(false);
  }, [auction]);

  const payRent = useCallback(() => {
    if (!pendingRent) return;
    if (gameSessionType === 'multiplayer') { return; }
    if (activePlayer.balance < pendingRent.amount) { declareBankruptcy(activePlayer, pendingRent.recipient.id); return; }
    setPlayers((previous) => previous.map((player) => player.id === activePlayer.id ? { ...player, balance: player.balance - pendingRent.amount } : player.id === pendingRent.recipient.id ? { ...player, balance: player.balance + pendingRent.amount } : player));
    addLog(`${activePlayer.name} paid $${pendingRent.amount} rent to ${pendingRent.recipient.name}.`, 'rent'); setPendingRent(null); setGamePhase('turn-end');
  }, [activePlayer, declareBankruptcy, gameSessionType, pendingRent, addLog]);

  const payTax = useCallback(() => {
    if (pendingTax === null) return;
    if (gameSessionType === 'multiplayer') return;
    if (activePlayer.balance < pendingTax) { declareBankruptcy(activePlayer); return; }
    setPlayers((previous) => previous.map((player) => player.id === activePlayer.id ? { ...player, balance: player.balance - pendingTax } : player));
    addLog(`${activePlayer.name} paid $${pendingTax} tax.`, 'money'); setPendingTax(null); setGamePhase('turn-end');
  }, [activePlayer, declareBankruptcy, gameSessionType, pendingTax, addLog]);

  const dismissCard = useCallback(() => {
    if (!drawnCard) return;
    if (gameSessionType === 'multiplayer') { mpClient.current.drawCard(); return; }
    const result = GameEngine.executeCard(drawnCard, activePlayer, players, boardTiles, ownership, boardTiles.length);
    setPlayers(result.updatedAllPlayers); setOwnership(result.updatedOwnership); setDrawnCard(null); addLog(result.message, 'card');
    if (drawnCard.actionType === 'go-detention') { setGamePhase('turn-end'); return; }
    if (result.targetPosition !== undefined) {
      const movedPlayer = result.updatedPlayer;
      const landingTile = boardTiles[result.targetPosition];
      const landing = GameEngine.resolveLanding(movedPlayer, landingTile, boardTiles, result.updatedOwnership, result.updatedAllPlayers, settings, 0);
      setRollSummary(landing.description);
      if (landing.type === 'unowned') { setCanBuyProperty(true); setGamePhase('action-required'); }
      else if (landing.type === 'rent' && landing.recipientId && landing.amount) {
        const recipient = result.updatedAllPlayers.find((candidate) => candidate.id === landing.recipientId);
        if (recipient) { setPendingRent({ amount: landing.amount, recipient }); setGamePhase('action-required'); } else setGamePhase('turn-end');
      } else if (landing.type === 'tax' && landing.amount) { setPendingTax(landing.amount); setGamePhase('action-required'); }
      else if (landing.type === 'card' && landing.card) { setDrawnCard(landing.card); setGamePhase('card-choice'); }
      else if (landing.type === 'detention') {
        const jail = boardTiles.find((candidate) => candidate.type === 'detention');
        setPlayers((previous) => previous.map((candidate) => candidate.id === movedPlayer.id ? { ...candidate, position: jail?.id ?? 0, inDetention: true, detentionTurns: 0 } : candidate));
        setGamePhase('turn-end');
      } else setGamePhase('turn-end');
      return;
    }
    setGamePhase(dice[0] === dice[1] && doublesCount > 0 ? 'ready-to-roll' : 'turn-end');
  }, [activePlayer, boardTiles, dice, drawnCard, doublesCount, gameSessionType, ownership, players, settings, addLog]);

  const upgradeProperty = useCallback((tileId: number) => {
    if (gameSessionType === 'multiplayer') { mpClient.current.upgradeProperty(tileId); return; }
    const tile = boardTiles[tileId]; if (!tile) return;
    const result = GameEngine.upgradeProperty(activePlayer, tile, boardTiles, ownership);
    if (result.success) { setPlayers((previous) => previous.map((player) => player.id === activePlayer.id ? result.updatedPlayer : player)); setOwnership(result.updatedOwnership); }
  }, [activePlayer, boardTiles, gameSessionType, ownership]);

  const mortgageProperty = useCallback((tileId: number) => {
    if (gameSessionType === 'multiplayer') { mpClient.current.mortgageProperty(tileId); return; }
    const tile = boardTiles[tileId]; if (!tile) return;
    const result = GameEngine.mortgageProperty(activePlayer, tile, boardTiles, ownership);
    if (result.success) { setPlayers((previous) => previous.map((player) => player.id === activePlayer.id ? result.updatedPlayer : player)); setOwnership(result.updatedOwnership); }
  }, [activePlayer, boardTiles, gameSessionType, ownership]);

  const unmortgageProperty = useCallback((tileId: number) => {
    if (gameSessionType === 'multiplayer') { mpClient.current.unmortgageProperty(tileId); return; }
    const tile = boardTiles[tileId]; if (!tile) return;
    const result = GameEngine.unmortgageProperty(activePlayer, tile, ownership);
    if (result.success) { setPlayers((previous) => previous.map((player) => player.id === activePlayer.id ? result.updatedPlayer : player)); setOwnership(result.updatedOwnership); }
  }, [activePlayer, boardTiles, gameSessionType, ownership]);

  const executeTrade = useCallback((offer: TradeOffer): { success: boolean; message: string } => {
    if (gameSessionType === 'multiplayer') { mpClient.current.proposeTrade(offer); return { success: true, message: 'Trade proposal sent.' }; }
    const recipient = players.find((player) => player.id === offer.toPlayerId);
    if (recipient?.isBot) {
      const evaluation = evaluateAITrade(offer, recipient, boardTiles, ownership);
      if (!evaluation.accept) return { success: false, message: evaluation.reason };
    }
    const result = GameEngine.executeTrade(offer, players, ownership);
    if (!result.success) return { success: false, message: result.error || 'Trade failed.' };
    setPlayers(result.updatedPlayers); setOwnership(result.updatedOwnership); return { success: true, message: 'Trade completed.' };
  }, [boardTiles, gameSessionType, ownership, players]);

  useEffect(() => {
    if (gameSessionType !== 'single' || !auction?.active) return;
    const timer = window.setInterval(() => {
      setAuction((current) => {
        if (!current || !current.active) return current;
        if (current.timeLeft <= 1) return current;
        return { ...current, timeLeft: current.timeLeft - 1 };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [auction?.active, gameSessionType]);

  useEffect(() => {
    if (gameSessionType !== 'single' || !auction?.active || !auction.currentBidderId) return;
    const bidder = players.find((player) => player.id === auction.currentBidderId);
    if (!bidder?.isBot || bidder.bankrupt) return;
    const timer = window.setTimeout(() => {
      if (!auction.active || auction.currentBidderId !== bidder.id) return;
      const shouldBid = shouldAIBuyProperty(bidder, boardTiles[auction.tileId], boardTiles, ownership);
      const amount = auction.currentBid + 10;
      if (shouldBid && bidder.balance >= amount) {
        const bidderIndex = auction.bidders.indexOf(bidder.id);
        const next = nextEligibleAuctionIndex({ ...auction, highestBidderId: bidder.id, currentBid: amount }, players, bidderIndex);
        setAuction({ ...auction, currentBid: amount, highestBidderId: bidder.id, currentBidderId: next === null ? null : auction.bidders[next], currentBidderIndex: next ?? bidderIndex, timeLeft: 15, history: [...auction.history, { playerId: bidder.id, amount, time: new Date().toISOString() }] });
      } else passAuction();
    }, 800);
    return () => window.clearTimeout(timer);
  }, [auction, boardTiles, gameSessionType, ownership, passAuction, players]);

  useEffect(() => {
    if (gameSessionType !== 'single' || !activePlayer.isBot || activePlayer.bankrupt || winner || auction) return;
    const timer = window.setTimeout(() => {
      if (gamePhase === 'ready-to-roll') rollDice();
      else if (gamePhase === 'action-required') {
        if (canBuyProperty) {
          const tile = boardTiles[activePlayer.position];
          if (tile && shouldAIBuyProperty(activePlayer, tile, boardTiles, ownership)) buyProperty(); else startAuction();
        } else if (pendingRent) payRent();
        else if (pendingTax !== null) payTax();
      } else if (gamePhase === 'card-choice') dismissCard();
      else if (gamePhase === 'turn-end') finishTurn();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [activePlayer, auction, boardTiles, buyProperty, canBuyProperty, dismissCard, finishTurn, gamePhase, gameSessionType, ownership, payRent, payTax, pendingRent, pendingTax, rollDice, startAuction, winner]);

  useEffect(() => {
    if (gameSessionType !== 'single' || !auction?.active || auction.currentBidderId !== activePlayer.id || !activePlayer.isBot) return;
    return undefined;
  }, [activePlayer, auction, gameSessionType]);

  useEffect(() => {
    if (gameSessionType !== 'single' || !auction || auction.active) return;
    const timer = window.setTimeout(() => auctionEnded(auction.highestBidderId, auction.currentBid), 0);
    return () => window.clearTimeout(timer);
  }, [auction, auctionEnded, gameSessionType]);

  const startSinglePlayer = useCallback((config: SetupConfig) => {
    const tiles = generateClassicBoard(config.boardSize, config.theme);
    const localSettings: GameSettings = {
      ...DEFAULT_SETTINGS, boardSize: config.boardSize, theme: config.theme, boardTheme: config.theme, mode: config.mode,
      gameMode: config.mode, botDifficulty: config.difficulty, startingMoney: config.startingMoney, turnTimer: config.turnTimer,
      auctionsEnabled: config.rules.auctions, tradingEnabled: config.rules.trading,
      quickChatEnabled: config.rules.quickChat, emotesEnabled: config.rules.emotes,
    };
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'];
    const botNames = ['Barnaby Bot', 'Cleo Bot', 'Darius Bot', 'Eliza Bot', 'Finley Bot', 'Gideon Bot', 'Hattie Bot', 'Ignatius Bot', 'Jules Bot'];
    const botCharacters = CHARACTER_LIST.filter((character) => character.id !== config.character);
    const localPlayers: Player[] = [createPlayer('p1', config.playerName, config.character, config.startingMoney, colors[0], false)];
    for (let index = 0; index < config.aiCount; index += 1) {
      localPlayers.push(createPlayer(`bot-${index + 1}`, botNames[index % botNames.length], botCharacters[index % botCharacters.length].id, config.startingMoney, colors[(index + 1) % colors.length], true, config.difficulty));
    }
    setSettings(localSettings); setBoardTiles(tiles); setPlayers(localPlayers); setOwnership(initializeOwnership(tiles)); setActivePlayerIndex(0); setWinner(null); setAuction(null);
    setOpeningRollState(GameEngine.conductOpeningRollStep(localPlayers)); setGamePhase('opening-roll'); setGameSessionType('single'); setAppScreen('playing'); addLog('Opening roll started.', 'roll');
  }, [addLog]);

  const proceedOpeningRoll = useCallback(() => {
    if (!openingRollState?.winnerId) return;
    const index = players.findIndex((player) => player.id === openingRollState.winnerId);
    setActivePlayerIndex(index >= 0 ? index : 0); setOpeningRollState(null); setGamePhase('ready-to-roll');
  }, [openingRollState, players]);

  const rerollOpeningTie = useCallback(() => {
    if (!openingRollState) return;
    if (gameSessionType === 'multiplayer') mpClient.current.rollOpeningRoll();
    else setOpeningRollState(GameEngine.conductOpeningRollStep(players, openingRollState.rolls, openingRollState.tiedPlayerIds));
  }, [gameSessionType, openingRollState, players]);

  const sendChat = useCallback((text: string) => {
    if (gameSessionType === 'multiplayer') mpClient.current.sendChat(text);
    else setChatMessages((previous) => [...previous, { id: `${Date.now()}`, senderId: activePlayer.id, senderName: activePlayer.name, senderColor: activePlayer.color, text, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
  }, [activePlayer, gameSessionType]);

  const sendEmote = useCallback((emoji: string) => { if (gameSessionType === 'multiplayer') mpClient.current.sendEmote(emoji); }, [gameSessionType]);

  const currentTheme = useMemo(() => BOARD_THEMES[settings.boardTheme || 'classic-town'], [settings.boardTheme]);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans overflow-x-hidden">
      {appScreen === 'menu' && <MainMenu playerName={playerName} onUpdatePlayerName={updatePlayerName} onPlaySinglePlayer={() => setAppScreen('single-setup')} onPlayMultiplayer={() => setAppScreen('multiplayer-lobby')} onOpenRules={() => setRulesOpen(true)} onOpenSettings={() => setSettingsOpen(true)} />}
      {appScreen === 'single-setup' && <SinglePlayerSetupModal playerName={playerName} onUpdatePlayerName={updatePlayerName} onStartGame={startSinglePlayer} onClose={() => setAppScreen('menu')} />}
      {appScreen === 'multiplayer-lobby' && <MultiplayerLobbyModal room={mpRoom} playerId={mpClient.current.playerId} playerName={playerName} onUpdatePlayerName={updatePlayerName} onCreateRoom={(character) => mpClient.current.createRoom(playerName, character)} onJoinRoom={(code, character) => mpClient.current.joinRoom(code, playerName, character)} onToggleReady={(ready) => mpClient.current.setReady(ready)} onChangeCharacter={(character) => mpClient.current.changeCharacter(character)} onKickPlayer={(id) => mpClient.current.kickPlayer(id)} onAddBot={(difficulty) => mpClient.current.addBot(difficulty)} onUpdateSettings={(value) => mpClient.current.updateSettings(value)} onStartGame={() => mpClient.current.startGame()} onLeaveRoom={() => { mpClient.current.leaveRoom(); setMpRoom(null); }} onClose={() => setAppScreen('menu')} errorMessage={mpError} />}

      {appScreen === 'playing' && (
        <>
          <header className="w-full bg-stone-900 border-b border-stone-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-md">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setAppScreen('menu')} className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400"><Dices className="w-5 h-5" /></button>
              <div><h1 className="text-base sm:text-lg font-black tracking-tight text-stone-100">Town Tycoon</h1><p className="text-[10px] text-stone-400">{currentTheme.name} • {boardTiles.length} spaces • {players.length} players</p></div>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-stone-950 border border-stone-800 text-xs font-bold">{activePlayer.name}'s Turn</div>
            <div className="flex items-center gap-2">
              {settings.tradingEnabled && <button type="button" onClick={() => setTradeOpen(true)} className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700"><ArrowLeftRight className="w-4 h-4 text-amber-400" /></button>}
              <button type="button" onClick={() => setRulesOpen(true)} className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700"><BookOpen className="w-4 h-4" /></button>
              <button type="button" onClick={() => setSettingsOpen(true)} className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700"><Settings className="w-4 h-4" /></button>
              <button type="button" onClick={() => setAppScreen('menu')} className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700"><Home className="w-4 h-4" /></button>
            </div>
          </header>

          <div className="w-full max-w-7xl mx-auto px-3 md:px-6 pt-3"><VoiceChatBar players={players} activePlayer={activePlayer} onLogMessage={(message) => addLog(message)} /></div>
          <main className="flex-1 w-full max-w-7xl mx-auto p-3 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 flex justify-center"><Board tiles={boardTiles} players={players} activePlayer={activePlayer} ownership={ownership} dice={dice} isRolling={isRolling} canRoll={gamePhase === 'ready-to-roll' && !isRolling && !activePlayer.isBot} onRoll={rollDice} rollSummary={rollSummary} drawnCard={drawnCard} pendingRent={pendingRent} pendingTax={pendingTax} canBuyProperty={canBuyProperty} onBuyProperty={buyProperty} onPassProperty={startAuction} onPayRent={payRent} onPayTax={payTax} onDismissCard={dismissCard} onPayDetentionBail={() => { if (activePlayer.balance >= 50) setPlayers((previous) => previous.map((player) => player.id === activePlayer.id ? { ...player, balance: player.balance - 50, inDetention: false, detentionTurns: 0 } : player)); }} onUseFreePass={() => { if ((activePlayer.detentionPasses || 0) > 0) setPlayers((previous) => previous.map((player) => player.id === activePlayer.id ? { ...player, detentionPasses: (player.detentionPasses || 0) - 1, inDetention: false, detentionTurns: 0 } : player)); }} onEndTurn={finishTurn} canEndTurn={gamePhase === 'turn-end'} onTileClick={setSelectedTile} theme={settings.boardTheme} /></div>
            <div className="lg:col-span-4 flex flex-col gap-3 w-full">
              <div className="flex items-center gap-1 p-1 bg-stone-900 border border-stone-800 rounded-2xl">
                {([['players', Users], ['properties', Building2], ['log', ScrollText], ['chat', MessageSquare]] as const).map(([tab, Icon]) => <button key={tab} type="button" onClick={() => setSidebarTab(tab)} className={`flex-1 py-2 rounded-xl text-xs font-bold ${sidebarTab === tab ? 'bg-amber-400 text-stone-950' : 'text-stone-400'}`}><Icon className="w-3.5 h-3.5 mx-auto" /></button>)}
              </div>
              <div className="h-[520px] w-full">
                {sidebarTab === 'players' && <PlayerBar players={players} activePlayerIndex={activePlayerIndex} tiles={boardTiles} ownership={ownership} onOpenTrade={(id) => { setTradePartnerId(id); setTradeOpen(true); }} onTileClick={(id) => setSelectedTile(boardTiles[id] || null)} onPlayerClick={setInspectedPlayer} />}
                {sidebarTab === 'properties' && <PropertyPanel tiles={boardTiles} ownership={ownership} players={players} activePlayer={activePlayer} onSelectTile={(id) => setSelectedTile(boardTiles[id] || null)} onHighlightTile={() => undefined} />}
                {sidebarTab === 'log' && <GameLog entries={logs} />}
                {sidebarTab === 'chat' && <ChatPanel messages={chatMessages} players={players} activePlayer={activePlayer} onSendMessage={sendChat} onSendEmote={sendEmote} />}
              </div>
            </div>
          </main>
        </>
      )}

      {openingRollState && <OpeningRollModal openingRoll={openingRollState} players={players} onProceed={proceedOpeningRoll} onRerollTie={rerollOpeningTie} />}
      {selectedTile && <PropertyModal tile={selectedTile} tiles={boardTiles} ownership={ownership} players={players} activePlayer={activePlayer} onClose={() => setSelectedTile(null)} onBuyHouse={upgradeProperty} onMortgage={mortgageProperty} onUnmortgage={unmortgageProperty} />}
      {inspectedPlayer && <PlayerInspectorModal player={inspectedPlayer} activePlayer={activePlayer} tiles={boardTiles} ownership={ownership} onClose={() => setInspectedPlayer(null)} onOpenTrade={(id) => { setTradePartnerId(id); setInspectedPlayer(null); setTradeOpen(true); }} onTileClick={(id) => { setInspectedPlayer(null); setSelectedTile(boardTiles[id] || null); }} />}
      {tradeOpen && <TradeModal activePlayer={activePlayer} players={players} tiles={boardTiles} ownership={ownership} onClose={() => setTradeOpen(false)} onExecuteTrade={executeTrade} />}
      {auction && <AuctionModal auction={auction} tile={boardTiles.find((tile) => tile.id === auction.tileId) || boardTiles[0]} players={players} currentUserId={gameSessionType === 'multiplayer' ? (mpClient.current.playerId || '') : activePlayer.id} onPlaceBid={placeBid} onPass={passAuction} onAuctionEnd={auctionEnded} />}
      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}
      {settingsOpen && <SettingsModal settings={settings} onClose={() => setSettingsOpen(false)} onUpdateSettings={(update) => { setSettings((previous) => ({ ...previous, ...update })); if (update.boardSize || update.boardTheme) setBoardTiles(generateClassicBoard(update.boardSize || settings.boardSize, update.boardTheme || settings.boardTheme)); }} />}
    </div>
  );
}

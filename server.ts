import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import {
  BoardTile,
  Card,
  CharacterId,
  ChatMessage,
  ClientAction,
  GameSettings,
  MultiplayerRoom,
  Player,
  QuickEmote,
  ServerGameState,
  ServerMessage,
  TradeOffer,
  AuctionState,
} from './src/types';
import { generateClassicBoard } from './src/data/classicBoard';
import { initializeOwnership } from './src/utils/gameHelpers';
import { GameEngine } from './src/engine/gameEngine';
import { shouldAIBuyProperty, shouldAIBidOnAuction, findAIPropertiesToBuild } from './src/utils/aiLogic';

const PORT = 3000;
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Parse JSON bodies
app.use(express.json());

// API health route
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    roomsCount: rooms.size,
    timestamp: Date.now(),
  });
});

// ========================================================
// AUTHORITATIVE IN-MEMORY MULTIPLAYER ROOM STORE
// ========================================================
const rooms = new Map<string, MultiplayerRoom>();
const clientSockets = new Map<string, WebSocket>(); // playerId -> WebSocket
const socketToPlayer = new Map<WebSocket, { playerId: string; roomCode: string }>();
const sessions = new Map<string, { playerId: string; roomCode: string; lastSeen: number }>();
const roomBoardTiles = new Map<string, BoardTile[]>(); // roomCode -> BoardTile[]
const botActionLocks = new Map<string, number>();

// Generate unique 5-letter uppercase room codes (e.g. AB7KQ)
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms.has(code));
  return code;
}

// Generate unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// Broadcast message to all connected clients in a room
function broadcastToRoom(roomCode: string, msg: ServerMessage, excludeSocket?: WebSocket) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const data = JSON.stringify(msg);
  room.players.forEach((p) => {
    const ws = clientSockets.get(p.id);
    if (ws && ws.readyState === WebSocket.OPEN && ws !== excludeSocket) {
      ws.send(data);
    }
  });
}

// Send message to single client
function sendToClient(ws: WebSocket | null | undefined, msg: ServerMessage) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

// Sanitize player name (2-16 chars, trimmed, safe)
function sanitizePlayerName(name: string): string {
  const cleaned = name.trim().replace(/[<>/"'&]/g, '');
  if (cleaned.length < 2) return 'Player';
  return cleaned.substring(0, 16);
}

// Room turn timer tick interval
setInterval(() => {
  rooms.forEach((room) => {
    if (room.status !== 'playing' || !room.gameState) return;
    const gs = room.gameState;
    if (room.settings.turnTimer <= 0) return; // Unlimited

    if (gs.turnTimer > 0) {
      gs.turnTimer -= 1;
      // If timer hits zero, advance or auto-action
      if (gs.turnTimer === 0) {
        // Auto resolve active turn
        handleTurnTimeout(room);
      }
    }
  });
}, 1000);

// Auction countdown timer tick
setInterval(() => {
  rooms.forEach((room) => {
    const auction = room.gameState?.auction;
    if (room.status !== 'playing' || !room.gameState || !auction?.active) return;
    if (auction.timeLeft > 0) auction.timeLeft -= 1;
    if (auction.timeLeft === 0 && auction.currentBidderId) {
      if (!auction.passedPlayerIds.includes(auction.currentBidderId)) auction.passedPlayerIds.push(auction.currentBidderId);
      advanceAuction(room, auction.currentBidderId, 'timeout');
    }
  });
}, 1000);

function handleTurnTimeout(room: MultiplayerRoom) {
  if (!room.gameState) return;
  const gs = room.gameState;
  const activePlayer = gs.players[gs.activePlayerIndex];

  gs.logs.unshift({
    id: generateId(),
    text: `Turn timer expired for ${activePlayer?.name || 'player'}. Turn concluded.`,
    type: 'info',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });

  // End turn & pass to next active player
  advanceToNextTurn(room);
}

function advanceToNextTurn(room: MultiplayerRoom) {
  if (!room.gameState) return;
  const gs = room.gameState;
  let nextIdx = (gs.activePlayerIndex + 1) % gs.players.length;
  let loops = 0;

  // Skip bankrupt players
  while (gs.players[nextIdx].bankrupt && loops < gs.players.length) {
    nextIdx = (nextIdx + 1) % gs.players.length;
    loops++;
  }

  // Increment round count when wrapping back to 0
  if (nextIdx <= gs.activePlayerIndex) {
    gs.roundNumber += 1;
  }

  gs.activePlayerIndex = nextIdx;
  gs.gamePhase = 'ready-to-roll';
  gs.doublesCount = 0;
  gs.isRolling = false;
  gs.drawnCard = null;
  gs.pendingRent = null;
  gs.pendingTax = null;
  gs.canBuyProperty = false;
  gs.turnTimer = room.settings.turnTimer;

  // Handle detention turns count
  const nextPlayer = gs.players[nextIdx];
  if (nextPlayer.inDetention) {
    nextPlayer.detentionTurns += 1;
  }

  broadcastToRoom(room.code, { type: 'STATE_UPDATE', gameState: gs });
}



function getActionBinding(ws: WebSocket | null, actorId?: string): { playerId: string; roomCode: string } | undefined {
  if (actorId) {
    for (const room of rooms.values()) {
      if (room.players.some((player) => player.id === actorId && player.isBot)) return { playerId: actorId, roomCode: room.code };
    }
    return undefined;
  }
  return ws ? socketToPlayer.get(ws) : undefined;
}

function getBotAction(room: MultiplayerRoom): { botId: string; action: ClientAction } | null {
  const gs = room.gameState;
  if (!gs || room.status !== 'playing') return null;
  if (gs.gamePhase === 'opening-roll') {
    const bot = gs.players.find((player) => player.isBot && !player.bankrupt);
    return bot ? { botId: bot.id, action: { type: 'OPENING_ROLL_ACTION' } } : null;
  }
  if (gs.gamePhase === 'auction' && gs.auction?.active && gs.auction.currentBidderId) {
    const bot = gs.players.find((player) => player.id === gs.auction?.currentBidderId && player.isBot && !player.bankrupt);
    if (!bot) return null;
    const tiles = roomBoardTiles.get(room.code) || [];
    const tile = tiles.find((candidate) => candidate.id === gs.auction?.tileId);
    if (!tile) return null;
    const decision = shouldAIBidOnAuction(bot, tile, gs.auction.currentBid, tiles, gs.ownership, gs.players);
    const nextBid = gs.auction.currentBid + 10;
    return decision.shouldBid && nextBid <= decision.maxBid ? { botId: bot.id, action: { type: 'PLACE_BID', amount: nextBid } } : { botId: bot.id, action: { type: 'PASS_AUCTION' } };
  }
  const bot = gs.players[gs.activePlayerIndex];
  if (!bot?.isBot || bot.bankrupt) return null;
  switch (gs.gamePhase) {
    case 'ready-to-roll': { const buildId = findAIPropertiesToBuild(bot, tiles, gs.ownership); return buildId !== null ? { botId: bot.id, action: { type: 'UPGRADE_PROPERTY', tileId: buildId } } : { botId: bot.id, action: { type: 'ROLL_DICE' } }; }
    case 'action-required': {
      if (gs.canBuyProperty) {
        const tiles = roomBoardTiles.get(room.code) || [];
        const tile = tiles.find((candidate) => candidate.id === bot.position);
        return tile && shouldAIBuyProperty(bot, tile, tiles, gs.ownership) ? { botId: bot.id, action: { type: 'BUY_PROPERTY', tileId: tile.id } } : { botId: bot.id, action: { type: 'DECLINE_PROPERTY', tileId: bot.position } };
      }
      return { botId: bot.id, action: { type: 'END_TURN' } };
    }
    case 'card-choice': return gs.drawnCard ? { botId: bot.id, action: { type: 'DRAW_CARD' } } : { botId: bot.id, action: { type: 'END_TURN' } };
    case 'turn-end': return { botId: bot.id, action: { type: 'END_TURN' } };
    default: return null;
  }
}

function scheduleBotActions() {
  rooms.forEach((room) => {
    const decision = getBotAction(room);
    if (!decision) return;
    const auctionTurnId = room.gameState?.auction?.turnId ?? 0;
    const lockKey = `${room.code}:${decision.botId}:${room.gameState?.gamePhase}:${auctionTurnId}:${room.gameState?.activePlayerIndex}`;
    if (botActionLocks.has(lockKey)) return;
    botActionLocks.set(lockKey, Date.now());
    setTimeout(() => {
      botActionLocks.delete(lockKey);
      const currentRoom = rooms.get(room.code);
      if (!currentRoom || currentRoom.status !== 'playing' || !currentRoom.gameState) return;
      const currentBot = currentRoom.gameState.players.find((player) => player.id === decision.botId);
      if (!currentBot?.isBot || currentBot.bankrupt) return;
      handleClientAction(null, decision.action, decision.botId);
    }, 500);
  });
}

setInterval(scheduleBotActions, 250);

function getAuctionEligibleIds(gs: ServerGameState, auction: AuctionState): string[] {
  return auction.bidders.filter((id) => {
    const player = gs.players.find((candidate) => candidate.id === id);
    return Boolean(player && !player.bankrupt && !auction.passedPlayerIds.includes(id));
  });
}

function advanceAuction(room: MultiplayerRoom, actorId: string, action: 'bid' | 'pass' | 'timeout') {
  const gs = room.gameState;
  const auction = gs?.auction;
  if (!gs || !auction?.active) return;
  const eligible = getAuctionEligibleIds(gs, auction);
  if (eligible.length === 0) {
    auction.active = false; gs.auction = null; gs.gamePhase = 'turn-end';
    broadcastToRoom(room.code, { type: 'STATE_UPDATE', gameState: gs }); return;
  }
  const actorIndex = auction.bidders.indexOf(actorId);
  let nextIndex: number | null = null;
  for (let offset = 1; offset <= auction.bidders.length; offset += 1) {
    const candidateIndex = (actorIndex + offset) % auction.bidders.length;
    if (eligible.includes(auction.bidders[candidateIndex])) { nextIndex = candidateIndex; break; }
  }
  if (eligible.length === 1) {
    const winnerId = eligible[0];
    const winner = gs.players.find((player) => player.id === winnerId);
    const tile = (roomBoardTiles.get(room.code) || []).find((candidate) => candidate.id === auction.tileId);
    if (winner && tile && winner.balance >= auction.currentBid) {
      winner.balance -= auction.currentBid;
      gs.ownership[auction.tileId] = { ownerId: winner.id, houses: 0, isMortgaged: false };
      gs.logs.unshift({ id: generateId(), text: `${winner.name} won ${tile.name} for $${auction.currentBid}.`, type: 'auction', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    }
    auction.active = false; gs.auction = null; gs.gamePhase = 'turn-end';
    broadcastToRoom(room.code, { type: 'STATE_UPDATE', gameState: gs }); return;
  }
  if (nextIndex === null) { auction.active = false; gs.auction = null; gs.gamePhase = 'turn-end'; broadcastToRoom(room.code, { type: 'STATE_UPDATE', gameState: gs }); return; }
  auction.currentBidderIndex = nextIndex;
  auction.currentBidderId = auction.bidders[nextIndex];
  auction.turnId = (auction.turnId ?? 0) + 1;
  auction.timeLeft = action === 'timeout' ? 5 : 15;
  broadcastToRoom(room.code, { type: 'STATE_UPDATE', gameState: gs });
}

function resolveLandingOutcome(room: MultiplayerRoom, playerId: string, diceTotal: number, allowExtraRoll: boolean): void {
  const gs = room.gameState;
  const tiles = roomBoardTiles.get(room.code) || [];
  if (!gs) return;
  const player = gs.players.find((candidate) => candidate.id === playerId);
  const tile = player ? tiles[player.position] : undefined;
  if (!player || !tile) return;
  const landing = GameEngine.resolveLanding(player, tile, tiles, gs.ownership, gs.players, room.settings, diceTotal);
  gs.rollSummary = `${player.name} -> ${tile.name}`;
  gs.logs.unshift({ id: generateId(), text: landing.description, type: landing.type === 'rent' ? 'rent' : landing.type === 'tax' ? 'money' : landing.type === 'card' ? 'card' : 'roll', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
  if (landing.type === 'unowned') { gs.gamePhase = 'action-required'; gs.canBuyProperty = true; }
  else if (landing.type === 'rent' && landing.recipientId && landing.amount) {
    const owner = gs.players.find((candidate) => candidate.id === landing.recipientId);
    if (player.balance >= landing.amount) { player.balance -= landing.amount; if (owner) owner.balance += landing.amount; gs.gamePhase = allowExtraRoll ? 'ready-to-roll' : 'turn-end'; }
    else { const bankruptcy = GameEngine.handleBankruptcy(player, owner?.id || null, gs.players, gs.ownership); gs.players = bankruptcy.updatedPlayers; gs.ownership = bankruptcy.updatedOwnership; gs.winner = bankruptcy.winner; gs.logs.unshift({ id: generateId(), text: bankruptcy.message, type: 'bankruptcy', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }); gs.gamePhase = bankruptcy.winner ? 'game-over' : 'turn-end'; }
  } else if (landing.type === 'tax' && landing.amount) {
    if (player.balance >= landing.amount) { player.balance -= landing.amount; gs.gamePhase = allowExtraRoll ? 'ready-to-roll' : 'turn-end'; }
    else { const bankruptcy = GameEngine.handleBankruptcy(player, null, gs.players, gs.ownership); gs.players = bankruptcy.updatedPlayers; gs.ownership = bankruptcy.updatedOwnership; gs.winner = bankruptcy.winner; gs.gamePhase = bankruptcy.winner ? 'game-over' : 'turn-end'; }
  } else if (landing.type === 'card' && landing.card) { gs.drawnCard = landing.card; gs.gamePhase = 'card-choice'; }
  else if (landing.type === 'detention') { player.inDetention = true; player.detentionTurns = 0; const jail = tiles.find((candidate) => candidate.type === 'detention'); if (jail) player.position = jail.id; gs.gamePhase = 'turn-end'; }
  else gs.gamePhase = allowExtraRoll ? 'ready-to-roll' : 'turn-end';
}

// ========================================================
// WEBSOCKET CONNECTION & MESSAGE ROUTING
// ========================================================
wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (rawData: string) => {
    try {
      const action: ClientAction = JSON.parse(rawData.toString());
      handleClientAction(ws, action);
    } catch (err) {
      sendToClient(ws, { type: 'ERROR', message: 'Malformed message format.' });
    }
  });

  ws.on('close', () => {
    handleClientDisconnect(ws);
  });
});

function handleClientAction(ws: WebSocket | null, action: ClientAction, actorId?: string) {
  switch (action.type) {
    case 'CREATE_ROOM': {
      const playerName = sanitizePlayerName(action.playerName);
      const roomCode = generateRoomCode();
      const playerId = generateId();
      const sessionToken = generateId();

      const hostPlayer: Player = {
        id: playerId,
        name: playerName,
        isAI: false,
        isBot: false,
        color: '#ef4444',
        character: action.character || 'duck',
        balance: 1500,
        position: 0,
        inDetention: false,
        detentionTurns: 0,
        detentionPasses: 0,
        bankrupt: false,
        voiceState: 'quiet',
        isHost: true,
        ready: true,
      };

      const defaultSettings: GameSettings = {
        mode: 'classic',
        gameMode: 'classic',
        boardSize: 'standard',
        boardName: 'Classic Town',
        theme: 'classic-town',
        boardTheme: 'classic-town',
        difficulty: 'normal',
        botDifficulty: 'normal',
        playerLimit: 6,
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

      const newRoom: MultiplayerRoom = {
        code: roomCode,
        hostId: playerId,
        playerLimit: 6,
        status: 'lobby',
        settings: defaultSettings,
        players: [hostPlayer],
        createdAt: Date.now(),
      };

      rooms.set(roomCode, newRoom);
      clientSockets.set(playerId, ws);
      socketToPlayer.set(ws, { playerId, roomCode });
      sessions.set(sessionToken, { playerId, roomCode, lastSeen: Date.now() });

      sendToClient(ws, {
        type: 'ROOM_CREATED',
        roomCode,
        playerId,
        sessionToken,
        room: newRoom,
      });
      break;
    }

    case 'JOIN_ROOM': {
      const roomCode = (action.roomCode || '').toUpperCase().trim();
      const room = rooms.get(roomCode);

      if (!room) {
        sendToClient(ws, { type: 'ERROR', message: 'Room not found. Please verify the 5-letter code.' });
        return;
      }
      if (room.status !== 'lobby') {
        sendToClient(ws, { type: 'ERROR', message: 'The game has already started.' });
        return;
      }
      if (room.players.length >= room.playerLimit) {
        sendToClient(ws, { type: 'ERROR', message: 'This room is currently full.' });
        return;
      }

      const cleanName = sanitizePlayerName(action.playerName);
      // Check duplicate name
      const nameExists = room.players.some(
        (p) => p.name.toLowerCase() === cleanName.toLowerCase()
      );
      if (nameExists) {
        sendToClient(ws, { type: 'ERROR', message: 'That name is already being used in this room.' });
        return;
      }

      const playerId = generateId();
      const sessionToken = generateId();

      // Available player colors
      const playerColors = [
        '#ef4444', '#3b82f6', '#10b981', '#f59e0b',
        '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
        '#f97316', '#6366f1'
      ];
      const usedColors = room.players.map((p) => p.color);
      const color = playerColors.find((c) => !usedColors.includes(c)) || '#64748b';

      const newPlayer: Player = {
        id: playerId,
        name: cleanName,
        isAI: false,
        isBot: false,
        color,
        character: action.character || 'cat',
        balance: room.settings.startingMoney || 1500,
        position: 0,
        inDetention: false,
        detentionTurns: 0,
        detentionPasses: 0,
        bankrupt: false,
        voiceState: 'quiet',
        isHost: false,
        ready: false,
      };

      room.players.push(newPlayer);
      clientSockets.set(playerId, ws);
      socketToPlayer.set(ws, { playerId, roomCode });
      sessions.set(sessionToken, { playerId, roomCode, lastSeen: Date.now() });

      sendToClient(ws, {
        type: 'ROOM_JOINED',
        roomCode,
        playerId,
        sessionToken,
        room,
      });

      broadcastToRoom(roomCode, { type: 'ROOM_UPDATED', room });
      break;
    }

    case 'SET_READY': {
      const binding = getActionBinding(ws, actorId);
      if (!binding) return;
      const room = rooms.get(binding.roomCode);
      if (!room || room.status !== 'lobby') return;

      const player = room.players.find((p) => p.id === binding.playerId);
      if (player) {
        player.ready = Boolean(action.ready);
        broadcastToRoom(room.code, { type: 'ROOM_UPDATED', room });
      }
      break;
    }

    case 'CHANGE_CHARACTER': {
      const binding = getActionBinding(ws, actorId);
      if (!binding) return;
      const room = rooms.get(binding.roomCode);
      if (!room || room.status !== 'lobby') return;

      const player = room.players.find((p) => p.id === binding.playerId);
      if (player && action.character) {
        player.character = action.character;
        broadcastToRoom(room.code, { type: 'ROOM_UPDATED', room });
      }
      break;
    }

    case 'UPDATE_SETTINGS': {
      const binding = getActionBinding(ws, actorId);
      if (!binding) return;
      const room = rooms.get(binding.roomCode);
      if (!room || room.status !== 'lobby' || room.hostId !== binding.playerId) return;

      room.settings = {
        ...room.settings,
        ...action.settings,
      };
      if (action.settings.playerLimit) {
        room.playerLimit = Math.max(2, Math.min(10, action.settings.playerLimit));
      }

      broadcastToRoom(room.code, { type: 'ROOM_UPDATED', room });
      break;
    }

    case 'KICK_PLAYER': {
      const binding = getActionBinding(ws, actorId);
      if (!binding) return;
      const room = rooms.get(binding.roomCode);
      if (!room || room.status !== 'lobby' || room.hostId !== binding.playerId) return;

      const targetIdx = room.players.findIndex((p) => p.id === action.playerId);
      if (targetIdx >= 0 && action.playerId !== room.hostId) {
        const kicked = room.players.splice(targetIdx, 1)[0];
        const kickedWs = clientSockets.get(kicked.id);
        if (kickedWs) {
          sendToClient(kickedWs, { type: 'ERROR', message: 'You have been removed from the room by the host.' });
          socketToPlayer.delete(kickedWs);
          clientSockets.delete(kicked.id);
        }
        broadcastToRoom(room.code, { type: 'ROOM_UPDATED', room });
      }
      break;
    }

    case 'ADD_BOT': {
      const binding = getActionBinding(ws, actorId);
      if (!binding) return;
      const room = rooms.get(binding.roomCode);
      if (!room || room.status !== 'lobby' || room.hostId !== binding.playerId) return;
      if (room.players.length >= room.playerLimit) { sendToClient(ws, { type: 'ERROR', message: 'This room is full.' }); return; }
      const botNames = ['Barnaby Bot', 'Cleo Bot', 'Darius Bot', 'Eliza Bot', 'Finley Bot', 'Gideon Bot', 'Hattie Bot', 'Ignatius Bot', 'Jules Bot'];
      const botCharacters: CharacterId[] = ['duck', 'cat', 'penguin', 'frog', 'pizza', 'coffee', 'robot', 'dino', 'car', 'rocket', 'chest', 'mushroom', 'balloon', 'crown'];
      const botIndex = room.players.filter((player) => player.isBot).length;
      const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];
      const usedColors = room.players.map((player) => player.color);
      const color = colors.find((candidate) => !usedColors.includes(candidate)) || '#64748b';
      const requestedName = sanitizePlayerName(action.name || botNames[botIndex % botNames.length]);
      const uniqueName = room.players.some((player) => player.name.toLowerCase() === requestedName.toLowerCase()) ? `${requestedName} ${botIndex + 1}` : requestedName;
      const personalities = ['conservative', 'aggressive', 'collector', 'investor', 'opportunist', 'balanced'] as const;
      const bot: Player = { id: `bot-${generateId()}`, name: uniqueName, isAI: true, isBot: true, color, character: botCharacters[botIndex % botCharacters.length], balance: room.settings.startingMoney || 1500, position: 0, inDetention: false, detentionTurns: 0, detentionPasses: 0, bankrupt: false, voiceState: 'quiet', isHost: false, ready: true, difficulty: action.difficulty || room.settings.botDifficulty || 'normal', personality: action.personality || personalities[botIndex % personalities.length] };
      room.players.push(bot);
      broadcastToRoom(room.code, { type: 'ROOM_UPDATED', room });
      break;
    }

    case 'REMOVE_BOT': {
      const binding = getActionBinding(ws, actorId);
      if (!binding) return;
      const room = rooms.get(binding.roomCode);
      if (!room || room.status !== 'lobby' || room.hostId !== binding.playerId) return;
      const botIndex = room.players.findIndex((player) => player.id === action.botId && player.isBot);
      if (botIndex >= 0) { room.players.splice(botIndex, 1); broadcastToRoom(room.code, { type: 'ROOM_UPDATED', room }); }
      break;
    }

    case 'START_GAME': {
      const binding = getActionBinding(ws, actorId);
      if (!binding) return;
      const room = rooms.get(binding.roomCode);
      if (!room || room.status !== 'lobby' || room.hostId !== binding.playerId) return;

      if (room.players.length < 2) {
        sendToClient(ws, { type: 'ERROR', message: 'At least 2 players are required to start.' });
        return;
      }
      const notReady = room.players.filter((p) => !p.ready);
      if (notReady.length > 0) {
        sendToClient(ws, { type: 'ERROR', message: 'All players must be READY before starting.' });
        return;
      }

      // Generate board tiles according to settings
      const tiles = generateClassicBoard(room.settings.boardSize, room.settings.boardTheme);
      roomBoardTiles.set(room.code, tiles);

      // Initialize starting money on all players
      room.players.forEach((p) => {
        p.balance = room.settings.startingMoney || 1500;
        p.position = 0;
        p.inDetention = false;
        p.detentionTurns = 0;
        p.detentionPasses = 0;
        p.bankrupt = false;
      });

      // Conduct Opening Roll across all participants to decide turn order!
      const initialRollState = GameEngine.conductOpeningRollStep(room.players);

      const serverGameState: ServerGameState = {
        players: [...room.players],
        activePlayerIndex: 0,
        ownership: initializeOwnership(tiles),
        dice: [1, 1],
        isRolling: false,
        gamePhase: 'opening-roll',
        doublesCount: 0,
        rollSummary: null,
        drawnCard: null,
        pendingRent: null,
        pendingTax: null,
        canBuyProperty: false,
        winner: null,
        logs: [
          {
            id: generateId(),
            text: 'Opening Roll initiated! Rolling dice to determine turn order.',
            type: 'roll',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ],
        roundNumber: 1,
        turnTimer: room.settings.turnTimer,
        auction: null,
        activeTrades: [],
        openingRoll: initialRollState,
      };

      // If initial roll determined a winner right away
      if (initialRollState.winnerId) {
        const winnerIdx = serverGameState.players.findIndex((p) => p.id === initialRollState.winnerId);
        serverGameState.activePlayerIndex = winnerIdx >= 0 ? winnerIdx : 0;
        const winnerName = serverGameState.players[serverGameState.activePlayerIndex]?.name || 'Player';
        serverGameState.logs.unshift({
          id: generateId(),
          text: `${winnerName} won the opening roll and takes the first turn!`,
          type: 'roll',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        serverGameState.gamePhase = 'ready-to-roll';
      }

      room.status = 'playing';
      room.gameState = serverGameState;

      broadcastToRoom(room.code, {
        type: 'GAME_STARTED',
        room,
        gameState: serverGameState,
      });
      break;
    }

    case 'OPENING_ROLL_ACTION': {
      const binding = getActionBinding(ws, actorId);
      if (!binding) return;
      const room = rooms.get(binding.roomCode);
      if (!room || !room.gameState || room.gameState.gamePhase !== 'opening-roll') return;

      const gs = room.gameState;
      if (!gs.openingRoll) return;

      const nextRollState = GameEngine.conductOpeningRollStep(
        gs.players,
        gs.openingRoll.rolls,
        gs.openingRoll.tiedPlayerIds
      );
      gs.openingRoll = nextRollState;

      if (nextRollState.winnerId) {
        const winnerIdx = gs.players.findIndex((p) => p.id === nextRollState.winnerId);
        gs.activePlayerIndex = winnerIdx >= 0 ? winnerIdx : 0;
        const winnerName = gs.players[gs.activePlayerIndex]?.name || 'Player';
        gs.logs.unshift({
          id: generateId(),
          text: `${winnerName} won the opening roll and takes the first turn!`,
          type: 'roll',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        gs.gamePhase = 'ready-to-roll';
      }

      broadcastToRoom(room.code, { type: 'STATE_UPDATE', gameState: gs });
      break;
    }

    case 'ROLL_DICE': {
      const binding = getActionBinding(ws, actorId);
      if (!binding) return;
      const room = rooms.get(binding.roomCode);
      if (!room || !room.gameState || room.gameState.gamePhase !== 'ready-to-roll') return;

      const gs = room.gameState;
      const activePlayer = gs.players[gs.activePlayerIndex];
      if (activePlayer.id !== binding.playerId) {
        sendToClient(ws, { type: 'ERROR', message: 'It is not your turn.' });
        return;
      }

      // Roll physical 2d6
      const [d1, d2] = GameEngine.rollDice();
      const sum = d1 + d2;
      const isDoubles = d1 === d2;

      gs.dice = [d1, d2];
      gs.isRolling = true;
      gs.gamePhase = 'rolling';
      broadcastToRoom(room.code, { type: 'STATE_UPDATE', gameState: gs });

      // Handle detention status
      if (activePlayer.inDetention) {
        if (isDoubles) {
          activePlayer.inDetention = false;
          activePlayer.detentionTurns = 0;
          gs.logs.unshift({
            id: generateId(),
            text: `${activePlayer.name} rolled doubles (${d1}-${d2}) and escaped from Detention!`,
            type: 'detention',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
        } else if (activePlayer.detentionTurns >= 3) {
          // Force $50 fine
          activePlayer.balance -= 50;
          activePlayer.inDetention = false;
          activePlayer.detentionTurns = 0;
          gs.logs.unshift({
            id: generateId(),
            text: `${activePlayer.name} served 3 turns in Detention. Paid $50 municipal discharge fee.`,
            type: 'detention',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
        } else {
          // Still in detention
          gs.logs.unshift({
            id: generateId(),
            text: `${activePlayer.name} rolled ${d1}-${d2} (no doubles). Remaining in Detention.`,
            type: 'detention',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
          gs.gamePhase = 'turn-end';
          gs.isRolling = false;
          broadcastToRoom(room.code, { type: 'STATE_UPDATE', gameState: gs });
          return;
        }
      }

      // Check consecutive doubles
      if (isDoubles) {
        gs.doublesCount += 1;
        if (gs.doublesCount >= 3) {
          activePlayer.inDetention = true;
          activePlayer.detentionTurns = 0;
          const tiles = roomBoardTiles.get(room.code) || [];
          const detentionTile = tiles.find((t) => t.type === 'detention');
          if (detentionTile) activePlayer.position = detentionTile.id;

          gs.logs.unshift({
            id: generateId(),
            text: `${activePlayer.name} rolled 3 consecutive doubles! Dispatched directly to Detention!`,
            type: 'detention',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
          gs.gamePhase = 'turn-end';
          gs.isRolling = false;
          broadcastToRoom(room.code, { type: 'STATE_UPDATE', gameState: gs });
          return;
        }
      } else {
        gs.doublesCount = 0;
      }

      // Move player
      const tiles = roomBoardTiles.get(room.code) || [];
      const moveResult = GameEngine.calculateMovementPath(activePlayer.position, sum, tiles.length);
      activePlayer.position = moveResult.targetPos;

      if (moveResult.passedGo) {
        const salary = GameEngine.getGoSalary(room.settings.mode);
        activePlayer.balance += salary;
        gs.logs.unshift({
          id: generateId(),
          text: `${activePlayer.name} crossed Town Square (GO) and collected $${salary} salary!`,
          type: 'money',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }

      const landedTile = tiles[moveResult.targetPos];
      const landing = GameEngine.resolveLanding(
        activePlayer,
        landedTile,
        tiles,
        gs.ownership,
        gs.players,
        room.settings,
        sum
      );

      gs.isRolling = false;
      gs.rollSummary = `${activePlayer.name} rolled ${d1}+${d2} = ${sum} -> landed on ${landedTile.name}`;
      gs.logs.unshift({
        id: generateId(),
        text: landing.description,
        type: landing.type === 'rent' ? 'rent' : landing.type === 'tax' ? 'money' : 'roll',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });

      resolveLandingOutcome(room, activePlayer.id, sum, isDoubles && !activePlayer.inDetention);

      broadcastToRoom(room.code, { type: 'STATE_UPDATE', gameState: gs });
      break;
    }

    case 'BUY_PROPERTY': {
      const binding = getActionBinding(ws, actorId);
      if (!binding) return;
      const room = rooms.get(binding.roomCode);
      if (!room || !room.gameState) return;

      const gs = room.gameState;
      const player = gs.players[gs.activePlayerIndex];
      if (player.id !== binding.playerId) return;

      const tiles = roomBoardTiles.get(room.code) || [];
      const tile = tiles.find((t) => t.id === action.tileId);
      if (!tile) return;

      const buyRes = GameEngine.buyProperty(player, tile, gs.ownership);
      if (buyRes.success) {
        gs.players[gs.activePlayerIndex] = buyRes.updatedPlayer;
        gs.ownership = buyRes.updatedOwnership;
        gs.canBuyProperty = false;
        gs.gamePhase = gs.doublesCount > 0 ? 'ready-to-roll' : 'turn-end';
        gs.logs.unshift({
          id: generateId(),
          text: `${player.name} purchased ${tile.name} for $${tile.cost}!`,
          type: 'buy',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        broadcastToRoom(room.code, { type: 'STATE_UPDATE', gameState: gs });
      } else {
        sendToClient(ws, { type: 'ERROR', message: buyRes.error || 'Cannot purchase property.' });
      }
      break;
    }

    case 'DECLINE_PROPERTY': {
      const binding = getActionBinding(ws, actorId);
      if (!binding) return;
      const room = rooms.get(binding.roomCode);
      if (!room?.gameState) return;
      const gs = room.gameState;
      const player = gs.players[gs.activePlayerIndex];
      if (player.id !== binding.playerId || gs.gamePhase !== 'action-required' || !gs.canBuyProperty) return;
      const tile = (roomBoardTiles.get(room.code) || []).find((candidate) => candidate.id === action.tileId);
      if (!tile) return;
      if (room.settings.auctionsEnabled) {
        const bidders = gs.players.filter((candidate) => !candidate.bankrupt).map((candidate) => candidate.id);
        const startFrom = bidders.indexOf(player.id);
        const firstIndex = bidders.length > 1 ? (startFrom + 1) % bidders.length : 0;
        gs.auction = { active: true, tileId: tile.id, currentBid: Math.max(10, Math.round((tile.cost || 100) * 0.5)), highestBidderId: null, currentBidderId: bidders[firstIndex] || null, currentBidderIndex: firstIndex, timeLeft: 20, bidders, passedPlayerIds: [], history: [], turnId: 1 };
        gs.canBuyProperty = false; gs.gamePhase = 'auction';
        gs.logs.unshift({ id: generateId(), text: `${player.name} passed on ${tile.name}. Auction opened at $${gs.auction.currentBid}.`, type: 'auction', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
      } else { gs.canBuyProperty = false; gs.gamePhase = gs.doublesCount > 0 ? 'ready-to-roll' : 'turn-end'; }
      broadcastToRoom(room.code, { type: 'STATE_UPDATE', gameState: gs });
      break;
    }

    case 'UPGRADE_PROPERTY': {
      const binding = getActionBinding(ws, actorId);
      if (!binding) return;
      const room = rooms.get(binding.roomCode);
      if (!room || !room.gameState) return;

      const gs = room.gameState;
      const player = gs.players.find((p) => p.id === binding.playerId);
      if (!player) return;

      const tiles = roomBoardTiles.get(room.code) || [];
      const tile = tiles.find((t) => t.id === action.tileId);
      if (!tile) return;

      const upRes = GameEngine.upgradeProperty(player, tile, tiles, gs.ownership);
      if (upRes.success) {
        gs.players = gs.players.map((p) => (p.id === player.id ? upRes.updatedPlayer : p));
        gs.ownership = upRes.updatedOwnership;
        const newHouses = upRes.updatedOwnership[tile.id]?.houses || 0;
        gs.logs.unshift({
          id: generateId(),
          text: `${player.name} upgraded ${tile.name} to ${newHouses === 5 ? 'a Luxury Hotel' : `Level ${newHouses}`}!`,
          type: 'build',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        broadcastToRoom(room.code, { type: 'STATE_UPDATE', gameState: gs });
      } else {
        sendToClient(ws, { type: 'ERROR', message: upRes.error || 'Cannot upgrade property.' });
      }
      break;
    }

    case 'MORTGAGE_PROPERTY': {
      const binding = getActionBinding(ws, actorId);
      if (!binding) return;
      const room = rooms.get(binding.roomCode);
      if (!room || !room.gameState) return;

      const gs = room.gameState;
      const player = gs.players.find((p) => p.id === binding.playerId);
      if (!player) return;

      const tiles = roomBoardTiles.get(room.code) || [];
      const tile = tiles.find((t) => t.id === action.tileId);
      if (!tile) return;

      const mRes = GameEngine.mortgageProperty(player, tile, tiles, gs.ownership);
      if (mRes.success) {
        gs.players = gs.players.map((p) => (p.id === player.id ? mRes.updatedPlayer : p));
        gs.ownership = mRes.updatedOwnership;
        gs.logs.unshift({
          id: generateId(),
          text: `${player.name} mortgaged ${tile.name} for $${tile.mortgageValue || 50}.`,
          type: 'money',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        broadcastToRoom(room.code, { type: 'STATE_UPDATE', gameState: gs });
      } else {
        sendToClient(ws, { type: 'ERROR', message: mRes.error || 'Cannot mortgage.' });
      }
      break;
    }

    case 'UNMORTGAGE_PROPERTY': {
      const binding = getActionBinding(ws, actorId);
      if (!binding) return;
      const room = rooms.get(binding.roomCode);
      if (!room || !room.gameState) return;

      const gs = room.gameState;
      const player = gs.players.find((p) => p.id === binding.playerId);
      if (!player) return;

      const tiles = roomBoardTiles.get(room.code) || [];
      const tile = tiles.find((t) => t.id === action.tileId);
      if (!tile) return;

      const uRes = GameEngine.unmortgageProperty(player, tile, gs.ownership);
      if (uRes.success) {
        gs.players = gs.players.map((p) => (p.id === player.id ? uRes.updatedPlayer : p));
        gs.ownership = uRes.updatedOwnership;
        gs.logs.unshift({
          id: generateId(),
          text: `${player.name} lifted mortgage on ${tile.name}.`,
          type: 'money',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        broadcastToRoom(room.code, { type: 'STATE_UPDATE', gameState: gs });
      } else {
        sendToClient(ws, { type: 'ERROR', message: uRes.error || 'Cannot lift mortgage.' });
      }
      break;
    }

    case 'DRAW_CARD': {
      const binding = getActionBinding(ws, actorId);
      if (!binding) return;
      const room = rooms.get(binding.roomCode);
      if (!room || !room.gameState || room.gameState.gamePhase !== 'card-choice') return;
      const gs = room.gameState;
      const player = gs.players[gs.activePlayerIndex];
      if (player.id !== binding.playerId || !gs.drawnCard) return;
      const card = gs.drawnCard;
      gs.drawnCard = null;
      const tiles = roomBoardTiles.get(room.code) || [];
      const cardRes = GameEngine.executeCard(card, player, gs.players, tiles, gs.ownership, tiles.length);
      gs.players = cardRes.updatedAllPlayers;
      gs.ownership = cardRes.updatedOwnership;
      gs.logs.unshift({ id: generateId(), text: cardRes.message, type: 'card', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
      if (card.actionType === 'go-detention') gs.gamePhase = 'turn-end';
      else if (cardRes.targetPosition !== undefined) resolveLandingOutcome(room, player.id, 0, false);
      else gs.gamePhase = gs.doublesCount > 0 ? 'ready-to-roll' : 'turn-end';
      broadcastToRoom(room.code, { type: 'STATE_UPDATE', gameState: gs });
      break;
    }

    case 'PLACE_BID': {
      const binding = getActionBinding(ws, actorId);
      if (!binding) return;
      const room = rooms.get(binding.roomCode);
      const gs = room?.gameState;
      const auction = gs?.auction;
      if (!room || !gs || !auction?.active) return;
      const player = gs.players.find((candidate) => candidate.id === binding.playerId);
      if (!player || player.bankrupt || !auction.bidders.includes(player.id) || auction.passedPlayerIds.includes(player.id)) return;
      if (auction.currentBidderId !== player.id) { sendToClient(ws, { type: 'ERROR', message: 'It is not your auction turn.' }); return; }
      const bidAmount = Math.round(Number(action.amount));
      if (!Number.isFinite(bidAmount) || bidAmount <= auction.currentBid) { sendToClient(ws, { type: 'ERROR', message: 'Bid must exceed the current bid.' }); return; }
      if (player.balance < bidAmount) { sendToClient(ws, { type: 'ERROR', message: 'Insufficient balance to place this bid.' }); return; }
      auction.currentBid = bidAmount; auction.highestBidderId = player.id;
      auction.history.push({ playerId: player.id, amount: bidAmount, time: new Date().toISOString() });
      gs.logs.unshift({ id: generateId(), text: `${player.name} raised the auction to $${bidAmount}.`, type: 'auction', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
      advanceAuction(room, player.id, 'bid');
      break;
    }

    case 'PASS_AUCTION': {
      const binding = getActionBinding(ws, actorId);
      if (!binding) return;
      const room = rooms.get(binding.roomCode);
      const gs = room?.gameState;
      const auction = gs?.auction;
      if (!room || !gs || !auction?.active) return;
      const player = gs.players.find((candidate) => candidate.id === binding.playerId);
      if (!player || player.bankrupt || !auction.bidders.includes(player.id) || auction.passedPlayerIds.includes(player.id)) return;
      if (auction.currentBidderId !== player.id) { sendToClient(ws, { type: 'ERROR', message: 'It is not your auction turn.' }); return; }
      auction.passedPlayerIds.push(player.id);
      advanceAuction(room, player.id, 'pass');
      break;
    }

    case 'PROPOSE_TRADE': {
      const binding = getActionBinding(ws, actorId);
      if (!binding) return;
      const room = rooms.get(binding.roomCode);
      if (!room || !room.gameState) return;

      const gs = room.gameState;
      const offer = action.offer;
      if (!offer) return;

      const tradeId = generateId();
      gs.activeTrades.push({
        ...offer,
        id: tradeId,
        status: 'pending',
      });

      const sender = gs.players.find((p) => p.id === offer.fromPlayerId);
      const recipient = gs.players.find((p) => p.id === offer.toPlayerId);

      gs.logs.unshift({
        id: generateId(),
        text: `${sender?.name || 'Player'} proposed a commercial trade to ${recipient?.name || 'Player'}.`,
        type: 'trade',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });

      broadcastToRoom(room.code, { type: 'STATE_UPDATE', gameState: gs });
      break;
    }

    case 'ACCEPT_TRADE': {
      const binding = getActionBinding(ws, actorId);
      if (!binding) return;
      const room = rooms.get(binding.roomCode);
      if (!room || !room.gameState) return;

      const gs = room.gameState;
      const trade = gs.activeTrades.find((t) => t.id === action.tradeId && t.status === 'pending');
      if (!trade) return;

      if (trade.toPlayerId !== binding.playerId) {
        sendToClient(ws, { type: 'ERROR', message: 'Only recipient can accept trade offer.' });
        return;
      }

      const tradeRes = GameEngine.executeTrade(trade, gs.players, gs.ownership);
      if (tradeRes.success) {
        gs.players = tradeRes.updatedPlayers;
        gs.ownership = tradeRes.updatedOwnership;
        trade.status = 'accepted';

        const sender = gs.players.find((p) => p.id === trade.fromPlayerId);
        const recipient = gs.players.find((p) => p.id === trade.toPlayerId);

        gs.logs.unshift({
          id: generateId(),
          text: `Trade concluded between ${sender?.name} and ${recipient?.name}!`,
          type: 'trade',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        broadcastToRoom(room.code, { type: 'STATE_UPDATE', gameState: gs });
      } else {
        sendToClient(ws, { type: 'ERROR', message: tradeRes.error || 'Trade could not be completed.' });
      }
      break;
    }

    case 'DECLINE_TRADE': {
      const binding = getActionBinding(ws, actorId);
      if (!binding) return;
      const room = rooms.get(binding.roomCode);
      if (!room || !room.gameState) return;

      const gs = room.gameState;
      const trade = gs.activeTrades.find((t) => t.id === action.tradeId);
      if (trade) {
        trade.status = 'declined';
        broadcastToRoom(room.code, { type: 'STATE_UPDATE', gameState: gs });
      }
      break;
    }

    case 'CANCEL_TRADE': {
      const binding = getActionBinding(ws, actorId);
      if (!binding) return;
      const room = rooms.get(binding.roomCode);
      if (!room || !room.gameState) return;

      const gs = room.gameState;
      const trade = gs.activeTrades.find((t) => t.id === action.tradeId);
      if (trade && trade.fromPlayerId === binding.playerId) {
        trade.status = 'cancelled';
        broadcastToRoom(room.code, { type: 'STATE_UPDATE', gameState: gs });
      }
      break;
    }

    case 'END_TURN': {
      const binding = getActionBinding(ws, actorId);
      if (!binding) return;
      const room = rooms.get(binding.roomCode);
      if (!room || !room.gameState) return;

      const gs = room.gameState;
      const activePlayer = gs.players[gs.activePlayerIndex];
      if (activePlayer.id !== binding.playerId) return;

      advanceToNextTurn(room);
      break;
    }

    case 'SEND_CHAT': {
      const binding = getActionBinding(ws, actorId);
      if (!binding) return;
      const room = rooms.get(binding.roomCode);
      if (!room) return;

      const player = room.players.find((p) => p.id === binding.playerId);
      if (!player) return;

      const text = (action.text || '').trim();
      if (!text) return;

      const chatMsg: ChatMessage = {
        id: generateId(),
        senderId: player.id,
        senderName: player.name,
        senderColor: player.color,
        text: text.substring(0, 200),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      broadcastToRoom(room.code, { type: 'CHAT_MESSAGE', message: chatMsg });
      break;
    }

    case 'SEND_EMOTE': {
      const binding = getActionBinding(ws, actorId);
      if (!binding) return;
      const room = rooms.get(binding.roomCode);
      if (!room) return;

      const emote: QuickEmote = {
        id: generateId(),
        playerId: binding.playerId,
        emoji: action.emoji || '👋',
        timestamp: Date.now(),
      };

      broadcastToRoom(room.code, { type: 'EMOTE_EVENT', emote });
      break;
    }

    case 'VOICE_SIGNAL': {
      const binding = getActionBinding(ws, actorId);
      if (!binding) return;
      const targetWs = clientSockets.get(action.targetPlayerId);
      if (targetWs && targetWs.readyState === WebSocket.OPEN) {
        sendToClient(targetWs, {
          type: 'VOICE_SIGNAL',
          fromPlayerId: binding.playerId,
          signal: action.signal,
        });
      }
      break;
    }

    case 'RECONNECT': {
      const roomCode = (action.roomCode || '').toUpperCase().trim();
      const room = rooms.get(roomCode);
      const session = sessions.get(action.sessionToken);

      if (!room || !session || session.playerId !== action.playerId) {
        sendToClient(ws, { type: 'ERROR', message: 'Session expired or room invalid.' });
        return;
      }

      clientSockets.set(session.playerId, ws);
      socketToPlayer.set(ws, { playerId: session.playerId, roomCode });
      session.lastSeen = Date.now();

      const player = room.players.find((p) => p.id === session.playerId);
      if (player) {
        broadcastToRoom(room.code, {
          type: 'PLAYER_RECONNECTED',
          playerId: player.id,
          playerName: player.name,
        });
      }

      sendToClient(ws, {
        type: 'ROOM_JOINED',
        roomCode,
        playerId: session.playerId,
        sessionToken: action.sessionToken,
        room,
      });

      if (room.gameState) {
        sendToClient(ws, {
          type: 'STATE_UPDATE',
          gameState: room.gameState,
        });
      }
      break;
    }

    case 'LEAVE_ROOM': {
      handleClientDisconnect(ws);
      break;
    }

    default:
      break;
  }
}

function handleClientDisconnect(ws: WebSocket) {
  const binding = socketToPlayer.get(ws);
  if (!binding) return;

  const { playerId, roomCode } = binding;
  socketToPlayer.delete(ws);
  clientSockets.delete(playerId);

  const room = rooms.get(roomCode);
  if (!room) return;

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return;

  if (room.status === 'lobby') {
    // In lobby: Remove player completely
    room.players = room.players.filter((p) => p.id !== playerId);
    if (room.players.length === 0) {
      rooms.delete(roomCode);
      roomBoardTiles.delete(roomCode);
    } else {
      if (room.hostId === playerId) {
        room.hostId = room.players[0].id;
        room.players[0].isHost = true;
      }
      broadcastToRoom(roomCode, { type: 'ROOM_UPDATED', room });
    }
  } else {
    // In active game: Broadcast disconnect notice
    broadcastToRoom(roomCode, {
      type: 'PLAYER_DISCONNECTED',
      playerId: player.id,
      playerName: player.name,
    });
    if (room.gameState) {
      const auction = room.gameState.auction;
      if (auction?.active && auction.currentBidderId === playerId) {
        if (!auction.passedPlayerIds.includes(playerId)) auction.passedPlayerIds.push(playerId);
        advanceAuction(room, playerId, 'pass');
      }
      room.gameState.logs.unshift({
        id: generateId(),
        text: `${player.name} temporarily disconnected. Waiting for reconnection...`,
        type: 'info',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      broadcastToRoom(roomCode, { type: 'STATE_UPDATE', gameState: room.gameState });
    }
  }
}

// ========================================================
// VITE MIDDLEWARE (DEV) & STATIC FILE HOSTING (PROD)
// ========================================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Town Tycoon Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

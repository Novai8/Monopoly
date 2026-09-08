from pathlib import Path
import re

ROOT = Path('.')

# ---------------- server-side multiplayer bot scheduler ----------------
server = ROOT / 'server.ts'
s = server.read_text()
s = s.replace(
    "import { GameEngine } from './src/engine/gameEngine';",
    "import { GameEngine } from './src/engine/gameEngine';\nimport { shouldAIBidOnAuction, shouldAIBuyProperty } from './src/utils/aiLogic';"
)

marker = "const roomBoardTiles = new Map<string, BoardTile[]>(); // roomCode -> BoardTile[]\n"
insert = marker + "const botTimers = new Map<string, NodeJS.Timeout>();\n"
if "const botTimers = new Map<string, NodeJS.Timeout>();" not in s:
    s = s.replace(marker, insert)

scheduler_marker = "// ========================================================\n// WEBSOCKET CONNECTION & MESSAGE ROUTING\n// ========================================================\n"
scheduler = r'''function runServerBotAction(room: MultiplayerRoom, botId: string, action: ClientAction) {
  const botSocket = {
    readyState: WebSocket.CLOSED,
    send: (_data: string) => undefined,
  } as unknown as WebSocket;
  socketToPlayer.set(botSocket, { playerId: botId, roomCode: room.code });
  try {
    handleClientAction(botSocket, action);
  } finally {
    socketToPlayer.delete(botSocket);
  }
}

function scheduleBotTurn(room: MultiplayerRoom) {
  if (room.status !== 'playing' || !room.gameState) return;
  if (botTimers.has(room.code)) return;
  const gs = room.gameState;
  let bot: Player | undefined;
  let action: ClientAction | null = null;

  if (gs.gamePhase === 'opening-roll') {
    bot = gs.players.find((player) => player.isBot && !player.bankrupt && !gs.openingRoll?.winnerId);
    if (bot) action = { type: 'OPENING_ROLL_ACTION' };
  } else if (gs.auction?.active) {
    bot = gs.players.find((player) => player.id === gs.auction?.currentBidderId && player.isBot && !player.bankrupt);
    if (bot) {
      const tile = (roomBoardTiles.get(room.code) || []).find((candidate) => candidate.id === gs.auction?.tileId);
      if (tile && gs.auction) {
        const decision = shouldAIBidOnAuction(bot, tile, gs.auction.currentBid, roomBoardTiles.get(room.code) || [], gs.ownership);
        const nextBid = gs.auction.currentBid + 10;
        action = decision.shouldBid && bot.balance >= nextBid
          ? { type: 'PLACE_BID', amount: nextBid }
          : { type: 'PASS_AUCTION' };
      }
    }
  } else {
    const active = gs.players[gs.activePlayerIndex];
    if (active?.isBot && !active.bankrupt) {
      bot = active;
      if (gs.gamePhase === 'ready-to-roll') action = { type: 'ROLL_DICE' };
      else if (gs.gamePhase === 'action-required') {
        const tile = (roomBoardTiles.get(room.code) || [])[active.position];
        if (gs.canBuyProperty && tile) {
          action = shouldAIBuyProperty(active, tile, roomBoardTiles.get(room.code) || [], gs.ownership)
            ? { type: 'BUY_PROPERTY', tileId: tile.id }
            : { type: 'DECLINE_PROPERTY', tileId: tile.id };
        } else if (gs.pendingRent) {
          action = { type: 'END_TURN' };
        } else if (gs.pendingTax !== null) {
          action = { type: 'END_TURN' };
        }
      } else if (gs.gamePhase === 'card-choice' && gs.drawnCard) action = { type: 'DRAW_CARD' };
      else if (gs.gamePhase === 'turn-end') action = { type: 'END_TURN' };
    }
  }

  if (!bot || !action) return;
  const timer = setTimeout(() => {
    botTimers.delete(room.code);
    if (room.status === 'playing') runServerBotAction(room, bot!.id, action!);
    scheduleBotTurn(room);
  }, gs.gamePhase === 'auction' ? 700 : 650);
  botTimers.set(room.code, timer);
}

setInterval(() => {
  rooms.forEach((room) => scheduleBotTurn(room));
}, 500);

'''
if "function runServerBotAction" not in s:
    s = s.replace(scheduler_marker, scheduler + scheduler_marker)

# Add authoritative lobby bot actions before START_GAME.
start_marker = "    case 'START_GAME': {"
bot_case = r'''    case 'ADD_BOT': {
      const binding = socketToPlayer.get(ws);
      if (!binding) return;
      const room = rooms.get(binding.roomCode);
      if (!room || room.status !== 'lobby' || room.hostId !== binding.playerId) return;
      if (room.players.length >= room.playerLimit) {
        sendToClient(ws, { type: 'ERROR', message: 'This room is full.' });
        return;
      }
      const botNames = ['Barnaby Bot', 'Cleo Bot', 'Darius Bot', 'Eliza Bot', 'Finley Bot', 'Gideon Bot', 'Hattie Bot', 'Ignatius Bot', 'Jules Bot'];
      const botCharacters: CharacterId[] = ['duck', 'cat', 'penguin', 'frog', 'pizza', 'coffee', 'robot', 'dino', 'car', 'rocket', 'chest', 'mushroom', 'balloon', 'crown'];
      const usedNames = new Set(room.players.map((player) => player.name));
      const requestedName = sanitizePlayerName(action.name || '');
      const name = requestedName !== 'Player' && !usedNames.has(requestedName)
        ? requestedName
        : botNames.find((candidate) => !usedNames.has(candidate)) || `Bot ${room.players.length}`;
      const usedColors = new Set(room.players.map((player) => player.color));
      const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];
      const color = colors.find((candidate) => !usedColors.has(candidate)) || '#64748b';
      const botId = `bot-${generateId()}`;
      const bot: Player = {
        id: botId,
        name,
        isAI: true,
        isBot: true,
        color,
        character: botCharacters[room.players.length % botCharacters.length],
        balance: room.settings.startingMoney || 1500,
        position: 0,
        inDetention: false,
        detentionTurns: 0,
        detentionPasses: 0,
        bankrupt: false,
        voiceState: 'quiet',
        isHost: false,
        ready: true,
        difficulty: action.difficulty || room.settings.botDifficulty || room.settings.difficulty,
      };
      room.players.push(bot);
      broadcastToRoom(room.code, { type: 'ROOM_UPDATED', room });
      break;
    }

    case 'REMOVE_BOT': {
      const binding = socketToPlayer.get(ws);
      if (!binding) return;
      const room = rooms.get(binding.roomCode);
      if (!room || room.status !== 'lobby' || room.hostId !== binding.playerId) return;
      const index = room.players.findIndex((player) => player.id === action.botId && player.isBot);
      if (index >= 0) room.players.splice(index, 1);
      broadcastToRoom(room.code, { type: 'ROOM_UPDATED', room });
      break;
    }

'''
if "case 'ADD_BOT':" not in s:
    s = s.replace(start_marker, bot_case + start_marker)

# Let a bot finish auction safely when it is the only remaining bidder.
s = s.replace(
    "  if (eligible.length === 1) {\n    const winnerId = eligible[0];",
    "  if (eligible.length === 1) {\n    const winnerId = auction.highestBidderId && eligible.includes(auction.highestBidderId) ? auction.highestBidderId : eligible[0];"
)

# Correct bot auction bids through the authoritative current-bidder action path. Existing handler already does this.
server.write_text(s)

# ---------------- card movement re-enters landing resolution ----------------
engine = ROOT / 'src/engine/gameEngine.ts'
e = engine.read_text()
if "movementTarget" not in e:
    e = e.replace(
        "    targetPosition?: number;\n  } {",
        "    targetPosition?: number;\n    movementTarget?: number;\n  } {"
    )
    # The exact return signature has a line break before the object; use a broader fallback.
    if "movementTarget?: number;" not in e:
        e = e.replace("    targetPosition?: number;\n  }", "    targetPosition?: number;\n    movementTarget?: number;\n  }")
    e = e.replace(
        "    return {\n      updatedPlayer: updated,\n      updatedAllPlayers: updatedPlayers,\n      updatedOwnership: updatedOwn,\n      message: msg,\n      targetPosition: targetPos,\n    };",
        "    return {\n      updatedPlayer: updated,\n      updatedAllPlayers: updatedPlayers,\n      updatedOwnership: updatedOwn,\n      message: msg,\n      targetPosition: targetPos,\n      movementTarget: targetPos,\n    };"
    )
engine.write_text(e)

# ---------------- local UI: resolve card movement through the same landing resolver ----------------
app = ROOT / 'src/App.tsx'
a = app.read_text()
old = """    const result = GameEngine.executeCard(drawnCard, activePlayer, players, boardTiles, ownership, boardTiles.length);\n    setPlayers(result.updatedAllPlayers); setOwnership(result.updatedOwnership); setDrawnCard(null); addLog(result.message, 'card'); setGamePhase('turn-end');"""
new = """    const result = GameEngine.executeCard(drawnCard, activePlayer, players, boardTiles, ownership, boardTiles.length);\n    setPlayers(result.updatedAllPlayers); setOwnership(result.updatedOwnership); setDrawnCard(null); addLog(result.message, 'card');\n    if (result.movementTarget !== undefined) {\n      const movedPlayer = result.updatedAllPlayers.find((candidate) => candidate.id === activePlayer.id) || result.updatedPlayer;\n      const movedTile = boardTiles[result.movementTarget];\n      if (movedTile) {\n        const landing = GameEngine.resolveLanding(movedPlayer, movedTile, boardTiles, result.updatedOwnership, result.updatedAllPlayers, settings, 0);\n        setRollSummary(landing.description);\n        if (landing.type === 'unowned') { setCanBuyProperty(true); setGamePhase('action-required'); }\n        else if (landing.type === 'rent' && landing.recipientId && landing.amount) {\n          const recipient = result.updatedAllPlayers.find((candidate) => candidate.id === landing.recipientId);\n          if (recipient) { setPendingRent({ amount: landing.amount, recipient }); setGamePhase('action-required'); } else setGamePhase('turn-end');\n        }\n        else if (landing.type === 'tax' && landing.amount) { setPendingTax(landing.amount); setGamePhase('action-required'); }\n        else if (landing.type === 'card' && landing.card) { setDrawnCard(landing.card); setGamePhase('card-choice'); }\n        else if (landing.type === 'detention') {\n          const jail = boardTiles.find((candidate) => candidate.type === 'detention');\n          setPlayers((previous) => previous.map((candidate) => candidate.id === movedPlayer.id ? { ...candidate, position: jail?.id ?? candidate.position, inDetention: true, detentionTurns: 0 } : candidate));\n          setGamePhase('turn-end');\n        } else setGamePhase('turn-end');\n      } else setGamePhase('turn-end');\n    } else setGamePhase('turn-end');"""
if old not in a:
    raise SystemExit('Expected App card resolver block not found')
a = a.replace(old, new)
app.write_text(a)

print('gameplay fixes applied')

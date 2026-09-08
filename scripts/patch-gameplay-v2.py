from pathlib import Path
import re

server = Path('server.ts')
s = server.read_text()
assert "import { shouldAIBuyProperty }" not in s
s = s.replace("import { GameEngine } from './src/engine/gameEngine';", "import { GameEngine } from './src/engine/gameEngine';\nimport { shouldAIBuyProperty } from './src/utils/aiLogic';")
s = s.replace("const roomBoardTiles = new Map<string, BoardTile[]>(); // roomCode -> BoardTile[]", "const roomBoardTiles = new Map<string, BoardTile[]>(); // roomCode -> BoardTile[]\nconst botActionLocks = new Set<string>();")
s = s.replace("function sendToClient(ws: WebSocket, msg: ServerMessage) {\n  if (ws.readyState === WebSocket.OPEN) {", "function sendToClient(ws: WebSocket | null | undefined, msg: ServerMessage) {\n  if (ws && ws.readyState === WebSocket.OPEN) {")
anchor = "function getAuctionEligibleIds(gs: ServerGameState, auction: AuctionState): string[] {"
assert anchor in s
bot_block = r'''function getActionBinding(ws: WebSocket | null, actorId?: string): { playerId: string; roomCode: string } | undefined {
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
    const wantsProperty = shouldAIBuyProperty(bot, tile, tiles, gs.ownership);
    const nextBid = gs.auction.currentBid + 10;
    return wantsProperty && bot.balance >= nextBid ? { botId: bot.id, action: { type: 'PLACE_BID', amount: nextBid } } : { botId: bot.id, action: { type: 'PASS_AUCTION' } };
  }
  const bot = gs.players[gs.activePlayerIndex];
  if (!bot?.isBot || bot.bankrupt) return null;
  switch (gs.gamePhase) {
    case 'ready-to-roll': return { botId: bot.id, action: { type: 'ROLL_DICE' } };
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
    const lockKey = `${room.code}:${decision.botId}:${room.gameState?.gamePhase}:${room.gameState?.auction?.currentBidderId || ''}`;
    if (botActionLocks.has(lockKey)) return;
    botActionLocks.add(lockKey);
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

'''
s = s.replace(anchor, bot_block + anchor)
s = s.replace("function handleClientAction(ws: WebSocket, action: ClientAction) {", "function handleClientAction(ws: WebSocket | null, action: ClientAction, actorId?: string) {")
start = s.index("function handleClientAction(")
end = s.index("\nfunction handleClientDisconnect", start)
handler = s[start:end].replace("const binding = socketToPlayer.get(ws);", "const binding = getActionBinding(ws, actorId);")
s = s[:start] + handler + s[end:]
marker = "    case 'START_GAME': {"
assert marker in s
bot_cases = r'''    case 'ADD_BOT': {
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
      const bot: Player = { id: `bot-${generateId()}`, name: uniqueName, isAI: true, isBot: true, color, character: botCharacters[botIndex % botCharacters.length], balance: room.settings.startingMoney || 1500, position: 0, inDetention: false, detentionTurns: 0, detentionPasses: 0, bankrupt: false, voiceState: 'quiet', isHost: false, ready: true, difficulty: action.difficulty || room.settings.botDifficulty || 'normal' };
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

'''
s = s.replace(marker, bot_cases + marker)
helper_anchor = "// ========================================================\n// WEBSOCKET CONNECTION & MESSAGE ROUTING\n// ========================================================"
assert helper_anchor in s
landing_helper = r'''function resolveLandingOutcome(room: MultiplayerRoom, playerId: string, diceTotal: number, allowExtraRoll: boolean): void {
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

'''
s = s.replace(helper_anchor, landing_helper + helper_anchor)
pattern = re.compile(r"      // Handle Landing Types\n.*?      broadcastToRoom\(room\.code, \{ type: 'STATE_UPDATE', gameState: gs \}\);\n      break;\n    }\n\n    case 'BUY_PROPERTY':", re.S)
match = pattern.search(s)
assert match, 'roll landing block not found'
s = s[:match.start()] + "      resolveLandingOutcome(room, activePlayer.id, sum, isDoubles && !activePlayer.inDetention);\n\n      broadcastToRoom(room.code, { type: 'STATE_UPDATE', gameState: gs });\n      break;\n    }\n\n    case 'BUY_PROPERTY':" + s[match.end():]
pattern = re.compile(r"    case 'DRAW_CARD': \{.*?      break;\n    }\n\n    case 'PLACE_BID':", re.S)
match = pattern.search(s)
assert match, 'DRAW_CARD block not found'
new_draw = r'''    case 'DRAW_CARD': {
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

    case 'PLACE_BID':'''
s = s[:match.start()] + new_draw + s[match.end():]
server.write_text(s)

client = Path('src/utils/multiplayerClient.ts')
c = client.read_text()
c = c.replace("  GameSettings,\n", "  GameSettings,\n  BotDifficulty,\n")
needle = "  public kickPlayer(playerId: string) { this.send({ type: 'KICK_PLAYER', playerId }); }\n"
assert needle in c
c = c.replace(needle, needle + "  public addBot(difficulty?: BotDifficulty, name?: string) { this.send({ type: 'ADD_BOT', difficulty, name }); }\n  public removeBot(botId: string) { this.send({ type: 'REMOVE_BOT', botId }); }\n")
client.write_text(c)

app = Path('src/App.tsx')
a = app.read_text()
old = re.search(r"  const dismissCard = useCallback\(\(\) => \{.*?\n  \}, \[activePlayer, boardTiles, drawnCard, gameSessionType, ownership, players, addLog\]\);", a, re.S)
assert old, 'dismissCard block not found'
new = r'''  const dismissCard = useCallback(() => {
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
  }, [activePlayer, boardTiles, dice, drawnCard, doublesCount, gameSessionType, ownership, players, settings, addLog]);'''
a = a[:old.start()] + new + a[old.end():]
needle = "onKickPlayer={(id) => mpClient.current.kickPlayer(id)}"
assert needle in a
a = a.replace(needle, needle + " onAddBot={(difficulty) => mpClient.current.addBot(difficulty)}")
app.write_text(a)

lobby = Path('src/components/MultiplayerLobbyModal.tsx')
l = lobby.read_text()
l = l.replace("  Player,\n", "  Player,\n  BotDifficulty,\n")
l = l.replace("  onKickPlayer: (targetPlayerId: string) => void;\n", "  onKickPlayer: (targetPlayerId: string) => void;\n  onAddBot: (difficulty?: BotDifficulty) => void;\n")
l = l.replace("  onKickPlayer,\n", "  onKickPlayer,\n  onAddBot,\n")
button_needle = "                  <button\n                    type=\"button\"\n                    onClick={() => setShowSettingsEdit(!showSettingsEdit)}"
assert button_needle in l
bot_button = """                  <button\n                    type=\"button\"\n                    onClick={() => onAddBot(room.settings.botDifficulty || 'normal')}\n                    disabled={totalCount >= room.playerLimit}\n                    className=\"px-2.5 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[10px] font-black disabled:opacity-40\"\n                  >\n                    + ADD BOT\n                  </button>\n\n"""
l = l.replace(button_needle, bot_button + button_needle)
lobby.write_text(l)
print('gameplay patch applied')

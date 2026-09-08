import {
  CharacterId, ChatMessage, ClientAction, GameSettings, BotDifficulty, BotPersonality, MultiplayerRoom, QuickEmote,
  ServerGameState, ServerMessage, TradeOffer, WebRTCSignal,
} from '../types';

export type MultiplayerEventListener = {
  onRoomCreated?: (data: { roomCode: string; playerId: string; sessionToken: string; room: MultiplayerRoom }) => void;
  onRoomJoined?: (data: { roomCode: string; playerId: string; sessionToken: string; room: MultiplayerRoom }) => void;
  onRoomUpdated?: (room: MultiplayerRoom) => void;
  onGameStarted?: (data: { room: MultiplayerRoom; gameState: ServerGameState }) => void;
  onStateUpdate?: (gameState: ServerGameState) => void;
  onChatMessage?: (message: ChatMessage) => void;
  onEmote?: (emote: QuickEmote) => void;
  onPlayerDisconnected?: (data: { playerId: string; playerName: string }) => void;
  onPlayerReconnected?: (data: { playerId: string; playerName: string }) => void;
  onError?: (error: string) => void;
  onConnectionChange?: (connected: boolean) => void;
};

export class MultiplayerClient {
  private static instance: MultiplayerClient;
  private ws: WebSocket | null = null;
  private listeners: Set<MultiplayerEventListener> = new Set();
  private pendingActions: ClientAction[] = [];
  public roomCode: string | null = null;
  public playerId: string | null = null;
  public sessionToken: string | null = null;
  public isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  public isVoiceMuted = false;
  public isVoiceActive = false;

  public static getInstance(): MultiplayerClient { if (!MultiplayerClient.instance) MultiplayerClient.instance = new MultiplayerClient(); return MultiplayerClient.instance; }
  private constructor() {
    try { this.roomCode = sessionStorage.getItem('tt_room_code'); this.playerId = sessionStorage.getItem('tt_player_id'); this.sessionToken = sessionStorage.getItem('tt_session_token'); } catch (_) {}
  }
  public addListener(listener: MultiplayerEventListener): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }

  public connect(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.ws?.readyState === WebSocket.OPEN) { this.isConnected = true; resolve(true); return; }
      if (this.ws?.readyState === WebSocket.CONNECTING) {
        const waitForOpen = () => { if (this.ws?.readyState === WebSocket.OPEN) { resolve(true); this.flushPendingActions(); } else if (this.ws?.readyState === WebSocket.CLOSED || this.ws?.readyState === WebSocket.CLOSING) resolve(false); else window.setTimeout(waitForOpen, 25); };
        waitForOpen();
        return;
      }
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      try { this.ws = new WebSocket(`${protocol}//${window.location.host}`); } catch { resolve(false); return; }
      this.ws.onopen = () => {
        this.isConnected = true; this.reconnectAttempts = 0; this.listeners.forEach((listener) => listener.onConnectionChange?.(true));
        if (this.roomCode && this.playerId && this.sessionToken) this.ws?.send(JSON.stringify({ type: 'RECONNECT', roomCode: this.roomCode, playerId: this.playerId, sessionToken: this.sessionToken }));
        this.flushPendingActions(); resolve(true);
      };
      this.ws.onmessage = (event) => { try { this.handleServerMessage(JSON.parse(event.data) as ServerMessage); } catch (error) { console.error('Failed to parse server message', error); } };
      this.ws.onclose = () => { this.isConnected = false; this.listeners.forEach((listener) => listener.onConnectionChange?.(false)); this.attemptReconnect(); };
      this.ws.onerror = () => { this.isConnected = false; this.listeners.forEach((listener) => listener.onConnectionChange?.(false)); };
    });
  }

  private flushPendingActions() {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    const actions = this.pendingActions.splice(0);
    actions.forEach((action) => this.ws?.send(JSON.stringify(action)));
  }
  private attemptReconnect() { if (this.reconnectAttempts < this.maxReconnectAttempts && this.roomCode && this.sessionToken) { this.reconnectAttempts += 1; window.setTimeout(() => void this.connect(), 1500 * Math.pow(1.5, this.reconnectAttempts)); } }
  public send(action: ClientAction) {
    if (this.ws?.readyState === WebSocket.OPEN) { this.ws.send(JSON.stringify(action)); return; }
    if (this.pendingActions.length < 20) this.pendingActions.push(action);
    void this.connect();
  }

  private handleServerMessage(message: ServerMessage) {
    switch (message.type) {
      case 'ROOM_CREATED': case 'ROOM_JOINED':
        this.roomCode = message.roomCode; this.playerId = message.playerId; this.sessionToken = message.sessionToken;
        try { sessionStorage.setItem('tt_room_code', message.roomCode); sessionStorage.setItem('tt_player_id', message.playerId); sessionStorage.setItem('tt_session_token', message.sessionToken); } catch (_) {}
        this.listeners.forEach((listener) => message.type === 'ROOM_CREATED' ? listener.onRoomCreated?.(message) : listener.onRoomJoined?.(message)); break;
      case 'ROOM_UPDATED': this.listeners.forEach((listener) => listener.onRoomUpdated?.(message.room)); break;
      case 'GAME_STARTED': this.listeners.forEach((listener) => listener.onGameStarted?.(message)); break;
      case 'STATE_UPDATE': this.listeners.forEach((listener) => listener.onStateUpdate?.(message.gameState)); break;
      case 'CHAT_MESSAGE': this.listeners.forEach((listener) => listener.onChatMessage?.(message.message)); break;
      case 'EMOTE_EVENT': this.listeners.forEach((listener) => listener.onEmote?.(message.emote)); break;
      case 'PLAYER_DISCONNECTED': this.listeners.forEach((listener) => listener.onPlayerDisconnected?.(message)); break;
      case 'PLAYER_RECONNECTED': this.listeners.forEach((listener) => listener.onPlayerReconnected?.(message)); break;
      case 'VOICE_SIGNAL': this.handleVoiceSignal(message.fromPlayerId, message.signal); break;
      case 'ERROR': this.listeners.forEach((listener) => listener.onError?.(message.message)); break;
    }
  }

  public createRoom(playerName: string, character: CharacterId) { this.send({ type: 'CREATE_ROOM', playerName, character }); }
  public joinRoom(roomCode: string, playerName: string, character?: CharacterId) { this.send({ type: 'JOIN_ROOM', roomCode, playerName, character }); }
  public setReady(ready: boolean) { this.send({ type: 'SET_READY', ready }); }
  public changeCharacter(character: CharacterId) { this.send({ type: 'CHANGE_CHARACTER', character }); }
  public updateSettings(settings: Partial<GameSettings>) { this.send({ type: 'UPDATE_SETTINGS', settings }); }
  public kickPlayer(playerId: string) { this.send({ type: 'KICK_PLAYER', playerId }); }
  public addBot(difficulty?: BotDifficulty, personality?: BotPersonality, name?: string) { this.send({ type: 'ADD_BOT', difficulty, personality, name }); }
  public removeBot(botId: string) { this.send({ type: 'REMOVE_BOT', botId }); }
  public startGame() { this.send({ type: 'START_GAME' }); }
  public rollOpeningRoll() { this.send({ type: 'OPENING_ROLL_ACTION' }); }
  public rollDice() { this.send({ type: 'ROLL_DICE' }); }
  public buyProperty(tileId: number) { this.send({ type: 'BUY_PROPERTY', tileId }); }
  public declineProperty(tileId: number) { this.send({ type: 'DECLINE_PROPERTY', tileId }); }
  public upgradeProperty(tileId: number) { this.send({ type: 'UPGRADE_PROPERTY', tileId }); }
  public mortgageProperty(tileId: number) { this.send({ type: 'MORTGAGE_PROPERTY', tileId }); }
  public unmortgageProperty(tileId: number) { this.send({ type: 'UNMORTGAGE_PROPERTY', tileId }); }
  public drawCard() { this.send({ type: 'DRAW_CARD' }); }
  public placeBid(amount: number) { this.send({ type: 'PLACE_BID', amount }); }
  public passAuction() { this.send({ type: 'PASS_AUCTION' }); }
  public proposeTrade(offer: TradeOffer) { this.send({ type: 'PROPOSE_TRADE', offer }); }
  public acceptTrade(tradeId: string) { this.send({ type: 'ACCEPT_TRADE', tradeId }); }
  public declineTrade(tradeId: string) { this.send({ type: 'DECLINE_TRADE', tradeId }); }
  public cancelTrade(tradeId: string) { this.send({ type: 'CANCEL_TRADE', tradeId }); }
  public endTurn() { this.send({ type: 'END_TURN' }); }
  public sendChat(text: string) { this.send({ type: 'SEND_CHAT', text }); }
  public sendEmote(emoji: string) { this.send({ type: 'SEND_EMOTE', emoji }); }
  public leaveRoom() { this.send({ type: 'LEAVE_ROOM' }); this.pendingActions = []; this.roomCode = null; this.playerId = null; this.sessionToken = null; try { sessionStorage.removeItem('tt_room_code'); sessionStorage.removeItem('tt_player_id'); sessionStorage.removeItem('tt_session_token'); } catch (_) {} this.cleanupVoice(); }
  public async enableVoice(): Promise<boolean> { try { if (!this.localStream) this.localStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false }); this.isVoiceActive = true; this.isVoiceMuted = false; return true; } catch (error) { console.warn('Microphone permission declined or unavailable', error); return false; } }
  public toggleMuteVoice(): boolean { if (!this.localStream) return true; this.isVoiceMuted = !this.isVoiceMuted; this.localStream.getAudioTracks().forEach((track) => { track.enabled = !this.isVoiceMuted; }); return this.isVoiceMuted; }
  public disableVoice() { this.cleanupVoice(); this.isVoiceActive = false; }
  private handleVoiceSignal(fromPlayerId: string, signal: WebRTCSignal) { if (signal.candidate && this.peerConnections.has(fromPlayerId)) void this.peerConnections.get(fromPlayerId)?.addIceCandidate(new RTCIceCandidate(signal.candidate)); }
  private cleanupVoice() { this.localStream?.getTracks().forEach((track) => track.stop()); this.localStream = null; this.peerConnections.forEach((connection) => connection.close()); this.peerConnections.clear(); }
}

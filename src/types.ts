export type TileType =
  | 'property'
  | 'station'
  | 'utility'
  | 'tax'
  | 'event'
  | 'community'
  | 'start'
  | 'rest'
  | 'detention'
  | 'go-to-detention';

export type PropertyGroupColor =
  | 'amber'
  | 'cyan'
  | 'rose'
  | 'orange'
  | 'crimson'
  | 'emerald'
  | 'violet'
  | 'indigo'
  | 'teal'
  | 'slate';

export interface BoardTile {
  id: number;
  name: string;
  type: TileType;
  group?: PropertyGroupColor;
  cost?: number;
  rent?: number[];
  houseCost?: number;
  mortgageValue?: number;
  taxAmount?: number;
  description?: string;
}

export type CharacterId =
  | 'duck' | 'cat' | 'penguin' | 'frog' | 'pizza' | 'coffee' | 'robot'
  | 'dino' | 'car' | 'rocket' | 'chest' | 'mushroom' | 'balloon' | 'crown';

export interface CharacterDef { id: CharacterId; name: string; tagline: string; emoji: string; color: string; }
export type BotDifficulty = 'easy' | 'normal' | 'hard' | 'expert';
export type VoiceState = 'quiet' | 'connecting' | 'connected' | 'speaking' | 'muted' | 'disconnecting' | 'disconnected' | 'error';
export type VoiceStatus = VoiceState;

export interface Player {
  id: string; name: string; isAI: boolean; isBot?: boolean; color: string; character: CharacterId;
  balance: number; position: number; inDetention: boolean; detentionTurns: number; detentionPasses: number;
  freePasses?: number; bankrupt: boolean; difficulty?: BotDifficulty; voiceState: VoiceState;
  isHost?: boolean; lapCount?: number; openingRoll?: number; ready?: boolean;
}

export interface PropertyOwnership { ownerId: string | null; houses: number; isMortgaged: boolean; }
export type OwnershipMap = Record<number, PropertyOwnership>;
export type GameMode = 'classic' | 'quick' | 'long' | 'chaos' | 'auction' | 'lucky-break' | 'bad-luck' | 'risk-reward' | 'survival' | 'party' | 'wild-board' | 'random' | 'friendly' | 'high-stakes';
export type ChaosLevel = 'low' | 'medium' | 'high' | 'extreme';
export type BoardSize = 'small' | 'standard' | 'large' | 'huge';
export type BoardTheme = 'classic-town' | 'seaside' | 'countryside' | 'winter-town' | 'festival-town' | 'old-town' | 'island' | 'mountain-town';

export interface GameSettings {
  mode: GameMode; gameMode?: GameMode; boardSize: BoardSize; boardName: string; theme: BoardTheme; boardTheme?: BoardTheme;
  difficulty: BotDifficulty; botDifficulty?: BotDifficulty; playerLimit: number; startingMoney: number; turnTimer: number;
  auctionsEnabled: boolean; tradingEnabled: boolean; voiceEnabled: boolean; reducedMotion: boolean;
  cameraMode: 'perspective' | 'top-down'; soundVolume: number; sfxVolume?: number; voiceVolume: number; sfxEnabled?: boolean;
  chaosLevel?: ChaosLevel; lapEventFrequency?: number; eventFrequency?: 'normal' | 'frequent' | 'extreme';
  quickChatEnabled?: boolean; emotesEnabled?: boolean; fillWithBots?: boolean; masterVolume?: number;
  uiVolume?: number; gameplayVolume?: number;
}

export type GamePhase = 'lobby' | 'opening-roll' | 'ready-to-roll' | 'rolling' | 'moving' | 'action-required' | 'auction' | 'card-choice' | 'turn-end' | 'game-over';

export interface GameLogEntry {
  id: string; text: string;
  type: 'roll' | 'buy' | 'rent' | 'card' | 'detention' | 'money' | 'build' | 'trade' | 'auction' | 'bankruptcy' | 'social' | 'chaos' | 'info';
  timestamp: string;
}

export type CardCategory = 'good' | 'bad' | 'neutral' | 'chaos';
export type CardRarity = 'common' | 'uncommon' | 'rare' | 'chaos';
export interface Card {
  id: string; deck: 'event' | 'community'; title: string; description: string; category: CardCategory; rarity: CardRarity;
  actionType: 'move-to' | 'move-spaces' | 'collect' | 'pay' | 'free-pass' | 'go-detention' | 'repairs' | 'collect-from-players' | 'pay-players' | 'nearest-station' | 'nearest-utility' | 'swap-positions' | 'free-upgrade' | 'rent-storm' | 'player-choice-pay' | 'player-choice-swap';
  value?: number; targetTileId?: number; houseFee?: number; hotelFee?: number; requiresPlayerChoice?: boolean;
}

export interface TradeOffer { fromPlayerId: string; toPlayerId: string; offeredMoney: number; offeredTileIds: number[]; requestedMoney: number; requestedTileIds: number[]; }

export interface AuctionBid {
  playerId: string;
  amount: number;
  time: string;
}

export interface AuctionState {
  active: boolean;
  tileId: number;
  currentBid: number;
  highestBidderId: string | null;
  currentBidderId: string | null;
  currentBidderIndex: number;
  timeLeft: number;
  bidders: string[];
  passedPlayerIds: string[];
  history: AuctionBid[];
}

export interface QuickEmote { id: string; playerId: string; emoji: string; text?: string; timestamp: number; }
export interface MatchStats {
  winner: Player; turnsPlayed: number; durationMinutes: number; mostPropertiesPlayer: { name: string; count: number };
  highestRentPaid: { payer: string; receiver: string; amount: number }; mostLuckyCards: { name: string; count: number }; totalBankruptcies: number;
}
export interface ChatMessage { id: string; senderId: string; senderName: string; senderColor: string; senderEmoji?: string; text: string; timestamp: string; isSystem?: boolean; }
export interface OpeningRollRecord { playerId: string; name: string; character: CharacterId; color: string; roll: number; }
export interface OpeningRollState { active: boolean; rolls: Record<string, number>; tiedPlayerIds: string[]; winnerId: string | null; history: OpeningRollRecord[]; isComplete: boolean; }

export interface ServerGameState {
  players: Player[]; activePlayerIndex: number; ownership: OwnershipMap; dice: [number, number]; isRolling: boolean; gamePhase: GamePhase;
  doublesCount: number; rollSummary: string | null; drawnCard: Card | null; pendingRent: { amount: number; recipientId: string } | null;
  pendingTax: number | null; canBuyProperty: boolean; winner: Player | null; logs: GameLogEntry[]; roundNumber: number;
  turnTimer: number; auction: AuctionState | null;
  activeTrades: (TradeOffer & { id: string; status: 'pending' | 'accepted' | 'declined' | 'cancelled' })[];
  openingRoll: OpeningRollState | null;
}

export interface MultiplayerRoom { code: string; hostId: string; playerLimit: number; status: 'lobby' | 'opening-roll' | 'playing' | 'ended'; settings: GameSettings; players: Player[]; gameState?: ServerGameState; createdAt: number; }

export interface WebRTCSignal {
  type: 'offer' | 'answer' | 'candidate' | 'close';
  sdp?: string;
  candidate?: RTCIceCandidateInit;
  reason?: string;
}

export type ClientAction =
  | { type: 'CREATE_ROOM'; playerName: string; character: CharacterId }
  | { type: 'JOIN_ROOM'; roomCode: string; playerName: string; character?: CharacterId }
  | { type: 'LEAVE_ROOM' }
  | { type: 'SET_READY'; ready: boolean }
  | { type: 'CHANGE_CHARACTER'; character: CharacterId }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<GameSettings> }
  | { type: 'KICK_PLAYER'; playerId: string }
  | { type: 'ADD_BOT'; difficulty?: BotDifficulty; name?: string }
  | { type: 'REMOVE_BOT'; botId: string }
  | { type: 'START_GAME' }
  | { type: 'OPENING_ROLL_ACTION' }
  | { type: 'ROLL_DICE' }
  | { type: 'BUY_PROPERTY'; tileId: number }
  | { type: 'DECLINE_PROPERTY'; tileId: number }
  | { type: 'UPGRADE_PROPERTY'; tileId: number }
  | { type: 'MORTGAGE_PROPERTY'; tileId: number }
  | { type: 'UNMORTGAGE_PROPERTY'; tileId: number }
  | { type: 'PAY_DETENTION_FINE' }
  | { type: 'USE_DETENTION_PASS' }
  | { type: 'DRAW_CARD' }
  | { type: 'START_AUCTION'; tileId: number }
  | { type: 'PLACE_BID'; amount: number }
  | { type: 'PASS_AUCTION' }
  | { type: 'PROPOSE_TRADE'; offer: TradeOffer }
  | { type: 'ACCEPT_TRADE'; tradeId: string }
  | { type: 'DECLINE_TRADE'; tradeId: string }
  | { type: 'CANCEL_TRADE'; tradeId: string }
  | { type: 'END_TURN' }
  | { type: 'SEND_CHAT'; text: string }
  | { type: 'SEND_EMOTE'; emoji: string }
  | { type: 'VOICE_SIGNAL'; targetPlayerId: string; signal: WebRTCSignal }
  | { type: 'RECONNECT'; roomCode: string; playerId: string; sessionToken: string };

export type ServerMessage =
  | { type: 'ROOM_CREATED'; roomCode: string; playerId: string; sessionToken: string; room: MultiplayerRoom }
  | { type: 'ROOM_JOINED'; roomCode: string; playerId: string; sessionToken: string; room: MultiplayerRoom }
  | { type: 'ROOM_UPDATED'; room: MultiplayerRoom }
  | { type: 'GAME_STARTED'; room: MultiplayerRoom; gameState: ServerGameState }
  | { type: 'STATE_UPDATE'; gameState: ServerGameState }
  | { type: 'PLAYER_DISCONNECTED'; playerId: string; playerName: string }
  | { type: 'PLAYER_RECONNECTED'; playerId: string; playerName: string }
  | { type: 'CHAT_MESSAGE'; message: ChatMessage }
  | { type: 'EMOTE_EVENT'; emote: QuickEmote }
  | { type: 'VOICE_SIGNAL'; fromPlayerId: string; signal: WebRTCSignal }
  | { type: 'ERROR'; message: string; code?: string };
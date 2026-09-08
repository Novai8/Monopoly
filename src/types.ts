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
  rent?: number[]; // [base, 1 house, 2 houses, 3 houses, 4 houses, hotel]
  houseCost?: number;
  mortgageValue?: number;
  taxAmount?: number;
  description?: string;
}

export type CharacterId =
  | 'duck'
  | 'cat'
  | 'penguin'
  | 'frog'
  | 'pizza'
  | 'coffee'
  | 'robot'
  | 'dino'
  | 'car'
  | 'rocket'
  | 'chest'
  | 'mushroom'
  | 'balloon'
  | 'crown';

export interface CharacterDef {
  id: CharacterId;
  name: string;
  tagline: string;
  emoji: string;
  color: string;
}

export type BotDifficulty = 'easy' | 'normal' | 'hard' | 'expert';

export type VoiceState =
  | 'quiet'
  | 'connecting'
  | 'connected'
  | 'speaking'
  | 'muted'
  | 'disconnecting'
  | 'disconnected'
  | 'error';

export type VoiceStatus = VoiceState;

export interface Player {
  id: string;
  name: string;
  isAI: boolean;
  isBot?: boolean;
  color: string;
  character: CharacterId;
  balance: number;
  position: number;
  inDetention: boolean;
  detentionTurns: number;
  detentionPasses: number;
  freePasses?: number;
  bankrupt: boolean;
  difficulty?: BotDifficulty;
  voiceState: VoiceState;
  isHost?: boolean;
  lapCount?: number;
  openingRoll?: number;
  ready?: boolean;
}

export interface PropertyOwnership {
  ownerId: string | null;
  houses: number; // 0-4 houses, 5 = hotel
  isMortgaged: boolean;
}

export type OwnershipMap = Record<number, PropertyOwnership>;

export type GameMode =
  | 'classic'
  | 'quick'
  | 'long'
  | 'chaos'
  | 'auction'
  | 'lucky-break'
  | 'bad-luck'
  | 'risk-reward'
  | 'survival'
  | 'party'
  | 'wild-board'
  | 'random'
  | 'friendly'
  | 'high-stakes';

export type ChaosLevel = 'low' | 'medium' | 'high' | 'extreme';

export type BoardSize = 'small' | 'standard' | 'large' | 'huge';

export type BoardTheme =
  | 'classic-town'
  | 'seaside'
  | 'countryside'
  | 'winter-town'
  | 'festival-town'
  | 'old-town'
  | 'island'
  | 'mountain-town';

export interface GameSettings {
  mode: GameMode;
  gameMode?: GameMode;
  boardSize: BoardSize;
  boardName: string;
  theme: BoardTheme;
  boardTheme?: BoardTheme;
  difficulty: BotDifficulty;
  botDifficulty?: BotDifficulty;
  playerLimit: number; // 2-10
  startingMoney: number;
  turnTimer: number; // 0 = off, 30, 45, 60
  auctionsEnabled: boolean;
  tradingEnabled: boolean;
  voiceEnabled: boolean;
  reducedMotion: boolean;
  cameraMode: 'perspective' | 'top-down';
  soundVolume: number;
  sfxVolume?: number;
  voiceVolume: number;
  sfxEnabled?: boolean;
  chaosLevel?: ChaosLevel;
  lapEventFrequency?: number; // 0 = disabled, 2, 3, 4, 5 laps
  eventFrequency?: 'normal' | 'frequent' | 'extreme';
  quickChatEnabled?: boolean;
  emotesEnabled?: boolean;
  masterVolume?: number;
  uiVolume?: number;
  gameplayVolume?: number;
}

export type GamePhase =
  | 'lobby'
  | 'opening-roll'
  | 'ready-to-roll'
  | 'rolling'
  | 'moving'
  | 'action-required'
  | 'auction'
  | 'card-choice'
  | 'turn-end'
  | 'game-over';

export interface GameLogEntry {
  id: string;
  text: string;
  type:
    | 'roll'
    | 'buy'
    | 'rent'
    | 'card'
    | 'detention'
    | 'money'
    | 'build'
    | 'trade'
    | 'auction'
    | 'bankruptcy'
    | 'social'
    | 'chaos'
    | 'info';
  timestamp: string;
}

export type CardCategory = 'good' | 'bad' | 'neutral' | 'chaos';
export type CardRarity = 'common' | 'uncommon' | 'rare' | 'chaos';

export interface Card {
  id: string;
  deck: 'event' | 'community';
  title: string;
  description: string;
  category: CardCategory;
  rarity: CardRarity;
  actionType:
    | 'move-to'
    | 'move-spaces'
    | 'collect'
    | 'pay'
    | 'free-pass'
    | 'go-detention'
    | 'repairs'
    | 'collect-from-players'
    | 'pay-players'
    | 'nearest-station'
    | 'nearest-utility'
    | 'swap-positions'
    | 'free-upgrade'
    | 'rent-storm'
    | 'player-choice-pay'
    | 'player-choice-swap';
  value?: number;
  targetTileId?: number;
  houseFee?: number;
  hotelFee?: number;
  requiresPlayerChoice?: boolean;
}

export interface TradeOffer {
  fromPlayerId: string;
  toPlayerId: string;
  offeredMoney: number;
  offeredTileIds: number[];
  requestedMoney: number;
  requestedTileIds: number[];
}

export interface AuctionState {
  active: boolean;
  tileId: number;
  currentBid: number;
  highestBidderId: string | null;
  timeLeft: number; // in seconds
  bidders: string[];
  passedPlayerIds?: string[];
  history: {
    playerId: string;
    amount: number;
    time: string;
  }[];
}

export interface QuickEmote {
  id: string;
  playerId: string;
  emoji: string;
  text?: string;
  timestamp: number;
}

export interface MatchStats {
  winner: Player;
  turnsPlayed: number;
  durationMinutes: number;
  mostPropertiesPlayer: { name: string; count: number };
  highestRentPaid: { payer: string; receiver: string; amount: number };
  mostLuckyCards: { name: string; count: number };
  totalBankruptcies: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  senderEmoji?: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

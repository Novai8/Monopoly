import { BoardSize, BoardTheme, BoardTile, PropertyGroupColor } from '../types';

export interface GroupMeta {
  name: string;
  hex: string;
  lightHex: string;
}

export const PROPERTY_GROUPS: Record<PropertyGroupColor, GroupMeta> = {
  amber: { name: 'Brown', hex: '#8b4513', lightHex: '#a0522d' },
  cyan: { name: 'Light Blue', hex: '#0284c7', lightHex: '#38bdf8' },
  rose: { name: 'Pink', hex: '#be185d', lightHex: '#f43f5e' },
  orange: { name: 'Orange', hex: '#c2410c', lightHex: '#fb923c' },
  crimson: { name: 'Red', hex: '#b91c1c', lightHex: '#f87171' },
  violet: { name: 'Yellow', hex: '#ca8a04', lightHex: '#facc15' },
  emerald: { name: 'Green', hex: '#15803d', lightHex: '#4ade80' },
  indigo: { name: 'Dark Blue', hex: '#1e3a8a', lightHex: '#60a5fa' },
  teal: { name: 'Aqua', hex: '#0f766e', lightHex: '#2dd4bf' },
  slate: { name: 'Charcoal', hex: '#334155', lightHex: '#94a3b8' },
};

export const BOARD_NAMES = [
  'Atlantic Boardwalk',
  'Classic Metropolis',
  'Riverside Promenade',
  'Seaside Harbor',
  'Golden Countryside',
  'Old Town Square',
  'Winter Glade',
  'Carnival Fair',
  'Tropical Cove',
  'Alpine Summit',
];

export interface ThemeConfig {
  id: BoardTheme;
  name: string;
  description: string;
  boardBg: string;        // Screen / surrounding table color
  boardSurface: string;   // Board background
  boardBorder: string;    // Outer board border
  tileBg: string;         // Tile face background
  tileBgHover: string;    // Tile hover
  tileBorder: string;     // Tile border lines
  centerBg: string;       // Center area background
  centerBadgeBg: string;  // Center logo badge background
  accentColor: string;    // Primary accent
  accentGlow: string;     // Glow/shadow color
  gridLineColor: string;  // Sub-grid lines
  textColor: string;      // Main tile text
  textMuted: string;      // Muted tile text
  icon: string;           // Theme icon emoji
  environment: string;
  cornerGoBg: string;
  cornerJailBg: string;
  cornerParkingBg: string;
  cornerGoToJailBg: string;
}

export const BOARD_THEMES: Record<BoardTheme, ThemeConfig> = {
  'classic-town': {
    id: 'classic-town',
    name: 'Classic Town',
    description: 'Traditional rich mahogany table, ivory parchment tiles, brass trim, and timeless board feel.',
    boardBg: '#1c1917',
    boardSurface: '#292524',
    boardBorder: '#78350f',
    tileBg: '#fefce8',
    tileBgHover: '#fef08a',
    tileBorder: '#ca8a04',
    centerBg: '#231f1d',
    centerBadgeBg: '#451a03',
    accentColor: '#f59e0b',
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    gridLineColor: '#57534e',
    textColor: '#1c1917',
    textMuted: '#57534e',
    icon: '🏛️',
    environment: 'urban-cozy',
    cornerGoBg: '#fef3c7',
    cornerJailBg: '#f5f5f4',
    cornerParkingBg: '#fef3c7',
    cornerGoToJailBg: '#fee2e2',
  },
  seaside: {
    id: 'seaside',
    name: 'Seaside Resort',
    description: 'Crisp nautical ocean teal, sun-bleached boardwalk planks, seafoam borders, and coastal breeze.',
    boardBg: '#082f49',
    boardSurface: '#075985',
    boardBorder: '#0284c7',
    tileBg: '#f0f9ff',
    tileBgHover: '#e0f2fe',
    tileBorder: '#38bdf8',
    centerBg: '#0c4a6e',
    centerBadgeBg: '#0369a1',
    accentColor: '#38bdf8',
    accentGlow: 'rgba(56, 189, 248, 0.35)',
    gridLineColor: '#0284c7',
    textColor: '#082f49',
    textMuted: '#0369a1',
    icon: '🌊',
    environment: 'coastal',
    cornerGoBg: '#e0f2fe',
    cornerJailBg: '#f1f5f9',
    cornerParkingBg: '#e0f2fe',
    cornerGoToJailBg: '#ffe4e6',
  },
  countryside: {
    id: 'countryside',
    name: 'Golden Countryside',
    description: 'Lush meadow green, golden harvest wheat accents, rustic timber fencing, and rolling pastures.',
    boardBg: '#142e1b',
    boardSurface: '#1c4524',
    boardBorder: '#4d7c0f',
    tileBg: '#f7fee7',
    tileBgHover: '#ecfccb',
    tileBorder: '#84cc16',
    centerBg: '#1b3b21',
    centerBadgeBg: '#365314',
    accentColor: '#a3e635',
    accentGlow: 'rgba(163, 230, 53, 0.3)',
    gridLineColor: '#365314',
    textColor: '#142e1b',
    textMuted: '#3f6212',
    icon: '🌾',
    environment: 'rural',
    cornerGoBg: '#ecfccb',
    cornerJailBg: '#f4f4f5',
    cornerParkingBg: '#ecfccb',
    cornerGoToJailBg: '#fef2f2',
  },
  'winter-town': {
    id: 'winter-town',
    name: 'Winter Wonderland',
    description: 'Glacial frosted midnight blue, crystalline ice borders, snowdrift tiles, and cozy glowing hearths.',
    boardBg: '#090d16',
    boardSurface: '#0f172a',
    boardBorder: '#38bdf8',
    tileBg: '#f8fafc',
    tileBgHover: '#e2e8f0',
    tileBorder: '#93c5fd',
    centerBg: '#1e293b',
    centerBadgeBg: '#1e3a8a',
    accentColor: '#60a5fa',
    accentGlow: 'rgba(96, 165, 250, 0.4)',
    gridLineColor: '#334155',
    textColor: '#0f172a',
    textMuted: '#475569',
    icon: '❄️',
    environment: 'snow',
    cornerGoBg: '#e0f2fe',
    cornerJailBg: '#f1f5f9',
    cornerParkingBg: '#e0f2fe',
    cornerGoToJailBg: '#fee2e2',
  },
  'festival-town': {
    id: 'festival-town',
    name: 'Festival Fair',
    description: 'Vibrant carnival violet, golden celebratory bunting, carousel lights, and energetic street festivities.',
    boardBg: '#240a34',
    boardSurface: '#3b0764',
    boardBorder: '#d946ef',
    tileBg: '#fdf4ff',
    tileBgHover: '#fae8ff',
    tileBorder: '#e879f9',
    centerBg: '#4a044e',
    centerBadgeBg: '#701a75',
    accentColor: '#f43f5e',
    accentGlow: 'rgba(244, 63, 94, 0.4)',
    gridLineColor: '#6b21a8',
    textColor: '#3b0764',
    textMuted: '#86198f',
    icon: '🎪',
    environment: 'carnival',
    cornerGoBg: '#fae8ff',
    cornerJailBg: '#f4f4f5',
    cornerParkingBg: '#fae8ff',
    cornerGoToJailBg: '#ffe4e6',
  },
  'old-town': {
    id: 'old-town',
    name: 'Historic Old Town',
    description: 'Antique sepia cobblestones, gas-lamp copper borders, weathered parchment tiles, and clock tower heritage.',
    boardBg: '#181512',
    boardSurface: '#241e19',
    boardBorder: '#b45309',
    tileBg: '#fef3c7',
    tileBgHover: '#fde68a',
    tileBorder: '#d97706',
    centerBg: '#2c221b',
    centerBadgeBg: '#451a03',
    accentColor: '#d97706',
    accentGlow: 'rgba(217, 119, 6, 0.35)',
    gridLineColor: '#574838',
    textColor: '#241e19',
    textMuted: '#78350f',
    icon: '🕰️',
    environment: 'historic',
    cornerGoBg: '#fde68a',
    cornerJailBg: '#e7e5e4',
    cornerParkingBg: '#fde68a',
    cornerGoToJailBg: '#fed7aa',
  },
  island: {
    id: 'island',
    name: 'Tropical Atoll',
    description: 'Turquoise ocean lagoon, bamboo boardwalk tiles, coral reef accents, and swaying palm fronds.',
    boardBg: '#022c22',
    boardSurface: '#044e3e',
    boardBorder: '#14b8a6',
    tileBg: '#f0fdfa',
    tileBgHover: '#ccfbf1',
    tileBorder: '#2dd4bf',
    centerBg: '#064e3b',
    centerBadgeBg: '#115e59',
    accentColor: '#2dd4bf',
    accentGlow: 'rgba(45, 212, 191, 0.4)',
    gridLineColor: '#134e4a',
    textColor: '#022c22',
    textMuted: '#0f766e',
    icon: '🏝️',
    environment: 'tropical',
    cornerGoBg: '#ccfbf1',
    cornerJailBg: '#f1f5f9',
    cornerParkingBg: '#ccfbf1',
    cornerGoToJailBg: '#ffe4e6',
  },
  'mountain-town': {
    id: 'mountain-town',
    name: 'Alpine Heights',
    description: 'Granite mountain peaks, pine needle evergreen frames, crisp timber lodge tiles, and scenic heights.',
    boardBg: '#0f172a',
    boardSurface: '#1e293b',
    boardBorder: '#818cf8',
    tileBg: '#f1f5f9',
    tileBgHover: '#e2e8f0',
    tileBorder: '#a5b4fc',
    centerBg: '#26334d',
    centerBadgeBg: '#312e81',
    accentColor: '#a78bfa',
    accentGlow: 'rgba(167, 139, 250, 0.35)',
    gridLineColor: '#475569',
    textColor: '#0f172a',
    textMuted: '#475569',
    icon: '🏔️',
    environment: 'mountain',
    cornerGoBg: '#e0e7ff',
    cornerJailBg: '#f1f5f9',
    cornerParkingBg: '#e0e7ff',
    cornerGoToJailBg: '#fee2e2',
  },
};

export const generateBoard = (size: BoardSize, _theme?: BoardTheme): BoardTile[] => {
  return generateBoardTiles(size);
};

// Generates classic property-trading boards
export function generateBoardTiles(size: BoardSize): BoardTile[] {
  if (size === 'small') {
    // 24 spaces (6 per side)
    return [
      { id: 0, name: 'GO', type: 'start', description: 'Collect $200 salary as you pass' },
      { id: 1, name: 'Baltic Avenue', type: 'property', group: 'amber', cost: 60, rent: [4, 20, 60, 180, 320, 450], houseCost: 50, mortgageValue: 30 },
      { id: 2, name: 'Community Chest', type: 'community', description: 'Draw a Community Chest Card' },
      { id: 3, name: 'Oriental Avenue', type: 'property', group: 'cyan', cost: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, mortgageValue: 50 },
      { id: 4, name: 'Reading Railroad', type: 'station', cost: 200, mortgageValue: 100, description: 'Collect $25-100 railroad revenue' },
      { id: 5, name: 'Connecticut Avenue', type: 'property', group: 'cyan', cost: 120, rent: [8, 40, 100, 300, 450, 600], houseCost: 50, mortgageValue: 60 },
      // Corner 1: Jail (Tile 6)
      { id: 6, name: 'Jail', type: 'detention', description: 'Just Visiting or In Jail' },
      { id: 7, name: 'St. Charles Place', type: 'property', group: 'rose', cost: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, mortgageValue: 70 },
      { id: 8, name: 'Chance', type: 'event', description: 'Draw a Chance Card' },
      { id: 9, name: 'New York Avenue', type: 'property', group: 'orange', cost: 200, rent: [16, 80, 220, 600, 800, 1000], houseCost: 100, mortgageValue: 100 },
      { id: 10, name: 'Electric Company', type: 'utility', cost: 150, mortgageValue: 75, description: 'Rent is 4x or 10x dice roll' },
      { id: 11, name: 'Tennessee Avenue', type: 'property', group: 'orange', cost: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, mortgageValue: 90 },
      // Corner 2: Free Parking (Tile 12)
      { id: 12, name: 'Free Parking', type: 'rest', description: 'Rest with no penalty' },
      { id: 13, name: 'Kentucky Avenue', type: 'property', group: 'crimson', cost: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, mortgageValue: 110 },
      { id: 14, name: 'Income Tax', type: 'tax', taxAmount: 100, description: 'Pay $100 Income Tax' },
      { id: 15, name: 'Illinois Avenue', type: 'property', group: 'crimson', cost: 240, rent: [20, 100, 300, 750, 925, 1100], houseCost: 150, mortgageValue: 120 },
      { id: 16, name: 'Pennsylvania Railroad', type: 'station', cost: 200, mortgageValue: 100, description: 'Collect $25-100 railroad revenue' },
      { id: 17, name: 'Atlantic Avenue', type: 'property', group: 'violet', cost: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, mortgageValue: 130 },
      // Corner 3: Go To Jail (Tile 18)
      { id: 18, name: 'Go To Jail', type: 'go-to-detention', description: 'Move directly to Jail' },
      { id: 19, name: 'Pacific Avenue', type: 'property', group: 'emerald', cost: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, mortgageValue: 150 },
      { id: 20, name: 'Community Chest', type: 'community', description: 'Draw a Community Chest Card' },
      { id: 21, name: 'Chance', type: 'event', description: 'Draw a Chance Card' },
      { id: 22, name: 'Park Place', type: 'property', group: 'indigo', cost: 350, rent: [35, 175, 500, 1100, 1300, 1500], houseCost: 200, mortgageValue: 175 },
      { id: 23, name: 'Boardwalk', type: 'property', group: 'indigo', cost: 400, rent: [50, 200, 600, 1400, 1700, 2000], houseCost: 200, mortgageValue: 200 },
    ];
  }

  if (size === 'standard') {
    // 32 spaces (8 per side)
    return [
      { id: 0, name: 'GO', type: 'start', description: 'Collect $200 salary as you pass' },
      { id: 1, name: 'Mediterranean Avenue', type: 'property', group: 'amber', cost: 60, rent: [2, 10, 30, 90, 160, 250], houseCost: 50, mortgageValue: 30 },
      { id: 2, name: 'Community Chest', type: 'community', description: 'Draw a Community Chest Card' },
      { id: 3, name: 'Baltic Avenue', type: 'property', group: 'amber', cost: 60, rent: [4, 20, 60, 180, 320, 450], houseCost: 50, mortgageValue: 30 },
      { id: 4, name: 'Income Tax', type: 'tax', taxAmount: 100, description: 'Pay $100 Income Tax' },
      { id: 5, name: 'Reading Railroad', type: 'station', cost: 200, mortgageValue: 100, description: 'Collect $25-100 per railroad owned' },
      { id: 6, name: 'Oriental Avenue', type: 'property', group: 'cyan', cost: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, mortgageValue: 50 },
      { id: 7, name: 'Chance', type: 'event', description: 'Draw a Chance Card' },
      // Corner 1: Jail (Tile 8)
      { id: 8, name: 'Jail', type: 'detention', description: 'Just Visiting or In Jail' },
      { id: 9, name: 'Vermont Avenue', type: 'property', group: 'cyan', cost: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, mortgageValue: 50 },
      { id: 10, name: 'Electric Company', type: 'utility', cost: 150, mortgageValue: 75, description: 'Rent is 4x or 10x dice roll' },
      { id: 11, name: 'St. Charles Place', type: 'property', group: 'rose', cost: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, mortgageValue: 70 },
      { id: 12, name: 'Virginia Avenue', type: 'property', group: 'rose', cost: 160, rent: [12, 60, 180, 500, 700, 900], houseCost: 100, mortgageValue: 80 },
      { id: 13, name: 'Pennsylvania Railroad', type: 'station', cost: 200, mortgageValue: 100, description: 'Collect $25-100 per railroad owned' },
      { id: 14, name: 'St. James Place', type: 'property', group: 'orange', cost: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, mortgageValue: 90 },
      { id: 15, name: 'Community Chest', type: 'community', description: 'Draw a Community Chest Card' },
      // Corner 2: Free Parking (Tile 16)
      { id: 16, name: 'Free Parking', type: 'rest', description: 'Rest without fees' },
      { id: 17, name: 'Tennessee Avenue', type: 'property', group: 'orange', cost: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, mortgageValue: 90 },
      { id: 18, name: 'New York Avenue', type: 'property', group: 'orange', cost: 200, rent: [16, 80, 220, 600, 800, 1000], houseCost: 100, mortgageValue: 100 },
      { id: 19, name: 'Chance', type: 'event', description: 'Draw a Chance Card' },
      { id: 20, name: 'Kentucky Avenue', type: 'property', group: 'crimson', cost: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, mortgageValue: 110 },
      { id: 21, name: 'Illinois Avenue', type: 'property', group: 'crimson', cost: 240, rent: [20, 100, 300, 750, 925, 1100], houseCost: 150, mortgageValue: 120 },
      { id: 22, name: 'B. & O. Railroad', type: 'station', cost: 200, mortgageValue: 100, description: 'Collect $25-100 per railroad owned' },
      { id: 23, name: 'Atlantic Avenue', type: 'property', group: 'violet', cost: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, mortgageValue: 130 },
      // Corner 3: Go To Jail (Tile 24)
      { id: 24, name: 'Go To Jail', type: 'go-to-detention', description: 'Move directly to Jail' },
      { id: 25, name: 'Marvin Gardens', type: 'property', group: 'violet', cost: 280, rent: [24, 120, 360, 850, 1025, 1200], houseCost: 150, mortgageValue: 140 },
      { id: 26, name: 'Water Works', type: 'utility', cost: 150, mortgageValue: 75, description: 'Rent is 4x or 10x dice roll' },
      { id: 27, name: 'Pacific Avenue', type: 'property', group: 'emerald', cost: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, mortgageValue: 150 },
      { id: 28, name: 'Pennsylvania Avenue', type: 'property', group: 'emerald', cost: 320, rent: [28, 150, 450, 1000, 1200, 1400], houseCost: 200, mortgageValue: 160 },
      { id: 29, name: 'Short Line Railroad', type: 'station', cost: 200, mortgageValue: 100, description: 'Collect $25-100 per railroad owned' },
      { id: 30, name: 'Luxury Tax', type: 'tax', taxAmount: 100, description: 'Pay $100 Luxury Tax' },
      { id: 31, name: 'Boardwalk', type: 'property', group: 'indigo', cost: 400, rent: [50, 200, 600, 1400, 1700, 2000], houseCost: 200, mortgageValue: 200 },
    ];
  }

  if (size === 'huge') {
    // 48 spaces (12 per side)
    return [
      { id: 0, name: 'GO', type: 'start', description: 'Collect $200 salary as you pass' },
      { id: 1, name: 'Mediterranean Avenue', type: 'property', group: 'amber', cost: 60, rent: [2, 10, 30, 90, 160, 250], houseCost: 50, mortgageValue: 30 },
      { id: 2, name: 'Community Chest', type: 'community', description: 'Draw a Community Chest Card' },
      { id: 3, name: 'Baltic Avenue', type: 'property', group: 'amber', cost: 60, rent: [4, 20, 60, 180, 320, 450], houseCost: 50, mortgageValue: 30 },
      { id: 4, name: 'Income Tax', type: 'tax', taxAmount: 200, description: 'Pay $200 Income Tax' },
      { id: 5, name: 'Reading Railroad', type: 'station', cost: 200, mortgageValue: 100, description: 'Railroad transit income' },
      { id: 6, name: 'Oriental Avenue', type: 'property', group: 'cyan', cost: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, mortgageValue: 50 },
      { id: 7, name: 'Chance', type: 'event', description: 'Draw a Chance Card' },
      { id: 8, name: 'Vermont Avenue', type: 'property', group: 'cyan', cost: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, mortgageValue: 50 },
      { id: 9, name: 'Connecticut Avenue', type: 'property', group: 'cyan', cost: 120, rent: [8, 40, 100, 300, 450, 600], houseCost: 50, mortgageValue: 60 },
      { id: 10, name: 'Electric Company', type: 'utility', cost: 150, mortgageValue: 75, description: 'Utility energy income' },
      { id: 11, name: 'St. Charles Place', type: 'property', group: 'rose', cost: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, mortgageValue: 70 },
      // Corner 1: Jail (Tile 12)
      { id: 12, name: 'Jail', type: 'detention', description: 'Just Visiting or In Jail' },
      { id: 13, name: 'States Avenue', type: 'property', group: 'rose', cost: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, mortgageValue: 70 },
      { id: 14, name: 'Virginia Avenue', type: 'property', group: 'rose', cost: 160, rent: [12, 60, 180, 500, 700, 900], houseCost: 100, mortgageValue: 80 },
      { id: 15, name: 'Pennsylvania Railroad', type: 'station', cost: 200, mortgageValue: 100, description: 'Railroad transit income' },
      { id: 16, name: 'St. James Place', type: 'property', group: 'orange', cost: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, mortgageValue: 90 },
      { id: 17, name: 'Community Chest', type: 'community', description: 'Draw a Community Chest Card' },
      { id: 18, name: 'Tennessee Avenue', type: 'property', group: 'orange', cost: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, mortgageValue: 90 },
      { id: 19, name: 'New York Avenue', type: 'property', group: 'orange', cost: 200, rent: [16, 80, 220, 600, 800, 1000], houseCost: 100, mortgageValue: 100 },
      { id: 20, name: 'Water Works', type: 'utility', cost: 150, mortgageValue: 75, description: 'Utility water income' },
      { id: 21, name: 'Ocean Way', type: 'property', group: 'teal', cost: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 100, mortgageValue: 110 },
      { id: 22, name: 'Coral Drive', type: 'property', group: 'teal', cost: 240, rent: [20, 100, 300, 750, 925, 1100], houseCost: 100, mortgageValue: 120 },
      { id: 23, name: 'Chance', type: 'event', description: 'Draw a Chance Card' },
      // Corner 2: Free Parking (Tile 24)
      { id: 24, name: 'Free Parking', type: 'rest', description: 'Rest without fees' },
      { id: 25, name: 'Kentucky Avenue', type: 'property', group: 'crimson', cost: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, mortgageValue: 110 },
      { id: 26, name: 'Indiana Avenue', type: 'property', group: 'crimson', cost: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, mortgageValue: 110 },
      { id: 27, name: 'Illinois Avenue', type: 'property', group: 'crimson', cost: 240, rent: [20, 100, 300, 750, 925, 1100], houseCost: 150, mortgageValue: 120 },
      { id: 28, name: 'B. & O. Railroad', type: 'station', cost: 200, mortgageValue: 100, description: 'Railroad transit income' },
      { id: 29, name: 'Atlantic Avenue', type: 'property', group: 'violet', cost: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, mortgageValue: 130 },
      { id: 30, name: 'Ventnor Avenue', type: 'property', group: 'violet', cost: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, mortgageValue: 130 },
      { id: 31, name: 'Marvin Gardens', type: 'property', group: 'violet', cost: 280, rent: [24, 120, 360, 850, 1025, 1200], houseCost: 150, mortgageValue: 140 },
      { id: 32, name: 'Windmill Energy', type: 'utility', cost: 150, mortgageValue: 75, description: 'Utility wind income' },
      { id: 33, name: 'Pacific Avenue', type: 'property', group: 'emerald', cost: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, mortgageValue: 150 },
      { id: 34, name: 'North Carolina Avenue', type: 'property', group: 'emerald', cost: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, mortgageValue: 150 },
      { id: 35, name: 'Pennsylvania Avenue', type: 'property', group: 'emerald', cost: 320, rent: [28, 150, 450, 1000, 1200, 1400], houseCost: 200, mortgageValue: 160 },
      // Corner 3: Go To Jail (Tile 36)
      { id: 36, name: 'Go To Jail', type: 'go-to-detention', description: 'Move directly to Jail' },
      { id: 37, name: 'Short Line Railroad', type: 'station', cost: 200, mortgageValue: 100, description: 'Railroad transit income' },
      { id: 38, name: 'Skyway Depot', type: 'station', cost: 200, mortgageValue: 100, description: 'Aerial transit income' },
      { id: 39, name: 'Community Chest', type: 'community', description: 'Draw a Community Chest Card' },
      { id: 40, name: 'Park Place', type: 'property', group: 'indigo', cost: 350, rent: [35, 175, 500, 1100, 1300, 1500], houseCost: 200, mortgageValue: 175 },
      { id: 41, name: 'Luxury Tax', type: 'tax', taxAmount: 100, description: 'Pay $100 Luxury Tax' },
      { id: 42, name: 'Chance', type: 'event', description: 'Draw a Chance Card' },
      { id: 43, name: 'Boardwalk', type: 'property', group: 'indigo', cost: 400, rent: [50, 200, 600, 1400, 1700, 2000], houseCost: 200, mortgageValue: 200 },
      { id: 44, name: 'Quarry Road', type: 'property', group: 'slate', cost: 420, rent: [55, 220, 650, 1500, 1800, 2100], houseCost: 250, mortgageValue: 210 },
      { id: 45, name: 'Community Chest', type: 'community', description: 'Draw a Community Chest Card' },
      { id: 46, name: 'Foundry Lane', type: 'property', group: 'slate', cost: 450, rent: [60, 250, 750, 1700, 2000, 2400], houseCost: 250, mortgageValue: 225 },
      { id: 47, name: 'Chance', type: 'event', description: 'Draw a Chance Card' },
    ];
  }

  // Default: 'large' (40 spaces - 10 per side - The Classic Board)
  return [
    { id: 0, name: 'GO', type: 'start', description: 'Collect $200 salary as you pass' },
    { id: 1, name: 'Mediterranean Avenue', type: 'property', group: 'amber', cost: 60, rent: [2, 10, 30, 90, 160, 250], houseCost: 50, mortgageValue: 30 },
    { id: 2, name: 'Community Chest', type: 'community', description: 'Draw a Community Chest Card' },
    { id: 3, name: 'Baltic Avenue', type: 'property', group: 'amber', cost: 60, rent: [4, 20, 60, 180, 320, 450], houseCost: 50, mortgageValue: 30 },
    { id: 4, name: 'Income Tax', type: 'tax', taxAmount: 200, description: 'Pay $200 Income Tax' },
    { id: 5, name: 'Reading Railroad', type: 'station', cost: 200, mortgageValue: 100, description: 'Collect $25-$200 based on railroads owned' },
    { id: 6, name: 'Oriental Avenue', type: 'property', group: 'cyan', cost: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, mortgageValue: 50 },
    { id: 7, name: 'Chance', type: 'event', description: 'Draw a Chance Card' },
    { id: 8, name: 'Vermont Avenue', type: 'property', group: 'cyan', cost: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, mortgageValue: 50 },
    { id: 9, name: 'Connecticut Avenue', type: 'property', group: 'cyan', cost: 120, rent: [8, 40, 100, 300, 450, 600], houseCost: 50, mortgageValue: 60 },

    // Corner 1: Jail (Tile 10)
    { id: 10, name: 'Jail', type: 'detention', description: 'Just Visiting or In Jail' },
    { id: 11, name: 'St. Charles Place', type: 'property', group: 'rose', cost: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, mortgageValue: 70 },
    { id: 12, name: 'Electric Company', type: 'utility', cost: 150, mortgageValue: 75, description: 'Rent is 4x or 10x dice roll' },
    { id: 13, name: 'States Avenue', type: 'property', group: 'rose', cost: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, mortgageValue: 70 },
    { id: 14, name: 'Virginia Avenue', type: 'property', group: 'rose', cost: 160, rent: [12, 60, 180, 500, 700, 900], houseCost: 100, mortgageValue: 80 },
    { id: 15, name: 'Pennsylvania Railroad', type: 'station', cost: 200, mortgageValue: 100, description: 'Collect $25-$200 based on railroads owned' },
    { id: 16, name: 'St. James Place', type: 'property', group: 'orange', cost: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, mortgageValue: 90 },
    { id: 17, name: 'Community Chest', type: 'community', description: 'Draw a Community Chest Card' },
    { id: 18, name: 'Tennessee Avenue', type: 'property', group: 'orange', cost: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, mortgageValue: 90 },
    { id: 19, name: 'New York Avenue', type: 'property', group: 'orange', cost: 200, rent: [16, 80, 220, 600, 800, 1000], houseCost: 100, mortgageValue: 100 },

    // Corner 2: Free Parking (Tile 20)
    { id: 20, name: 'Free Parking', type: 'rest', description: 'Rest without penalty' },
    { id: 21, name: 'Kentucky Avenue', type: 'property', group: 'crimson', cost: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, mortgageValue: 110 },
    { id: 22, name: 'Chance', type: 'event', description: 'Draw a Chance Card' },
    { id: 23, name: 'Indiana Avenue', type: 'property', group: 'crimson', cost: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, mortgageValue: 110 },
    { id: 24, name: 'Illinois Avenue', type: 'property', group: 'crimson', cost: 240, rent: [20, 100, 300, 750, 925, 1100], houseCost: 150, mortgageValue: 120 },
    { id: 25, name: 'B. & O. Railroad', type: 'station', cost: 200, mortgageValue: 100, description: 'Collect $25-$200 based on railroads owned' },
    { id: 26, name: 'Atlantic Avenue', type: 'property', group: 'violet', cost: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, mortgageValue: 130 },
    { id: 27, name: 'Ventnor Avenue', type: 'property', group: 'violet', cost: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, mortgageValue: 130 },
    { id: 28, name: 'Water Works', type: 'utility', cost: 150, mortgageValue: 75, description: 'Rent is 4x or 10x dice roll' },
    { id: 29, name: 'Marvin Gardens', type: 'property', group: 'violet', cost: 280, rent: [24, 120, 360, 850, 1025, 1200], houseCost: 150, mortgageValue: 140 },

    // Corner 3: Go To Jail (Tile 30)
    { id: 30, name: 'Go To Jail', type: 'go-to-detention', description: 'Move directly to Jail' },
    { id: 31, name: 'Pacific Avenue', type: 'property', group: 'emerald', cost: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, mortgageValue: 150 },
    { id: 32, name: 'North Carolina Avenue', type: 'property', group: 'emerald', cost: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, mortgageValue: 150 },
    { id: 33, name: 'Community Chest', type: 'community', description: 'Draw a Community Chest Card' },
    { id: 34, name: 'Pennsylvania Avenue', type: 'property', group: 'emerald', cost: 320, rent: [28, 150, 450, 1000, 1200, 1400], houseCost: 200, mortgageValue: 160 },
    { id: 35, name: 'Short Line Railroad', type: 'station', cost: 200, mortgageValue: 100, description: 'Collect $25-$200 based on railroads owned' },
    { id: 36, name: 'Chance', type: 'event', description: 'Draw a Chance Card' },
    { id: 37, name: 'Park Place', type: 'property', group: 'indigo', cost: 350, rent: [35, 175, 500, 1100, 1300, 1500], houseCost: 200, mortgageValue: 175 },
    { id: 38, name: 'Luxury Tax', type: 'tax', taxAmount: 100, description: 'Pay $100 Luxury Tax' },
    { id: 39, name: 'Boardwalk', type: 'property', group: 'indigo', cost: 400, rent: [50, 200, 600, 1400, 1700, 2000], houseCost: 200, mortgageValue: 200 },
  ];
}

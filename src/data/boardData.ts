import { BoardSize, BoardTheme, BoardTile, PropertyGroupColor } from '../types';

export interface GroupMeta {
  name: string;
  hex: string;
  lightHex: string;
}

export const PROPERTY_GROUPS: Record<PropertyGroupColor, GroupMeta> = {
  amber: { name: 'Old Quarter', hex: '#b45309', lightHex: '#f59e0b' },
  cyan: { name: 'River District', hex: '#0284c7', lightHex: '#38bdf8' },
  rose: { name: 'Garden District', hex: '#be185d', lightHex: '#f43f5e' },
  orange: { name: 'Market Center', hex: '#c2410c', lightHex: '#fb923c' },
  crimson: { name: 'Grand Avenue', hex: '#b91c1c', lightHex: '#f87171' },
  emerald: { name: 'Harbor Heights', hex: '#047857', lightHex: '#34d399' },
  violet: { name: 'Highland Hill', hex: '#6d28d9', lightHex: '#a78bfa' },
  indigo: { name: 'Crown Crest', hex: '#4338ca', lightHex: '#818cf8' },
  teal: { name: 'Bayside Way', hex: '#0f766e', lightHex: '#2dd4bf' },
  slate: { name: 'Mill Valley', hex: '#334155', lightHex: '#94a3b8' },
};

export const BOARD_NAMES = [
  'Sunny Town',
  'Riverside',
  'Maple City',
  'Green Valley',
  'Seaside Town',
  'Old Town',
  'Hillview',
  'Lakeside',
  'Garden City',
  'Harbor Town',
  'Pine Creek',
  'Meadowdale',
  'Stonehaven',
  'Amber Valley',
];

export interface ThemeConfig {
  id: BoardTheme;
  name: string;
  description: string;
  boardBg: string;
  centerBg: string;
  accentColor: string;
  gridLineColor: string;
  environment: string;
}

export const BOARD_THEMES: Record<BoardTheme, ThemeConfig> = {
  'classic-town': {
    id: 'classic-town',
    name: 'Classic Town',
    description: 'Warm cobblestones, cozy shops, tree-lined streets, and lively town center.',
    boardBg: '#1c1917',
    centerBg: '#292524',
    accentColor: '#f59e0b',
    gridLineColor: '#44403c',
    environment: 'urban-cozy',
  },
  seaside: {
    id: 'seaside',
    name: 'Seaside Resort',
    description: 'Golden sand beaches, boardwalk shops, ocean breezes, and harbor lighthouses.',
    boardBg: '#082f49',
    centerBg: '#0c4a6e',
    accentColor: '#38bdf8',
    gridLineColor: '#0369a1',
    environment: 'coastal',
  },
  countryside: {
    id: 'countryside',
    name: 'Golden Countryside',
    description: 'Rolling wheat fields, red timber barns, peaceful windmills, and farm stands.',
    boardBg: '#27272a',
    centerBg: '#3f3f46',
    accentColor: '#84cc16',
    gridLineColor: '#52525b',
    environment: 'rural',
  },
  'winter-town': {
    id: 'winter-town',
    name: 'Winter Wonderland',
    description: 'Snow-capped roofs, frosted pine trees, icy skating rinks, and warm hearths.',
    boardBg: '#0f172a',
    centerBg: '#1e293b',
    accentColor: '#93c5fd',
    gridLineColor: '#334155',
    environment: 'snow',
  },
  'festival-town': {
    id: 'festival-town',
    name: 'Festival Fair',
    description: 'Colorful street banners, festive food stalls, carnival lights, and merry bells.',
    boardBg: '#2e1065',
    centerBg: '#3b0764',
    accentColor: '#f43f5e',
    gridLineColor: '#581c87',
    environment: 'carnival',
  },
  'old-town': {
    id: 'old-town',
    name: 'Historic Old Town',
    description: 'Vintage brick facades, ancient clock towers, artisan markets, and copper lanterns.',
    boardBg: '#18181b',
    centerBg: '#27272a',
    accentColor: '#d97706',
    gridLineColor: '#3f3f46',
    environment: 'historic',
  },
  island: {
    id: 'island',
    name: 'Tropical Atoll',
    description: 'Turquoise lagoons, bamboo boardwalks, swaying palms, and hidden sea coves.',
    boardBg: '#042f2e',
    centerBg: '#115e59',
    accentColor: '#2dd4bf',
    gridLineColor: '#134e4a',
    environment: 'tropical',
  },
  'mountain-town': {
    id: 'mountain-town',
    name: 'Alpine Heights',
    description: 'Granite peaks, timber cabins, crisp alpine air, and scenic tramways.',
    boardBg: '#1e293b',
    centerBg: '#334155',
    accentColor: '#a78bfa',
    gridLineColor: '#475569',
    environment: 'mountain',
  },
};

export const generateBoard = (size: BoardSize, _theme?: BoardTheme): BoardTile[] => {
  return generateBoardTiles(size);
};

// Generates a balanced board configuration based on size (24, 32, 40, or 48 tiles)
export function generateBoardTiles(size: BoardSize): BoardTile[] {
  if (size === 'small') {
    // 24 spaces (6 per side)
    return [
      { id: 0, name: 'Town Square', type: 'start', description: 'Collect $200 salary as you pass' },
      { id: 1, name: 'Maple Street', type: 'property', group: 'amber', cost: 60, rent: [4, 20, 60, 180, 320, 450], houseCost: 50, mortgageValue: 30 },
      { id: 2, name: 'Town Council', type: 'community', description: 'Draw a Town Council Perk Card' },
      { id: 3, name: 'Oak Avenue', type: 'property', group: 'amber', cost: 80, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, mortgageValue: 40 },
      { id: 4, name: 'Transit Depot', type: 'station', cost: 150, mortgageValue: 75, description: 'Collect $25 per station owned' },
      { id: 5, name: 'Garden Road', type: 'property', group: 'cyan', cost: 100, rent: [8, 40, 100, 300, 450, 600], houseCost: 50, mortgageValue: 50 },
      // Corner 1: Detention
      { id: 6, name: 'Town Detention', type: 'detention', description: 'Visiting or Serving Time' },
      { id: 7, name: 'River Lane', type: 'property', group: 'cyan', cost: 120, rent: [10, 50, 150, 450, 625, 750], houseCost: 50, mortgageValue: 60 },
      { id: 8, name: 'Lucky Event', type: 'event', description: 'Draw a Lucky Event Card' },
      { id: 9, name: 'Market Street', type: 'property', group: 'orange', cost: 140, rent: [12, 60, 180, 500, 700, 900], houseCost: 100, mortgageValue: 70 },
      { id: 10, name: 'Solar Station', type: 'utility', cost: 120, mortgageValue: 60, description: 'Rent is 4x or 10x dice roll' },
      { id: 11, name: 'Copper Street', type: 'property', group: 'orange', cost: 160, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, mortgageValue: 80 },
      // Corner 2: Rest Park
      { id: 12, name: 'Central Park', type: 'rest', description: 'Relax without fees' },
      { id: 13, name: 'Pine Avenue', type: 'property', group: 'crimson', cost: 180, rent: [16, 80, 220, 600, 800, 1000], houseCost: 100, mortgageValue: 90 },
      { id: 14, name: 'Town Dues', type: 'tax', taxAmount: 100, description: 'Pay $100 town infrastructure fee' },
      { id: 15, name: 'Lakeside Walk', type: 'property', group: 'crimson', cost: 200, rent: [18, 90, 250, 700, 875, 1050], houseCost: 100, mortgageValue: 100 },
      { id: 16, name: 'Harbor Ferry', type: 'station', cost: 150, mortgageValue: 75, description: 'Collect $25 per station owned' },
      { id: 17, name: 'High Street', type: 'property', group: 'emerald', cost: 240, rent: [20, 100, 300, 750, 925, 1100], houseCost: 150, mortgageValue: 120 },
      // Corner 3: Go to Detention
      { id: 18, name: 'Officer Warning', type: 'go-to-detention', description: 'Move directly to Detention' },
      { id: 19, name: 'Harbor View', type: 'property', group: 'emerald', cost: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, mortgageValue: 130 },
      { id: 20, name: 'Town Council', type: 'community', description: 'Draw a Town Council Perk Card' },
      { id: 21, name: 'Lucky Event', type: 'event', description: 'Draw a Lucky Event Card' },
      { id: 22, name: 'Crown Terrace', type: 'property', group: 'indigo', cost: 320, rent: [28, 150, 450, 1000, 1200, 1400], houseCost: 200, mortgageValue: 160 },
      { id: 23, name: 'Diamond Plaza', type: 'property', group: 'indigo', cost: 350, rent: [35, 175, 500, 1100, 1300, 1500], houseCost: 200, mortgageValue: 175 },
    ];
  }

  if (size === 'standard') {
    // 32 spaces (8 per side)
    return [
      { id: 0, name: 'Town Square', type: 'start', description: 'Collect $200 salary as you pass' },
      { id: 1, name: 'Cobble Lane', type: 'property', group: 'amber', cost: 60, rent: [2, 10, 30, 90, 160, 250], houseCost: 50, mortgageValue: 30 },
      { id: 2, name: 'Town Council', type: 'community', description: 'Draw a Town Council Perk Card' },
      { id: 3, name: 'Maple Street', type: 'property', group: 'amber', cost: 60, rent: [4, 20, 60, 180, 320, 450], houseCost: 50, mortgageValue: 30 },
      { id: 4, name: 'Town Dues', type: 'tax', taxAmount: 100, description: 'Pay $100 town infrastructure fee' },
      { id: 5, name: 'Transit Depot', type: 'station', cost: 200, mortgageValue: 100, description: 'Collect $25-100 per station owned' },
      { id: 6, name: 'Garden Road', type: 'property', group: 'cyan', cost: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, mortgageValue: 50 },
      { id: 7, name: 'Lucky Event', type: 'event', description: 'Draw a Lucky Event Card' },
      // Corner 1: Detention (Tile 8)
      { id: 8, name: 'Town Detention', type: 'detention', description: 'Visiting or Serving Time' },
      { id: 9, name: 'River Lane', type: 'property', group: 'cyan', cost: 120, rent: [8, 40, 100, 300, 450, 600], houseCost: 50, mortgageValue: 60 },
      { id: 10, name: 'Solar Station', type: 'utility', cost: 150, mortgageValue: 75, description: 'Rent is 4x or 10x dice roll' },
      { id: 11, name: 'Pine Terrace', type: 'property', group: 'rose', cost: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, mortgageValue: 70 },
      { id: 12, name: 'Blossom Lane', type: 'property', group: 'rose', cost: 160, rent: [12, 60, 180, 500, 700, 900], houseCost: 100, mortgageValue: 80 },
      { id: 13, name: 'Harbor Ferry', type: 'station', cost: 200, mortgageValue: 100, description: 'Collect $25-100 per station owned' },
      { id: 14, name: 'Market Street', type: 'property', group: 'orange', cost: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, mortgageValue: 90 },
      { id: 15, name: 'Town Council', type: 'community', description: 'Draw a Town Council Perk Card' },
      // Corner 2: Rest Park (Tile 16)
      { id: 16, name: 'Central Park', type: 'rest', description: 'Take a restful break without fees' },
      { id: 17, name: 'Copper Court', type: 'property', group: 'orange', cost: 200, rent: [16, 80, 220, 600, 800, 1000], houseCost: 100, mortgageValue: 100 },
      { id: 18, name: 'Lucky Event', type: 'event', description: 'Draw a Lucky Event Card' },
      { id: 19, name: 'Grand Avenue', type: 'property', group: 'crimson', cost: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, mortgageValue: 110 },
      { id: 20, name: 'Sunset Boulevard', type: 'property', group: 'crimson', cost: 240, rent: [20, 100, 300, 750, 925, 1100], houseCost: 150, mortgageValue: 120 },
      { id: 21, name: 'Metro Junction', type: 'station', cost: 200, mortgageValue: 100, description: 'Collect $25-100 per station owned' },
      { id: 22, name: 'Water Works', type: 'utility', cost: 150, mortgageValue: 75, description: 'Rent is 4x or 10x dice roll' },
      { id: 23, name: 'Highland Hill', type: 'property', group: 'violet', cost: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, mortgageValue: 130 },
      // Corner 3: Go to Detention (Tile 24)
      { id: 24, name: 'Officer Warning', type: 'go-to-detention', description: 'Move directly to Detention' },
      { id: 25, name: 'Summit Road', type: 'property', group: 'violet', cost: 280, rent: [24, 120, 360, 850, 1025, 1200], houseCost: 150, mortgageValue: 140 },
      { id: 26, name: 'High Street', type: 'property', group: 'emerald', cost: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, mortgageValue: 150 },
      { id: 27, name: 'Town Council', type: 'community', description: 'Draw a Town Council Perk Card' },
      { id: 28, name: 'Harbor View', type: 'property', group: 'emerald', cost: 320, rent: [28, 150, 450, 1000, 1200, 1400], houseCost: 200, mortgageValue: 160 },
      { id: 29, name: 'Lucky Event', type: 'event', description: 'Draw a Lucky Event Card' },
      { id: 30, name: 'Luxury Dues', type: 'tax', taxAmount: 150, description: 'Pay $150 luxury assessment' },
      { id: 31, name: 'Diamond Plaza', type: 'property', group: 'indigo', cost: 380, rent: [40, 200, 600, 1400, 1700, 2000], houseCost: 200, mortgageValue: 190 },
    ];
  }

  if (size === 'huge') {
    // 48 spaces (12 per side) - Rich, spacious, strategic
    const hugeTiles: BoardTile[] = [
      { id: 0, name: 'Town Square', type: 'start', description: 'Collect $200 salary as you pass' },
      { id: 1, name: 'Cobble Lane', type: 'property', group: 'amber', cost: 60, rent: [2, 10, 30, 90, 160, 250], houseCost: 50, mortgageValue: 30 },
      { id: 2, name: 'Town Council', type: 'community', description: 'Draw a Town Council Perk Card' },
      { id: 3, name: 'Bakery Row', type: 'property', group: 'amber', cost: 60, rent: [3, 15, 45, 130, 240, 350], houseCost: 50, mortgageValue: 30 },
      { id: 4, name: 'Maple Street', type: 'property', group: 'amber', cost: 80, rent: [4, 20, 60, 180, 320, 450], houseCost: 50, mortgageValue: 40 },
      { id: 5, name: 'Town Dues', type: 'tax', taxAmount: 100, description: 'Pay $100 town infrastructure fee' },
      { id: 6, name: 'Transit Hub', type: 'station', cost: 200, mortgageValue: 100, description: 'Collect station revenue' },
      { id: 7, name: 'Meadow Way', type: 'property', group: 'cyan', cost: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, mortgageValue: 50 },
      { id: 8, name: 'Lucky Event', type: 'event', description: 'Draw a Lucky Event Card' },
      { id: 9, name: 'Garden Road', type: 'property', group: 'cyan', cost: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, mortgageValue: 50 },
      { id: 10, name: 'River Lane', type: 'property', group: 'cyan', cost: 120, rent: [8, 40, 100, 300, 450, 600], houseCost: 50, mortgageValue: 60 },
      { id: 11, name: 'Solar Station', type: 'utility', cost: 150, mortgageValue: 75, description: 'Utility energy income' },

      // Corner 1: Tile 12
      { id: 12, name: 'Town Detention', type: 'detention', description: 'Visiting or Serving Time' },
      { id: 13, name: 'Pine Terrace', type: 'property', group: 'rose', cost: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, mortgageValue: 70 },
      { id: 14, name: 'Blossom Lane', type: 'property', group: 'rose', cost: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, mortgageValue: 70 },
      { id: 15, name: 'Lilac Way', type: 'property', group: 'rose', cost: 160, rent: [12, 60, 180, 500, 700, 900], houseCost: 100, mortgageValue: 80 },
      { id: 16, name: 'Harbor Ferry', type: 'station', cost: 200, mortgageValue: 100, description: 'Collect station revenue' },
      { id: 17, name: 'Market Street', type: 'property', group: 'orange', cost: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, mortgageValue: 90 },
      { id: 18, name: 'Town Council', type: 'community', description: 'Draw a Town Council Perk Card' },
      { id: 19, name: 'Copper Court', type: 'property', group: 'orange', cost: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, mortgageValue: 90 },
      { id: 20, name: 'Clocktower Way', type: 'property', group: 'orange', cost: 200, rent: [16, 80, 220, 600, 800, 1000], houseCost: 100, mortgageValue: 100 },
      { id: 21, name: 'Water Works', type: 'utility', cost: 150, mortgageValue: 75, description: 'Utility water income' },
      { id: 22, name: 'Ocean Way', type: 'property', group: 'teal', cost: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 100, mortgageValue: 110 },
      { id: 23, name: 'Coral Drive', type: 'property', group: 'teal', cost: 240, rent: [20, 100, 300, 750, 925, 1100], houseCost: 100, mortgageValue: 120 },

      // Corner 2: Tile 24
      { id: 24, name: 'Central Park', type: 'rest', description: 'Take a break without fees' },
      { id: 25, name: 'Grand Avenue', type: 'property', group: 'crimson', cost: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, mortgageValue: 110 },
      { id: 26, name: 'Lucky Event', type: 'event', description: 'Draw a Lucky Event Card' },
      { id: 27, name: 'Riverside Walk', type: 'property', group: 'crimson', cost: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, mortgageValue: 110 },
      { id: 28, name: 'Sunset Boulevard', type: 'property', group: 'crimson', cost: 240, rent: [20, 100, 300, 750, 925, 1100], houseCost: 150, mortgageValue: 120 },
      { id: 29, name: 'Metro Junction', type: 'station', cost: 200, mortgageValue: 100, description: 'Collect station revenue' },
      { id: 30, name: 'Highland Hill', type: 'property', group: 'violet', cost: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, mortgageValue: 130 },
      { id: 31, name: 'Crestview Lane', type: 'property', group: 'violet', cost: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, mortgageValue: 130 },
      { id: 32, name: 'Summit Road', type: 'property', group: 'violet', cost: 280, rent: [24, 120, 360, 850, 1025, 1200], houseCost: 150, mortgageValue: 140 },
      { id: 33, name: 'Windmill Energy', type: 'utility', cost: 150, mortgageValue: 75, description: 'Utility wind income' },
      { id: 34, name: 'High Street', type: 'property', group: 'emerald', cost: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, mortgageValue: 150 },
      { id: 35, name: 'Royal Way', type: 'property', group: 'emerald', cost: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, mortgageValue: 150 },

      // Corner 3: Tile 36
      { id: 36, name: 'Officer Warning', type: 'go-to-detention', description: 'Move directly to Detention' },
      { id: 37, name: 'Harbor View', type: 'property', group: 'emerald', cost: 320, rent: [28, 150, 450, 1000, 1200, 1400], houseCost: 200, mortgageValue: 160 },
      { id: 38, name: 'Skyway Depot', type: 'station', cost: 200, mortgageValue: 100, description: 'Collect station revenue' },
      { id: 39, name: 'Town Council', type: 'community', description: 'Draw a Town Council Perk Card' },
      { id: 40, name: 'Crown Crest', type: 'property', group: 'indigo', cost: 350, rent: [35, 175, 500, 1100, 1300, 1500], houseCost: 200, mortgageValue: 175 },
      { id: 41, name: 'Luxury Dues', type: 'tax', taxAmount: 150, description: 'Pay $150 luxury assessment' },
      { id: 42, name: 'Lucky Event', type: 'event', description: 'Draw a Lucky Event Card' },
      { id: 43, name: 'Diamond Plaza', type: 'property', group: 'indigo', cost: 400, rent: [50, 200, 600, 1400, 1700, 2000], houseCost: 200, mortgageValue: 200 },
      { id: 44, name: 'Quarry Road', type: 'property', group: 'slate', cost: 420, rent: [55, 220, 650, 1500, 1800, 2100], houseCost: 250, mortgageValue: 210 },
      { id: 45, name: 'Town Council', type: 'community', description: 'Draw a Town Council Perk Card' },
      { id: 46, name: 'Foundry Lane', type: 'property', group: 'slate', cost: 450, rent: [60, 250, 750, 1700, 2000, 2400], houseCost: 250, mortgageValue: 225 },
      { id: 47, name: 'Lucky Event', type: 'event', description: 'Draw a Lucky Event Card' },
    ];
    return hugeTiles;
  }

  // Default: 'large' (40 spaces - 10 per side)
  return [
    { id: 0, name: 'Town Square', type: 'start', description: 'Collect $200 salary as you pass' },
    { id: 1, name: 'Cobble Lane', type: 'property', group: 'amber', cost: 60, rent: [2, 10, 30, 90, 160, 250], houseCost: 50, mortgageValue: 30 },
    { id: 2, name: 'Town Council', type: 'community', description: 'Draw a Town Council Perk Card' },
    { id: 3, name: 'Maple Street', type: 'property', group: 'amber', cost: 60, rent: [4, 20, 60, 180, 320, 450], houseCost: 50, mortgageValue: 30 },
    { id: 4, name: 'Town Dues', type: 'tax', taxAmount: 200, description: 'Pay $200 municipal tax' },
    { id: 5, name: 'Transit Depot', type: 'station', cost: 200, mortgageValue: 100, description: 'Collect station revenue' },
    { id: 6, name: 'Garden Road', type: 'property', group: 'cyan', cost: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, mortgageValue: 50 },
    { id: 7, name: 'Lucky Event', type: 'event', description: 'Draw a Lucky Event Card' },
    { id: 8, name: 'Orchard Way', type: 'property', group: 'cyan', cost: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, mortgageValue: 50 },
    { id: 9, name: 'River Lane', type: 'property', group: 'cyan', cost: 120, rent: [8, 40, 100, 300, 450, 600], houseCost: 50, mortgageValue: 60 },

    // Corner 1: Tile 10
    { id: 10, name: 'Town Detention', type: 'detention', description: 'Visiting or Serving Time' },
    { id: 11, name: 'Pine Terrace', type: 'property', group: 'rose', cost: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, mortgageValue: 70 },
    { id: 12, name: 'Solar Station', type: 'utility', cost: 150, mortgageValue: 75, description: 'Rent is 4x or 10x dice roll' },
    { id: 13, name: 'Blossom Lane', type: 'property', group: 'rose', cost: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, mortgageValue: 70 },
    { id: 14, name: 'Lilac Way', type: 'property', group: 'rose', cost: 160, rent: [12, 60, 180, 500, 700, 900], houseCost: 100, mortgageValue: 80 },
    { id: 15, name: 'Harbor Ferry', type: 'station', cost: 200, mortgageValue: 100, description: 'Collect station revenue' },
    { id: 16, name: 'Market Street', type: 'property', group: 'orange', cost: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, mortgageValue: 90 },
    { id: 17, name: 'Town Council', type: 'community', description: 'Draw a Town Council Perk Card' },
    { id: 18, name: 'Copper Court', type: 'property', group: 'orange', cost: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, mortgageValue: 90 },
    { id: 19, name: 'Clocktower Way', type: 'property', group: 'orange', cost: 200, rent: [16, 80, 220, 600, 800, 1000], houseCost: 100, mortgageValue: 100 },

    // Corner 2: Tile 20
    { id: 20, name: 'Central Park', type: 'rest', description: 'Take a break without fees' },
    { id: 21, name: 'Grand Avenue', type: 'property', group: 'crimson', cost: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, mortgageValue: 110 },
    { id: 22, name: 'Lucky Event', type: 'event', description: 'Draw a Lucky Event Card' },
    { id: 23, name: 'Riverside Walk', type: 'property', group: 'crimson', cost: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, mortgageValue: 110 },
    { id: 24, name: 'Sunset Boulevard', type: 'property', group: 'crimson', cost: 240, rent: [20, 100, 300, 750, 925, 1100], houseCost: 150, mortgageValue: 120 },
    { id: 25, name: 'Metro Junction', type: 'station', cost: 200, mortgageValue: 100, description: 'Collect station revenue' },
    { id: 26, name: 'Highland Hill', type: 'property', group: 'violet', cost: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, mortgageValue: 130 },
    { id: 27, name: 'Crestview Lane', type: 'property', group: 'violet', cost: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, mortgageValue: 130 },
    { id: 28, name: 'Water Works', type: 'utility', cost: 150, mortgageValue: 75, description: 'Rent is 4x or 10x dice roll' },
    { id: 29, name: 'Summit Road', type: 'property', group: 'violet', cost: 280, rent: [24, 120, 360, 850, 1025, 1200], houseCost: 150, mortgageValue: 140 },

    // Corner 3: Tile 30
    { id: 30, name: 'Officer Warning', type: 'go-to-detention', description: 'Move directly to Detention' },
    { id: 31, name: 'High Street', type: 'property', group: 'emerald', cost: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, mortgageValue: 150 },
    { id: 32, name: 'Royal Way', type: 'property', group: 'emerald', cost: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, mortgageValue: 150 },
    { id: 33, name: 'Town Council', type: 'community', description: 'Draw a Town Council Perk Card' },
    { id: 34, name: 'Harbor View', type: 'property', group: 'emerald', cost: 320, rent: [28, 150, 450, 1000, 1200, 1400], houseCost: 200, mortgageValue: 160 },
    { id: 35, name: 'Skyway Depot', type: 'station', cost: 200, mortgageValue: 100, description: 'Collect station revenue' },
    { id: 36, name: 'Lucky Event', type: 'event', description: 'Draw a Lucky Event Card' },
    { id: 37, name: 'Crown Crest', type: 'property', group: 'indigo', cost: 350, rent: [35, 175, 500, 1100, 1300, 1500], houseCost: 200, mortgageValue: 175 },
    { id: 38, name: 'Luxury Dues', type: 'tax', taxAmount: 100, description: 'Pay $100 luxury assessment' },
    { id: 39, name: 'Diamond Plaza', type: 'property', group: 'indigo', cost: 400, rent: [50, 200, 600, 1400, 1700, 2000], houseCost: 200, mortgageValue: 200 },
  ];
}

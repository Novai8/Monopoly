import { CharacterDef, CharacterId } from '../types';

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  duck: {
    id: 'duck',
    name: 'Rubber Duck',
    tagline: 'Small. Yellow. Ready.',
    emoji: '🦆',
    color: '#eab308',
  },
  cat: {
    id: 'cat',
    name: 'Tabby Cat',
    tagline: 'Sleek, alert, and loves prime streets.',
    emoji: '🐱',
    color: '#f97316',
  },
  penguin: {
    id: 'penguin',
    name: 'Gentoo Penguin',
    tagline: 'Waddles into monopolies with cool confidence.',
    emoji: '🐧',
    color: '#38bdf8',
  },
  frog: {
    id: 'frog',
    name: 'Tree Frog',
    tagline: 'Leaps over high rents and dangerous spaces.',
    emoji: '🐸',
    color: '#22c55e',
  },
  pizza: {
    id: 'pizza',
    name: 'Cheesy Slice',
    tagline: 'Hot, fresh, and everyone wants a piece.',
    emoji: '🍕',
    color: '#ef4444',
  },
  coffee: {
    id: 'coffee',
    name: 'Morning Brew',
    tagline: 'Fueled and ready for aggressive negotiations.',
    emoji: '☕',
    color: '#854d0e',
  },
  robot: {
    id: 'robot',
    name: 'Byte Bot',
    tagline: 'Programmed for maximum rent calculations.',
    emoji: '🤖',
    color: '#6366f1',
  },
  dino: {
    id: 'dino',
    name: 'Baby Rex',
    tagline: 'Ancient strength stomping across the town.',
    emoji: '🦖',
    color: '#15803d',
  },
  car: {
    id: 'car',
    name: 'Town Cruiser',
    tagline: 'Cruising through every avenue in style.',
    emoji: '🚗',
    color: '#dc2626',
  },
  rocket: {
    id: 'rocket',
    name: 'Astro Rocket',
    tagline: 'Skyrocketing property values to the stars.',
    emoji: '🚀',
    color: '#a855f7',
  },
  chest: {
    id: 'chest',
    name: 'Vault Chest',
    tagline: 'Locked and loaded with town fortunes.',
    emoji: '💎',
    color: '#0284c7',
  },
  mushroom: {
    id: 'mushroom',
    name: 'Magic Shroom',
    tagline: 'Sprouting houses overnight after rain.',
    emoji: '🍄',
    color: '#f43f5e',
  },
  balloon: {
    id: 'balloon',
    name: 'Sky Balloon',
    tagline: 'Drifting gently above bankruptcies.',
    emoji: '🎈',
    color: '#ec4899',
  },
  crown: {
    id: 'crown',
    name: 'Golden Crown',
    tagline: 'Born royalty of the trading table.',
    emoji: '👑',
    color: '#fbbf24',
  },
};

export const CHARACTER_LIST = Object.values(CHARACTERS);

export const PLAYER_COLORS = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Orange
  '#64748b', // Slate
];

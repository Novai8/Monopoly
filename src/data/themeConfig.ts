import { BoardTheme } from '../types';
import { BOARD_THEMES as BASE_THEMES } from './boardData';

export interface ThemeConfig {
  id: BoardTheme;
  name: string;
  description: string;
  boardBg: string;
  boardSurface: string;
  boardBorder: string;
  outerBorderColor: string;
  tileBg: string;
  tileBgHover: string;
  tileBorder: string;
  centerBg: string;
  centerBadgeBg: string;
  cardSlotBg: string;
  accentColor: string;
  accentGlow: string;
  ambientGlow: string;
  gridLineColor: string;
  textColor: string;
  textMuted: string;
  icon: string;
  badgeEmoji: string;
  environment: string;
  cornerGoBg: string;
  cornerJailBg: string;
  cornerParkingBg: string;
  cornerGoToJailBg: string;
}

const BADGES: Record<BoardTheme, string> = {
  'classic-town': '🏛️',
  seaside: '🌊',
  countryside: '🌾',
  'winter-town': '❄️',
  'festival-town': '🎪',
  'old-town': '🕰️',
  island: '🏝️',
  'mountain-town': '🏔️',
};

export const BOARD_THEMES: Record<BoardTheme, ThemeConfig> = Object.fromEntries(
  (Object.entries(BASE_THEMES) as [BoardTheme, (typeof BASE_THEMES)[BoardTheme]][]).map(([id, theme]) => [
    id,
    {
      ...theme,
      outerBorderColor: theme.boardBorder,
      cardSlotBg: theme.centerBadgeBg,
      ambientGlow: theme.accentGlow,
      badgeEmoji: BADGES[id],
    },
  ])
) as Record<BoardTheme, ThemeConfig>;

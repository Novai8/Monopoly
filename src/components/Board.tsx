import React from 'react';
import { BoardTheme, BoardTile, Card, OwnershipMap, Player } from '../types';
import { getGridCoordinates } from '../utils/gameHelpers';
import { BOARD_THEMES } from '../data/themeConfig';
import { Tile } from './Tile';
import { Dice } from './Dice';
import { ActionBanner } from './ActionBanner';
import { HelpCircle, Package } from 'lucide-react';

interface BoardProps {
  tiles: BoardTile[];
  players: Player[];
  activePlayer: Player;
  ownership: OwnershipMap;
  dice: [number, number];
  isRolling: boolean;
  canRoll: boolean;
  onRoll: () => void;
  rollSummary?: string | null;
  drawnCard: Card | null;
  pendingRent: { amount: number; recipient: Player } | null;
  pendingTax: number | null;
  canBuyProperty: boolean;
  onBuyProperty: () => void;
  onPassProperty: () => void;
  onPayRent: () => void;
  onPayTax: () => void;
  onDismissCard: (targetPlayerId?: string) => void;
  onPayDetentionBail: () => void;
  onUseFreePass: () => void;
  onEndTurn: () => void;
  canEndTurn: boolean;
  onTileClick: (tile: BoardTile) => void;
  theme?: BoardTheme;
}

export const Board: React.FC<BoardProps> = ({
  tiles,
  players,
  activePlayer,
  ownership,
  dice,
  isRolling,
  canRoll,
  onRoll,
  rollSummary,
  drawnCard,
  pendingRent,
  pendingTax,
  canBuyProperty,
  onBuyProperty,
  onPassProperty,
  onPayRent,
  onPayTax,
  onDismissCard,
  onPayDetentionBail,
  onUseFreePass,
  onEndTurn,
  canEndTurn,
  onTileClick,
  theme = 'classic-town',
}) => {
  const currentTile = tiles[activePlayer.position] || tiles[0];
  const sideCount = Math.floor(tiles.length / 4);
  const gridSize = sideCount + 1;
  const themeConfig = BOARD_THEMES[theme] || BOARD_THEMES['classic-town'];

  return (
    <div
      id="game-board-container"
      className="relative w-full aspect-square max-w-[780px] mx-auto p-2.5 rounded-3xl shadow-2xl flex items-center justify-center transition-colors duration-300"
      style={{
        backgroundColor: themeConfig.boardBg,
        border: `3px solid ${themeConfig.outerBorderColor}`,
        boxShadow: `0 25px 50px -12px ${themeConfig.ambientGlow}`,
      }}
    >
      <div
        className="w-full h-full gap-1 p-1 rounded-2xl overflow-hidden shadow-inner"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
          backgroundColor: themeConfig.gridLineColor,
        }}
      >
        {tiles.map((tile) => {
          const { col, row, side } = getGridCoordinates(tile.id, tiles.length);
          return (
            <div key={tile.id} style={{ gridColumnStart: col + 1, gridRowStart: row + 1 }} className="w-full h-full">
              <Tile
                tile={tile}
                side={side}
                ownership={ownership}
                players={players}
                onClick={onTileClick}
                isHighlighted={activePlayer.position === tile.id}
              />
            </div>
          );
        })}

        <div
          style={{
            gridColumn: `2 / ${gridSize}`,
            gridRow: `2 / ${gridSize}`,
            backgroundColor: themeConfig.centerBg,
          }}
          className="relative flex flex-col items-center justify-between p-3 md:p-5 overflow-hidden rounded-xl border border-white/10 shadow-inner"
        >
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{ backgroundImage: `radial-gradient(circle at center, ${themeConfig.accentColor} 0%, transparent 70%)` }}
          />

          <div className="w-full flex items-center justify-between z-10">
            <div
              className="flex items-center gap-2 p-2 rounded-2xl border shadow-md transition"
              style={{ backgroundColor: themeConfig.cardSlotBg, borderColor: `${themeConfig.accentColor}50` }}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-white shadow-xs" style={{ backgroundColor: '#ea580c' }}>
                <HelpCircle className="w-5 h-5 text-white" />
              </div>
              <div className="text-left hidden sm:block">
                <span className="text-[11px] font-black text-amber-300 uppercase tracking-wider block">Chance</span>
                <span className="text-[9px] text-stone-300">Action Deck</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/10 backdrop-blur-xs text-[11px] font-bold text-stone-200">
              <span>{themeConfig.badgeEmoji}</span>
              <span className="truncate max-w-[120px]">{themeConfig.name}</span>
            </div>

            <div
              className="flex items-center gap-2 p-2 rounded-2xl border shadow-md transition"
              style={{ backgroundColor: themeConfig.cardSlotBg, borderColor: `${themeConfig.accentColor}50` }}
            >
              <div className="text-right hidden sm:block">
                <span className="text-[11px] font-black text-blue-300 uppercase tracking-wider block">Community</span>
                <span className="text-[9px] text-stone-300">Chest Deck</span>
              </div>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-white shadow-xs" style={{ backgroundColor: '#2563eb' }}>
                <Package className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="z-10 my-auto flex flex-col items-center gap-2">
            <Dice dice={dice} isRolling={isRolling} canRoll={canRoll} onRoll={onRoll} rollSummary={rollSummary} />
          </div>

          <div className="w-full z-10 max-w-md">
            <ActionBanner
              activePlayer={activePlayer}
              currentTile={currentTile}
              ownership={ownership}
              drawnCard={drawnCard}
              pendingRent={pendingRent}
              pendingTax={pendingTax}
              canBuyProperty={canBuyProperty}
              players={players}
              onBuyProperty={onBuyProperty}
              onPassProperty={onPassProperty}
              onPayRent={onPayRent}
              onPayTax={onPayTax}
              onDismissCard={onDismissCard}
              onPayDetentionBail={onPayDetentionBail}
              onUseFreePass={onUseFreePass}
              onEndTurn={onEndTurn}
              canEndTurn={canEndTurn}
              isBotTurn={!!(activePlayer.isAI || activePlayer.isBot)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

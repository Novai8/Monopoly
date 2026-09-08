import React from 'react';
import { BoardTile, Card, OwnershipMap, Player } from '../types';
import { getGridCoordinates } from '../utils/gameHelpers';
import { Tile } from './Tile';
import { Dice } from './Dice';
import { ActionBanner } from './ActionBanner';
import { HelpCircle, Landmark } from 'lucide-react';

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
}) => {
  const currentTile = tiles[activePlayer.position] || tiles[0];
  const sideCount = Math.floor(tiles.length / 4);
  const gridSize = sideCount + 1;

  return (
    <div className="relative w-full aspect-square max-w-[760px] mx-auto p-2 bg-stone-900 border-2 border-stone-800 rounded-3xl shadow-2xl flex items-center justify-center">
      <div
        className="w-full h-full gap-0.5 bg-stone-800 p-0.5 rounded-2xl overflow-hidden"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
        }}
      >
        {/* Render all tiles at dynamic grid coordinates */}
        {tiles.map((tile) => {
          const { col, row, side } = getGridCoordinates(tile.id, tiles.length);
          const isHighlighted = activePlayer.position === tile.id;

          return (
            <div
              key={tile.id}
              style={{
                gridColumnStart: col + 1,
                gridRowStart: row + 1,
              }}
              className="w-full h-full"
            >
              <Tile
                tile={tile}
                side={side}
                ownership={ownership}
                players={players}
                onClick={onTileClick}
                isHighlighted={isHighlighted}
              />
            </div>
          );
        })}

        {/* Board Center Area */}
        <div
          style={{
            gridColumn: `2 / ${gridSize}`,
            gridRow: `2 / ${gridSize}`,
          }}
          className="relative bg-stone-950 flex flex-col items-center justify-between p-3 md:p-5 overflow-hidden rounded-xl border border-stone-800"
        >
          {/* Top card slots */}
          <div className="w-full flex items-center justify-between z-10">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-stone-900 border border-amber-500/30 shadow-xs">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div className="text-left hidden sm:block">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block">
                  Lucky Events
                </span>
                <span className="text-[9px] text-stone-400">Action Decks</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-stone-900 border border-blue-500/30 shadow-xs">
              <div className="text-right hidden sm:block">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider block">
                  Town Council
                </span>
                <span className="text-[9px] text-stone-400">Civic Grants</span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                <Landmark className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Middle: Dice & Roll Control */}
          <div className="z-10 my-auto flex flex-col items-center gap-2">
            <Dice
              dice={dice}
              isRolling={isRolling}
              canRoll={canRoll}
              onRoll={onRoll}
              rollSummary={rollSummary}
            />
          </div>

          {/* Bottom: Dynamic Action Banner */}
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

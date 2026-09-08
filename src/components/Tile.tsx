import React from 'react';
import { BoardTile, OwnershipMap, Player } from '../types';
import { PROPERTY_GROUPS } from '../data/boardData';
import { CHARACTERS } from '../data/charactersData';
import {
  Train,
  Zap,
  Droplet,
  HelpCircle,
  AlertTriangle,
  Lock,
  ArrowRight,
  Package,
  Coins,
  Car,
} from 'lucide-react';

interface TileProps {
  tile: BoardTile;
  side: 'bottom' | 'left' | 'top' | 'right' | 'corner';
  ownership: OwnershipMap;
  players: Player[];
  onClick: (tile: BoardTile) => void;
  isHighlighted?: boolean;
}

export const Tile: React.FC<TileProps> = ({
  tile,
  side,
  ownership,
  players,
  onClick,
  isHighlighted = false,
}) => {
  const prop = ownership[tile.id];
  const owner = prop?.ownerId ? players.find((p) => p.id === prop.ownerId) : null;
  const playersOnTile = players.filter((p) => !p.bankrupt && p.position === tile.id);

  const isCorner = side === 'corner';
  const groupMeta = tile.group ? PROPERTY_GROUPS[tile.group] : null;

  return (
    <div
      id={`board-tile-${tile.id}`}
      onClick={() => onClick(tile)}
      className={`relative group cursor-pointer select-none transition-all duration-150 flex flex-col justify-between overflow-hidden
        ${isCorner ? 'bg-stone-900 text-stone-100 border border-stone-700/90' : 'bg-stone-850 text-stone-100 border border-stone-700/80'}
        ${isHighlighted ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-stone-950 shadow-lg scale-[1.02] z-20' : 'hover:bg-stone-800'}
        ${prop?.isMortgaged ? 'opacity-70 bg-stone-950' : ''}
      `}
    >
      {/* Property Color Banner */}
      {tile.group && groupMeta && (
        <div
          className={`w-full flex items-center justify-center font-bold text-[10px] text-white tracking-wider shrink-0 shadow-sm
            ${side === 'top' ? 'order-last h-4 border-t border-stone-700' : 'order-first h-4 border-b border-stone-700'}
          `}
          style={{ backgroundColor: groupMeta.hex }}
        >
          {prop && prop.houses > 0 && (
            <div className="flex items-center gap-0.5 px-1 py-0.5">
              {prop.houses === 5 ? (
                <span className="bg-red-600 text-white text-[8px] font-black px-1 rounded shadow-xs">
                  HOTEL
                </span>
              ) : (
                Array.from({ length: prop.houses }).map((_, i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-xs bg-emerald-400 inline-block shadow-xs" />
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-1 text-center min-h-0">
        {tile.type === 'start' && (
          <div className="flex flex-col items-center justify-center">
            <span className="text-[9px] font-bold text-stone-300">COLLECT $200</span>
            <span className="text-xl font-black text-rose-500 flex items-center gap-0.5 tracking-wider">
              GO <ArrowRight className="w-4 h-4 text-rose-500 inline" />
            </span>
          </div>
        )}

        {tile.type === 'detention' && (
          <div className="flex flex-col items-center justify-center">
            <Lock className="w-4 h-4 text-amber-400 mb-0.5" />
            <span className="text-[10px] font-black text-stone-200 leading-tight">JAIL</span>
            <span className="text-[8px] font-semibold text-stone-400">JUST VISITING</span>
          </div>
        )}

        {tile.type === 'rest' && (
          <div className="flex flex-col items-center justify-center">
            <Car className="w-4 h-4 text-emerald-400 mb-0.5" />
            <span className="text-[10px] font-black text-stone-200 leading-tight">FREE</span>
            <span className="text-[9px] font-bold text-emerald-400">PARKING</span>
          </div>
        )}

        {tile.type === 'go-to-detention' && (
          <div className="flex flex-col items-center justify-center text-stone-100">
            <AlertTriangle className="w-4 h-4 text-amber-500 mb-0.5 animate-pulse" />
            <span className="text-[10px] font-black text-stone-200 leading-tight">GO TO</span>
            <span className="text-[9px] font-black text-amber-400">JAIL</span>
          </div>
        )}

        {tile.type === 'station' && (
          <div className="flex flex-col items-center justify-center px-0.5">
            <Train className="w-3.5 h-3.5 text-stone-300 mb-0.5" />
            <span className="text-[8px] font-bold text-stone-200 line-clamp-2 leading-tight">
              {tile.name}
            </span>
          </div>
        )}

        {tile.type === 'utility' && (
          <div className="flex flex-col items-center justify-center px-0.5">
            {tile.name.toLowerCase().includes('water') ? (
              <Droplet className="w-3.5 h-3.5 text-blue-400 mb-0.5" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-amber-400 mb-0.5" />
            )}
            <span className="text-[8px] font-bold text-stone-200 line-clamp-2 leading-tight">
              {tile.name}
            </span>
          </div>
        )}

        {tile.type === 'event' && (
          <div className="flex flex-col items-center justify-center">
            <HelpCircle className="w-4 h-4 text-amber-400 mb-0.5 animate-pulse" />
            <span className="text-[9px] font-black text-amber-400 tracking-wider">CHANCE</span>
          </div>
        )}

        {tile.type === 'community' && (
          <div className="flex flex-col items-center justify-center">
            <Package className="w-4 h-4 text-blue-400 mb-0.5" />
            <span className="text-[8px] font-black text-blue-300 leading-tight">COMMUNITY</span>
            <span className="text-[7px] font-bold text-blue-400">CHEST</span>
          </div>
        )}

        {tile.type === 'tax' && (
          <div className="flex flex-col items-center justify-center">
            <Coins className="w-3.5 h-3.5 text-rose-400 mb-0.5" />
            <span className="text-[8px] font-bold text-stone-200 leading-tight text-center">
              {tile.name}
            </span>
            <span className="text-[9px] font-black text-rose-400 font-mono">${tile.taxAmount}</span>
          </div>
        )}

        {tile.type === 'property' && (
          <span className="text-[8px] sm:text-[9px] font-bold text-stone-200 leading-tight line-clamp-2 px-0.5">
            {tile.name}
          </span>
        )}

        {tile.cost && (
          <span className="text-[8px] font-bold text-stone-400 mt-0.5 font-mono">
            ${tile.cost}
          </span>
        )}
      </div>

      {/* Owner indicator stripe */}
      {owner && (
        <div
          className="w-full text-center py-0.5 px-1 flex items-center justify-center gap-1 shrink-0"
          style={{ backgroundColor: owner.color }}
        >
          <span className="text-[8px] font-bold text-white truncate drop-shadow-xs">
            {owner.name}
          </span>
        </div>
      )}

      {prop?.isMortgaged && (
        <div className="absolute inset-0 bg-stone-950/85 flex flex-col items-center justify-center z-10">
          <span className="text-[8px] font-black text-red-400 tracking-widest border border-red-500/50 px-1 py-0.5 rounded bg-stone-950">
            MORTGAGED
          </span>
        </div>
      )}

      {/* Players currently positioned on this tile */}
      {playersOnTile.length > 0 && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center justify-center gap-0.5 z-30 pointer-events-none flex-wrap max-w-full">
          {playersOnTile.map((player) => {
            const charObj = CHARACTERS[player.character];
            return (
              <div
                key={player.id}
                className="w-5 h-5 rounded-full border border-white/80 shadow-md flex items-center justify-center text-xs animate-bounce"
                style={{ backgroundColor: player.color }}
                title={player.name}
              >
                {charObj ? charObj.emoji : '🦆'}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

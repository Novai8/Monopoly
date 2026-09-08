import React from 'react';
import { BoardTile, OwnershipMap, Player } from '../types';
import { CHARACTERS } from '../data/charactersData';
import { PROPERTY_GROUPS } from '../data/boardData';
import { calculateNetWorth } from '../utils/gameHelpers';
import { audio } from '../utils/audio';
import { Bot, User, Lock, ArrowLeftRight, Coins, ShieldAlert } from 'lucide-react';

interface PlayerBarProps {
  players: Player[];
  activePlayerIndex: number;
  tiles: BoardTile[];
  ownership: OwnershipMap;
  onOpenTrade: (targetPlayerId?: string) => void;
  onTileClick: (tileId: number) => void;
  onPlayerClick?: (player: Player) => void;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  players,
  activePlayerIndex,
  tiles,
  ownership,
  onOpenTrade,
  onTileClick,
  onPlayerClick,
}) => {
  return (
    <div className="flex flex-col gap-2 w-full max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
      {players.map((player, idx) => {
        const isActive = idx === activePlayerIndex && !player.bankrupt;
        const netWorth = calculateNetWorth(player, tiles, ownership);
        const charObj = CHARACTERS[player.character];

        // Find properties owned by this player
        const ownedTiles = tiles.filter((t) => ownership[t.id]?.ownerId === player.id);

        return (
          <div
            key={player.id}
            onClick={() => onPlayerClick?.(player)}
            className={`p-2.5 rounded-2xl border transition-all duration-200 relative overflow-hidden flex flex-col gap-1.5 cursor-pointer hover:border-stone-700 ${
              player.bankrupt
                ? 'bg-stone-900/40 border-stone-800 text-stone-600 opacity-50'
                : isActive
                ? 'bg-stone-850 border-amber-400 shadow-lg shadow-amber-400/10 ring-1 ring-amber-400/50'
                : 'bg-stone-900/90 border-stone-800 text-stone-300'
            }`}
          >
            {/* Active turn indicator accent */}
            {isActive && (
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: player.color }}
              />
            )}

            {/* Header: Token, Name, Bot/Human, Balance */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-lg text-white shadow-xs shrink-0"
                  style={{ backgroundColor: player.color }}
                >
                  {charObj ? charObj.emoji : '🦆'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-xs font-bold text-stone-100 truncate">{player.name}</span>
                    {player.isAI || player.isBot ? (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 uppercase">
                        {player.difficulty || 'Bot'}
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                        Player
                      </span>
                    )}
                  </div>
                  {player.inDetention && (
                    <span className="text-[9px] font-bold text-amber-400 flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" /> In Detention ({player.detentionTurns}/3)
                    </span>
                  )}
                  {player.bankrupt && (
                    <span className="text-[9px] font-bold text-red-500 uppercase">
                      Bankrupt
                    </span>
                  )}
                </div>
              </div>

              {/* Balances */}
              <div className="text-right shrink-0">
                <div className="text-xs font-black text-amber-400 font-mono flex items-center justify-end gap-1">
                  <Coins className="w-3 h-3" />
                  ${player.balance}
                </div>
                <div className="text-[10px] text-stone-500 font-medium">
                  Net: ${netWorth}
                </div>
              </div>
            </div>

            {/* Properties swatches */}
            {ownedTiles.length > 0 && !player.bankrupt && (
              <div className="flex flex-wrap items-center gap-1 mt-0.5">
                {ownedTiles.map((tile) => {
                  const prop = ownership[tile.id];
                  const groupMeta = tile.group ? PROPERTY_GROUPS[tile.group] : null;
                  return (
                    <button
                      key={tile.id}
                      onClick={() => {
                        audio.play('button-click');
                        onTileClick(tile.id);
                      }}
                      title={`${tile.name} (${prop.houses > 0 ? (prop.houses === 5 ? 'Hotel' : `${prop.houses} Houses`) : 'Base property'})`}
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-0.5 transition hover:scale-105 border border-stone-700/60 shadow-xs cursor-pointer"
                      style={{
                        backgroundColor: groupMeta ? groupMeta.hex : '#334155',
                        color: '#ffffff',
                      }}
                    >
                      <span className="truncate max-w-[65px]">{tile.name}</span>
                      {prop.houses > 0 && (
                        <span className="ml-0.5 px-0.5 rounded text-[8px] bg-black/50 text-amber-300 font-mono">
                          {prop.houses === 5 ? 'H' : prop.houses}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Quick Actions (Trade) */}
            {!player.bankrupt && (
              <div className="flex items-center justify-between pt-1 border-t border-stone-800/60 text-[10px]">
                <span className="text-stone-500">
                  {ownedTiles.length} {ownedTiles.length === 1 ? 'property' : 'properties'}
                </span>
                <button
                  onClick={() => {
                    audio.play('button-click');
                    onOpenTrade(player.id);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <ArrowLeftRight className="w-3 h-3 text-amber-400" />
                  Trade
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

import React from 'react';
import { Player, BoardTile, OwnershipMap } from '../types';
import { CHARACTERS } from '../data/charactersData';
import { PROPERTY_GROUPS } from '../data/boardData';
import { calculateNetWorth } from '../utils/gameHelpers';
import { audio } from '../utils/audio';
import {
  X,
  User,
  Bot,
  Coins,
  Building2,
  Home,
  ArrowLeftRight,
  Volume2,
  VolumeX,
  Lock,
  Flag,
  Sparkles,
} from 'lucide-react';

interface PlayerInspectorModalProps {
  player: Player | null;
  activePlayer: Player;
  tiles: BoardTile[];
  ownership: OwnershipMap;
  onClose: () => void;
  onOpenTrade: (targetPlayerId: string) => void;
  onTileClick: (tileId: number) => void;
}

export const PlayerInspectorModal: React.FC<PlayerInspectorModalProps> = ({
  player,
  activePlayer,
  tiles,
  ownership,
  onClose,
  onOpenTrade,
  onTileClick,
}) => {
  if (!player) return null;

  const charDef = CHARACTERS[player.character];
  const netWorth = calculateNetWorth(player, tiles, ownership);
  const ownedTiles = tiles.filter((t) => ownership[t.id]?.ownerId === player.id);
  const totalHouses = ownedTiles.reduce(
    (acc, t) => acc + (ownership[t.id]?.houses || 0),
    0
  );

  return (
    <div
      id="player-inspector-backdrop"
      className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="player-inspector-card"
        onClick={(e) => e.stopPropagation()}
        className="bg-stone-900 text-stone-100 rounded-3xl shadow-2xl border border-stone-800 w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header with Player Color */}
        <div
          className="p-5 border-b border-stone-800 relative flex items-center gap-4 text-white"
          style={{
            background: `linear-gradient(135deg, ${player.color}dd, #1c1917)`,
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg border-2 border-white/20 shrink-0"
            style={{ backgroundColor: player.color }}
          >
            {charDef ? charDef.emoji : '🦆'}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black truncate">{player.name}</h2>
              {player.isAI || player.isBot ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/40 text-stone-200 font-bold uppercase tracking-wider border border-white/20">
                  {player.difficulty || 'Bot'}
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 font-bold uppercase tracking-wider border border-emerald-400/40">
                  Human Tycoon
                </span>
              )}
            </div>
            <p className="text-xs text-white/80 italic mt-0.5">
              {charDef ? charDef.tagline : 'Venture capitalist in Town Tycoon'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              audio.play('button-click');
              onClose();
            }}
            className="text-white/80 hover:text-white p-1.5 rounded-full bg-black/30 hover:bg-black/50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="p-4 grid grid-cols-3 gap-2 bg-stone-950/60 border-b border-stone-800 text-center">
          <div className="p-2 rounded-xl bg-stone-900/80 border border-stone-800">
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Cash</span>
            <div className="text-base font-black text-amber-400 font-mono mt-0.5">
              ${player.balance}
            </div>
          </div>
          <div className="p-2 rounded-xl bg-stone-900/80 border border-stone-800">
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Net Worth</span>
            <div className="text-base font-black text-emerald-400 font-mono mt-0.5">
              ${netWorth}
            </div>
          </div>
          <div className="p-2 rounded-xl bg-stone-900/80 border border-stone-800">
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Laps Done</span>
            <div className="text-base font-black text-cyan-400 font-mono mt-0.5 flex items-center justify-center gap-1">
              <Flag className="w-3.5 h-3.5" />
              {player.lapCount || 0}
            </div>
          </div>
        </div>

        {/* Status flags */}
        <div className="px-4 py-2 bg-stone-900/40 flex items-center justify-between text-xs border-b border-stone-800">
          <div className="flex items-center gap-3">
            {player.inDetention ? (
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> In Detention ({player.detentionTurns}/3)
              </span>
            ) : (
              <span className="text-stone-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Free Explorer
              </span>
            )}

            {player.detentionPasses > 0 && (
              <span className="text-purple-300 text-[11px] font-semibold bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30">
                {player.detentionPasses} Pass{player.detentionPasses > 1 ? 'es' : ''}
              </span>
            )}
          </div>

          <div className="text-stone-400 text-xs">
            Properties: <strong className="text-stone-200">{ownedTiles.length}</strong> (Upgrades: {totalHouses})
          </div>
        </div>

        {/* Owned Property Deed List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            Owned Town Deeds ({ownedTiles.length})
          </h3>

          {ownedTiles.length === 0 ? (
            <div className="text-center py-8 text-stone-500 text-xs italic bg-stone-950/40 rounded-xl border border-stone-800/60">
              This player currently owns no properties.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ownedTiles.map((tile) => {
                const prop = ownership[tile.id];
                const groupMeta = tile.group ? PROPERTY_GROUPS[tile.group] : null;
                const houses = prop?.houses || 0;
                const rent = tile.rent ? tile.rent[houses] : 0;

                return (
                  <div
                    key={tile.id}
                    onClick={() => {
                      audio.play('ui-click');
                      onTileClick(tile.id);
                    }}
                    className="p-2 rounded-xl bg-stone-950/80 hover:bg-stone-950 border border-stone-800 hover:border-amber-400/60 transition cursor-pointer flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-2 h-8 rounded-sm shrink-0"
                        style={{ backgroundColor: groupMeta?.hex || '#78716c' }}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-stone-200 truncate">
                          {tile.name}
                        </div>
                        <div className="text-[10px] text-stone-400 flex items-center gap-1.5">
                          <span>Rent: ${rent}</span>
                          {houses > 0 && (
                            <span className="text-amber-400 font-bold">
                              • {houses === 5 ? 'Hotel' : `${houses}H`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {prop?.isMortgaged && (
                      <span className="text-[8px] px-1 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 uppercase font-bold shrink-0">
                        Mortgaged
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions: Trade Proposal */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              audio.play('button-click');
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition cursor-pointer"
          >
            Close
          </button>

          {player.id !== activePlayer.id && !player.bankrupt && !activePlayer.bankrupt && (
            <button
              type="button"
              onClick={() => {
                audio.play('button-click');
                onClose();
                onOpenTrade(player.id);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Propose Trade
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

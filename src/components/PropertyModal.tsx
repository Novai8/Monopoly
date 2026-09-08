import React from 'react';
import { BoardTile, OwnershipMap, Player } from '../types';
import { PROPERTY_GROUPS } from '../data/boardData';
import { ownsFullGroup } from '../utils/gameHelpers';
import { audio } from '../utils/audio';
import { X, Home, Building2, ShieldAlert, ArrowUpCircle } from 'lucide-react';

interface PropertyModalProps {
  tile: BoardTile | null;
  tiles: BoardTile[];
  ownership: OwnershipMap;
  players: Player[];
  activePlayer: Player;
  onClose: () => void;
  onBuyHouse?: (tileId: number) => void;
  onSellHouse?: (tileId: number) => void;
  onMortgage?: (tileId: number) => void;
  onUnmortgage?: (tileId: number) => void;
}

export const PropertyModal: React.FC<PropertyModalProps> = ({
  tile,
  tiles,
  ownership,
  players,
  activePlayer,
  onClose,
  onBuyHouse,
  onSellHouse,
  onMortgage,
  onUnmortgage,
}) => {
  if (!tile) return null;

  const prop = ownership[tile.id];
  const owner = prop?.ownerId ? players.find((p) => p.id === prop.ownerId) : null;
  const isOwnedByActive = owner?.id === activePlayer.id;
  const groupMeta = tile.group ? PROPERTY_GROUPS[tile.group] : null;
  const hasFullSet = tile.group ? ownsFullGroup(tile.group, activePlayer.id, tiles, ownership) : false;

  const canBuildHouse =
    isOwnedByActive &&
    hasFullSet &&
    tile.type === 'property' &&
    prop &&
    prop.houses < 5 &&
    !prop.isMortgaged &&
    tile.houseCost &&
    activePlayer.balance >= tile.houseCost;

  const canSellHouse = isOwnedByActive && prop && prop.houses > 0;
  const canMortgage = isOwnedByActive && prop && !prop.isMortgaged && prop.houses === 0;
  const unmortgageCost = tile.mortgageValue ? Math.round(tile.mortgageValue * 1.1) : 0;
  const canUnmortgage =
    isOwnedByActive && prop && prop.isMortgaged && activePlayer.balance >= unmortgageCost;

  return (
    <div
      id="property-modal-overlay"
      className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="property-deed-card"
        onClick={(e) => e.stopPropagation()}
        className="bg-stone-900 text-stone-100 rounded-3xl shadow-2xl border border-stone-800 w-full max-w-sm overflow-hidden flex flex-col"
      >
        {/* Color Banner */}
        {tile.group && groupMeta ? (
          <div
            className="p-4 text-center border-b border-stone-800 flex flex-col items-center justify-center relative"
            style={{ backgroundColor: groupMeta.hex }}
          >
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/90">
              {groupMeta.name}
            </span>
            <h2 className="text-xl font-black uppercase text-white tracking-wider drop-shadow-xs">
              {tile.name}
            </h2>
            <button
              onClick={() => {
                audio.play('button-click');
                onClose();
              }}
              className="absolute top-3 right-3 text-white/80 hover:text-white p-1 rounded-full bg-black/20 hover:bg-black/40 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="p-4 text-center bg-stone-800 text-stone-100 border-b border-stone-700 relative">
            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
              {tile.type.toUpperCase()}
            </span>
            <h2 className="text-lg font-bold text-amber-300">{tile.name}</h2>
            <button
              onClick={() => {
                audio.play('button-click');
                onClose();
              }}
              className="absolute top-3 right-3 text-stone-300 hover:text-white p-1 rounded-full bg-stone-700 hover:bg-stone-600 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Deed Body */}
        <div className="p-4 flex-1 flex flex-col gap-3 text-xs">
          {/* Owner status */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-stone-950 border border-stone-800">
            <span className="font-semibold text-stone-400">Owner:</span>
            {owner ? (
              <span
                className="font-bold px-2 py-0.5 rounded-lg text-white text-[11px]"
                style={{ backgroundColor: owner.color }}
              >
                {owner.name} {owner.id === activePlayer.id ? '(You)' : ''}
              </span>
            ) : (
              <span className="font-bold text-amber-400 italic">Available for Purchase</span>
            )}
          </div>

          {/* Rents breakdown */}
          {tile.type === 'property' && tile.rent && (
            <div className="space-y-1 divide-y divide-stone-800">
              <div className="flex justify-between py-1 font-semibold">
                <span className="text-stone-300">Base Street Rent</span>
                <span className="text-amber-400 font-mono">${tile.rent[0]}</span>
              </div>
              <div className="flex justify-between py-1 text-stone-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-xs bg-emerald-500 inline-block" /> With 1 House
                </span>
                <span className="font-mono">${tile.rent[1]}</span>
              </div>
              <div className="flex justify-between py-1 text-stone-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-xs bg-emerald-500 inline-block" /> With 2 Houses
                </span>
                <span className="font-mono">${tile.rent[2]}</span>
              </div>
              <div className="flex justify-between py-1 text-stone-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-xs bg-emerald-500 inline-block" /> With 3 Houses
                </span>
                <span className="font-mono">${tile.rent[3]}</span>
              </div>
              <div className="flex justify-between py-1 text-stone-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-xs bg-emerald-500 inline-block" /> With 4 Houses
                </span>
                <span className="font-mono">${tile.rent[4]}</span>
              </div>
              <div className="flex justify-between py-1 font-bold text-red-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2 rounded-xs bg-red-500 inline-block" /> With HOTEL
                </span>
                <span className="font-mono">${tile.rent[5]}</span>
              </div>
            </div>
          )}

          {tile.type === 'station' && (
            <div className="space-y-1 text-stone-300">
              <div className="flex justify-between py-1"><span>Rent with 1 Station:</span><span className="font-mono">$25</span></div>
              <div className="flex justify-between py-1"><span>Rent with 2 Stations:</span><span className="font-mono">$50</span></div>
              <div className="flex justify-between py-1"><span>Rent with 3 Stations:</span><span className="font-mono">$100</span></div>
              <div className="flex justify-between py-1"><span>Rent with 4 Stations:</span><span className="font-mono">$200</span></div>
            </div>
          )}

          {tile.type === 'utility' && (
            <div className="space-y-1.5 text-stone-300">
              <p>If 1 Utility is owned, rent is 4 times the amount rolled on the dice.</p>
              <p>If both Utilities are owned, rent is 10 times the amount rolled on the dice.</p>
            </div>
          )}

          {/* Pricing stats */}
          <div className="border-t border-stone-800 pt-2 grid grid-cols-2 gap-2 text-stone-400 text-[11px]">
            {tile.cost && (
              <div>
                <span className="font-semibold text-stone-300">Purchase Price:</span> ${tile.cost}
              </div>
            )}
            {tile.mortgageValue && (
              <div>
                <span className="font-semibold text-stone-300">Mortgage Value:</span> ${tile.mortgageValue}
              </div>
            )}
            {tile.houseCost && (
              <div className="col-span-2">
                <span className="font-semibold text-stone-300">Upgrade Cost (per House):</span> ${tile.houseCost}
              </div>
            )}
          </div>

          {/* Management controls for active player */}
          {isOwnedByActive && (
            <div className="border-t border-stone-800 pt-3 flex flex-col gap-2">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                Management Actions
              </span>
              <div className="grid grid-cols-2 gap-2">
                {tile.type === 'property' && (
                  <>
                    <button
                      disabled={!canBuildHouse}
                      onClick={() => {
                        audio.play('property-buy');
                        onBuyHouse && onBuyHouse(tile.id);
                      }}
                      className={`px-3 py-2 rounded-xl font-bold flex items-center justify-center gap-1 text-[11px] transition cursor-pointer ${
                        canBuildHouse
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                          : 'bg-stone-800 text-stone-500 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <Home className="w-3.5 h-3.5" />
                      Build (${tile.houseCost})
                    </button>
                    <button
                      disabled={!canSellHouse}
                      onClick={() => {
                        audio.play('property-buy');
                        onSellHouse && onSellHouse(tile.id);
                      }}
                      className={`px-3 py-2 rounded-xl font-bold flex items-center justify-center gap-1 text-[11px] transition cursor-pointer ${
                        canSellHouse
                          ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 shadow-md'
                          : 'bg-stone-800 text-stone-500 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      Sell (${tile.houseCost ? tile.houseCost / 2 : 0})
                    </button>
                  </>
                )}

                {prop && !prop.isMortgaged ? (
                  <button
                    disabled={!canMortgage}
                    onClick={() => {
                      audio.play('button-click');
                      onMortgage && onMortgage(tile.id);
                    }}
                    className={`col-span-2 px-3 py-2 rounded-xl font-bold flex items-center justify-center gap-1 text-[11px] transition cursor-pointer ${
                      canMortgage
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md'
                        : 'bg-stone-800 text-stone-500 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Mortgage (+${tile.mortgageValue})
                  </button>
                ) : (
                  <button
                    disabled={!canUnmortgage}
                    onClick={() => {
                      audio.play('property-buy');
                      onUnmortgage && onUnmortgage(tile.id);
                    }}
                    className={`col-span-2 px-3 py-2 rounded-xl font-bold flex items-center justify-center gap-1 text-[11px] transition cursor-pointer ${
                      canUnmortgage
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
                        : 'bg-stone-800 text-stone-500 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <ArrowUpCircle className="w-3.5 h-3.5" />
                    Unmortgage (-${unmortgageCost})
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

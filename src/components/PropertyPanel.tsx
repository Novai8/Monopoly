import React, { useState, useMemo } from 'react';
import { BoardTile, OwnershipMap, Player } from '../types';
import { PROPERTY_GROUPS } from '../data/boardData';
import { CHARACTERS } from '../data/charactersData';
import { audio } from '../utils/audio';
import {
  Building2,
  Home,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  CheckCircle2,
  Lock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export type PropertyFilter = 'all' | 'mine' | 'available' | 'other' | 'upgraded' | 'special';

interface PropertyPanelProps {
  tiles: BoardTile[];
  ownership: OwnershipMap;
  players: Player[];
  activePlayer: Player;
  onSelectTile: (tileId: number) => void;
  onHighlightTile?: (tileId: number | null) => void;
  isOpenDefault?: boolean;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  tiles,
  ownership,
  players,
  activePlayer,
  onSelectTile,
  onHighlightTile,
  isOpenDefault = true,
}) => {
  const [isOpen, setIsOpen] = useState(isOpenDefault);
  const [activeFilter, setActiveFilter] = useState<PropertyFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Count items per filter category
  const propertyTiles = useMemo(() => {
    return tiles.filter(
      (t) => t.type === 'property' || t.type === 'station' || t.type === 'utility'
    );
  }, [tiles]);

  const counts = useMemo(() => {
    let mine = 0;
    let available = 0;
    let other = 0;
    let upgraded = 0;
    let special = 0;

    propertyTiles.forEach((tile) => {
      const prop = ownership[tile.id];
      if (tile.type === 'station' || tile.type === 'utility') {
        special++;
      }
      if (!prop || !prop.ownerId) {
        available++;
      } else if (prop.ownerId === activePlayer.id) {
        mine++;
        if (prop.houses > 0) upgraded++;
      } else {
        other++;
        if (prop.houses > 0) upgraded++;
      }
    });

    return {
      all: propertyTiles.length,
      mine,
      available,
      other,
      upgraded,
      special,
    };
  }, [propertyTiles, ownership, activePlayer.id]);

  // Filtered properties
  const filteredProperties = useMemo(() => {
    return propertyTiles.filter((tile) => {
      const prop = ownership[tile.id];
      const matchesSearch =
        tile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tile.group && tile.group.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchesSearch) return false;

      switch (activeFilter) {
        case 'mine':
          return prop?.ownerId === activePlayer.id;
        case 'available':
          return !prop || !prop.ownerId;
        case 'other':
          return prop?.ownerId && prop.ownerId !== activePlayer.id;
        case 'upgraded':
          return prop && prop.houses > 0;
        case 'special':
          return tile.type === 'station' || tile.type === 'utility';
        case 'all':
        default:
          return true;
      }
    });
  }, [propertyTiles, ownership, activePlayer.id, activeFilter, searchQuery]);

  return (
    <div className="flex flex-col bg-stone-900/90 border border-stone-800 rounded-2xl overflow-hidden shadow-inner">
      {/* Accordion Header */}
      <button
        type="button"
        onClick={() => {
          audio.play('button-click');
          setIsOpen(!isOpen);
        }}
        className="w-full px-3.5 py-2.5 bg-stone-950 hover:bg-stone-900 transition flex items-center justify-between text-left border-b border-stone-800 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-stone-200 tracking-wide">
            PROPERTIES & ITEMS
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-800 text-stone-400 font-medium">
            {propertyTiles.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-stone-400">
          <span className="text-[10px] text-stone-500 font-mono">
            {activeFilter.toUpperCase()}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Accordion Body */}
      {isOpen && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Search and Filters Bar */}
          <div className="p-2 border-b border-stone-800/80 bg-stone-950/40 flex flex-col gap-1.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search town properties..."
                className="w-full bg-stone-900 border border-stone-800 rounded-lg pl-8 pr-3 py-1 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-400/60"
              />
            </div>

            {/* Filter Pills with Counts */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar text-[10px]">
              {(
                [
                  { id: 'all', label: 'All', count: counts.all },
                  { id: 'mine', label: 'Mine', count: counts.mine },
                  { id: 'available', label: 'Available', count: counts.available },
                  { id: 'other', label: 'Other', count: counts.other },
                  { id: 'upgraded', label: 'Upgraded', count: counts.upgraded },
                  { id: 'special', label: 'Special', count: counts.special },
                ] as const
              ).map((f) => {
                const isSelected = activeFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      audio.play('ui-hover');
                      setActiveFilter(f.id);
                    }}
                    className={`px-2 py-1 rounded-md font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-amber-400 text-stone-950 shadow-xs'
                        : 'bg-stone-800/80 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                    }`}
                  >
                    <span>{f.label}</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded-full font-mono ${
                        isSelected ? 'bg-black/20 text-stone-950' : 'bg-stone-900 text-stone-500'
                      }`}
                    >
                      {f.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Properties List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[380px]">
            {filteredProperties.length === 0 ? (
              <div className="text-center py-6 text-xs text-stone-500 italic">
                No properties match the filter.
              </div>
            ) : (
              filteredProperties.map((tile) => {
                const prop = ownership[tile.id];
                const owner = prop?.ownerId ? players.find((p) => p.id === prop.ownerId) : null;
                const isMine = owner?.id === activePlayer.id;
                const groupMeta = tile.group ? PROPERTY_GROUPS[tile.group] : null;

                // Determine badge
                let statusLabel = 'AVAILABLE';
                let statusClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

                if (prop?.isMortgaged) {
                  statusLabel = 'MORTGAGED';
                  statusClass = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
                } else if (isMine) {
                  statusLabel = prop && prop.houses > 0 ? 'UPGRADED (YOU)' : 'OWNED BY YOU';
                  statusClass = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                } else if (owner) {
                  statusLabel = `OWNED BY ${owner.name.toUpperCase()}`;
                  statusClass = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
                } else if (tile.type === 'station' || tile.type === 'utility') {
                  statusLabel = 'SPECIAL';
                  statusClass = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
                }

                // Current Rent calculation display
                let currentRent = tile.rent ? tile.rent[0] : 0;
                if (prop && tile.rent) {
                  currentRent = tile.rent[prop.houses] ?? tile.rent[0];
                }

                return (
                  <div
                    key={tile.id}
                    onClick={() => {
                      audio.play('ui-click');
                      onSelectTile(tile.id);
                    }}
                    onMouseEnter={() => onHighlightTile?.(tile.id)}
                    onMouseLeave={() => onHighlightTile?.(null)}
                    className="p-2 rounded-xl bg-stone-950/70 hover:bg-stone-950 border border-stone-800/80 hover:border-amber-400/50 transition cursor-pointer flex items-center justify-between gap-2 group"
                  >
                    {/* Left: Color Bar & Details */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Color Tag / Type Tag */}
                      <div
                        className="w-2.5 h-10 rounded-sm shrink-0 shadow-xs"
                        style={{
                          backgroundColor:
                            groupMeta?.hex ||
                            (tile.type === 'station'
                              ? '#0284c7'
                              : tile.type === 'utility'
                              ? '#d97706'
                              : '#78716c'),
                        }}
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-xs font-bold text-stone-200 truncate group-hover:text-amber-300 transition">
                            {tile.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-stone-400 mt-0.5">
                          <span>Cost: <strong className="text-stone-300">${tile.cost || 0}</strong></span>
                          <span>•</span>
                          <span>Rent: <strong className="text-amber-400">${currentRent}</strong></span>
                          {prop && prop.houses > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-400 flex items-center gap-0.5 font-bold">
                                <Home className="w-2.5 h-2.5" />
                                {prop.houses === 5 ? 'Hotel' : `${prop.houses}H`}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Owner chip */}
                        {owner && (
                          <div className="flex items-center gap-1 mt-1">
                            <div
                              className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] text-white shadow-xs"
                              style={{ backgroundColor: owner.color }}
                            >
                              {CHARACTERS[owner.character]?.emoji || '●'}
                            </div>
                            <span className="text-[10px] text-stone-400 truncate">
                              {owner.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Status Pill & Action button */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold border uppercase tracking-wider ${statusClass}`}
                      >
                        {statusLabel}
                      </span>
                      <span className="text-[10px] text-stone-500 opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5 text-amber-400">
                        Deed <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useRef, useEffect } from 'react';
import { GameLogEntry } from '../types';
import { ScrollText, Dice5, ShoppingCart, Landmark, AlertOctagon, HelpCircle, ArrowRight, Gavel, Shuffle } from 'lucide-react';

interface GameLogProps {
  entries: GameLogEntry[];
}

export const GameLog: React.FC<GameLogProps> = ({ entries }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolledUpRef = useRef(false);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    // If user scrolled more than 50px away from bottom, don't jerk them down
    isScrolledUpRef.current = scrollHeight - (scrollTop + clientHeight) > 50;
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el || isScrolledUpRef.current) return;
    const pageScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const pageScrollX = window.scrollX || document.documentElement.scrollLeft || 0;
    el.scrollTop = el.scrollHeight;
    const currentPageScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    if (currentPageScrollY !== pageScrollY) {
      window.scrollTo({ top: pageScrollY, left: pageScrollX, behavior: 'instant' as ScrollBehavior });
    }
  }, [entries]);

  const scrollToBottom = () => {
    const el = containerRef.current;
    if (!el) return;
    isScrolledUpRef.current = false;
    const pageScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const pageScrollX = window.scrollX || document.documentElement.scrollLeft || 0;
    el.scrollTop = el.scrollHeight;
    const currentPageScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    if (currentPageScrollY !== pageScrollY) {
      window.scrollTo({ top: pageScrollY, left: pageScrollX, behavior: 'instant' as ScrollBehavior });
    }
  };

  const renderIcon = (type: GameLogEntry['type']) => {
    switch (type) {
      case 'roll':
        return <Dice5 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />;
      case 'buy':
        return <ShoppingCart className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />;
      case 'rent':
        return <Landmark className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />;
      case 'card':
        return <HelpCircle className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />;
      case 'bankruptcy':
        return <AlertOctagon className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />;
      case 'detention':
        return <AlertOctagon className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />;
      case 'auction':
        return <Gavel className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />;
      case 'chaos':
        return <Shuffle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />;
      default:
        return <ArrowRight className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-900/90 border border-stone-800 rounded-2xl overflow-hidden shadow-inner">
      <div className="px-3.5 py-2.5 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-stone-200">
          <ScrollText className="w-4 h-4 text-amber-400" />
          Town Chronicle
        </div>
        <span className="text-[10px] text-stone-500 font-medium">
          {entries.length} events
        </span>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{ overflowAnchor: 'none' }}
        className="flex-1 overflow-y-auto p-2.5 space-y-1.5 text-xs relative"
      >
        {entries.length === 0 ? (
          <div className="text-stone-500 italic text-center py-6 text-[11px]">
            The game has just begun. Roll the dice to write history!
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-2 p-1.5 rounded-xl bg-stone-950/60 hover:bg-stone-950 border border-stone-800/80 text-stone-300 leading-relaxed transition"
            >
              {renderIcon(entry.type)}
              <div className="flex-1">
                <span className="text-stone-200">{entry.text}</span>
              </div>
              <span className="text-[9px] text-stone-500 font-mono shrink-0">
                {entry.timestamp}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

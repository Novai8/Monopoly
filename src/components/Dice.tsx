import React from 'react';
import { motion } from 'motion/react';
import { Dices } from 'lucide-react';

interface DiceProps {
  dice: [number, number];
  isRolling: boolean;
  canRoll: boolean;
  onRoll: () => void;
  rollSummary?: string | null;
}

export const Dice: React.FC<DiceProps> = ({
  dice,
  isRolling,
  canRoll,
  onRoll,
  rollSummary,
}) => {
  const renderDots = (value: number) => {
    const dotCoords: Record<number, number[][]> = {
      1: [[50, 50]],
      2: [
        [25, 25],
        [75, 75],
      ],
      3: [
        [25, 25],
        [50, 50],
        [75, 75],
      ],
      4: [
        [25, 25],
        [25, 75],
        [75, 25],
        [75, 75],
      ],
      5: [
        [25, 25],
        [25, 75],
        [50, 50],
        [75, 25],
        [75, 75],
      ],
      6: [
        [25, 25],
        [25, 50],
        [25, 75],
        [75, 25],
        [75, 50],
        [75, 75],
      ],
    };

    const coords = dotCoords[value] || dotCoords[1];

    return (
      <svg className="w-full h-full" viewBox="0 0 100 100">
        {coords.map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={10}
            className="fill-stone-900"
          />
        ))}
      </svg>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      {/* Visual Dice Display */}
      <div className="flex items-center gap-4">
        {[0, 1].map((idx) => (
          <motion.div
            key={idx}
            animate={
              isRolling
                ? {
                    rotate: [0, 90, 180, 270, 360],
                    scale: [1, 1.15, 0.95, 1.1, 1],
                  }
                : { rotate: 0, scale: 1 }
            }
            transition={{
              repeat: isRolling ? Infinity : 0,
              duration: 0.35,
              ease: 'linear',
            }}
            className="w-14 h-14 bg-amber-50 rounded-xl shadow-lg border-2 border-amber-200/80 p-2 flex items-center justify-center relative overflow-hidden"
          >
            {renderDots(dice[idx])}
          </motion.div>
        ))}
      </div>

      {/* Dice Sum & Doubles alert */}
      {rollSummary && !isRolling && (
        <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/30">
          {rollSummary}
        </div>
      )}

      {/* Roll Action Button */}
      <button
        id="roll-dice-btn"
        type="button"
        disabled={!canRoll || isRolling}
        onClick={(e) => {
          (e.currentTarget as HTMLElement)?.blur();
          onRoll();
        }}
        className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md active:scale-95
          ${
            canRoll && !isRolling
              ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer shadow-amber-500/25 hover:shadow-amber-500/40'
              : 'bg-stone-700/60 text-stone-400 cursor-not-allowed border border-stone-600/40'
          }
        `}
      >
        <Dices className={`w-5 h-5 ${isRolling ? 'animate-spin' : ''}`} />
        {isRolling ? 'Rolling...' : canRoll ? 'Roll Dice' : 'Wait...'}
      </button>
    </div>
  );
};

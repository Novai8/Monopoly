import React from 'react';
import { OpeningRollState, Player } from '../types';
import { CHARACTERS } from '../data/charactersData';
import { Dices, Trophy, ArrowRight, RefreshCw } from 'lucide-react';
import { audio } from '../utils/audio';

interface OpeningRollModalProps {
  openingRoll: OpeningRollState | null;
  players: Player[];
  onProceed: () => void;
  onRerollTie?: () => void;
}

export const OpeningRollModal: React.FC<OpeningRollModalProps> = ({
  openingRoll,
  players,
  onProceed,
  onRerollTie,
}) => {
  if (!openingRoll) return null;

  const winner = players.find((p) => p.id === openingRoll.winnerId);
  const hasTie = openingRoll.tiedPlayerIds.length > 1 && !openingRoll.winnerId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl p-6 flex flex-col items-center gap-5 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <Dices className="w-6 h-6" />
        </div>

        <div>
          <h2 className="text-xl font-black text-white">Opening Roll</h2>
          <p className="text-xs text-stone-400">
            {winner
              ? 'Turn order decided by highest dice total'
              : hasTie
              ? 'Tie detected for highest roll! Tied players re-roll'
              : 'Rolling dice to determine turn order'}
          </p>
        </div>

        {/* List of Player Rolls */}
        <div className="w-full space-y-2">
          {players.map((player) => {
            const roll = openingRoll.rolls[player.id];
            const isWinner = openingRoll.winnerId === player.id;
            const isTied = openingRoll.tiedPlayerIds.includes(player.id);
            const charDef = CHARACTERS[player.character];

            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isWinner
                    ? 'bg-amber-500/20 border-amber-500/60 shadow-md shadow-amber-500/10'
                    : isTied
                    ? 'bg-blue-500/10 border-blue-500/40'
                    : 'bg-stone-950/60 border-stone-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{charDef?.emoji || '👤'}</span>
                  <div className="text-left">
                    <div className="font-bold text-xs text-stone-100 flex items-center gap-1.5">
                      <span>{player.name}</span>
                      {isWinner && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 text-[10px] font-black">
                          <Trophy className="w-3 h-3" /> 1ST
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {roll !== undefined ? (
                    <div className="flex items-center gap-1.5">
                      <span className="w-8 h-8 rounded-lg bg-amber-500 text-stone-950 font-mono font-black text-sm flex items-center justify-center shadow-sm">
                        {roll}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-stone-500 italic">Rolling...</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Status / Announcement Box */}
        {winner && (
          <div className="w-full p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            {winner.name} rolled the highest total and takes the first turn!
          </div>
        )}

        {/* Action Button */}
        {hasTie ? (
          <button
            onClick={() => {
              audio.play('dice-roll');
              onRerollTie?.();
            }}
            className="w-full bg-blue-500 hover:bg-blue-400 text-white font-black py-3 rounded-xl shadow-lg shadow-blue-500/20 text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reroll Tied Players</span>
          </button>
        ) : (
          <button
            onClick={() => {
              audio.play('ui-click');
              onProceed();
            }}
            className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-black py-3 rounded-xl shadow-lg shadow-amber-500/20 text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <span>Proceed to Turn 1</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

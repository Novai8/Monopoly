import React from 'react';
import { X, BookOpen, Gavel, Building2, Shuffle, CheckCircle2 } from 'lucide-react';
import { audio } from '../utils/audio';

interface RulesModalProps {
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  return (
    <div
      id="rules-modal-overlay"
      className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="rules-dialog"
        onClick={(e) => e.stopPropagation()}
        className="bg-stone-900 border border-stone-800 text-stone-100 rounded-3xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-100">
                Town Tycoon 3D Rules & Guide
              </h2>
              <p className="text-xs text-stone-400">Simple English quick reference</p>
            </div>
          </div>
          <button
            onClick={() => {
              audio.play('button-click');
              onClose();
            }}
            className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-3.5 text-xs text-stone-300 leading-relaxed">
          <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800">
            <h3 className="text-amber-400 font-bold text-sm mb-1 flex items-center gap-1.5">
              <Building2 className="w-4 h-4" /> 1. Buying Properties & Passing
            </h3>
            <p>
              When you land on an unowned street, station, or utility, you can buy it for the listed price.
              If you pass, the property immediately goes to a live <strong>public auction</strong> where any active player can bid!
            </p>
          </div>

          <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800">
            <h3 className="text-amber-400 font-bold text-sm mb-1 flex items-center gap-1.5">
              <Gavel className="w-4 h-4" /> 2. Live Public Auctions
            </h3>
            <p>
              Auctions start at $10. Players take turns placing bids in increments of $10, $50, or $100.
              Each bid resets the countdown clock. The highest bidder wins the property.
            </p>
          </div>

          <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800">
            <h3 className="text-amber-400 font-bold text-sm mb-1">3. District Monopolies & Rent</h3>
            <p>
              When you own all streets in a color group, unimproved rent is automatically <strong>doubled</strong>.
              You can then build houses and upgrade to a Hotel tower for massive payouts.
            </p>
          </div>

          <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800">
            <h3 className="text-amber-400 font-bold text-sm mb-1 flex items-center gap-1.5">
              <Shuffle className="w-4 h-4" /> 4. Lucky Events & Chaos Cards
            </h3>
            <p>
              Drawing cards can earn you cash prizes, grants, or cause surprise chaos: like position swaps with opponents,
              rent storms, or emergency building repairs.
            </p>
          </div>

          <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800">
            <h3 className="text-amber-400 font-bold text-sm mb-1">5. Town Detention</h3>
            <p>
              Landed in Detention? You can escape by rolling doubles on your turn, paying the $50 bail fee,
              or using a saved Free Pass card.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex justify-end">
          <button
            onClick={() => {
              audio.play('button-click');
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs transition cursor-pointer"
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  );
};

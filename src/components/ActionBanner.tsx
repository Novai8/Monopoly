import React from 'react';
import { BoardTile, Card, OwnershipMap, Player } from '../types';
import { audio } from '../utils/audio';
import {
  CheckCircle,
  XCircle,
  HelpCircle,
  Landmark,
  KeyRound,
  DollarSign,
  ArrowRight,
  Sparkles,
  Gavel,
  Shuffle,
  Users,
} from 'lucide-react';

interface ActionBannerProps {
  activePlayer: Player;
  currentTile: BoardTile;
  ownership: OwnershipMap;
  drawnCard: Card | null;
  pendingRent: { amount: number; recipient: Player } | null;
  pendingTax: number | null;
  canBuyProperty: boolean;
  players: Player[];
  onBuyProperty: () => void;
  onPassProperty: () => void;
  onPayRent: () => void;
  onPayTax: () => void;
  onDismissCard: (targetPlayerId?: string) => void;
  onPayDetentionBail: () => void;
  onUseFreePass: () => void;
  onEndTurn: () => void;
  canEndTurn: boolean;
  isBotTurn: boolean;
}

export const ActionBanner: React.FC<ActionBannerProps> = ({
  activePlayer,
  currentTile,
  ownership,
  drawnCard,
  pendingRent,
  pendingTax,
  canBuyProperty,
  players,
  onBuyProperty,
  onPassProperty,
  onPayRent,
  onPayTax,
  onDismissCard,
  onPayDetentionBail,
  onUseFreePass,
  onEndTurn,
  canEndTurn,
  isBotTurn,
}) => {
  const [selectedTargetId, setSelectedTargetId] = React.useState<string>('');

  const eligibleTargetPlayers = players.filter(
    (p) => p.id !== activePlayer.id && !p.bankrupt
  );

  return (
    <div
      id="action-banner"
      className="w-full bg-stone-900/95 border border-stone-800 rounded-2xl p-4 shadow-xl flex flex-col items-center justify-center text-center gap-3 backdrop-blur-xs min-h-[110px]"
    >
      {/* 1. In Detention Options */}
      {activePlayer.inDetention && (
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs font-semibold text-amber-400">
            {activePlayer.name} is in Detention (Turn {activePlayer.detentionTurns + 1} of 3). Roll doubles to leave!
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {activePlayer.balance >= 50 && !isBotTurn && (
              <button
                type="button"
                onClick={(e) => {
                  (e.currentTarget as HTMLElement)?.blur();
                  audio.play('button-click');
                  onPayDetentionBail();
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
              >
                <DollarSign className="w-3.5 h-3.5" />
                Pay $50 Bail Fee
              </button>
            )}
            {((activePlayer.detentionPasses ?? activePlayer.freePasses ?? 0) > 0) && !isBotTurn && (
              <button
                type="button"
                onClick={(e) => {
                  (e.currentTarget as HTMLElement)?.blur();
                  audio.play('button-click');
                  onUseFreePass();
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Use Detention Free Pass ({activePlayer.detentionPasses ?? activePlayer.freePasses ?? 0} left)
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Drawn Card Display */}
      {drawnCard && (
        <div className="flex flex-col items-center gap-2 w-full max-w-md">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
            {drawnCard.category === 'chaos' ? (
              <span className="text-rose-400 flex items-center gap-1">
                <Shuffle className="w-4 h-4 animate-spin text-rose-400" />
                CHAOS EVENT CARD
              </span>
            ) : drawnCard.deck === 'event' ? (
              <>
                <HelpCircle className="w-4 h-4 text-amber-400" />
                Lucky Event Card
              </>
            ) : (
              <>
                <Landmark className="w-4 h-4 text-blue-400" />
                Town Council Perk
              </>
            )}
          </div>
          <div className="p-3 bg-stone-950 border border-stone-800 rounded-2xl text-xs text-stone-200 shadow-inner w-full">
            <p className="font-bold text-amber-300 text-sm mb-1">{drawnCard.title}</p>
            <p className="text-stone-300 leading-relaxed">{drawnCard.description}</p>

            {/* Target Player Picker if required */}
            {drawnCard.requiresPlayerChoice && !isBotTurn && (
              <div className="mt-3 flex flex-col gap-1.5 border-t border-stone-800 pt-2">
                <span className="text-[11px] font-bold text-stone-400">Choose Player:</span>
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  {eligibleTargetPlayers.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        audio.play('button-click');
                        setSelectedTargetId(p.id);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border cursor-pointer ${
                        selectedTargetId === p.id
                          ? 'border-amber-400 bg-amber-500/20 text-white'
                          : 'border-stone-700 bg-stone-900 text-stone-400 hover:border-stone-600'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {!isBotTurn && (
            <button
              type="button"
              disabled={drawnCard.requiresPlayerChoice && !selectedTargetId}
              onClick={(e) => {
                (e.currentTarget as HTMLElement)?.blur();
                audio.play('button-click');
                onDismissCard(selectedTargetId || eligibleTargetPlayers[0]?.id);
                setSelectedTargetId('');
              }}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 font-bold text-xs transition shadow-md cursor-pointer disabled:cursor-not-allowed"
            >
              Continue
            </button>
          )}
        </div>
      )}

      {/* 3. Property Buy Prompt */}
      {canBuyProperty && !drawnCard && (
        <div className="flex flex-col items-center gap-2.5">
          <span className="text-xs text-stone-300">
            You landed on <span className="font-bold text-amber-300">{currentTile.name}</span>!
            Buy for <span className="font-bold text-emerald-400">${currentTile.cost}</span> or pass to auction?
          </span>
          {!isBotTurn ? (
            <div className="flex items-center gap-3">
              <button
                id="buy-property-btn"
                type="button"
                onClick={(e) => {
                  (e.currentTarget as HTMLElement)?.blur();
                  audio.play('property-buy');
                  onBuyProperty();
                }}
                disabled={activePlayer.balance < (currentTile.cost || 0)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                Buy Property (${currentTile.cost})
              </button>
              <button
                id="pass-property-btn"
                type="button"
                onClick={(e) => {
                  (e.currentTarget as HTMLElement)?.blur();
                  audio.play('button-click');
                  onPassProperty();
                }}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs flex items-center gap-1.5 border border-stone-700 transition cursor-pointer"
                title="Pass and open live auction for all players"
              >
                <Gavel className="w-4 h-4 text-amber-400" />
                Pass to Auction
              </button>
            </div>
          ) : (
            <span className="text-xs text-indigo-400 font-semibold animate-pulse">
              Bot is deciding whether to buy...
            </span>
          )}
        </div>
      )}

      {/* 4. Pending Rent Payment */}
      {pendingRent && !drawnCard && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-stone-300">
            Landed on <span className="font-bold text-stone-100">{currentTile.name}</span> owned by{' '}
            <span className="font-bold text-amber-400">{pendingRent.recipient.name}</span>.
          </span>
          {!isBotTurn ? (
            <button
              type="button"
              onClick={(e) => {
                (e.currentTarget as HTMLElement)?.blur();
                audio.play('rent-paid');
                onPayRent();
              }}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-red-600/20 transition cursor-pointer"
            >
              <DollarSign className="w-4 h-4" />
              Pay Rent (${pendingRent.amount})
            </button>
          ) : (
            <span className="text-xs text-indigo-400 font-semibold animate-pulse">
              Bot is paying rent...
            </span>
          )}
        </div>
      )}

      {/* 5. Pending Tax Payment */}
      {pendingTax && !drawnCard && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-stone-300">
            Landed on <span className="font-bold text-stone-100">{currentTile.name}</span>.
            Municipal dues required: <span className="font-bold text-red-400">${pendingTax}</span>.
          </span>
          {!isBotTurn ? (
            <button
              type="button"
              onClick={(e) => {
                (e.currentTarget as HTMLElement)?.blur();
                audio.play('rent-paid');
                onPayTax();
              }}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-red-600/20 transition cursor-pointer"
            >
              <DollarSign className="w-4 h-4" />
              Pay Assessment (${pendingTax})
            </button>
          ) : (
            <span className="text-xs text-indigo-400 font-semibold animate-pulse">
              Bot is paying taxes...
            </span>
          )}
        </div>
      )}

      {/* 6. End Turn Button */}
      {canEndTurn && !canBuyProperty && !pendingRent && !pendingTax && !drawnCard && (
        <div className="flex items-center gap-3">
          {!isBotTurn ? (
            <button
              id="end-turn-btn"
              type="button"
              onClick={(e) => {
                (e.currentTarget as HTMLElement)?.blur();
                audio.play('button-click');
                onEndTurn();
              }}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 hover:shadow-amber-500/30 transition cursor-pointer active:scale-95"
            >
              <span>End Turn</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <span className="text-xs text-indigo-300 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-400" />
              {activePlayer.name}'s turn in progress...
            </span>
          )}
        </div>
      )}
    </div>
  );
};

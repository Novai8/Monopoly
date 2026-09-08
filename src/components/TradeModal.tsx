import React, { useState } from 'react';
import { BoardTile, OwnershipMap, Player, TradeOffer } from '../types';
import { PROPERTY_GROUPS } from '../data/boardData';
import { CHARACTERS } from '../data/charactersData';
import { audio } from '../utils/audio';
import { X, ArrowLeftRight, Check, AlertCircle } from 'lucide-react';

interface TradeModalProps {
  activePlayer: Player;
  players: Player[];
  tiles: BoardTile[];
  ownership: OwnershipMap;
  onClose: () => void;
  onExecuteTrade: (offer: TradeOffer) => { success: boolean; message: string };
}

export const TradeModal: React.FC<TradeModalProps> = ({
  activePlayer,
  players,
  tiles,
  ownership,
  onClose,
  onExecuteTrade,
}) => {
  const otherPlayers = players.filter((p) => p.id !== activePlayer.id && !p.bankrupt);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>(
    otherPlayers[0]?.id || ''
  );

  const [offerMoney, setOfferMoney] = useState<number>(0);
  const [requestMoney, setRequestMoney] = useState<number>(0);
  const [offeredTileIds, setOfferedTileIds] = useState<number[]>([]);
  const [requestedTileIds, setRequestedTileIds] = useState<number[]>([]);
  const [tradeMessage, setTradeMessage] = useState<string | null>(null);

  const partner = players.find((p) => p.id === selectedPartnerId);

  const activeProperties = tiles.filter(
    (t) => ownership[t.id]?.ownerId === activePlayer.id && (ownership[t.id]?.houses || 0) === 0
  );

  const partnerProperties = tiles.filter(
    (t) => ownership[t.id]?.ownerId === selectedPartnerId && (ownership[t.id]?.houses || 0) === 0
  );

  const toggleOfferTile = (id: number) => {
    audio.play('button-click');
    setOfferedTileIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleRequestTile = (id: number) => {
    audio.play('button-click');
    setRequestedTileIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleProposeTrade = () => {
    if (!partner) return;
    const offer: TradeOffer = {
      fromPlayerId: activePlayer.id,
      toPlayerId: partner.id,
      offeredMoney: Number(offerMoney) || 0,
      offeredTileIds,
      requestedMoney: Number(requestMoney) || 0,
      requestedTileIds,
    };

    const res = onExecuteTrade(offer);
    setTradeMessage(res.message);
    if (res.success) {
      audio.play('trade-accepted');
      setTimeout(() => {
        onClose();
      }, 1400);
    } else {
      audio.play('card-bad');
    }
  };

  return (
    <div
      id="trade-modal-overlay"
      className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="trade-dialog"
        onClick={(e) => e.stopPropagation()}
        className="bg-stone-900 border border-stone-800 text-stone-100 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-100">
                Property Trade Deal
              </h2>
              <p className="text-xs text-stone-400">Negotiate properties and cash directly</p>
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

        {/* Partner Selector */}
        <div className="p-3.5 border-b border-stone-800 bg-stone-950/60 flex items-center gap-3 overflow-x-auto">
          <span className="text-xs font-semibold text-stone-400 shrink-0">Trade with:</span>
          <div className="flex items-center gap-2">
            {otherPlayers.map((p) => {
              const charObj = CHARACTERS[p.character];
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    audio.play('button-click');
                    setSelectedPartnerId(p.id);
                    setRequestedTileIds([]);
                    setRequestMoney(0);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition shrink-0 cursor-pointer ${
                    p.id === selectedPartnerId
                      ? 'border-amber-400 bg-amber-500/20 text-white'
                      : 'border-stone-800 bg-stone-900 text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <span className="text-sm">{charObj ? charObj.emoji : '🦆'}</span>
                  <span>{p.name} (${p.balance})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Trade Columns: You Give vs You Receive */}
        <div className="p-4 flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Active Player Column */}
          <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                You Offer
              </span>
              <span className="text-xs text-stone-400 font-mono">
                Cash: ${activePlayer.balance}
              </span>
            </div>

            {/* Cash Input */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400">$</span>
              <input
                type="number"
                min="0"
                max={activePlayer.balance}
                value={offerMoney}
                onChange={(e) => setOfferMoney(Math.min(activePlayer.balance, Math.max(0, Number(e.target.value))))}
                className="w-full bg-stone-900 border border-stone-700 rounded-xl px-2.5 py-1.5 text-xs font-mono text-stone-100 focus:outline-hidden focus:border-amber-400"
                placeholder="Money to give"
              />
            </div>

            {/* Property list */}
            <span className="text-[11px] font-semibold text-stone-400">Properties to give:</span>
            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
              {activeProperties.length === 0 ? (
                <span className="text-xs text-stone-600 italic">No unimproved properties</span>
              ) : (
                activeProperties.map((t) => {
                  const isSelected = offeredTileIds.includes(t.id);
                  const groupMeta = t.group ? PROPERTY_GROUPS[t.group] : null;
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleOfferTile(t.id)}
                      className={`p-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition border cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/20 text-white'
                          : 'border-stone-800 bg-stone-900 text-stone-300 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: groupMeta ? groupMeta.hex : '#475569' }}
                        />
                        <span>{t.name}</span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-mono">${t.cost}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Partner Column */}
          <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                You Ask For
              </span>
              <span className="text-xs text-stone-400 font-mono">
                Cash: ${partner?.balance || 0}
              </span>
            </div>

            {/* Cash Input */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400">$</span>
              <input
                type="number"
                min="0"
                max={partner?.balance || 0}
                value={requestMoney}
                onChange={(e) => setRequestMoney(Math.min(partner?.balance || 0, Math.max(0, Number(e.target.value))))}
                className="w-full bg-stone-900 border border-stone-700 rounded-xl px-2.5 py-1.5 text-xs font-mono text-stone-100 focus:outline-hidden focus:border-amber-400"
                placeholder="Money requested"
              />
            </div>

            {/* Property list */}
            <span className="text-[11px] font-semibold text-stone-400">Properties requested:</span>
            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
              {partnerProperties.length === 0 ? (
                <span className="text-xs text-stone-600 italic">Partner has no unimproved properties</span>
              ) : (
                partnerProperties.map((t) => {
                  const isSelected = requestedTileIds.includes(t.id);
                  const groupMeta = t.group ? PROPERTY_GROUPS[t.group] : null;
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleRequestTile(t.id)}
                      className={`p-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition border cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/20 text-white'
                          : 'border-stone-800 bg-stone-900 text-stone-300 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: groupMeta ? groupMeta.hex : '#475569' }}
                        />
                        <span>{t.name}</span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-mono">${t.cost}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Feedback Message if any */}
        {tradeMessage && (
          <div className="px-4 py-2 bg-stone-950 border-t border-stone-800 text-xs font-bold text-center text-amber-300">
            {tradeMessage}
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-end gap-3">
          <button
            onClick={() => {
              audio.play('button-click');
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleProposeTrade}
            disabled={offeredTileIds.length === 0 && requestedTileIds.length === 0 && offerMoney === 0 && requestMoney === 0}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 font-black text-xs transition shadow-md cursor-pointer disabled:cursor-not-allowed"
          >
            Propose Deal
          </button>
        </div>
      </div>
    </div>
  );
};

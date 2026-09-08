import React, { useState } from 'react';
import { AuctionState, BoardTile, Player } from '../types';
import { audio } from '../utils/audio';
import { Gavel, Clock, CheckCircle, XCircle, ArrowUpRight, ShieldAlert } from 'lucide-react';

interface AuctionModalProps {
  auction: AuctionState;
  tile: BoardTile;
  players: Player[];
  currentUserId: string;
  onPlaceBid: (amount: number) => void;
  onPass: () => void;
  onClose?: () => void;
}

export const AuctionModal: React.FC<AuctionModalProps> = ({
  auction,
  tile,
  players,
  currentUserId,
  onPlaceBid,
  onPass,
}) => {
  const [customBid, setCustomBid] = useState<string>('');
  const [inputError, setInputError] = useState<string | null>(null);

  const highestBidder = players.find((p) => p.id === auction.highestBidderId);
  const me = players.find((p) => p.id === currentUserId) || players.find((p) => !p.isAI && !p.isBot);
  const hasPassed = (auction.passedPlayerIds || []).includes(me?.id || '');

  const minNextBid = auction.currentBid + 10;
  const canAffordMin = me ? me.balance >= minNextBid : false;

  const handleIncrementBid = (increment: number) => {
    if (!me || hasPassed) return;
    const amount = auction.currentBid + increment;
    if (me.balance < amount) {
      setInputError(`Need $${amount} (you have $${me.balance})`);
      setTimeout(() => setInputError(null), 2500);
      return;
    }
    setInputError(null);
    audio.play('auction-bid');
    onPlaceBid(amount);
  };

  const handleCustomBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!me || hasPassed) return;
    const num = parseInt(customBid, 10);
    if (isNaN(num) || num <= auction.currentBid) {
      setInputError(`Bid must be greater than $${auction.currentBid}`);
      setTimeout(() => setInputError(null), 2500);
      return;
    }
    if (num > me.balance) {
      setInputError(`Insufficient funds: you have $${me.balance}`);
      setTimeout(() => setInputError(null), 2500);
      return;
    }
    setInputError(null);
    setCustomBid('');
    audio.play('auction-bid');
    onPlaceBid(num);
  };

  const handlePassClick = () => {
    if (hasPassed) return;
    audio.play('button-click');
    onPass();
  };

  return (
    <div
      id="auction-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none"
    >
      <div
        id="auction-modal"
        className="w-full max-w-lg bg-stone-900 border-2 border-amber-500/60 rounded-3xl p-6 shadow-2xl text-stone-100 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Header with Title and Countdown */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Gavel className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-amber-400 uppercase">
                Property Auction
              </h3>
              <p className="text-xs text-stone-400">Town Hall Public Tender</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-950 border border-amber-500/40 text-amber-300 font-mono text-sm font-black shadow-inner">
            <Clock className="w-4 h-4 text-amber-400 animate-spin" />
            <span>{auction.timeLeft}s</span>
          </div>
        </div>

        {/* Property Being Auctioned */}
        <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 flex flex-col items-center text-center gap-1 shadow-inner">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
            Auction Item
          </span>
          <h4 className="text-2xl font-black text-white">{tile.name}</h4>
          <span className="text-xs text-stone-300">
            Original List Price: <strong className="text-emerald-400 font-bold">${tile.cost || 100}</strong>
          </span>
        </div>

        {/* Current Bid Status */}
        <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-stone-950 border border-stone-800">
          <div>
            <span className="text-xs text-stone-400 block mb-0.5">Current Highest Bid</span>
            <div className="text-3xl font-black text-amber-400 font-mono tracking-tight">
              ${auction.currentBid}
            </div>
          </div>
          <div className="text-right flex flex-col justify-center">
            <span className="text-xs text-stone-400 block mb-0.5">Leader</span>
            <div className="text-sm font-bold text-stone-100 truncate">
              {highestBidder ? (
                <span className="flex items-center justify-end gap-1.5">
                  <span
                    className="w-3 h-3 rounded-full inline-block shrink-0"
                    style={{ backgroundColor: highestBidder.color }}
                  />
                  {highestBidder.name}
                </span>
              ) : (
                <span className="text-stone-500 italic">No bids yet</span>
              )}
            </div>
          </div>
        </div>

        {/* Participant Status Chips */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
            Bidders ({players.filter((p) => !p.bankrupt).length})
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {players
              .filter((p) => !p.bankrupt)
              .map((p) => {
                const isPassed = (auction.passedPlayerIds || []).includes(p.id);
                const isHighest = auction.highestBidderId === p.id;
                return (
                  <div
                    key={p.id}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
                      isHighest
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-sm'
                        : isPassed
                        ? 'border-stone-800 bg-stone-950 text-stone-600 line-through'
                        : 'border-stone-700 bg-stone-800/80 text-stone-300'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <span>{p.name}</span>
                    {isHighest && <CheckCircle className="w-3 h-3 text-amber-400" />}
                    {isPassed && <XCircle className="w-3 h-3 text-stone-600" />}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Human Player Controls */}
        {me && (
          <div className="flex flex-col gap-3 pt-2 border-t border-stone-800">
            <div className="flex items-center justify-between text-xs text-stone-300 px-1">
              <span>
                Your Available Cash:{' '}
                <strong className="text-emerald-400 font-bold font-mono">${me.balance}</strong>
              </span>
              {hasPassed ? (
                <span className="text-rose-400 font-bold flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> You have passed
                </span>
              ) : (
                <span className="text-amber-400 font-medium">Eligible to Bid</span>
              )}
            </div>

            {inputError && (
              <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{inputError}</span>
              </div>
            )}

            {!hasPassed ? (
              <div className="flex flex-col gap-2.5">
                {/* Quick Increment Bid Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    id="auction-bid-10-btn"
                    type="button"
                    disabled={!canAffordMin}
                    onClick={() => handleIncrementBid(10)}
                    className="py-3 px-2 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:hover:bg-amber-500 text-stone-950 font-black text-sm transition shadow-md flex flex-col items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                  >
                    <span>+$10</span>
                    <span className="text-[10px] font-mono font-bold opacity-85">
                      ${auction.currentBid + 10}
                    </span>
                  </button>

                  <button
                    id="auction-bid-50-btn"
                    type="button"
                    disabled={me.balance < auction.currentBid + 50}
                    onClick={() => handleIncrementBid(50)}
                    className="py-3 px-2 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:hover:bg-amber-500 text-stone-950 font-black text-sm transition shadow-md flex flex-col items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                  >
                    <span>+$50</span>
                    <span className="text-[10px] font-mono font-bold opacity-85">
                      ${auction.currentBid + 50}
                    </span>
                  </button>

                  <button
                    id="auction-bid-100-btn"
                    type="button"
                    disabled={me.balance < auction.currentBid + 100}
                    onClick={() => handleIncrementBid(100)}
                    className="py-3 px-2 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:hover:bg-amber-500 text-stone-950 font-black text-sm transition shadow-md flex flex-col items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                  >
                    <span>+$100</span>
                    <span className="text-[10px] font-mono font-bold opacity-85">
                      ${auction.currentBid + 100}
                    </span>
                  </button>
                </div>

                {/* Custom Bid Input */}
                <form onSubmit={handleCustomBidSubmit} className="flex items-center gap-2">
                  <input
                    type="number"
                    min={minNextBid}
                    max={me.balance}
                    placeholder={`Custom bid (> $${auction.currentBid})`}
                    value={customBid}
                    onChange={(e) => setCustomBid(e.target.value)}
                    className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-400 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={!customBid || parseInt(customBid, 10) <= auction.currentBid || parseInt(customBid, 10) > me.balance}
                    className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-amber-300 font-bold text-xs flex items-center gap-1 transition border border-stone-700 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <span>Bid</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </form>

                {/* Pass Button */}
                <button
                  id="auction-pass-btn"
                  type="button"
                  onClick={handlePassClick}
                  className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-bold transition border border-stone-700 cursor-pointer"
                >
                  Pass (Drop Out of Auction)
                </button>
              </div>
            ) : (
              <div className="py-3 text-center text-xs text-stone-400 bg-stone-950/60 rounded-xl border border-stone-800">
                You have passed. Waiting for other bidders to conclude...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

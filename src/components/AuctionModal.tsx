import React, { useEffect, useState } from 'react';
import { AuctionState, BoardTile, Player } from '../types';
import { audio } from '../utils/audio';
import { Gavel, Clock, ArrowUp, XCircle, CheckCircle2 } from 'lucide-react';

interface AuctionModalProps {
  auction: AuctionState;
  tiles?: BoardTile[];
  tile?: BoardTile;
  players: Player[];
  currentUserId?: string;
  onPlaceBid?: (amount: number) => void;
  onPass?: () => void;
  onAuctionEnd?: (winnerId: string | null, winningBid: number) => void;
  onClose?: () => void;
}

export const AuctionModal: React.FC<AuctionModalProps> = ({
  auction,
  tiles = [],
  tile: propTile,
  players,
  currentUserId = '',
  onPlaceBid,
  onPass,
  onAuctionEnd,
  onClose,
}) => {
  const tile = propTile || tiles.find((t) => t.id === auction.tileId);
  const highestBidder = players.find((p) => p.id === auction.highestBidderId);
  const me = players.find((p) => p.id === currentUserId) || players.find((p) => !p.isAI);
  const hasPassed = (auction.passedPlayerIds || []).includes(currentUserId);

  const minNextBid = auction.currentBid + 10;
  const canAffordMin = me ? me.balance >= minNextBid : false;

  const handleBid = (increment: number) => {
    const amount = auction.currentBid + increment;
    if (me && me.balance >= amount) {
      audio.play('auction-bid');
      if (onPlaceBid) onPlaceBid(amount);
    }
  };

  const handlePass = () => {
    audio.play('button-click');
    if (onPass) onPass();
  };

  if (!tile) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-stone-900 border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl text-stone-100 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Gavel className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-amber-400 uppercase">Property Auction</h3>
              <p className="text-xs text-stone-400">All players may bid or pass</p>
            </div>
          </div>
          {/* Countdown timer */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-800 border border-stone-700 font-mono text-sm font-bold text-amber-300">
            <Clock className="w-4 h-4 animate-spin text-amber-400" />
            <span>{auction.timeLeft}s</span>
          </div>
        </div>

        {/* Property Card Highlight */}
        <div className="p-4 rounded-2xl bg-stone-800/80 border border-stone-700/80 flex flex-col items-center text-center gap-1">
          <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Item for Sale</span>
          <h4 className="text-xl font-black text-white">{tile.name}</h4>
          <p className="text-xs text-stone-300">Original price: ${tile.cost || 100}</p>
        </div>

        {/* Current Bid Status */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-stone-950 border border-stone-800">
          <div>
            <span className="text-xs text-stone-400 font-medium">Highest Bid</span>
            <div className="text-3xl font-black text-amber-400">${auction.currentBid}</div>
          </div>
          <div className="text-right">
            <span className="text-xs text-stone-400 font-medium">Leading Bidder</span>
            <div className="font-bold text-sm text-stone-200">
              {highestBidder ? highestBidder.name : 'No bids yet'}
            </div>
          </div>
        </div>

        {/* Player Cash and Status */}
        {me && (
          <div className="flex items-center justify-between text-xs text-stone-400 px-1">
            <span>Your Cash: <strong className="text-emerald-400 font-bold">${me.balance}</strong></span>
            {hasPassed && <span className="text-red-400 font-semibold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> You have passed</span>}
          </div>
        )}

        {/* Bid Action Buttons */}
        {!hasPassed && (
          <div className="flex flex-col gap-2.5">
            <div className="grid grid-cols-3 gap-2">
              <button
                disabled={!canAffordMin}
                onClick={() => handleBid(10)}
                className="py-3 px-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-600 text-stone-950 font-black text-sm transition shadow-md flex flex-col items-center justify-center cursor-pointer disabled:cursor-not-allowed"
              >
                <span>+$10</span>
                <span className="text-[10px] font-medium opacity-80">${auction.currentBid + 10}</span>
              </button>
              <button
                disabled={!me || me.balance < auction.currentBid + 50}
                onClick={() => handleBid(50)}
                className="py-3 px-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-600 text-stone-950 font-black text-sm transition shadow-md flex flex-col items-center justify-center cursor-pointer disabled:cursor-not-allowed"
              >
                <span>+$50</span>
                <span className="text-[10px] font-medium opacity-80">${auction.currentBid + 50}</span>
              </button>
              <button
                disabled={!me || me.balance < auction.currentBid + 100}
                onClick={() => handleBid(100)}
                className="py-3 px-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-600 text-stone-950 font-black text-sm transition shadow-md flex flex-col items-center justify-center cursor-pointer disabled:cursor-not-allowed"
              >
                <span>+$100</span>
                <span className="text-[10px] font-medium opacity-80">${auction.currentBid + 100}</span>
              </button>
            </div>

            <button
              onClick={handlePass}
              className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition border border-stone-700 cursor-pointer"
            >
              Pass (Drop Out of Auction)
            </button>
          </div>
        )}

        {hasPassed && (
          <div className="py-3 text-center text-xs text-stone-400 bg-stone-800/40 rounded-xl border border-stone-800">
            Waiting for other players to finish bidding...
          </div>
        )}
      </div>
    </div>
  );
};

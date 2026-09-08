import React, { useEffect, useRef, useState } from 'react';
import { AuctionState, BoardTile, Player } from '../types';
import { audio } from '../utils/audio';
import { Gavel, Clock, CheckCircle, XCircle, ArrowUpRight, ShieldAlert } from 'lucide-react';

type AuctionDisplayState = Omit<AuctionState, 'currentBidderId' | 'currentBidderIndex' | 'passedPlayerIds'> &
  Partial<Pick<AuctionState, 'currentBidderId' | 'currentBidderIndex' | 'passedPlayerIds'>>;

interface AuctionModalProps {
  auction: AuctionDisplayState;
  tile: BoardTile;
  players: Player[];
  currentUserId: string;
  onPlaceBid: (amount: number) => void;
  onPass: () => void;
  onAuctionEnd: (winnerId: string | null, winningBid: number) => void;
  onClose?: () => void;
}

export const AuctionModal: React.FC<AuctionModalProps> = ({
  auction,
  tile,
  players,
  currentUserId,
  onPlaceBid,
  onPass,
  onAuctionEnd,
}) => {
  const [customBid, setCustomBid] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const completionSent = useRef(false);

  useEffect(() => {
    if (auction.active || completionSent.current) return;
    completionSent.current = true;
    onAuctionEnd(auction.highestBidderId, auction.currentBid);
  }, [auction.active, auction.currentBid, auction.highestBidderId, onAuctionEnd]);

  const me = players.find((p) => p.id === currentUserId);
  const passedIds = auction.passedPlayerIds ?? [];
  const currentBidderId = auction.currentBidderId ?? null;
  const isCurrentBidder = currentBidderId === currentUserId;
  const hasPassed = passedIds.includes(currentUserId);
  const highestBidder = players.find((p) => p.id === auction.highestBidderId);
  const minNextBid = auction.currentBid + 10;
  const canAffordMin = me ? me.balance >= minNextBid : false;

  const reportError = (message: string) => {
    setInputError(message);
    window.setTimeout(() => setInputError(null), 2500);
  };

  const submitBid = (amount: number) => {
    if (!me || !isCurrentBidder || hasPassed || !auction.active) return;
    if (amount <= auction.currentBid) {
      reportError(`Bid must be greater than $${auction.currentBid}`);
      return;
    }
    if (amount > me.balance) {
      reportError(`Insufficient funds: you have $${me.balance}`);
      return;
    }
    setInputError(null);
    audio.play('auction-bid');
    onPlaceBid(amount);
  };

  const handleCustomBidSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number.parseInt(customBid, 10);
    if (!Number.isFinite(amount)) {
      reportError('Enter a valid bid amount.');
      return;
    }
    submitBid(amount);
    setCustomBid('');
  };

  const handlePass = () => {
    if (!auction.active || !isCurrentBidder || hasPassed) return;
    audio.play('button-click');
    onPass();
  };

  return (
    <div id="auction-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
      <div id="auction-modal" className="w-full max-w-lg bg-stone-900 border-2 border-amber-500/60 rounded-3xl p-6 shadow-2xl text-stone-100 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Gavel className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-amber-400 uppercase">Property Auction</h3>
              <p className="text-xs text-stone-400">Town Hall Public Tender</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-950 border border-amber-500/40 text-amber-300 font-mono text-sm font-black">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>{auction.timeLeft}s</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 flex flex-col items-center text-center gap-1">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Auction Item</span>
          <h4 className="text-2xl font-black text-white">{tile.name}</h4>
          <span className="text-xs text-stone-300">Original List Price: <strong className="text-emerald-400">${tile.cost || 100}</strong></span>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-stone-950 border border-stone-800">
          <div>
            <span className="text-xs text-stone-400 block mb-0.5">Current Highest Bid</span>
            <div className="text-3xl font-black text-amber-400 font-mono">${auction.currentBid}</div>
          </div>
          <div className="text-right flex flex-col justify-center">
            <span className="text-xs text-stone-400 block mb-0.5">Current Bidder</span>
            <div className="text-sm font-bold text-stone-100 truncate">
              {currentBidderId ? players.find((p) => p.id === currentBidderId)?.name || 'Player' : 'Waiting'}
            </div>
            <span className="text-xs text-stone-500">Leader: {highestBidder?.name || 'No bids yet'}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Eligible Bidders</span>
          <div className="flex items-center gap-2 flex-wrap">
            {players.filter((p) => !p.bankrupt && auction.bidders.includes(p.id)).map((p) => {
              const isPassed = passedIds.includes(p.id);
              const isCurrent = currentBidderId === p.id;
              const isHighest = auction.highestBidderId === p.id;
              return (
                <div key={p.id} className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${isCurrent ? 'border-amber-400 bg-amber-500/20 text-amber-300' : isPassed ? 'border-stone-800 bg-stone-950 text-stone-600 line-through' : 'border-stone-700 bg-stone-800/80 text-stone-300'}`}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <span>{p.name}</span>
                  {isHighest && <CheckCircle className="w-3 h-3 text-amber-400" />}
                  {isPassed && <XCircle className="w-3 h-3 text-stone-600" />}
                </div>
              );
            })}
          </div>
        </div>

        {me && (
          <div className="flex flex-col gap-3 pt-2 border-t border-stone-800">
            <div className="flex items-center justify-between text-xs text-stone-300 px-1">
              <span>Your Available Cash: <strong className="text-emerald-400 font-mono">${me.balance}</strong></span>
              {hasPassed ? <span className="text-rose-400 font-bold">You have passed</span> : isCurrentBidder ? <span className="text-amber-400 font-medium">Your turn to bid</span> : <span className="text-stone-500">Waiting for another bidder</span>}
            </div>

            {inputError && <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-1.5"><ShieldAlert className="w-4 h-4 shrink-0" /><span>{inputError}</span></div>}

            {isCurrentBidder && !hasPassed ? (
              <div className="flex flex-col gap-2.5">
                <div className="grid grid-cols-3 gap-2">
                  {[10, 50, 100].map((increment) => {
                    const amount = auction.currentBid + increment;
                    return (
                      <button key={increment} type="button" disabled={!me || me.balance < amount} onClick={() => submitBid(amount)} className="py-3 px-2 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-stone-950 font-black text-sm transition shadow-md flex flex-col items-center justify-center cursor-pointer disabled:cursor-not-allowed">
                        <span>+${increment}</span><span className="text-[10px] font-mono">${amount}</span>
                      </button>
                    );
                  })}
                </div>
                <form onSubmit={handleCustomBidSubmit} className="flex items-center gap-2">
                  <input type="number" min={minNextBid} max={me.balance} placeholder={`Custom bid (> $${auction.currentBid})`} value={customBid} onChange={(event) => setCustomBid(event.target.value)} className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-400 font-mono" />
                  <button type="submit" disabled={!customBid} className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-amber-300 font-bold text-xs flex items-center gap-1 border border-stone-700 cursor-pointer disabled:cursor-not-allowed"><span>Bid</span><ArrowUpRight className="w-3.5 h-3.5" /></button>
                </form>
                <button type="button" onClick={handlePass} className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-bold transition border border-stone-700 cursor-pointer">Pass</button>
              </div>
            ) : (
              <div className="py-3 text-center text-xs text-stone-400 bg-stone-950/60 rounded-xl border border-stone-800">{hasPassed ? 'You have passed. Waiting for the auction to conclude.' : 'Waiting for the current bidder to act.'}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  BoardSize,
  BoardTheme,
  BotDifficulty,
  CharacterId,
  GameMode,
  GameSettings,
} from '../types';
import { CHARACTER_LIST } from '../data/charactersData';
import { BOARD_THEMES } from '../data/boardData';
import { audio } from '../utils/audio';
import {
  X,
  Play,
  User,
  Bot,
  Layers,
  Sparkles,
  Coins,
  Timer,
  Sliders,
  Compass,
} from 'lucide-react';

interface SinglePlayerSetupModalProps {
  playerName: string;
  onUpdatePlayerName: (name: string) => void;
  onStartGame: (config: {
    playerName: string;
    character: CharacterId;
    aiCount: number;
    difficulty: BotDifficulty;
    boardSize: BoardSize;
    theme: BoardTheme;
    mode: GameMode;
    startingMoney: number;
    turnTimer: number;
    rules: {
      auctions: boolean;
      trading: boolean;
      events: boolean;
      community: boolean;
      specialSpaces: boolean;
      quickChat: boolean;
      emotes: boolean;
    };
  }) => void;
  onClose: () => void;
}

export const SinglePlayerSetupModal: React.FC<SinglePlayerSetupModalProps> = ({
  playerName,
  onUpdatePlayerName,
  onStartGame,
  onClose,
}) => {
  const [name, setName] = useState(playerName);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterId>('duck');
  const [aiCount, setAiCount] = useState<number>(3); // 1 to 9 AI
  const [difficulty, setDifficulty] = useState<BotDifficulty>('normal');
  const [boardSize, setBoardSize] = useState<BoardSize>('standard');
  const [theme, setTheme] = useState<BoardTheme>('classic-town');
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [startingMoney, setStartingMoney] = useState<number>(1500);
  const [turnTimer, setTurnTimer] = useState<number>(45); // 0 = unlimited

  // Optional Rules
  const [auctionsEnabled, setAuctionsEnabled] = useState(true);
  const [tradingEnabled, setTradingEnabled] = useState(true);
  const [eventsEnabled, setEventsEnabled] = useState(true);
  const [communityEnabled, setCommunityEnabled] = useState(true);
  const [specialSpacesEnabled, setSpecialSpacesEnabled] = useState(true);
  const [quickChatEnabled, setQuickChatEnabled] = useState(true);
  const [emotesEnabled, setEmotesEnabled] = useState(true);

  const handleStart = () => {
    const trimmed = name.trim().replace(/[<>/"'&]/g, '');
    const finalName = trimmed.length >= 2 ? trimmed.substring(0, 16) : 'Player 1';
    onUpdatePlayerName(finalName);

    audio.play('ui-click');
    onStartGame({
      playerName: finalName,
      character: selectedCharacter,
      aiCount,
      difficulty,
      boardSize,
      theme,
      mode: gameMode,
      startingMoney,
      turnTimer,
      rules: {
        auctions: auctionsEnabled,
        trading: tradingEnabled,
        events: eventsEnabled,
        community: communityEnabled,
        specialSpaces: specialSpacesEnabled,
        quickChat: quickChatEnabled,
        emotes: emotesEnabled,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-100">Single Player Match Setup</h2>
              <p className="text-xs text-stone-400">Configure your match parameters and AI opponents</p>
            </div>
          </div>
          <button
            onClick={() => {
              audio.play('button-click');
              onClose();
            }}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-stone-300">
          {/* 1. Player Identity & Character Selection */}
          <div className="space-y-2">
            <label className="font-semibold text-stone-200 uppercase tracking-wider text-[11px]">
              Player Identity & Piece
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={16}
                placeholder="Your Name (2-16 chars)"
                className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 font-semibold focus:outline-none focus:border-amber-500 text-sm"
              />
            </div>
            {/* Character grid */}
            <div className="grid grid-cols-7 gap-1.5 pt-1">
              {CHARACTER_LIST.map((char) => {
                const isSelected = selectedCharacter === char.id;
                return (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => {
                      setSelectedCharacter(char.id);
                      audio.play('button-click');
                    }}
                    title={char.name}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500 text-white shadow-md scale-105'
                        : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                    }`}
                  >
                    <span className="text-xl">{char.emoji}</span>
                    <span className="text-[10px] font-medium truncate max-w-full">{char.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. AI Opponents & Difficulty */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-semibold text-stone-200 uppercase tracking-wider text-[11px] flex items-center justify-between">
                <span>AI Opponents ({aiCount})</span>
                <span className="text-stone-400 font-mono text-[10px]">Total: {aiCount + 1} Players</span>
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => {
                      setAiCount(count);
                      audio.play('button-click');
                    }}
                    className={`flex-1 min-w-[34px] py-1.5 rounded-lg font-bold text-xs transition-colors ${
                      aiCount === count
                        ? 'bg-amber-500 text-stone-950 shadow-sm'
                        : 'bg-stone-950 border border-stone-800 text-stone-300 hover:bg-stone-800'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-semibold text-stone-200 uppercase tracking-wider text-[11px]">
                AI Difficulty
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['easy', 'normal', 'hard', 'expert'] as BotDifficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDifficulty(d);
                      audio.play('button-click');
                    }}
                    className={`py-1.5 rounded-lg font-bold capitalize text-xs transition-colors ${
                      difficulty === d
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'bg-stone-950 border border-stone-800 text-stone-300 hover:bg-stone-800'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Board Size & Theme */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-semibold text-stone-200 uppercase tracking-wider text-[11px] flex items-center justify-between">
                <span>Board Size</span>
                <span className="text-stone-400 font-mono text-[10px]">
                  {boardSize === 'small' ? '24 Tiles' : boardSize === 'standard' ? '32 Tiles' : boardSize === 'large' ? '40 Tiles' : '48 Tiles'}
                </span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['small', 'standard', 'large', 'huge'] as BoardSize[]).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setBoardSize(size);
                      audio.play('button-click');
                    }}
                    className={`py-1.5 rounded-lg font-bold capitalize text-xs transition-colors ${
                      boardSize === size
                        ? 'bg-amber-500 text-stone-950 shadow-sm'
                        : 'bg-stone-950 border border-stone-800 text-stone-300 hover:bg-stone-800'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-semibold text-stone-200 uppercase tracking-wider text-[11px]">
                3D World Theme
              </label>
              <select
                value={theme}
                onChange={(e) => {
                  setTheme(e.target.value as BoardTheme);
                  audio.play('button-click');
                }}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 font-medium text-xs focus:outline-none focus:border-amber-500"
              >
                {Object.values(BOARD_THEMES).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} - {t.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Game Mode & Starting Money */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-semibold text-stone-200 uppercase tracking-wider text-[11px]">
                Game Mode
              </label>
              <select
                value={gameMode}
                onChange={(e) => {
                  setGameMode(e.target.value as GameMode);
                  audio.play('button-click');
                }}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 font-medium text-xs focus:outline-none focus:border-amber-500 capitalize"
              >
                <option value="classic">Classic (Standard Rules & Economy)</option>
                <option value="quick">Quick Game (Higher Salary, Faster Turns)</option>
                <option value="long">Long Game (Strategic Progression)</option>
                <option value="chaos">Chaos Mode (Unpredictable Cards & Board Swaps)</option>
                <option value="auction">Auction Mode (Auctions on Unbought Lands)</option>
                <option value="friendly">Friendly Mode (Reduced Rents & Bailouts)</option>
                <option value="high-stakes">High Stakes (Heavy Rents & Fast Bankruptcies)</option>
                <option value="random">Random Mode (Dynamic Mixed Rules)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="font-semibold text-stone-200 uppercase tracking-wider text-[11px]">
                Starting Capital
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[1000, 1500, 2000, 2500, 3000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setStartingMoney(amt);
                      audio.play('button-click');
                    }}
                    className={`py-1.5 rounded-lg font-mono font-bold text-xs transition-colors ${
                      startingMoney === amt
                        ? 'bg-emerald-500 text-stone-950 shadow-sm'
                        : 'bg-stone-950 border border-stone-800 text-stone-300 hover:bg-stone-800'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5. Turn Timer */}
          <div className="space-y-2">
            <label className="font-semibold text-stone-200 uppercase tracking-wider text-[11px] flex items-center justify-between">
              <span>Turn Timer</span>
              <span className="text-amber-400 font-bold">
                {turnTimer === 0 ? 'Unlimited (No Timer)' : `${turnTimer} Seconds`}
              </span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-9 gap-1.5">
              {[
                { val: 15, label: '15s' },
                { val: 30, label: '30s' },
                { val: 45, label: '45s' },
                { val: 60, label: '60s' },
                { val: 90, label: '90s' },
                { val: 120, label: '2m' },
                { val: 300, label: '5m' },
                { val: 600, label: '10m' },
                { val: 0, label: 'Unlimited' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => {
                    setTurnTimer(opt.val);
                    audio.play('button-click');
                  }}
                  className={`py-1.5 rounded-lg font-semibold text-[11px] transition-colors ${
                    turnTimer === opt.val
                      ? 'bg-amber-500 text-stone-950 shadow-sm font-bold'
                      : 'bg-stone-950 border border-stone-800 text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Optional Rules */}
          <div className="space-y-2">
            <label className="font-semibold text-stone-200 uppercase tracking-wider text-[11px]">
              Optional Rule Modules
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <label className="flex items-center gap-2 p-2 rounded-xl bg-stone-950 border border-stone-800 cursor-pointer hover:border-stone-700">
                <input
                  type="checkbox"
                  checked={auctionsEnabled}
                  onChange={(e) => setAuctionsEnabled(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0"
                />
                <span className="text-xs text-stone-200 font-medium">Auctions</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-xl bg-stone-950 border border-stone-800 cursor-pointer hover:border-stone-700">
                <input
                  type="checkbox"
                  checked={tradingEnabled}
                  onChange={(e) => setTradingEnabled(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0"
                />
                <span className="text-xs text-stone-200 font-medium">Player Trading</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-xl bg-stone-950 border border-stone-800 cursor-pointer hover:border-stone-700">
                <input
                  type="checkbox"
                  checked={eventsEnabled}
                  onChange={(e) => setEventsEnabled(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0"
                />
                <span className="text-xs text-stone-200 font-medium">Event Cards</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-xl bg-stone-950 border border-stone-800 cursor-pointer hover:border-stone-700">
                <input
                  type="checkbox"
                  checked={communityEnabled}
                  onChange={(e) => setCommunityEnabled(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0"
                />
                <span className="text-xs text-stone-200 font-medium">Town Council</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-xl bg-stone-950 border border-stone-800 cursor-pointer hover:border-stone-700">
                <input
                  type="checkbox"
                  checked={specialSpacesEnabled}
                  onChange={(e) => setSpecialSpacesEnabled(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0"
                />
                <span className="text-xs text-stone-200 font-medium">Special Spaces</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-xl bg-stone-950 border border-stone-800 cursor-pointer hover:border-stone-700">
                <input
                  type="checkbox"
                  checked={quickChatEnabled}
                  onChange={(e) => setQuickChatEnabled(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0"
                />
                <span className="text-xs text-stone-200 font-medium">Quick Chat</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-xl bg-stone-950 border border-stone-800 cursor-pointer hover:border-stone-700">
                <input
                  type="checkbox"
                  checked={emotesEnabled}
                  onChange={(e) => setEmotesEnabled(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0"
                />
                <span className="text-xs text-stone-200 font-medium">Emotes</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer with Start Button */}
        <div className="px-5 py-4 border-t border-stone-800 bg-stone-950/60 flex items-center justify-between">
          <button
            onClick={() => {
              audio.play('button-click');
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-stone-400 hover:text-white transition-colors text-xs font-semibold"
          >
            Cancel
          </button>

          <button
            onClick={handleStart}
            className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-black py-2.5 px-6 rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 text-xs uppercase tracking-wider transition-all duration-150 hover:scale-105 active:scale-95"
          >
            <Play className="w-4 h-4" />
            <span>START SINGLE PLAYER MATCH</span>
          </button>
        </div>
      </div>
    </div>
  );
};

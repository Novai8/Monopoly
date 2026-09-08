import React, { useState } from 'react';
import { BoardSize, BoardTheme, BotDifficulty, CharacterId, GameMode, GameSettings, Player } from '../types';
import { CHARACTERS, CHARACTER_LIST } from '../data/charactersData';
import { BOARD_THEMES } from '../data/boardData';
import { audio } from '../utils/audio';
import { Play, Bot, User, Plus, Trash2, Settings2, Sparkles, Building2, ShieldAlert } from 'lucide-react';

interface SetupModalProps {
  onStartGame: (players: Player[], settings: GameSettings) => void;
}

const PLAYER_COLORS = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#84cc16', // Lime
];

export const SetupModal: React.FC<SetupModalProps> = ({ onStartGame }) => {
  const [boardSize, setBoardSize] = useState<BoardSize>('standard');
  const [boardTheme, setBoardTheme] = useState<BoardTheme>('classic-town');
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [selectedCharacterPickerIdx, setSelectedCharacterPickerIdx] = useState<number | null>(null);

  const [players, setPlayers] = useState<Player[]>([
    {
      id: 'p1',
      name: 'Player 1',
      isBot: false,
      isAI: false,
      color: PLAYER_COLORS[0],
      character: 'duck',
      balance: 1500,
      position: 0,
      inDetention: false,
      detentionTurns: 0,
      detentionPasses: 0,
      freePasses: 0,
      bankrupt: false,
      voiceState: 'quiet',
      isHost: true,
    },
    {
      id: 'p2',
      name: 'Barnaby Bot',
      isBot: true,
      isAI: true,
      difficulty: 'normal',
      color: PLAYER_COLORS[1],
      character: 'cat',
      balance: 1500,
      position: 0,
      inDetention: false,
      detentionTurns: 0,
      detentionPasses: 0,
      freePasses: 0,
      bankrupt: false,
      voiceState: 'quiet',
    },
    {
      id: 'p3',
      name: 'Cleo Bot',
      isBot: true,
      isAI: true,
      difficulty: 'hard',
      color: PLAYER_COLORS[2],
      character: 'penguin',
      balance: 1500,
      position: 0,
      inDetention: false,
      detentionTurns: 0,
      detentionPasses: 0,
      freePasses: 0,
      bankrupt: false,
      voiceState: 'quiet',
    },
    {
      id: 'p4',
      name: 'Rusty Bot',
      isBot: true,
      isAI: true,
      difficulty: 'normal',
      color: PLAYER_COLORS[3],
      character: 'robot',
      balance: 1500,
      position: 0,
      inDetention: false,
      detentionTurns: 0,
      detentionPasses: 0,
      freePasses: 0,
      bankrupt: false,
      voiceState: 'quiet',
    },
  ]);

  const updatePlayer = (index: number, updates: Partial<Player>) => {
    setPlayers((prev) => {
      const next = [...prev];
      const merged = { ...next[index], ...updates };
      if ('isBot' in updates) {
        merged.isAI = !!updates.isBot;
      }
      next[index] = merged;
      return next;
    });
  };

  const addPlayer = () => {
    if (players.length >= 10) return;
    audio.play('button-click');
    const newIdx = players.length;
    const availableChar =
      CHARACTER_LIST.find((c) => !players.some((p) => p.character === c.id))?.id || 'dino';

    setPlayers((prev) => [
      ...prev,
      {
        id: `p${Date.now().toString().slice(-4)}`,
        name: `Bot ${newIdx + 1}`,
        isBot: true,
        isAI: true,
        difficulty: 'normal',
        color: PLAYER_COLORS[newIdx % PLAYER_COLORS.length],
        character: availableChar,
        balance: gameMode === 'quick' ? 2500 : gameMode === 'high-stakes' ? 5000 : 1500,
        position: 0,
        inDetention: false,
        detentionTurns: 0,
        detentionPasses: 0,
        freePasses: 0,
        bankrupt: false,
        voiceState: 'quiet',
      },
    ]);
  };

  const removePlayer = (index: number) => {
    if (players.length <= 2) return;
    audio.play('button-click');
    setPlayers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStart = () => {
    audio.play('button-click');
    const startCash = gameMode === 'quick' ? 2500 : gameMode === 'high-stakes' ? 5000 : 1500;
    const finalPlayers = players.map((p) => ({
      ...p,
      balance: startCash,
    }));

    const settings: GameSettings = {
      mode: gameMode,
      gameMode,
      boardSize,
      boardName: BOARD_THEMES[boardTheme]?.name || 'Town Board',
      theme: boardTheme,
      boardTheme,
      difficulty: 'normal',
      botDifficulty: 'normal',
      playerLimit: players.length,
      startingMoney: startCash,
      turnTimer: 45,
      auctionsEnabled: true,
      tradingEnabled: true,
      voiceEnabled: true,
      reducedMotion: false,
      cameraMode: 'perspective',
      soundVolume: 80,
      sfxVolume: 80,
      voiceVolume: 80,
      sfxEnabled: true,
    };

    onStartGame(finalPlayers, settings);
  };

  return (
    <div
      id="setup-modal-overlay"
      className="fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        id="setup-dialog"
        className="bg-stone-900 border border-stone-800 text-stone-100 rounded-3xl shadow-2xl w-full max-w-3xl my-8 p-6 md:p-8 flex flex-col gap-6"
      >
        {/* Title Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold mb-2">
            <Building2 className="w-3.5 h-3.5" />
            <span>3D Multiplayer Property Game</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            Town Tycoon 3D
          </h1>
          <p className="text-xs md:text-sm text-stone-400 mt-1 max-w-md">
            Buy streets, build houses, trade properties, and run live auctions with 2 to 10 players.
          </p>
        </div>

        {/* Board & Mode Settings Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Board Size */}
          <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 flex flex-col gap-2">
            <label className="text-xs font-bold text-amber-400 uppercase tracking-wider">Board Size</label>
            <select
              value={boardSize}
              onChange={(e) => {
                audio.play('button-click');
                setBoardSize(e.target.value as BoardSize);
              }}
              className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs font-bold text-stone-200 cursor-pointer focus:outline-hidden focus:border-amber-400"
            >
              <option value="small">Small (24 Spaces - Fast)</option>
              <option value="standard">Standard (32 Spaces - Balanced)</option>
              <option value="large">Large (40 Spaces - Deep)</option>
              <option value="huge">Huge (48 Spaces - Grand)</option>
            </select>
          </div>

          {/* Board Theme */}
          <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 flex flex-col gap-2">
            <label className="text-xs font-bold text-amber-400 uppercase tracking-wider">Board Theme</label>
            <select
              value={boardTheme}
              onChange={(e) => {
                audio.play('button-click');
                setBoardTheme(e.target.value as BoardTheme);
              }}
              className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs font-bold text-stone-200 cursor-pointer focus:outline-hidden focus:border-amber-400"
            >
              {Object.values(BOARD_THEMES).map((thm) => (
                <option key={thm.id} value={thm.id}>
                  {thm.name}
                </option>
              ))}
            </select>
          </div>

          {/* Game Mode */}
          <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 flex flex-col gap-2">
            <label className="text-xs font-bold text-amber-400 uppercase tracking-wider">Game Mode</label>
            <select
              value={gameMode}
              onChange={(e) => {
                audio.play('button-click');
                setGameMode(e.target.value as GameMode);
              }}
              className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs font-bold text-stone-200 cursor-pointer focus:outline-hidden focus:border-amber-400"
            >
              <option value="classic">Classic ($1,500 cash)</option>
              <option value="quick">Quick ($2,500 cash, fast win)</option>
              <option value="chaos">Chaos (Wild card events)</option>
              <option value="auction">Auction Frenzy (Always bid)</option>
              <option value="friendly">Friendly Town (Relaxed fees)</option>
              <option value="high-stakes">High Stakes ($5,000 cash)</option>
              <option value="long">Grand Marathon</option>
            </select>
          </div>
        </div>

        {/* Players Roster (2 - 10 players) */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-200">
                Players & Bots ({players.length} / 10)
              </h3>
              <p className="text-xs text-stone-400">Add bots or friends with custom character tokens</p>
            </div>
            {players.length < 10 && (
              <button
                onClick={addPlayer}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center gap-1 transition shadow-md cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Slot</span>
              </button>
            )}
          </div>

          {/* Player list scrollable */}
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
            {players.map((p, idx) => {
              const charObj = CHARACTERS[p.character];

              return (
                <div
                  key={p.id}
                  className="p-3 bg-stone-950 rounded-2xl border border-stone-800 flex flex-wrap items-center justify-between gap-3"
                >
                  {/* Left: Token & Name */}
                  <div className="flex items-center gap-3 min-w-[180px] flex-1">
                    {/* Character Avatar Button */}
                    <button
                      onClick={() => {
                        audio.play('button-click');
                        setSelectedCharacterPickerIdx(selectedCharacterPickerIdx === idx ? null : idx);
                      }}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-md cursor-pointer hover:scale-105 transition border border-white/20 shrink-0"
                      style={{ backgroundColor: p.color }}
                      title="Click to pick character"
                    >
                      {charObj ? charObj.emoji : '🦆'}
                    </button>

                    <div className="flex flex-col flex-1 min-w-0">
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => updatePlayer(idx, { name: e.target.value })}
                        className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2 py-1 text-xs font-bold text-stone-100 focus:outline-hidden focus:border-amber-400"
                        placeholder="Player Name"
                      />
                      <span className="text-[10px] text-stone-400 mt-0.5 truncate">
                        {charObj ? charObj.name : 'Token'}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Bot Toggle & Difficulty */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        audio.play('button-click');
                        updatePlayer(idx, { isBot: !p.isBot });
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border cursor-pointer ${
                        p.isBot
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {p.isBot ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                      <span>{p.isBot ? 'Bot' : 'Human'}</span>
                    </button>

                    {p.isBot && (
                      <select
                        value={p.difficulty || 'normal'}
                        onChange={(e) => {
                          audio.play('button-click');
                          updatePlayer(idx, { difficulty: e.target.value as BotDifficulty });
                        }}
                        className="bg-stone-900 border border-stone-700 text-stone-300 rounded-xl px-2 py-1.5 text-xs font-semibold cursor-pointer"
                      >
                        <option value="easy">Easy</option>
                        <option value="normal">Normal</option>
                        <option value="hard">Hard</option>
                        <option value="expert">Expert</option>
                      </select>
                    )}
                  </div>

                  {/* Right: Color Selector & Delete */}
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={p.color}
                      onChange={(e) => updatePlayer(idx, { color: e.target.value })}
                      className="w-7 h-7 rounded-lg bg-transparent border-none cursor-pointer"
                      title="Player Color"
                    />

                    {players.length > 2 && (
                      <button
                        onClick={() => removePlayer(idx)}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-red-400 hover:bg-stone-800 transition cursor-pointer"
                        title="Remove player"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Sub-Panel: Character Picker if open */}
                  {selectedCharacterPickerIdx === idx && (
                    <div className="w-full pt-2 border-t border-stone-800 grid grid-cols-4 sm:grid-cols-7 gap-1.5 animate-in fade-in duration-150">
                      {CHARACTER_LIST.map((char) => {
                        const isTaken = players.some((other, oi) => oi !== idx && other.character === char.id);
                        return (
                          <button
                            key={char.id}
                            disabled={isTaken}
                            onClick={() => {
                              audio.play('button-click');
                              updatePlayer(idx, { character: char.id });
                              setSelectedCharacterPickerIdx(null);
                            }}
                            className={`p-2 rounded-xl border flex flex-col items-center gap-0.5 text-center cursor-pointer transition ${
                              p.character === char.id
                                ? 'bg-amber-500/20 border-amber-400 text-white'
                                : isTaken
                                ? 'opacity-30 border-stone-800 bg-stone-900 cursor-not-allowed'
                                : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
                            }`}
                          >
                            <span className="text-xl">{char.emoji}</span>
                            <span className="text-[9px] font-bold truncate w-full">{char.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Start Game Action */}
        <button
          id="start-monopoly-game-btn"
          onClick={handleStart}
          className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-sm tracking-wider uppercase transition shadow-xl shadow-amber-500/20 hover:shadow-amber-500/35 cursor-pointer flex items-center justify-center gap-2 active:scale-98"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>Launch Game</span>
        </button>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Sparkles, Users, User, BookOpen, Settings, Play, Shield, Dice1, Dices } from 'lucide-react';
import { audio } from '../utils/audio';

interface MainMenuProps {
  playerName: string;
  onUpdatePlayerName: (name: string) => void;
  onPlaySinglePlayer: () => void;
  onPlayMultiplayer: () => void;
  onOpenRules: () => void;
  onOpenSettings: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  playerName,
  onUpdatePlayerName,
  onPlaySinglePlayer,
  onPlayMultiplayer,
  onOpenRules,
  onOpenSettings,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(playerName);
  const [nameError, setNameError] = useState('');

  const handleSaveName = () => {
    const trimmed = tempName.trim().replace(/[<>/"'&]/g, '');
    if (trimmed.length < 2) {
      setNameError('Name must be at least 2 characters.');
      audio.play('ui-error');
      return;
    }
    if (trimmed.length > 16) {
      setNameError('Name cannot exceed 16 characters.');
      audio.play('ui-error');
      return;
    }
    setNameError('');
    onUpdatePlayerName(trimmed);
    setEditingName(false);
    audio.play('ui-click');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveName();
    if (e.key === 'Escape') {
      setTempName(playerName);
      setEditingName(false);
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 sm:p-6 bg-stone-950/75 backdrop-blur-md select-none pointer-events-auto">
      <div className="w-full max-w-md flex flex-col items-center gap-6 text-center animate-in fade-in zoom-in-95 duration-300">
        {/* Game Title & Badge */}
        <div className="flex flex-col items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            Dual-Mode Tabletop Edition
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-md">
            TOWN TYCOON
          </h1>
          <p className="text-sm text-stone-300 max-w-sm">
            Build, trade, and conquer in a colorful tabletop board with Single Player and Online Multiplayer.
          </p>
        </div>

        {/* Player Name Card */}
        <div className="w-full bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-xl flex flex-col gap-2">
          <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider flex items-center justify-between">
            <span>Player Identity</span>
            {!editingName && (
              <button
                onClick={() => {
                  setEditingName(true);
                  audio.play('button-click');
                }}
                className="text-amber-400 hover:text-amber-300 transition-colors"
              >
                Change Name
              </button>
            )}
          </div>

          {editingName ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => {
                    setTempName(e.target.value);
                    setNameError('');
                  }}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  placeholder="Enter 2-16 characters..."
                  maxLength={16}
                  className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-semibold focus:outline-none focus:border-amber-500 text-sm"
                />
                <button
                  onClick={handleSaveName}
                  className="bg-amber-500 hover:bg-amber-400 text-stone-950 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                >
                  Save
                </button>
              </div>
              {nameError && <span className="text-rose-400 text-xs text-left">{nameError}</span>}
            </div>
          ) : (
            <div className="flex items-center justify-between bg-stone-950/60 rounded-xl px-3.5 py-2.5 border border-stone-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs">
                  {playerName.charAt(0).toUpperCase()}
                </div>
                <span className="font-bold text-stone-100 text-base">{playerName}</span>
              </div>
              <span className="text-[11px] text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                Ready to Play
              </span>
            </div>
          )}
        </div>

        {/* Main Menu Action Buttons */}
        <div className="w-full flex flex-col gap-3">
          {/* Play Single Player */}
          <button
            onClick={() => {
              audio.play('ui-click');
              onPlaySinglePlayer();
            }}
            className="w-full group bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black py-3.5 px-5 rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-between transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-stone-950/20 flex items-center justify-center text-stone-950">
                <User className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-sm font-extrabold tracking-wide uppercase">PLAY SINGLE PLAYER</div>
                <div className="text-xs text-stone-900 font-medium">Vs 1-9 Intelligent AI Bots</div>
              </div>
            </div>
            <Play className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Play Multiplayer */}
          <button
            onClick={() => {
              audio.play('ui-click');
              onPlayMultiplayer();
            }}
            className="w-full group bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-amber-500/50 text-white font-black py-3.5 px-5 rounded-2xl shadow-xl flex items-center justify-between transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Users className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-sm font-extrabold tracking-wide uppercase text-stone-100">PLAY MULTIPLAYER</div>
                <div className="text-xs text-stone-400 font-medium">2-10 Real Players Online Rooms</div>
              </div>
            </div>
            <Dices className="w-5 h-5 text-amber-400 group-hover:rotate-12 transition-transform" />
          </button>
        </div>

        {/* Secondary Buttons (Rules & Settings) */}
        <div className="grid grid-cols-2 gap-3 w-full">
          <button
            onClick={() => {
              audio.play('button-click');
              onOpenRules();
            }}
            className="bg-stone-900/80 hover:bg-stone-800 border border-stone-800 hover:border-stone-700 text-stone-300 hover:text-white py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>HOW TO PLAY</span>
          </button>

          <button
            onClick={() => {
              audio.play('button-click');
              onOpenSettings();
            }}
            className="bg-stone-900/80 hover:bg-stone-800 border border-stone-800 hover:border-stone-700 text-stone-300 hover:text-white py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <Settings className="w-4 h-4 text-amber-400" />
            <span>SETTINGS</span>
          </button>
        </div>

        {/* Footer info */}
        <div className="text-[11px] text-stone-400 flex items-center gap-1">
          <Shield className="w-3.5 h-3.5 text-stone-400" />
          <span>Server Authoritative • Pure SFX Only • No Forced Scrolling</span>
        </div>
      </div>
    </div>
  );
};

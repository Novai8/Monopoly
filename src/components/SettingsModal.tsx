import React from 'react';
import { BoardSize, BoardTheme, BotDifficulty, GameMode, GameSettings } from '../types';
import { BOARD_THEMES } from '../data/boardData';
import { audio } from '../utils/audio';
import { Settings, Volume2, VolumeX, Eye, Sparkles, X, Check } from 'lucide-react';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onClose: () => void;
  isHost?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
  isHost = true,
}) => {
  const modes: { id: GameMode; title: string; desc: string }[] = [
    { id: 'classic', title: 'Classic Mode', desc: 'Standard rules, $1,500 starting money, balanced pacing.' },
    { id: 'quick', title: 'Quick Mode', desc: 'Fast $2,500 starting cash, rapid 25-turn cap or first to $4,000.' },
    { id: 'chaos', title: 'Chaos Mode', desc: 'Wild events, position swaps, rent surges, and surprise cash rain!' },
    { id: 'auction', title: 'Auction Frenzy', desc: 'Every single unpurchased property goes immediately to live bidding.' },
    { id: 'friendly', title: 'Friendly Town', desc: 'Reduced rents, higher salaries, relaxed penalties for cozy play.' },
    { id: 'high-stakes', title: 'High Stakes', desc: 'High roller rules: $5,000 starting cash and triple rent stakes.' },
    { id: 'long', title: 'Grand Tycoon', desc: 'Deep strategic marathon for true real estate empire builders.' },
  ];

  const boardSizes: { id: BoardSize; title: string; count: string }[] = [
    { id: 'small', title: 'Small', count: '24 Spaces (Fast)' },
    { id: 'standard', title: 'Standard', count: '32 Spaces (Balanced)' },
    { id: 'large', title: 'Large', count: '40 Spaces (Deep)' },
    { id: 'huge', title: 'Huge', count: '48 Spaces (Grand)' },
  ];

  const botDifficulties: { id: BotDifficulty; title: string; desc: string }[] = [
    { id: 'easy', title: 'Easy', desc: 'Relaxed decisions, simple trades, generous bidding.' },
    { id: 'normal', title: 'Normal', desc: 'Balanced cash reserves, fair trades, solid plays.' },
    { id: 'hard', title: 'Hard', desc: 'Strategic bidding, protects monopolies, calculates risk.' },
    { id: 'expert', title: 'Expert', desc: 'Master negotiator, aggressive expansions, tight cash control.' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-2xl text-stone-100 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Game Settings</h3>
              <p className="text-xs text-stone-400">Audio, graphics, and match parameters</p>
            </div>
          </div>
          <button
            onClick={() => {
              audio.play('button-click');
              onClose();
            }}
            className="p-2 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Audio Effects (STRICTLY NO MUSIC) */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Sound Effects (No Music)</h4>
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-950 border border-stone-800">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  onUpdateSettings({ sfxEnabled: !settings.sfxEnabled });
                  audio.enabled = !settings.sfxEnabled;
                  audio.play('button-click');
                }}
                className={`p-2 rounded-xl transition ${
                  settings.sfxEnabled ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-500'
                }`}
              >
                {settings.sfxEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              <div>
                <span className="text-sm font-bold text-stone-200">Sound Effects</span>
                <p className="text-xs text-stone-400">Dice rattles, footsteps, cash register, card chimes</p>
              </div>
            </div>
            <div className="w-32">
              <input
                type="range"
                min="0"
                max="100"
                value={settings.sfxVolume}
                onChange={(e) => {
                  const vol = Number(e.target.value);
                  onUpdateSettings({ sfxVolume: vol });
                  audio.volume = vol / 100;
                }}
                className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Visual & Accessibility */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Visual & Accessibility</h4>
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-950 border border-stone-800">
            <div>
              <span className="text-sm font-bold text-stone-200">Reduced Motion</span>
              <p className="text-xs text-stone-400">Disables jump hops and softens 3D camera sweeps</p>
            </div>
            <button
              onClick={() => {
                audio.play('button-click');
                onUpdateSettings({ reducedMotion: !settings.reducedMotion });
              }}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.reducedMotion ? 'bg-amber-500' : 'bg-stone-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.reducedMotion ? 'translate-x-6' : 'translate-x-1'
                } top-0.5 absolute`}
              />
            </button>
          </div>
        </div>

        {/* Host Game Customization (Available in lobby or host settings) */}
        {isHost && (
          <>
            {/* Section 3: Board Size */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Board Size</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {boardSizes.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => {
                      audio.play('button-click');
                      onUpdateSettings({ boardSize: size.id });
                    }}
                    className={`p-3 rounded-2xl text-left border transition flex flex-col gap-1 cursor-pointer ${
                      settings.boardSize === size.id
                        ? 'border-amber-500 bg-amber-500/10 text-white'
                        : 'border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <span className="font-bold text-sm text-stone-200">{size.title}</span>
                    <span className="text-[11px] text-stone-400">{size.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Section 4: Board Theme */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Board Theme</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.values(BOARD_THEMES).map((thm) => (
                  <button
                    key={thm.id}
                    onClick={() => {
                      audio.play('button-click');
                      onUpdateSettings({ boardTheme: thm.id });
                    }}
                    className={`p-3 rounded-2xl text-left border transition flex flex-col gap-1 cursor-pointer ${
                      settings.boardTheme === thm.id
                        ? 'border-amber-500 bg-amber-500/10 text-white'
                        : 'border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: thm.accentColor }} />
                      <span className="font-bold text-xs text-stone-200 truncate">{thm.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Section 5: Game Mode */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Game Mode</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {modes.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => {
                      audio.play('button-click');
                      onUpdateSettings({ gameMode: mode.id });
                    }}
                    className={`p-3 rounded-2xl text-left border transition flex flex-col gap-1 cursor-pointer ${
                      settings.gameMode === mode.id
                        ? 'border-amber-500 bg-amber-500/10 text-white'
                        : 'border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <span className="font-bold text-sm text-stone-200">{mode.title}</span>
                    <span className="text-[11px] text-stone-400">{mode.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Section 6: Bot Difficulty */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Bot Difficulty</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {botDifficulties.map((diff) => (
                  <button
                    key={diff.id}
                    onClick={() => {
                      audio.play('button-click');
                      onUpdateSettings({ botDifficulty: diff.id });
                    }}
                    className={`p-3 rounded-2xl text-left border transition flex flex-col gap-1 cursor-pointer ${
                      settings.botDifficulty === diff.id
                        ? 'border-amber-500 bg-amber-500/10 text-white'
                        : 'border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <span className="font-bold text-xs text-stone-200 uppercase">{diff.title}</span>
                    <span className="text-[10px] text-stone-400 leading-tight">{diff.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Done Button */}
        <button
          onClick={() => {
            audio.play('button-click');
            onClose();
          }}
          className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-sm transition shadow-lg cursor-pointer"
        >
          Save & Close
        </button>
      </div>
    </div>
  );
};

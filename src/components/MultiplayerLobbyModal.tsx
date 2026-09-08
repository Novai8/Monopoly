import React, { useState } from 'react';
import {
  CharacterId,
  GameSettings,
  MultiplayerRoom,
  Player,
  BotDifficulty,
} from '../types';
import { CHARACTERS, CHARACTER_LIST } from '../data/charactersData';
import { audio } from '../utils/audio';
import {
  X,
  Copy,
  Check,
  Crown,
  Users,
  Play,
  Settings,
  UserX,
  LogOut,
  Sparkles,
  ShieldCheck,
  Radio,
  Sliders,
} from 'lucide-react';

interface MultiplayerLobbyModalProps {
  room: MultiplayerRoom | null;
  playerId: string | null;
  playerName: string;
  onUpdatePlayerName: (name: string) => void;
  onCreateRoom: (character: CharacterId) => void;
  onJoinRoom: (roomCode: string, character: CharacterId) => void;
  onToggleReady: (ready: boolean) => void;
  onChangeCharacter: (character: CharacterId) => void;
  onKickPlayer: (targetPlayerId: string) => void;
  onAddBot: (difficulty?: BotDifficulty) => void;
  onUpdateSettings: (settings: Partial<GameSettings>) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  onClose: () => void;
  errorMessage?: string | null;
}

export const MultiplayerLobbyModal: React.FC<MultiplayerLobbyModalProps> = ({
  room,
  playerId,
  playerName,
  onUpdatePlayerName,
  onCreateRoom,
  onJoinRoom,
  onToggleReady,
  onChangeCharacter,
  onKickPlayer,
  onAddBot,
  onUpdateSettings,
  onStartGame,
  onLeaveRoom,
  onClose,
  errorMessage,
}) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [joinCode, setJoinCode] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterId>('duck');
  const [copied, setCopied] = useState(false);
  const [showSettingsEdit, setShowSettingsEdit] = useState(false);

  const isHost = room ? room.hostId === playerId : false;
  const myPlayer = room?.players.find((p) => p.id === playerId);
  const isReady = myPlayer?.ready ?? false;

  const handleCopyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    audio.play('ui-click');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = () => {
    audio.play('ui-click');
    onCreateRoom(selectedCharacter);
  };

  const handleJoin = () => {
    const code = joinCode.toUpperCase().trim();
    if (!code) return;
    audio.play('ui-click');
    onJoinRoom(code, selectedCharacter);
  };

  const readyCount = room?.players.filter((p) => p.ready).length || 0;
  const totalCount = room?.players.length || 0;
  const canStart = isHost && totalCount >= 2 && readyCount === totalCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-100">
                {room ? `Multiplayer Room: ${room.code}` : 'Online Multiplayer Hub'}
              </h2>
              <p className="text-xs text-stone-400">
                {room
                  ? `${totalCount} / ${room.playerLimit} Players Connected`
                  : 'Host or join real-time online matches'}
              </p>
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

        {/* Error notification banner if any */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        {/* BODY: IF NOT IN ROOM (CREATE / JOIN) */}
        {!room ? (
          <div className="p-5 space-y-5 overflow-y-auto text-stone-300">
            {/* Tabs */}
            <div className="flex p-1 rounded-xl bg-stone-950 border border-stone-800">
              <button
                type="button"
                onClick={() => {
                  setTab('create');
                  audio.play('button-click');
                }}
                className={`flex-1 py-2 rounded-lg font-bold text-xs transition-colors ${
                  tab === 'create'
                    ? 'bg-amber-500 text-stone-950 shadow-sm'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                CREATE ROOM
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('join');
                  audio.play('button-click');
                }}
                className={`flex-1 py-2 rounded-lg font-bold text-xs transition-colors ${
                  tab === 'join'
                    ? 'bg-amber-500 text-stone-950 shadow-sm'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                JOIN ROOM
              </button>
            </div>

            {/* Piece Selection */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                Select Your Playing Piece
              </label>
              <div className="grid grid-cols-7 gap-1.5">
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
                          : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700'
                      }`}
                    >
                      <span className="text-xl">{char.emoji}</span>
                      <span className="text-[10px] truncate max-w-full">{char.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Fields */}
            {tab === 'create' ? (
              <div className="space-y-4 pt-2">
                <div className="p-3.5 rounded-xl bg-stone-950/60 border border-stone-800 text-xs text-stone-300 space-y-1">
                  <div className="font-bold text-stone-100 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    Host a Dedicated Online Room
                  </div>
                  <p className="text-[11px] text-stone-400">
                    A unique 5-character server room code will be generated. You can configure board size, themes, and timer rules in the lobby.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCreate}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-black py-3 rounded-xl shadow-lg shadow-amber-500/20 text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-transform hover:scale-[1.01]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Create Room & Enter Lobby</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                    5-Letter Room Code
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={5}
                    placeholder="e.g. AB7KQ"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-stone-100 font-mono font-black tracking-widest text-center text-xl uppercase focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={joinCode.trim().length < 5}
                  className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-black py-3 rounded-xl shadow-lg shadow-blue-500/20 text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-transform hover:scale-[1.01]"
                >
                  <Users className="w-4 h-4" />
                  <span>Join Server Room</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* BODY: IF ALREADY IN A ROOM LOBBY */
          <div className="p-5 space-y-5 overflow-y-auto text-stone-300">
            {/* Room Code Display & Share */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-950 border border-stone-800">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-400">
                  Room Invite Code
                </span>
                <div className="text-2xl font-black font-mono tracking-widest text-amber-400">
                  {room.code}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 hover:border-amber-400 text-stone-200 text-xs font-bold transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            {/* Connected Players List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-200 uppercase tracking-wider text-[11px]">
                  Players ({totalCount} / {room.playerLimit})
                </span>
                <span className="text-amber-400 font-bold font-mono text-[11px]">
                  {readyCount} / {totalCount} READY
                </span>
              </div>

              <div className="space-y-1.5">
                {room.players.map((p) => {
                  const charDef = CHARACTERS[p.character];
                  const isMe = p.id === playerId;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                        isMe
                          ? 'bg-amber-500/10 border-amber-500/40'
                          : 'bg-stone-950/60 border-stone-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-lg border"
                          style={{
                            backgroundColor: `${p.color}20`,
                            borderColor: p.color,
                          }}
                        >
                          {charDef?.emoji || '👤'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-stone-100 text-xs">
                            <span>{p.name}</span>
                            {p.isHost && (
                              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                                <Crown className="w-3 h-3" /> HOST
                              </span>
                            )}
                            {isMe && (
                              <span className="text-stone-400 text-[10px] font-normal">(You)</span>
                            )}
                          </div>
                          <span className="text-[10px] text-stone-400">{charDef?.name || 'Pawn'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                            p.ready
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-stone-800 border-stone-700 text-stone-400'
                          }`}
                        >
                          {p.ready ? 'READY' : 'NOT READY'}
                        </span>

                        {isHost && !p.isHost && (
                          <button
                            type="button"
                            onClick={() => onKickPlayer(p.id)}
                            title="Kick player"
                            className="p-1 rounded-lg text-stone-500 hover:text-rose-400 hover:bg-stone-800 transition-colors"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Player Controls: Ready Up & Character Swap */}
            <div className="p-3.5 rounded-xl bg-stone-950/60 border border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-300">Your Ready Status</span>
                <button
                  type="button"
                  onClick={() => {
                    audio.play('ui-click');
                    onToggleReady(!isReady);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-transform active:scale-95 ${
                    isReady
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 shadow-md shadow-emerald-500/20'
                      : 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md shadow-amber-500/20'
                  }`}
                >
                  {isReady ? 'READY (Click to Unready)' : 'CLICK TO READY UP'}
                </button>
              </div>

              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-medium text-stone-400">Change Playing Piece</span>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {CHARACTER_LIST.map((char) => (
                    <button
                      key={char.id}
                      type="button"
                      onClick={() => {
                        onChangeCharacter(char.id);
                        audio.play('button-click');
                      }}
                      className={`p-1.5 rounded-lg border text-lg shrink-0 transition-all ${
                        myPlayer?.character === char.id
                          ? 'bg-amber-500/20 border-amber-500 scale-110'
                          : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700'
                      }`}
                    >
                      {char.emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Host Game Settings & Start Trigger */}
            {isHost && (
              <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                    <Crown className="w-4 h-4" />
                    <span>Host Controls</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAddBot(room.settings.botDifficulty || 'normal')}
                    disabled={totalCount >= room.playerLimit}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[10px] font-black disabled:opacity-40"
                  >
                    + ADD BOT
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSettingsEdit(!showSettingsEdit)}
                    className="text-xs text-stone-400 hover:text-white flex items-center gap-1"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{showSettingsEdit ? 'Hide Settings' : 'Edit Game Rules'}</span>
                  </button>
                </div>

                {showSettingsEdit && (
                  <div className="space-y-2.5 pt-2 border-t border-stone-800 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-stone-400 uppercase">Board Size</label>
                        <select
                          value={room.settings.boardSize}
                          onChange={(e) => onUpdateSettings({ boardSize: e.target.value as any })}
                          className="w-full bg-stone-950 border border-stone-800 rounded-lg p-1.5 text-stone-200 capitalize text-xs"
                        >
                          <option value="small">Small (24 Tiles)</option>
                          <option value="standard">Standard (32 Tiles)</option>
                          <option value="large">Large (40 Tiles)</option>
                          <option value="huge">Huge (48 Tiles)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-stone-400 uppercase">Game Mode</label>
                        <select
                          value={room.settings.mode}
                          onChange={(e) => onUpdateSettings({ mode: e.target.value as any })}
                          className="w-full bg-stone-950 border border-stone-800 rounded-lg p-1.5 text-stone-200 capitalize text-xs"
                        >
                          <option value="classic">Classic</option>
                          <option value="quick">Quick Game</option>
                          <option value="chaos">Chaos Mode</option>
                          <option value="high-stakes">High Stakes</option>
                          <option value="friendly">Friendly Mode</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-stone-400 uppercase">Turn Timer</label>
                        <select
                          value={room.settings.turnTimer}
                          onChange={(e) => onUpdateSettings({ turnTimer: Number(e.target.value) })}
                          className="w-full bg-stone-950 border border-stone-800 rounded-lg p-1.5 text-stone-200 text-xs"
                        >
                          <option value={15}>15 Seconds</option>
                          <option value={30}>30 Seconds</option>
                          <option value={45}>45 Seconds</option>
                          <option value={60}>60 Seconds</option>
                          <option value={0}>Unlimited</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-stone-400 uppercase">Max Players</label>
                        <select
                          value={room.playerLimit}
                          onChange={(e) => onUpdateSettings({ playerLimit: Number(e.target.value) })}
                          className="w-full bg-stone-950 border border-stone-800 rounded-lg p-1.5 text-stone-200 text-xs"
                        >
                          {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                            <option key={num} value={num}>
                              {num} Players
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    audio.play('ui-click');
                    onStartGame();
                  }}
                  disabled={!canStart}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-stone-950 font-black py-3 rounded-xl shadow-lg text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-transform hover:scale-[1.01]"
                >
                  <Play className="w-4 h-4" />
                  <span>
                    {totalCount < 2
                      ? 'Waiting for at least 2 players...'
                      : readyCount < totalCount
                      ? `Waiting for players to ready (${readyCount}/${totalCount})`
                      : 'START ONLINE MULTIPLAYER MATCH'}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-stone-800 bg-stone-950/60 flex items-center justify-between">
          {room ? (
            <button
              type="button"
              onClick={() => {
                audio.play('button-click');
                onLeaveRoom();
              }}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Leave Room</span>
            </button>
          ) : (
            <div className="text-[11px] text-stone-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Server-Authoritative Real-Time Rooms</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              audio.play('button-click');
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-stone-400 hover:text-white transition-colors text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { Player, VoiceState, VoiceStatus } from '../types';
import { Mic, MicOff, Volume2, VolumeX, Radio, AlertCircle } from 'lucide-react';
import { audio } from '../utils/audio';

interface VoiceChatBarProps {
  players: Player[];
  currentUserId?: string;
  activePlayer?: Player;
  onLogMessage?: (msg: string) => void;
}

export const VoiceChatBar: React.FC<VoiceChatBarProps> = ({
  players,
  currentUserId,
  activePlayer,
  onLogMessage,
}) => {
  const effectiveUserId = currentUserId || activePlayer?.id || players[0]?.id || 'p1';
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('muted');
  const [volume, setVolume] = useState<number>(80);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [speakingPlayers, setSpeakingPlayers] = useState<Record<string, boolean>>({});

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Clean toggle microphone
  const toggleMic = async () => {
    audio.play('button-click');
    if (!isMuted) {
      // Mute
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setIsMuted(true);
      setVoiceStatus('muted');
      setSpeakingPlayers((prev) => ({ ...prev, [effectiveUserId]: false }));
    } else {
      // Request mic access
      setVoiceStatus('connecting');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        setIsMuted(false);
        setVoiceStatus('connected');

        // Setup simple audio level analyser to detect speaking
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const actx = new AudioCtx();
        const src = actx.createMediaStreamSource(stream);
        const analyser = actx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);

        audioContextRef.current = actx;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkVolume = () => {
          if (!streamRef.current) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const isSpeakingNow = avg > 28;
          setSpeakingPlayers((prev) => ({ ...prev, [effectiveUserId]: isSpeakingNow }));
          setVoiceStatus(isSpeakingNow ? 'speaking' : 'connected');
          requestAnimationFrame(checkVolume);
        };
        checkVolume();
      } catch (err) {
        setVoiceStatus('error');
        setIsMuted(true);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const getStatusBadge = (status: VoiceStatus) => {
    switch (status) {
      case 'speaking':
        return <span className="text-emerald-400 font-bold flex items-center gap-1 animate-pulse">● Speaking</span>;
      case 'connected':
        return <span className="text-emerald-400 font-medium flex items-center gap-1">● Ready</span>;
      case 'connecting':
        return <span className="text-amber-400 font-medium flex items-center gap-1">Connecting...</span>;
      case 'muted':
        return <span className="text-stone-400 font-medium">Muted</span>;
      case 'error':
        return <span className="text-red-400 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Mic Denied</span>;
      default:
        return null;
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 p-1.5 px-3 rounded-2xl bg-stone-900/90 border border-stone-800 backdrop-blur-xs text-xs">
        {/* Toggle Mic Button */}
        <button
          onClick={toggleMic}
          className={`p-2 rounded-xl flex items-center gap-1.5 transition font-bold cursor-pointer ${
            isMuted
              ? 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200'
              : voiceStatus === 'speaking'
              ? 'bg-emerald-500 text-stone-950 ring-2 ring-emerald-400/50'
              : 'bg-emerald-600/80 text-white hover:bg-emerald-500'
          }`}
          title={isMuted ? 'Turn on microphone' : 'Mute microphone'}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          <span className="hidden sm:inline">{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        {/* Current status */}
        <div className="flex items-center gap-1 px-2 border-r border-stone-800">
          <Radio className={`w-3.5 h-3.5 ${voiceStatus === 'speaking' ? 'text-emerald-400 animate-pulse' : 'text-stone-500'}`} />
          {getStatusBadge(voiceStatus)}
        </div>

        {/* Volume slider toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition"
          title="Voice room settings"
        >
          <Volume2 className="w-4 h-4" />
        </button>
      </div>

      {/* Expanded Voice Panel */}
      {isExpanded && (
        <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl z-30 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-200">Voice Chat</span>
            <span className="text-[10px] text-stone-400">WebRTC Audio</span>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-stone-400 flex items-center justify-between">
              <span>Voice Volume</span>
              <span className="font-mono text-stone-300">{volume}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          <div className="flex flex-col gap-1.5 border-t border-stone-800 pt-2">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Players in Room</span>
            <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
              {players.map((p) => {
                const isSpeaking = speakingPlayers[p.id];
                return (
                  <div key={p.id} className="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg bg-stone-800/50">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="truncate text-stone-200">{p.name} {p.isAI || p.isBot ? '(Bot)' : ''}</span>
                    </div>
                    {isSpeaking ? (
                      <span className="text-[10px] text-emerald-400 font-bold animate-pulse">Talking</span>
                    ) : (
                      <span className="text-[10px] text-stone-500">Silent</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

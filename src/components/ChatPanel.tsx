import React, { useState, useRef, useEffect } from 'react';
import { Player, ChatMessage } from '../types';
import { CHARACTERS } from '../data/charactersData';
import { audio } from '../utils/audio';
import { Send, MessageSquare, Smile, Zap } from 'lucide-react';

interface ChatPanelProps {
  messages: ChatMessage[];
  players: Player[];
  activePlayer: Player;
  onSendMessage: (text: string) => void;
  onSendEmote: (emoji: string) => void;
}

const QUICK_CHATS = [
  'Nice roll!',
  'That hurt.',
  'Good move!',
  'Wait!',
  'Deal?',
  'No way!',
  "Let's trade.",
  'GG!',
];

const EMOTES = ['😂', '😱', '🔥', '💀', '👀', '🎉', '🤝', '💰', '😈', '😭'];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  players,
  activePlayer,
  onSendMessage,
  onSendEmote,
}) => {
  const [inputText, setInputText] = useState('');
  const [showEmotePicker, setShowEmotePicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolledUpRef = useRef(false);

  // Safe inner scroll tracking: never calls window.scroll or scrollIntoView!
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    isScrolledUpRef.current = scrollHeight - (scrollTop + clientHeight) > 60;
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el || isScrolledUpRef.current) return;
    const pageScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const pageScrollX = window.scrollX || document.documentElement.scrollLeft || 0;
    el.scrollTop = el.scrollHeight;
    const currentPageScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    if (currentPageScrollY !== pageScrollY) {
      window.scrollTo({ top: pageScrollY, left: pageScrollX, behavior: 'instant' as ScrollBehavior });
    }
  }, [messages]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    audio.play('ui-click');
    onSendMessage(trimmed);
    setInputText('');
  };

  return (
    <div className="flex flex-col h-full bg-stone-900/90 border border-stone-800 rounded-2xl overflow-hidden shadow-inner">
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-stone-200">
          <MessageSquare className="w-4 h-4 text-amber-400" />
          Town Hall Chat
        </div>
        <span className="text-[10px] text-stone-500 font-mono">
          {messages.length} messages
        </span>
      </div>

      {/* Messages Scroll Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{ overflowAnchor: 'none' }}
        className="flex-1 overflow-y-auto p-2.5 space-y-2 text-xs relative"
      >
        {messages.length === 0 ? (
          <div className="text-stone-500 italic text-center py-6 text-[11px]">
            No messages yet. Send a quick chat or emote to greet your fellow tycoons!
          </div>
        ) : (
          messages.map((msg) => {
            const sender = players.find((p) => p.id === msg.senderId);
            const isMe = msg.senderId === activePlayer.id;

            return (
              <div
                key={msg.id}
                className={`flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
                  {msg.senderEmoji && <span>{msg.senderEmoji}</span>}
                  <span
                    className="font-bold"
                    style={{ color: msg.senderColor || sender?.color || '#fbbf24' }}
                  >
                    {msg.senderName}
                  </span>
                  <span className="text-stone-600 font-mono">{msg.timestamp}</span>
                </div>

                <div
                  className={`px-3 py-1.5 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                    isMe
                      ? 'bg-amber-400 text-stone-950 font-medium rounded-tr-xs'
                      : 'bg-stone-950/80 text-stone-200 border border-stone-800 rounded-tl-xs'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Chat Pills Bar */}
      <div className="px-2 py-1.5 bg-stone-950/60 border-t border-stone-800/80 flex items-center gap-1 overflow-x-auto no-scrollbar">
        <Zap className="w-3 h-3 text-amber-400 shrink-0 ml-1" />
        {QUICK_CHATS.map((qc) => (
          <button
            key={qc}
            type="button"
            onClick={() => {
              audio.play('ui-click');
              onSendMessage(qc);
            }}
            className="px-2 py-0.5 rounded-full bg-stone-800/90 hover:bg-stone-700 text-stone-300 hover:text-white text-[10px] font-medium whitespace-nowrap transition cursor-pointer shrink-0 border border-stone-700/50"
          >
            {qc}
          </button>
        ))}
      </div>

      {/* Emotes Bar */}
      <div className="px-2 py-1 bg-stone-950/40 border-t border-stone-800/60 flex items-center gap-1 justify-between overflow-x-auto no-scrollbar">
        {EMOTES.map((em) => (
          <button
            key={em}
            type="button"
            onClick={() => {
              audio.play('ui-click');
              onSendEmote(em);
            }}
            className="p-1 hover:scale-125 transition text-sm cursor-pointer rounded-md hover:bg-stone-800"
            title={`Send ${em}`}
          >
            {em}
          </button>
        ))}
      </div>

      {/* Text Input Area */}
      <form
        onSubmit={handleSubmit}
        className="p-2 bg-stone-950 border-t border-stone-800 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type message..."
          className="flex-1 bg-stone-900 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-400/60"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:hover:bg-amber-400 text-stone-950 font-bold transition cursor-pointer shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};

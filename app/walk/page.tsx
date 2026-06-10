"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

const LOCATIONS = [
  {
    id: "jungfrau",
    name: "융프라우",
    sub: "스위스 알프스",
    emoji: "🏔️",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1920&q=80",
    description: "유럽의 지붕, 4,158m의 청정한 설경",
    ambience: "❄️ 차갑고 맑은 알프스의 공기",
    color: "from-blue-900/60",
  },
  {
    id: "dolomiti",
    name: "돌로미티",
    sub: "이탈리아 북부",
    emoji: "⛰️",
    image: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?auto=format&fit=crop&w=1920&q=80",
    description: "유네스코 세계유산, 장엄한 바위 봉우리",
    ambience: "🌿 소나무 숲의 향기와 맑은 산바람",
    color: "from-orange-900/60",
  },
  {
    id: "niagara",
    name: "나이아가라",
    sub: "캐나다·미국 국경",
    emoji: "💧",
    image: "https://images.unsplash.com/photo-1489456583539-b56a7f2e7af5?auto=format&fit=crop&w=1920&q=80",
    description: "북미 최대의 폭포, 웅장한 물의 장막",
    ambience: "🌊 쏟아지는 물소리와 시원한 물안개",
    color: "from-cyan-900/60",
  },
  {
    id: "santorini",
    name: "산토리니",
    sub: "그리스 에게해",
    emoji: "🌅",
    image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1920&q=80",
    description: "파란 돔 지붕의 동화 같은 항구 마을",
    ambience: "☀️ 따뜻한 지중해 햇살과 살랑이는 바람",
    color: "from-indigo-900/60",
  },
  {
    id: "kyoto",
    name: "교토",
    sub: "일본",
    emoji: "🌸",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1920&q=80",
    description: "천 년의 고도, 벚꽃과 대나무의 도시",
    ambience: "🍃 고즈넉한 사찰의 종소리와 새소리",
    color: "from-pink-900/60",
  },
  {
    id: "patagonia",
    name: "파타고니아",
    sub: "아르헨티나",
    emoji: "🌄",
    image: "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1920&q=80",
    description: "지구 끝의 대자연, 원시의 광야",
    ambience: "🦅 드넓은 초원을 가르는 바람 소리",
    color: "from-green-900/60",
  },
  {
    id: "maldives",
    name: "몰디브",
    sub: "인도양",
    emoji: "🏝️",
    image: "https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?auto=format&fit=crop&w=1920&q=80",
    description: "에메랄드빛 투명한 바다의 산호섬",
    ambience: "🐠 파도 소리와 눈부신 햇살",
    color: "from-teal-900/60",
  },
  {
    id: "aurora",
    name: "오로라",
    sub: "노르웨이 북극",
    emoji: "🌌",
    image: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=1920&q=80",
    description: "북극의 밤하늘을 수놓는 빛의 향연",
    ambience: "✨ 고요한 설원과 춤추는 오로라",
    color: "from-purple-900/60",
  },
];

const WALK_MESSAGES = [
  "잠깐 숨 고르고 가요 🌿",
  "지금 이 순간, 여기에 있어요 ✨",
  "산책하듯 천천히... 🚶",
  "괜찮아요, 잠깐 쉬어도 돼요 💙",
  "자연이 당신 곁에 있어요 🌍",
  "걱정은 잠시 내려두고 🍃",
  "깊게 숨을 들이마셔요... 😌",
];

const NICKNAME_ADJECTIVES = ["따뜻한", "고요한", "맑은", "포근한", "산뜻한", "잔잔한", "밝은"];
const NICKNAME_NOUNS = ["구름", "바람", "파도", "나무", "별빛", "노을", "이슬"];

function randomNickname() {
  const a = NICKNAME_ADJECTIVES[Math.floor(Math.random() * NICKNAME_ADJECTIVES.length)];
  const n = NICKNAME_NOUNS[Math.floor(Math.random() * NICKNAME_NOUNS.length)];
  return `${a} ${n}`;
}

interface ChatMessage {
  id: number;
  text: string;
  nickname: string;
  locationEmoji: string;
  locationName: string;
  time: string;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

// ─── Chat Panel ──────────────────────────────────────────────────────────────

function ChatPanel({
  nickname,
  location,
  onNicknameChange,
}: {
  nickname: string;
  location: (typeof LOCATIONS)[0];
  onNicknameChange: (n: string) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [editingNick, setEditingNick] = useState(false);
  const [nickDraft, setNickDraft] = useState(nickname);
  const [onlineCount, setOnlineCount] = useState(1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // SSE connection
  useEffect(() => {
    const es = new EventSource("/api/chat");
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "init") {
        setMessages(data.messages);
        setOnlineCount(Math.max(1, data.messages.length > 0 ? Math.floor(Math.random() * 4) + 2 : 1));
      } else if (data.type === "message") {
        setMessages((prev) => [...prev, data.message]);
      }
    };
    return () => es.close();
  }, []);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        nickname,
        locationEmoji: location.emoji,
        locationName: location.name,
      }),
    });
  }, [input, nickname, location]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const saveNick = () => {
    const n = nickDraft.trim().slice(0, 20) || randomNickname();
    onNicknameChange(n);
    setNickDraft(n);
    setEditingNick(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white/70 text-xs">{onlineCount}명 산책 중</span>
        </div>
        <div className="text-white/40 text-xs">{location.emoji} {location.name}</div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
        {messages.length === 0 && (
          <div className="text-center text-white/30 text-xs py-8 leading-relaxed">
            아직 아무도 말하지 않았어요.<br />
            먼저 말을 걸어볼까요? 🌿
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.nickname === nickname;
          return (
            <div key={msg.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
              {!isMine && (
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs">{msg.locationEmoji}</span>
                  <span className="text-white/50 text-xs">{msg.nickname}</span>
                </div>
              )}
              <div
                className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                  isMine
                    ? "bg-white/20 text-white rounded-tr-sm"
                    : "bg-white/10 text-white/90 rounded-tl-sm"
                }`}
              >
                {msg.text}
              </div>
              <span className="text-white/25 text-xs mt-1">{formatTime(msg.time)}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Nickname bar */}
      <div className="px-3 pt-2 border-t border-white/10">
        {editingNick ? (
          <div className="flex gap-2 mb-2">
            <input
              autoFocus
              value={nickDraft}
              onChange={(e) => setNickDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveNick()}
              maxLength={20}
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white text-xs outline-none placeholder:text-white/30 focus:border-white/40"
              placeholder="닉네임 입력..."
            />
            <button onClick={saveNick} className="text-white/70 hover:text-white text-xs px-3 py-1.5 bg-white/10 rounded-lg transition-colors">
              확인
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setNickDraft(nickname); setEditingNick(true); }}
            className="text-white/40 hover:text-white/70 text-xs mb-2 transition-colors"
          >
            닉네임: {nickname} ✏️
          </button>
        )}
      </div>

      {/* Input */}
      <div className="px-3 pb-3 flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={200}
          placeholder="여기 경치 어때요? 🌿"
          className="flex-1 bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-white text-sm outline-none placeholder:text-white/30 focus:border-white/35 focus:bg-white/15 transition-all"
        />
        <button
          onClick={send}
          disabled={!input.trim()}
          className="px-3 py-2 bg-white/20 hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl transition-all text-sm"
        >
          ↑
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WalkPage() {
  const [selected, setSelected] = useState(LOCATIONS[0]);
  const [prev, setPrev] = useState<(typeof LOCATIONS)[0] | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [walkMsg, setWalkMsg] = useState(WALK_MESSAGES[0]);
  const [msgVisible, setMsgVisible] = useState(true);
  const [time, setTime] = useState("");
  const [showInfo, setShowInfo] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [nickname, setNickname] = useState("");
  const [unread, setUnread] = useState(0);
  const prevMsgCountRef = useRef(0);

  useEffect(() => {
    const saved = localStorage.getItem("walk-nickname") || randomNickname();
    setNickname(saved);
    localStorage.setItem("walk-nickname", saved);
  }, []);

  const handleNicknameChange = (n: string) => {
    setNickname(n);
    localStorage.setItem("walk-nickname", n);
  };

  useEffect(() => {
    const update = () =>
      setTime(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      setMsgVisible(false);
      setTimeout(() => {
        i = (i + 1) % WALK_MESSAGES.length;
        setWalkMsg(WALK_MESSAGES[i]);
        setMsgVisible(true);
      }, 600);
    }, 7000);
    return () => clearInterval(t);
  }, []);

  // Track unread when chat is closed
  useEffect(() => {
    if (chatOpen) {
      setUnread(0);
      return;
    }
    const es = new EventSource("/api/chat");
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "message") {
        setUnread((n) => n + 1);
      }
    };
    return () => es.close();
  }, [chatOpen]);

  const handleSelect = (loc: (typeof LOCATIONS)[0]) => {
    if (loc.id === selected.id || transitioning) return;
    setPrev(selected);
    setTransitioning(true);
    setTimeout(() => {
      setSelected(loc);
      setTransitioning(false);
      setPrev(null);
    }, 800);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* Fading out previous image */}
      {prev && (
        <div className="absolute inset-0 z-10" style={{ animation: "fadeOut 0.8s ease forwards" }}>
          <Image src={prev.image} alt={prev.name} fill className="object-cover" priority unoptimized />
          <div className={`absolute inset-0 bg-gradient-to-t ${prev.color} via-black/10 to-black/40`} />
        </div>
      )}

      {/* Current image — Ken Burns */}
      <div key={selected.id} className="absolute inset-0 z-0" style={{ animation: "kenBurns 30s ease-in-out infinite alternate" }}>
        <Image src={selected.image} alt={selected.name} fill className="object-cover" priority unoptimized />
      </div>

      {/* Color overlay */}
      <div className={`absolute inset-0 z-20 bg-gradient-to-t ${selected.color} via-transparent to-black/40 pointer-events-none transition-all duration-1000`} />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-start justify-between p-6">
        <div>
          <p className="text-white/40 text-xs tracking-[0.2em] uppercase mb-1">Virtual Walk</p>
          <p className="text-white text-5xl font-extralight tabular-nums">{time}</p>
        </div>
        <button
          onClick={() => setShowInfo((v) => !v)}
          className="text-white/50 hover:text-white text-xs border border-white/20 hover:border-white/50 rounded-full px-4 py-2 backdrop-blur-sm transition-all mt-1"
        >
          {showInfo ? "정보 숨기기" : "정보 보기"}
        </button>
      </div>

      {/* Location info */}
      <div
        className="absolute top-28 left-6 z-30 transition-all duration-500"
        style={{ opacity: showInfo && !transitioning ? 1 : 0, transform: transitioning ? "translateY(10px)" : "translateY(0)" }}
      >
        <div className="text-5xl mb-3">{selected.emoji}</div>
        <h1 className="text-white text-4xl font-bold leading-tight drop-shadow-lg">{selected.name}</h1>
        <p className="text-white/50 text-sm mt-1 font-light">{selected.sub}</p>
        <p className="text-white/80 text-base mt-4 max-w-sm font-light leading-relaxed">{selected.description}</p>
        <p className="text-white/50 text-sm mt-2">{selected.ambience}</p>
      </div>

      {/* Center ambient message */}
      <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
        <p
          className="text-white/50 text-xl font-light text-center tracking-wide transition-all duration-500"
          style={{ opacity: msgVisible ? 1 : 0, transform: msgVisible ? "translateY(0)" : "translateY(8px)" }}
        >
          {walkMsg}
        </p>
      </div>

      {/* ── Chat panel ── */}
      <div
        className={`absolute right-0 top-0 bottom-0 z-40 flex flex-col transition-all duration-400 ease-in-out ${
          chatOpen ? "w-80 pointer-events-auto" : "w-0 pointer-events-none"
        }`}
        style={{ backdropFilter: chatOpen ? "blur(20px)" : undefined }}
      >
        {chatOpen && (
          <div className="flex flex-col h-full bg-black/40 border-l border-white/10">
            <ChatPanel nickname={nickname} location={selected} onNicknameChange={handleNicknameChange} />
          </div>
        )}
      </div>

      {/* Chat toggle button */}
      <button
        onClick={() => setChatOpen((v) => !v)}
        className="absolute right-5 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-1 backdrop-blur-sm transition-all duration-200 hover:scale-110"
        style={{ right: chatOpen ? "324px" : "20px" }}
      >
        <div className="relative w-12 h-12 rounded-2xl bg-white/15 border border-white/25 hover:bg-white/25 flex items-center justify-center text-xl transition-all shadow-lg">
          {chatOpen ? "✕" : "💬"}
          {!chatOpen && unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </div>
        <span className="text-white/50 text-xs">{chatOpen ? "닫기" : "채팅"}</span>
      </button>

      {/* Bottom location selector */}
      <div className="absolute bottom-0 left-0 z-30 p-5" style={{ right: chatOpen ? "320px" : "0" }}>
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
        <div className="relative flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {LOCATIONS.map((loc) => (
            <button
              key={loc.id}
              onClick={() => handleSelect(loc)}
              className={`flex-shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-2xl border transition-all duration-300 backdrop-blur-md cursor-pointer ${
                selected.id === loc.id
                  ? "bg-white/25 border-white/60 text-white scale-105 shadow-lg"
                  : "bg-black/25 border-white/15 text-white/55 hover:bg-white/15 hover:border-white/35 hover:text-white"
              }`}
            >
              <span className="text-2xl leading-none">{loc.emoji}</span>
              <span className="text-xs font-medium whitespace-nowrap mt-0.5">{loc.name}</span>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes kenBurns {
          0%   { transform: scale(1)    translateX(0%)    translateY(0%); }
          25%  { transform: scale(1.06) translateX(-1%)   translateY(-0.5%); }
          50%  { transform: scale(1.1)  translateX(1%)    translateY(-1%); }
          75%  { transform: scale(1.06) translateX(-0.5%) translateY(0.5%); }
          100% { transform: scale(1)    translateX(0%)    translateY(0%); }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

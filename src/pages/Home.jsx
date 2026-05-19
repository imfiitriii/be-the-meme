import Background from "../components/Background";
import { useNavigate } from "react-router-dom";
import MEME_CONFIG from "../data/memeConfig";

const FLOAT_EMOJIS = [
    { emoji: "🎬", top: "12%", left: "6%",  delay: "0s",    size: "3.5rem" },
    { emoji: "🤌", top: "20%", right: "8%", delay: "0.8s",  size: "3rem"   },
    { emoji: "😱", top: "65%", left: "4%",  delay: "1.4s",  size: "3rem"   },
    { emoji: "💀", top: "70%", right: "6%", delay: "0.4s",  size: "2.8rem" },
    { emoji: "🫡", top: "40%", left: "2%",  delay: "1.8s",  size: "2.5rem" },
    { emoji: "🙌", top: "35%", right: "3%", delay: "1.1s",  size: "2.8rem" },
    { emoji: "📸", top: "82%", left: "12%", delay: "0.6s",  size: "2.2rem" },
    { emoji: "🔥", top: "78%", right: "14%",delay: "1.6s",  size: "2.2rem" },
];

export default function Home() {
    const navigate = useNavigate();

    // Double the list for seamless marquee loop
    const marqueeItems = [...MEME_CONFIG, ...MEME_CONFIG];

    return (
        <>
            <Background>
                {/* Floating emoji decorations */}
                {FLOAT_EMOJIS.map(({ emoji, top, left, right, delay, size }) => (
                    <div
                        key={emoji + delay}
                        className="absolute pointer-events-none select-none opacity-20 animate-float"
                        style={{ top, left, right, fontSize: size, animationDelay: delay }}
                    >
                        {emoji}
                    </div>
                ))}

                <div className="relative flex flex-col justify-center items-center gap-6 h-screen animate-introFadeUp text-white z-20">

                    {/* GDSC UTP Badge with Logo */}
                    <div className="flex items-center gap-4 bg-white/95 rounded-2xl px-6 py-3 shadow-[0_0_40px_rgba(255,255,255,0.15)] transition-transform hover:scale-105 cursor-default">
                        <img src="/gdsc-logo.png" alt="GDSC UTP Logo" className="h-14 object-contain" />
                        <div className="h-10 w-px bg-black/10" />
                        <div className="flex flex-col">
                            <span className="text-black/80 font-black text-sm uppercase tracking-widest leading-tight">Booth</span>
                            <span className="text-black/40 font-bold text-xs uppercase tracking-widest">Games</span>
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-[7rem] font-black tracking-tight leading-none text-center"
                        style={{
                            background: "linear-gradient(135deg, #ffffff 0%, #c9d8ff 50%, #a8d8b0 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                            textShadow: "none",
                        }}>
                        Be The Meme!
                    </h1>

                    {/* Tagline */}
                    <p className="text-xl text-white/50 font-semibold tracking-widest uppercase">
                        Strike the pose &nbsp;·&nbsp; Claim the glory
                    </p>

                    {/* Meme preview carousel */}
                    <div className="w-full max-w-2xl overflow-hidden mt-2" style={{ maskImage: "linear-gradient(90deg, transparent, black 15%, black 85%, transparent)" }}>
                        <div className="flex gap-4 animate-marquee" style={{ width: "max-content" }}>
                            {marqueeItems.map((meme, i) => (
                                <div key={`${meme.name}-${i}`}
                                    className="flex-shrink-0 w-28 rounded-xl overflow-hidden"
                                    style={{
                                        background: "#0d0f18",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                    }}>
                                    <img src={meme.image} alt={meme.name}
                                        className="w-full h-24 object-contain" />
                                    <p className="text-center text-white/40 text-[0.6rem] font-bold uppercase tracking-wider py-1.5 truncate px-1">
                                        {meme.name}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Game mode cards */}
                    <div className="flex gap-5 mt-2">
                        {/* Be The Meme */}
                        <button
                            onClick={() => navigate("/game")}
                            className="group relative flex flex-col items-center gap-3 px-10 py-8 rounded-3xl transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
                            style={{
                                background: "rgba(66,133,244,0.08)",
                                border: "1.5px solid rgba(66,133,244,0.3)",
                                boxShadow: "0 8px 32px rgba(66,133,244,0.15)",
                            }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-[#4285F4]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <span className="text-5xl">🎭</span>
                            <span className="text-white font-black text-lg uppercase tracking-wider">Be The Meme</span>
                            <span className="text-white/40 text-xs font-semibold">📷 Match poses with your body</span>
                        </button>

                        {/* Typing Race */}
                        <button
                            onClick={() => navigate("/typing")}
                            className="group relative flex flex-col items-center gap-3 px-10 py-8 rounded-3xl transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
                            style={{
                                background: "rgba(52,168,83,0.08)",
                                border: "1.5px solid rgba(52,168,83,0.3)",
                                boxShadow: "0 8px 32px rgba(52,168,83,0.15)",
                            }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-[#34A853]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <span className="text-5xl">⌨️</span>
                            <span className="text-white font-black text-lg uppercase tracking-wider">Typing Race</span>
                            <span className="text-white/40 text-xs font-semibold">⚡ Type code snippets fast</span>
                        </button>

                        {/* Mirror Match */}
                        <button
                            onClick={() => navigate("/mirror")}
                            className="group relative flex flex-col items-center gap-3 px-10 py-8 rounded-3xl transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
                            style={{
                                background: "rgba(234,67,53,0.08)",
                                border: "1.5px solid rgba(234,67,53,0.3)",
                                boxShadow: "0 8px 32px rgba(234,67,53,0.15)",
                            }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-[#EA4335]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <span className="text-5xl">🪞</span>
                            <span className="text-white font-black text-lg uppercase tracking-wider">Mirror Match</span>
                            <span className="text-white/40 text-xs font-semibold">👥 2 players · Copy each other</span>
                        </button>
                    </div>

                    {/* Leaderboard link */}
                    <button
                        onClick={() => navigate("/leaderboard")}
                        className="mt-4 px-8 py-3 rounded-full text-sm font-black uppercase tracking-widest transition-all duration-300 hover:scale-105 shadow-[0_0_20px_rgba(251,188,4,0.2)] hover:shadow-[0_0_30px_rgba(251,188,4,0.4)]"
                        style={{ background: "rgba(251,188,4,0.15)", border: "1.5px solid #FBBC04", color: "#FBBC04" }}
                    >
                        🏆 View Leaderboard
                    </button>
                </div>
            </Background>
        </>
    );
}
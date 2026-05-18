import Background from "../components/Background";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLeaderboard } from "../utils/leaderboard";

const GDSC_COLORS = ["#4285F4", "#EA4335", "#FBBC04", "#34A853"];
const MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("meme");

    const memeBoard = getLeaderboard("meme");
    const typingBoard = getLeaderboard("typing");
    const mirrorBoard = getLeaderboard("mirror");

    const board = activeTab === "meme" ? memeBoard : activeTab === "typing" ? typingBoard : mirrorBoard;

    return (
        <Background>
            <div className="flex flex-col items-center h-screen text-white z-20 relative pt-8 px-4 animate-introFadeUp">

                {/* Header */}
                <div className="text-5xl mb-2 animate-float">🏆</div>
                <h1 className="text-4xl font-black mb-1"
                    style={{
                        background: "linear-gradient(135deg, #ffffff, #FBBC04)",
                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                    }}>
                    Leaderboard
                </h1>
                <p className="text-white/40 text-sm font-bold mb-6">GDSC UTP Booth</p>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {[
                        { id: "meme", label: "🎭 Be The Meme", color: "#4285F4" },
                        { id: "typing", label: "⌨️ Typing Race", color: "#34A853" },
                        { id: "mirror", label: "🪞 Mirror Match", color: "#EA4335" },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className="px-6 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all duration-200"
                            style={{
                                background: activeTab === tab.id ? `${tab.color}22` : "rgba(255,255,255,0.04)",
                                border: `1.5px solid ${activeTab === tab.id ? tab.color + '66' : 'rgba(255,255,255,0.08)'}`,
                                color: activeTab === tab.id ? tab.color : "rgba(255,255,255,0.4)",
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div className="w-full max-w-lg rounded-2xl overflow-hidden"
                    style={{ background: "#0d0f18", border: "1.5px solid rgba(255,255,255,0.07)" }}>

                    {/* Header row */}
                    <div className="flex items-center px-6 py-3 text-white/30 text-xs font-black uppercase tracking-widest"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="w-12 text-center">#</div>
                        <div className="flex-1">Player</div>
                        <div className="w-24 text-right">{activeTab === "typing" ? "WPM" : "Score"}</div>
                        {activeTab === "typing" && <div className="w-20 text-right">ACC</div>}
                    </div>

                    {/* Entries */}
                    {board.length === 0 ? (
                        <div className="px-6 py-12 text-center text-white/20 font-semibold">
                            No scores yet — be the first! 🚀
                        </div>
                    ) : (
                        board.map((entry, i) => {
                            const accent = GDSC_COLORS[i % GDSC_COLORS.length];
                            return (
                                <div key={i}
                                    className="flex items-center px-6 py-3.5 transition-colors hover:bg-white/[0.02]"
                                    style={{
                                        borderBottom: i < board.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                                        background: i === 0 ? "rgba(251,188,4,0.04)" : "transparent",
                                    }}>
                                    <div className="w-12 text-center text-lg">
                                        {i < 3 ? MEDALS[i] : <span className="text-white/20 font-bold text-sm">{i + 1}</span>}
                                    </div>
                                    <div className="flex-1">
                                        <span className="font-black text-sm" style={{ color: i < 3 ? accent : "rgba(255,255,255,0.7)" }}>
                                            {entry.name}
                                        </span>
                                    </div>
                                    <div className="w-24 text-right font-black text-lg"
                                        style={{ color: i === 0 ? "#FBBC04" : "rgba(255,255,255,0.6)" }}>
                                        {activeTab === "typing" ? entry.wpm : entry.score}
                                    </div>
                                    {activeTab === "typing" && (
                                        <div className="w-20 text-right text-sm font-bold text-white/30">
                                            {entry.accuracy}%
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Back button */}
                <button onClick={() => navigate("/")}
                    className="mt-6 px-8 py-3 text-sm font-black uppercase tracking-wider rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }}>
                    ← Back to Home
                </button>
            </div>
        </Background>
    );
}

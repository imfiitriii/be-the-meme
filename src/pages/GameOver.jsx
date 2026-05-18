import Background from "../components/Background";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { playGameOver } from "../utils/sounds";

export default function GameOver() {
    const navigate = useNavigate();
    const location = useLocation();
    const { score = 0, streak = 0, total = 0 } = location.state || {};

    const [displayScore, setDisplayScore] = useState(0);
    const [isNewRecord, setIsNewRecord] = useState(false);

    useEffect(() => {
        // Check for new best score
        const best = parseInt(localStorage.getItem("btm_best") || "0");
        if (score > best) {
            localStorage.setItem("btm_best", score.toString());
            setIsNewRecord(true);
        }

        // Play fanfare
        playGameOver();

        // Animate score counter
        let current = 0;
        const step = Math.max(1, Math.floor(score / 20));
        const interval = setInterval(() => {
            current += step;
            if (current >= score) {
                current = score;
                clearInterval(interval);
            }
            setDisplayScore(current);
        }, 50);

        return () => clearInterval(interval);
    }, [score]);

    const bestScore = parseInt(localStorage.getItem("btm_best") || "0");

    return (
        <Background>
            <div className="flex flex-col justify-center items-center h-screen gap-6 text-white animate-introFadeUp z-20 relative">

                {/* Trophy / emoji */}
                <div className="text-8xl animate-float">
                    {isNewRecord ? "🏆" : score > 0 ? "🎉" : "😅"}
                </div>

                {/* New record banner */}
                {isNewRecord && (
                    <div
                        className="px-6 py-2 rounded-full font-black text-lg uppercase tracking-widest"
                        style={{
                            background: "linear-gradient(135deg, #FBBC04, #EA4335)",
                            boxShadow: "0 0 30px rgba(251,188,4,0.5)",
                            animation: "pulseGlow 1.5s ease-in-out infinite",
                        }}
                    >
                        🏆 New Record!
                    </div>
                )}

                {/* Score */}
                <div className="text-center">
                    <p className="text-white/40 text-sm font-bold uppercase tracking-widest mb-2">Final Score</p>
                    <p
                        className="text-[6rem] font-black leading-none"
                        style={{
                            background: "linear-gradient(135deg, #ffffff, #4285F4)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                        }}
                    >
                        {displayScore}
                    </p>
                </div>

                {/* Stats row */}
                <div className="flex gap-8 mt-2">
                    <div className="text-center">
                        <p className="text-3xl font-black" style={{ color: "#EA4335" }}>{total}</p>
                        <p className="text-white/40 text-xs font-bold uppercase tracking-wider">Memes</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-black" style={{ color: "#FBBC04" }}>{streak}</p>
                        <p className="text-white/40 text-xs font-bold uppercase tracking-wider">Best Streak</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-black" style={{ color: "#34A853" }}>{bestScore}</p>
                        <p className="text-white/40 text-xs font-bold uppercase tracking-wider">All-Time Best</p>
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-4 mt-6">
                    <button
                        onClick={() => navigate("/game")}
                        className="px-12 py-4 text-lg font-black tracking-widest uppercase rounded-2xl text-white transition-all duration-300 hover:scale-105 active:scale-95"
                        style={{
                            background: "linear-gradient(135deg, #4285F4, #34A853)",
                            boxShadow: "0 0 30px rgba(66,133,244,0.5)",
                        }}
                    >
                        Play Again 🚀
                    </button>
                    <button
                        onClick={() => navigate("/leaderboard")}
                        className="px-8 py-4 text-lg font-black tracking-widest uppercase rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95"
                        style={{
                            background: "rgba(251,188,4,0.1)",
                            border: "1.5px solid rgba(251,188,4,0.3)",
                            color: "#FBBC04",
                        }}
                    >
                        🏆 Leaderboard
                    </button>
                    <button
                        onClick={() => navigate("/")}
                        className="px-8 py-4 text-lg font-black tracking-widest uppercase rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95"
                        style={{
                            background: "rgba(255,255,255,0.08)",
                            border: "1.5px solid rgba(255,255,255,0.15)",
                            color: "rgba(255,255,255,0.7)",
                        }}
                    >
                        Home
                    </button>
                </div>

                {/* GDSC badge */}
                <div className="flex items-center gap-2 mt-4 opacity-40">
                    <div className="flex gap-0.5 text-sm font-black">
                        <span style={{ color: "#EA4335" }}>G</span>
                        <span style={{ color: "#4285F4" }}>D</span>
                        <span style={{ color: "#FBBC04" }}>S</span>
                        <span style={{ color: "#34A853" }}>C</span>
                    </div>
                    <span className="text-white/50 font-semibold text-xs">× UTP</span>
                </div>
            </div>
        </Background>
    );
}

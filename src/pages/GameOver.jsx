import Background from "../components/Background";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { playGameOver } from "../utils/sounds";

export default function GameOver() {
    const navigate = useNavigate();
    const location = useLocation();
    const { score = 0, streak = 0, total = 0, snapshot = null } = location.state || {};

    const [displayScore, setDisplayScore] = useState(0);
    const [isNewRecord, setIsNewRecord] = useState(false);

    async function handleShare() {
        if (!snapshot) return;
        try {
            const response = await fetch(snapshot);
            const blob = await response.blob();
            const file = new File([blob], 'GDSC-Booth-Snapshot.jpg', { type: 'image/jpeg' });
            
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: 'GDSC Booth Snapshot',
                    text: 'Here is your photo from the GDSC UTP Booth!',
                    files: [file]
                });
            } else {
                // Fallback to manual download if native sharing is not supported
                const a = document.createElement("a");
                a.href = snapshot;
                a.download = "GDSC-BeTheMeme.jpg";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        } catch (err) {
            console.error("Error sharing:", err);
        }
    }

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
                
                <div className="flex flex-row items-center gap-16">
                    {/* LEFT COLUMN: Score & Stats */}
                    <div className="flex flex-col items-center gap-4">
                        {/* Trophy / emoji */}
                        <div className="text-7xl animate-float">
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
                            <p className="text-white/40 text-sm font-bold uppercase tracking-widest mb-1">Final Score</p>
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
                        <div className="flex gap-6 mt-2">
                            <div className="text-center bg-white/5 rounded-2xl px-5 py-3 border border-white/10">
                                <p className="text-3xl font-black" style={{ color: "#EA4335" }}>{total}</p>
                                <p className="text-white/40 text-[0.6rem] font-bold uppercase tracking-wider">Memes</p>
                            </div>
                            <div className="text-center bg-white/5 rounded-2xl px-5 py-3 border border-white/10">
                                <p className="text-3xl font-black" style={{ color: "#FBBC04" }}>{streak}</p>
                                <p className="text-white/40 text-[0.6rem] font-bold uppercase tracking-wider">Best Streak</p>
                            </div>
                            <div className="text-center bg-white/5 rounded-2xl px-5 py-3 border border-white/10">
                                <p className="text-3xl font-black" style={{ color: "#34A853" }}>{bestScore}</p>
                                <p className="text-white/40 text-[0.6rem] font-bold uppercase tracking-wider">All-Time</p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Polaroid Snapshot */}
                    {snapshot && (
                        <div className="flex flex-col items-center bg-white p-4 rounded-xl shadow-2xl rotate-2 transition-transform hover:rotate-0 duration-300">
                            <img src={snapshot} alt="Your Meme Pose" className="w-80 h-auto rounded-lg border-2 border-gray-200" />
                            
                            <div className="flex flex-row items-center justify-between w-full mt-4 px-2">
                                <div className="flex flex-col">
                                    <span className="text-black font-black text-lg">GDSC UTP</span>
                                    <span className="text-black/50 text-xs font-bold">Booth Snapshot</span>
                                    <button 
                                        onClick={handleShare}
                                        className="mt-2 px-4 py-2 bg-[#4285F4] text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-blue-600 transition shadow-md w-max"
                                    >
                                        Share to Phone 📲
                                    </button>
                                </div>
                                
                                <div className="flex flex-col items-center gap-1">
                                    <img src="/insta-qr.png" alt="Instagram QR" className="w-[4.5rem] h-[4.5rem] object-contain rounded-md" />
                                    <span className="text-[0.55rem] text-black/60 font-black tracking-widest uppercase">Tag Us!</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Buttons */}
                <div className="flex gap-4 mt-8">
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
                        onClick={() => navigate("/leaderboard", { state: { newRecord: isNewRecord } })}
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
            </div>
        </Background>
    );
}

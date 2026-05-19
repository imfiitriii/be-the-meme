import Background from "../components/Background";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import CODE_SNIPPETS from "../data/codeSnippets";
import { addEntry } from "../utils/leaderboard";

const GAME_DURATION = 60; // seconds

export default function TypingRace() {
    const navigate = useNavigate();

    // Game state
    const [phase, setPhase] = useState("name"); // name | ready | countdown | playing | done
    const [playerName, setPlayerName] = useState("");
    const [countdownNum, setCountdownNum] = useState(3);
    const [snippet, setSnippet] = useState(null);
    const [typed, setTyped] = useState("");
    const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
    const [errors, setErrors] = useState(0);
    const [startTime, setStartTime] = useState(null);
    const [wpm, setWpm] = useState(0);
    const [snippetsCompleted, setSnippetsCompleted] = useState(0);

    const inputRef = useRef(null);
    const timerRef = useRef(null);
    const totalCharsRef = useRef(0);
    const totalErrorsRef = useRef(0);

    // Pick a random snippet
    function pickSnippet() {
        const idx = Math.floor(Math.random() * CODE_SNIPPETS.length);
        setSnippet(CODE_SNIPPETS[idx]);
        setTyped("");
    }

    // Start countdown
    function startGame() {
        setPhase("countdown");
        setCountdownNum(3);
        let count = 3;
        const cdInterval = setInterval(() => {
            count--;
            if (count <= 0) {
                clearInterval(cdInterval);
                setPhase("playing");
                setStartTime(Date.now());
                setTimeLeft(GAME_DURATION);
                setErrors(0);
                setSnippetsCompleted(0);
                totalCharsRef.current = 0;
                totalErrorsRef.current = 0;
                pickSnippet();
                setTimeout(() => inputRef.current?.focus(), 50);
            } else {
                setCountdownNum(count);
            }
        }, 1000);
    }

    // Timer
    useEffect(() => {
        if (phase !== "playing") return;
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    setPhase("done");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [phase]);

    // WPM calculation (live)
    useEffect(() => {
        if (phase !== "playing" || !startTime) return;
        const elapsed = (Date.now() - startTime) / 1000 / 60; // minutes
        if (elapsed > 0) {
            const words = totalCharsRef.current / 5; // standard: 5 chars = 1 word
            setWpm(Math.round(words / elapsed));
        }
    }, [typed, phase, startTime]);

    // Handle typing
    const handleInput = useCallback((e) => {
        if (phase !== "playing" || !snippet) return;
        const value = e.target.value;
        const code = snippet.code;

        // Check the latest character
        if (value.length > typed.length) {
            const newChar = value[value.length - 1];
            const expectedChar = code[value.length - 1];
            if (newChar !== expectedChar) {
                totalErrorsRef.current++;
                setErrors(totalErrorsRef.current);
            }
            totalCharsRef.current++;
        }

        setTyped(value);

        // Snippet completed
        if (value === code) {
            setSnippetsCompleted(prev => prev + 1);
            pickSnippet();
        }
    }, [phase, snippet, typed]);

    // Accuracy
    const accuracy = totalCharsRef.current > 0
        ? Math.round(((totalCharsRef.current - totalErrorsRef.current) / totalCharsRef.current) * 100)
        : 100;

    // Best WPM from localStorage
    const bestWpm = parseInt(localStorage.getItem("btm_typing_best") || "0");

    // Save to leaderboard on game over
    useEffect(() => {
        if (phase === "done") {
            if (wpm > bestWpm) {
                localStorage.setItem("btm_typing_best", wpm.toString());
            }
            addEntry("typing", { name: playerName, wpm, accuracy });
        }
    }, [phase]);

    // Render the code with character-by-character coloring
    function renderCode() {
        if (!snippet) return null;
        const code = snippet.code;
        return (
            <pre className="text-lg leading-relaxed font-mono whitespace-pre-wrap break-all" style={{ tabSize: 2 }}>
                {code.split("").map((char, i) => {
                    let color = "rgba(255,255,255,0.25)"; // untyped
                    let bg = "transparent";
                    if (i < typed.length) {
                        if (typed[i] === char) {
                            color = "#34A853"; // correct
                        } else {
                            color = "#fff";
                            bg = "rgba(234,67,53,0.5)"; // error
                        }
                    } else if (i === typed.length) {
                        bg = "rgba(66,133,244,0.4)"; // cursor
                        color = "#fff";
                    }
                    return (
                        <span key={i} style={{ color, backgroundColor: bg, borderRadius: i === typed.length ? "2px" : 0 }}>
                            {char === "\n" ? "↵\n" : char}
                        </span>
                    );
                })}
            </pre>
        );
    }

    const GDSC_BADGE = (
        <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 mt-4 opacity-70">
            <img src="/gdsc-logo.png" alt="GDSC UTP" className="h-4 object-contain brightness-0 invert" />
        </div>
    );

    // ── NAME ENTRY screen ──
    if (phase === "name") {
        return (
            <Background>
                <div className="flex flex-col justify-center items-center h-screen gap-6 text-white animate-introFadeUp z-20 relative">
                    <div className="text-7xl animate-float">⌨️</div>
                    <h1 className="text-5xl font-black"
                        style={{
                            background: "linear-gradient(135deg, #ffffff, #4285F4)",
                            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                        }}>
                        Typing Race
                    </h1>
                    <p className="text-white/50 font-semibold text-lg">Type code snippets as fast as you can in 60 seconds!</p>

                    <h2 className="text-xl font-black mt-2">What's your name?</h2>
                    <input
                        type="text"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
                        onKeyDown={(e) => { if (e.key === "Enter" && playerName.trim()) setPhase("ready"); }}
                        placeholder="Enter your name..."
                        maxLength={20}
                        autoFocus
                        className="w-72 px-6 py-4 rounded-xl text-center text-lg font-bold outline-none transition-all duration-200 focus:ring-2 focus:ring-blue-400"
                        style={{
                            background: "rgba(255,255,255,0.06)",
                            border: "1.5px solid rgba(255,255,255,0.15)",
                            color: "white",
                        }}
                    />
                    <button
                        onClick={() => { if (playerName.trim()) setPhase("ready"); }}
                        disabled={!playerName.trim()}
                        className="px-12 py-4 text-lg font-black tracking-widest uppercase rounded-2xl text-white transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                        style={{
                            background: playerName.trim() ? "linear-gradient(135deg, #4285F4, #34A853)" : "#333",
                            boxShadow: playerName.trim() ? "0 0 30px rgba(66,133,244,0.5)" : "none",
                        }}>
                        Next →
                    </button>

                    <button onClick={() => navigate("/")}
                        className="text-white/30 text-sm font-bold hover:text-white/60 transition-colors mt-2">
                        ← Back to Home
                    </button>

                    {GDSC_BADGE}
                </div>
            </Background>
        );
    }

    // ── READY screen ──
    if (phase === "ready") {
        return (
            <Background>
                <div className="flex flex-col justify-center items-center h-screen gap-6 text-white animate-introFadeUp z-20 relative">
                    <p className="text-white/40 font-bold text-sm">Playing as <span className="text-white/70">{playerName}</span></p>

                    {bestWpm > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full"
                            style={{ background: "rgba(251,188,4,0.1)", border: "1px solid rgba(251,188,4,0.3)" }}>
                            <span className="text-white/50 text-sm font-bold">Booth Record</span>
                            <span className="text-lg font-black" style={{ color: "#FBBC04" }}>{bestWpm} WPM</span>
                        </div>
                    )}

                    <button onClick={startGame}
                        className="mt-4 px-16 py-5 text-xl font-black tracking-widest uppercase rounded-2xl text-white transition-all duration-300 hover:scale-105 active:scale-95"
                        style={{
                            background: "linear-gradient(135deg, #4285F4, #34A853)",
                            boxShadow: "0 0 30px rgba(66,133,244,0.5)",
                            animation: "pulseGlow 2s ease-in-out infinite",
                        }}>
                        START ⚡
                    </button>

                    {GDSC_BADGE}
                </div>
            </Background>
        );
    }

    // ── COUNTDOWN screen ──
    if (phase === "countdown") {
        return (
            <Background>
                <div className="flex flex-col justify-center items-center h-screen text-white z-20 relative">
                    <div className="text-[12rem] font-black animate-popIn" key={countdownNum}
                        style={{
                            background: "linear-gradient(135deg, #4285F4, #34A853)",
                            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                        }}>
                        {countdownNum}
                    </div>
                    <p className="text-white/50 font-black text-xl uppercase tracking-widest">Get Ready...</p>
                </div>
            </Background>
        );
    }

    // ── GAME OVER screen ──
    if (phase === "done") {
        const isNewRecord = wpm > bestWpm || (wpm === bestWpm && wpm > 0);
        return (
            <Background>
                <div className="flex flex-col justify-center items-center h-screen gap-6 text-white animate-introFadeUp z-20 relative">
                    <div className="text-8xl animate-float">{isNewRecord ? "🏆" : wpm > 30 ? "⚡" : "⌨️"}</div>

                    {isNewRecord && (
                        <div className="px-6 py-2 rounded-full font-black text-lg uppercase tracking-widest"
                            style={{ background: "linear-gradient(135deg, #FBBC04, #EA4335)", boxShadow: "0 0 30px rgba(251,188,4,0.5)" }}>
                            🏆 New Record!
                        </div>
                    )}

                    <div className="text-center">
                        <p className="text-white/40 text-sm font-bold uppercase tracking-widest mb-2">Words Per Minute</p>
                        <p className="text-[6rem] font-black leading-none"
                            style={{ background: "linear-gradient(135deg, #ffffff, #4285F4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                            {wpm}
                        </p>
                    </div>

                    <div className="flex gap-8 mt-2">
                        <div className="text-center">
                            <p className="text-3xl font-black" style={{ color: "#34A853" }}>{accuracy}%</p>
                            <p className="text-white/40 text-xs font-bold uppercase tracking-wider">Accuracy</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-black" style={{ color: "#FBBC04" }}>{snippetsCompleted}</p>
                            <p className="text-white/40 text-xs font-bold uppercase tracking-wider">Snippets</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-black" style={{ color: "#EA4335" }}>{errors}</p>
                            <p className="text-white/40 text-xs font-bold uppercase tracking-wider">Errors</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-black" style={{ color: "#4285F4" }}>{Math.max(wpm, bestWpm)}</p>
                            <p className="text-white/40 text-xs font-bold uppercase tracking-wider">Best WPM</p>
                        </div>
                    </div>

                    <div className="flex gap-4 mt-6">
                        <button onClick={() => { setPhase("ready"); setWpm(0); setTyped(""); }}
                            className="px-12 py-4 text-lg font-black tracking-widest uppercase rounded-2xl text-white transition-all duration-300 hover:scale-105 active:scale-95"
                            style={{ background: "linear-gradient(135deg, #4285F4, #34A853)", boxShadow: "0 0 30px rgba(66,133,244,0.5)" }}>
                            Play Again ⚡
                        </button>
                        <button onClick={() => navigate("/leaderboard", { state: { newRecord: isNewRecord } })}
                            className="px-8 py-4 text-lg font-black tracking-widest uppercase rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95"
                            style={{ background: "rgba(251,188,4,0.1)", border: "1.5px solid rgba(251,188,4,0.3)", color: "#FBBC04" }}>
                            🏆 Leaderboard
                        </button>
                        <button onClick={() => navigate("/")}
                            className="px-8 py-4 text-lg font-black tracking-widest uppercase rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95"
                            style={{ background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }}>
                            Home
                        </button>
                    </div>

                    {GDSC_BADGE}
                </div>
            </Background>
        );
    }

    // ── PLAYING screen ──
    const timerColor = timeLeft <= 10 ? "#EA4335" : timeLeft <= 20 ? "#FBBC04" : "#34A853";

    return (
        <Background>
            <div className="flex flex-col h-screen z-20 relative">

                {/* HUD */}
                <div className="flex items-center justify-between px-6 h-16 flex-shrink-0"
                    style={{ background: "rgba(9,10,15,0.75)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>

                    <div className="flex items-center gap-4">
                        <div className="flex gap-0.5 text-xl font-black">
                            <span style={{ color: "#EA4335" }}>G</span>
                            <span style={{ color: "#4285F4" }}>D</span>
                            <span style={{ color: "#FBBC04" }}>S</span>
                            <span style={{ color: "#34A853" }}>C</span>
                        </div>
                        <span className="text-white/60 font-bold text-sm uppercase tracking-wider">Typing Race</span>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* WPM */}
                        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full"
                            style={{ background: "rgba(66,133,244,0.15)", border: "1.5px solid rgba(66,133,244,0.4)" }}>
                            <span className="text-white/50 text-xs font-bold">WPM</span>
                            <span className="font-black text-lg" style={{ color: "#4285F4" }}>{wpm}</span>
                        </div>

                        {/* Accuracy */}
                        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full"
                            style={{ background: "rgba(52,168,83,0.15)", border: "1.5px solid rgba(52,168,83,0.4)" }}>
                            <span className="text-white/50 text-xs font-bold">ACC</span>
                            <span className="font-black text-lg" style={{ color: "#34A853" }}>{accuracy}%</span>
                        </div>

                        {/* Timer */}
                        <div className="flex items-center justify-center w-12 h-12 rounded-full font-black text-lg"
                            style={{
                                border: `2.5px solid ${timerColor}`,
                                color: timerColor,
                                background: timeLeft <= 10 ? "rgba(234,67,53,0.1)" : "transparent",
                                animation: timeLeft <= 5 ? "pulseGlow 0.5s ease-in-out infinite" : "none",
                                transition: "all 0.3s",
                            }}>
                            {timeLeft}
                        </div>
                    </div>
                </div>

                {/* Main typing area */}
                <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">

                    {/* Snippet info */}
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider"
                            style={{ background: "rgba(66,133,244,0.15)", border: "1px solid rgba(66,133,244,0.3)", color: "#4285F4" }}>
                            {snippet?.language}
                        </span>
                        <span className="text-white/40 font-bold text-sm">{snippet?.title}</span>
                        <span className="text-white/20 text-sm">• Snippet {snippetsCompleted + 1}</span>
                    </div>

                    {/* Code display */}
                    <div className="w-full max-w-3xl rounded-2xl p-8 relative"
                        style={{
                            background: "#0d0f18",
                            border: "1.5px solid rgba(255,255,255,0.07)",
                            boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
                        }}>
                        {/* Line numbers gutter */}
                        <div className="absolute left-0 top-8 bottom-8 w-12 flex flex-col items-end pr-3 text-white/10 text-sm font-mono leading-relaxed select-none">
                            {snippet?.code.split("\n").map((_, i) => (
                                <div key={i}>{i + 1}</div>
                            ))}
                        </div>

                        <div className="pl-8">
                            {renderCode()}
                        </div>
                    </div>

                    {/* Hidden input that captures keystrokes */}
                    <textarea
                        ref={inputRef}
                        value={typed}
                        onChange={handleInput}
                        className="opacity-0 absolute w-0 h-0"
                        autoFocus
                        spellCheck={false}
                        autoCapitalize="off"
                        autoCorrect="off"
                    />

                    {/* Click-to-focus hint */}
                    <p className="text-white/20 text-sm font-semibold">
                        {document.activeElement === inputRef.current
                            ? "⌨️ Typing..."
                            : "👆 Click anywhere to focus"
                        }
                    </p>
                </div>
            </div>

            {/* Global click to focus */}
            <div className="fixed inset-0 z-10" onClick={() => inputRef.current?.focus()} />
        </Background>
    );
}

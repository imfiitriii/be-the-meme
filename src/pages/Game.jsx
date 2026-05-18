import Background from "../components/Background";
import Webcam from "react-webcam";
import { useRef, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import MEME_CONFIG from "../data/memeConfig";
import { playScore, playStreak, playTick, playTimeout, playGameOver } from "../utils/sounds";
import { addEntry } from "../utils/leaderboard";

// Minimum visibility threshold — landmarks below this are unreliable/guessed
const VISIBILITY_THRESHOLD = 0.5;

function normalizePose(pose) {
    if (!pose) return null;

    // Use hip center as the origin
    const leftHip = pose[23];
    const rightHip = pose[24];
    if (!leftHip || !rightHip) return pose;

    const centerX = (leftHip.x + rightHip.x) / 2;
    const centerY = (leftHip.y + rightHip.y) / 2;

    // Compute torso length (hip center → shoulder center) for scale normalization
    // so the pose score is independent of how far the user is from the camera
    const leftShoulder = pose[11];
    const rightShoulder = pose[12];
    const shoulderCX = leftShoulder && rightShoulder
        ? (leftShoulder.x + rightShoulder.x) / 2
        : centerX;
    const shoulderCY = leftShoulder && rightShoulder
        ? (leftShoulder.y + rightShoulder.y) / 2
        : centerY;

    const torsoLength = Math.sqrt(
        (shoulderCX - centerX) ** 2 + (shoulderCY - centerY) ** 2
    );
    const scale = torsoLength > 0.01 ? torsoLength : 1; // guard against degenerate cases

    return pose.map(p => ({
        x: (p.x - centerX) / scale,
        y: (p.y - centerY) / scale,
        visibility: p.visibility ?? 1,
    }));
}

function comparePoses(userPose, memePose) {
    if (!userPose || !memePose) return 0;
    const u = normalizePose(userPose);
    const m = normalizePose(memePose);

    let total = 0;
    let count = 0;
    for (let i = 0; i < m.length; i++) {
        // Skip face landmarks (0-10) — they're irrelevant for body pose matching
        // and their jitter hurts match accuracy
        if (i <= 10) continue;
        if (!u[i] || !m[i]) continue;
        // Skip landmarks that are low-confidence in either pose —
        // these are often guessed by the model and will hurt accuracy
        const uVis = u[i].visibility ?? 1;
        const mVis = m[i].visibility ?? 1;
        if (uVis < VISIBILITY_THRESHOLD || mVis < VISIBILITY_THRESHOLD) continue;

        const dx = m[i].x - u[i].x;
        const dy = m[i].y - u[i].y;
        total += Math.sqrt(dx * dx + dy * dy);
        count++;
    }

    if (count === 0) return 0;
    const avg = total / count;

    // Scoring curve — returns ~1.0 for perfect match, approaches 0 as avg grows.
    // Multiplier of 3 is intentionally gentle after scale normalization; higher values
    // were too strict (even a good match would only score ~0.35 with multiplier=5).
    return Math.exp(-avg * 3);
}

// Helper to load an image as an HTMLImageElement
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

export default function Game() {
    const navigate = useNavigate();
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const memeCanvasRef = useRef(null);
    const canScoreRef = useRef(true);
    const currentIndexRef = useRef(0);
    const holdRef = useRef(0);

    const [memes, setMemes] = useState([]);
    const [playerName, setPlayerName] = useState("");
    const [nameEntered, setNameEntered] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingStatus, setLoadingStatus] = useState("Initializing...");
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [matchScore, setMatchScore] = useState(0);
    const [showScorePopup, setShowScorePopup] = useState(false);
    const [timeLeft, setTimeLeft] = useState(15);
    const [streak, setStreak] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
    const [memesCompleted, setMemesCompleted] = useState(0);
    const [confettiEmojis, setConfettiEmojis] = useState([]);

    const memesRef = useRef([]);
    const timerRef = useRef(null);
    const streakRef = useRef(0);
    const playerNameRef = useRef("");

    // Start extraction only after name is entered
    useEffect(() => {
        if (!nameEntered) return;
        extractAllPoses();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [nameEntered]);

    useEffect(() => {
        currentIndexRef.current = currentIndex;
        drawMemeSkeleton();
    }, [currentIndex, memes]);

    // Countdown timer — resets on meme change
    useEffect(() => {
        if (loading || memes.length === 0) return;
        setTimeLeft(15);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    // Time's up — skip without scoring, break streak
                    clearInterval(timerRef.current);
                    playTimeout();
                    streakRef.current = 0;
                    setStreak(0);
                    advanceMeme();
                    return 15;
                }
                if (prev <= 6) playTick();
                return prev - 1;
            });
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [currentIndex, loading, memes]);

    function advanceMeme() {
        setMemesCompleted(prev => {
            const next = prev + 1;
            if (next >= memesRef.current.length) {
                // Save to leaderboard and go to Game Over
                setTimeout(() => {
                    addEntry("meme", { name: playerNameRef.current, score });
                    navigate("/gameover", {
                        state: {
                            name: playerNameRef.current,
                            score,
                            streak: bestStreak,
                            total: memesRef.current.length,
                        },
                    });
                }, 300);
            }
            return next;
        });
        setCurrentIndex(prev => (prev + 1) % memesRef.current.length);
    }

    function nextMeme() {
        playTimeout();
        streakRef.current = 0;
        setStreak(0);
        advanceMeme();
    }

    async function extractAllPoses() {
        setLoadingStatus("Loading AI model...");

        const vision = await import("@mediapipe/tasks-vision");
        const filesetResolver = await vision.FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        const poseLandmarker = await vision.PoseLandmarker.createFromOptions(
            filesetResolver,
            {
                baseOptions: {
                    modelAssetPath:
                        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
                },
                runningMode: "IMAGE",
            }
        );

        const extracted = [];
        for (let i = 0; i < MEME_CONFIG.length; i++) {
            const meme = MEME_CONFIG[i];
            setLoadingStatus(`Extracting pose ${i + 1}/${MEME_CONFIG.length}: ${meme.name}`);
            setLoadingProgress(Math.round(((i) / MEME_CONFIG.length) * 100));
            try {
                const htmlImg = await loadImage(meme.image);
                const result = poseLandmarker.detect(htmlImg);
                const pose = result.landmarks?.[0] ?? null;
                if (pose) {
                    extracted.push({ name: meme.name, image: meme.image, pose });
                }
            } catch (e) {
                console.warn(`Failed to extract pose for ${meme.name}:`, e);
            }
            setLoadingProgress(Math.round(((i + 1) / MEME_CONFIG.length) * 100));
        }

        // Switch model to VIDEO mode for real-time webcam detection
        setLoadingStatus("Starting camera...");
        const videoLandmarker = await vision.PoseLandmarker.createFromOptions(
            filesetResolver,
            {
                baseOptions: {
                    modelAssetPath:
                        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
                },
                runningMode: "VIDEO",
                numPoses: 1,
            }
        );

        memesRef.current = extracted;
        setMemes(extracted);
        setLoading(false);
        detect(videoLandmarker);
    }

    function drawMemeSkeleton() {
        const canvas = memeCanvasRef.current;
        if (!canvas) return;
        const pose = memesRef.current[currentIndexRef.current]?.pose;
        if (!pose) return;

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const w = canvas.width;
        const h = canvas.height;

        const connections = [
            [11, 13], [13, 15],       // left arm
            [12, 14], [14, 16],       // right arm
            [15, 17], [15, 19], [15, 21], // left hand (pinky, index, thumb)
            [16, 18], [16, 20], [16, 22], // right hand
            [11, 12],                 // shoulders
            [11, 23], [12, 24],       // torso
            [23, 25], [25, 27],       // left leg
            [24, 26], [26, 28],       // right leg
        ];

        ctx.strokeStyle = "rgba(255,200,0,0.9)";
        ctx.lineWidth = 3;
        connections.forEach(([a, b]) => {
            const p1 = pose[a];
            const p2 = pose[b];
            if (!p1 || !p2) return;
            if ((p1.visibility ?? 1) < VISIBILITY_THRESHOLD) return;
            if ((p2.visibility ?? 1) < VISIBILITY_THRESHOLD) return;
            ctx.beginPath();
            ctx.moveTo(p1.x * w, p1.y * h);
            ctx.lineTo(p2.x * w, p2.y * h);
            ctx.stroke();
        });

        pose.forEach((point, idx) => {
            if (idx <= 10) return; // skip face landmarks
            const vis = point.visibility ?? 1;
            if (vis < VISIBILITY_THRESHOLD) return;
            ctx.beginPath();
            ctx.arc(point.x * w, point.y * h, 5, 0, Math.PI * 2);
            ctx.fillStyle = "#facc15";
            ctx.fill();
        });
    }

    async function detect(poseLandmarker) {
        async function frameLandmarks() {
            if (
                webcamRef.current &&
                webcamRef.current.video.readyState === 4
            ) {
                const video = webcamRef.current.video;

                const results = poseLandmarker.detectForVideo(
                    video,
                    performance.now()
                );

                const userPose = results.landmarks?.[0];
                const memePose = memesRef.current[currentIndexRef.current]?.pose;

                drawLandmarks(results.landmarks);

                const matchScore = comparePoses(userPose, memePose);
                setMatchScore(matchScore);

                if (matchScore > 0.80) {
                    holdRef.current += 1;
                } else {
                    holdRef.current = 0;
                }

                if (holdRef.current > 15 && canScoreRef.current) {
                    canScoreRef.current = false;

                    setScore(prev => prev + 1);
                    setShowScorePopup(true);

                    // Streak
                    streakRef.current += 1;
                    const newStreak = streakRef.current;
                    setStreak(newStreak);
                    setBestStreak(prev => Math.max(prev, newStreak));

                    // Sounds
                    playScore();
                    if (newStreak >= 3) {
                        playStreak();
                        // Confetti burst
                        const emojis = ['🔥', '⭐', '🎉', '💥', '✨', '🤩'];
                        const burst = Array.from({ length: 8 }, (_, i) => ({
                            id: Date.now() + i,
                            emoji: emojis[Math.floor(Math.random() * emojis.length)],
                            left: 30 + Math.random() * 40,
                            delay: Math.random() * 0.3,
                        }));
                        setConfettiEmojis(burst);
                        setTimeout(() => setConfettiEmojis([]), 1200);
                    }

                    advanceMeme();
                    holdRef.current = 0;

                    setTimeout(() => {
                        setShowScorePopup(false);
                        canScoreRef.current = true;
                    }, 1200);
                }
            }

            requestAnimationFrame(frameLandmarks);
        }
        frameLandmarks();
    }

    function drawLandmarks(landmarks) {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Sync canvas pixel dimensions to the actual video feed so the
        // skeleton overlay aligns correctly regardless of CSS sizing
        const video = webcamRef.current?.video;
        if (video && video.videoWidth > 0) {
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            }
        }

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!landmarks.length) return;

        const points = landmarks[0]; // only use first detected pose

        const w = canvas.width;
        const h = canvas.height;

        const connections = [ // connections between the landmarks to form the skeleton
            [11, 13], [13, 15], // left arm
            [12, 14], [14, 16], // right arm
            [15, 17], [15, 19], [15, 21], // left hand (pinky, index, thumb)
            [16, 18], [16, 20], [16, 22], // right hand
            [11, 12], // shoulders
            [11, 23], [12, 24], // torso
            [23, 25], [25, 27], // left leg
            [24, 26], [26, 28], // right leg
        ];

        // Flip X to match the mirrored webcam display
        const getX = (x) => (1 - x) * w;
        const getY = (y) => y * h;

        // DRAW LINES
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = 3;

        connections.forEach(([a, b]) => {
            const p1 = points[a];
            const p2 = points[b];
            if (!p1 || !p2) return;

            ctx.beginPath();
            ctx.moveTo(getX(p1.x), getY(p1.y));
            ctx.lineTo(getX(p2.x), getY(p2.y));
            ctx.stroke();
        });

        // DRAW JOINTS — skip face (0-10), color body joints by visibility
        points.forEach((point, idx) => {
            if (idx <= 10) return; // skip face landmarks — irrelevant for pose
            const vis = point.visibility ?? 1;
            const color = vis >= VISIBILITY_THRESHOLD ? "#00ff88" : "rgba(255,80,80,0.4)";
            ctx.beginPath();
            ctx.arc(getX(point.x), getY(point.y), 5, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
        });
    }

    // ── Name entry screen ──
    if (!nameEntered) {
        return (
            <Background>
                <div className="flex flex-col justify-center items-center h-screen gap-6 text-white animate-introFadeUp z-20 relative">
                    <div className="text-7xl animate-float">🎭</div>
                    <h2 className="text-3xl font-black">What's your name?</h2>
                    <p className="text-white/40 font-semibold text-sm">This will appear on the leaderboard</p>
                    <input
                        type="text"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
                        onKeyDown={(e) => { if (e.key === "Enter" && playerName.trim()) { playerNameRef.current = playerName.trim(); setNameEntered(true); } }}
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
                        onClick={() => { if (playerName.trim()) { playerNameRef.current = playerName.trim(); setNameEntered(true); } }}
                        disabled={!playerName.trim()}
                        className="px-12 py-4 text-lg font-black tracking-widest uppercase rounded-2xl text-white transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                        style={{
                            background: playerName.trim() ? "linear-gradient(135deg, #4285F4, #34A853)" : "#333",
                            boxShadow: playerName.trim() ? "0 0 30px rgba(66,133,244,0.5)" : "none",
                        }}
                    >
                        Let's Go! 🚀
                    </button>
                </div>
            </Background>
        );
    }

    // ── Loading screen ──
    if (loading) {
        return (
            <Background>
                <div className="flex flex-col justify-center items-center h-screen gap-6 text-white animate-introFadeUp">
                    <div className="text-6xl animate-float">🎭</div>
                    <h2 className="text-3xl font-black">Loading Memes...</h2>
                    <p className="text-white/50 font-semibold">{loadingStatus}</p>
                    <div className="w-72 h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                        <div
                            className="h-full rounded-full"
                            style={{
                                width: `${loadingProgress}%`,
                                background: "linear-gradient(90deg, #4285F4, #34A853)",
                                transition: "width 0.3s ease-out",
                            }}
                        />
                    </div>
                    <span className="text-white/30 text-sm font-bold">{loadingProgress}%</span>
                </div>
            </Background>
        );
    }

    // ── Game UI ──
    const GDSC_ACCENTS = ["#4285F4", "#EA4335", "#FBBC04", "#34A853"];
    const accentColor = GDSC_ACCENTS[currentIndex % GDSC_ACCENTS.length];

    const matchPct = Math.round(matchScore * 100);
    const barColor = matchScore > 0.80
        ? "#34A853"
        : matchScore > 0.50
        ? "#FBBC04"
        : "#EA4335";

    return (
        <>
            <Background>

                {/* ── Score popup overlay ── */}
                {showScorePopup && (
                    <>
                        {/* screen flash */}
                        <div
                            className="fixed inset-0 pointer-events-none z-50 animate-scoreFlash"
                            style={{ background: `radial-gradient(ellipse at center, ${accentColor}44, transparent 70%)` }}
                        />
                        {/* +1 pop */}
                        <div
                            className="fixed z-50 font-black text-white animate-popIn"
                            style={{
                                top: "50%", left: "50%",
                                fontSize: "9rem",
                                lineHeight: 1,
                                textShadow: `0 0 40px ${accentColor}, 0 0 80px ${accentColor}`,
                                pointerEvents: "none",
                            }}
                        >
                            +1
                        </div>
                    </>
                )}

                {/* ── Confetti burst ── */}
                {confettiEmojis.map(c => (
                    <div key={c.id} className="fixed z-50 pointer-events-none animate-confettiUp"
                        style={{ top: "50%", left: `${c.left}%`, fontSize: "2rem", animationDelay: `${c.delay}s` }}>
                        {c.emoji}
                    </div>
                ))}

                {/* ── Top HUD bar ── */}
                <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-6 z-40"
                    style={{ background: "rgba(9,10,15,0.75)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>

                    {/* GDSC UTP badge */}
                    <div className="flex items-center gap-2">
                        <div className="flex gap-0.5 text-xl font-black">
                            <span style={{ color: "#EA4335" }}>G</span>
                            <span style={{ color: "#4285F4" }}>D</span>
                            <span style={{ color: "#FBBC04" }}>S</span>
                            <span style={{ color: "#34A853" }}>C</span>
                        </div>
                        <span className="text-white/40 font-bold text-sm">× UTP</span>
                    </div>

                    {/* Current meme name + timer */}
                    <div className="flex items-center gap-3">
                        <div className="text-white font-black text-lg tracking-wide uppercase opacity-80">
                            {memes[currentIndex]?.name}
                        </div>
                        <div
                            className="flex items-center justify-center w-10 h-10 rounded-full font-black text-sm"
                            style={{
                                background: timeLeft <= 5 ? "rgba(234,67,53,0.2)" : "rgba(255,255,255,0.06)",
                                border: `2px solid ${timeLeft <= 5 ? '#EA4335' : timeLeft <= 10 ? '#FBBC04' : 'rgba(255,255,255,0.15)'}`,
                                color: timeLeft <= 5 ? "#EA4335" : timeLeft <= 10 ? "#FBBC04" : "rgba(255,255,255,0.7)",
                                transition: "all 0.3s",
                                animation: timeLeft <= 3 ? "pulseGlow 0.5s ease-in-out infinite" : "none",
                            }}
                        >
                            {timeLeft}
                        </div>
                    </div>

                    {/* Score pill + streak */}
                    <div className="flex items-center gap-3">
                        {streak >= 2 && (
                            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full font-black text-sm"
                                style={{ background: "rgba(251,188,4,0.15)", border: "1.5px solid rgba(251,188,4,0.4)", color: "#FBBC04" }}>
                                🔥 x{streak}
                            </div>
                        )}
                        <div
                            className="flex items-center gap-2 px-5 py-2 rounded-full font-black text-white text-lg"
                            style={{
                                background: "rgba(66,133,244,0.15)",
                                border: "1.5px solid rgba(66,133,244,0.4)",
                                boxShadow: showScorePopup ? "0 0 24px 6px rgba(66,133,244,0.7)" : "0 0 10px 2px rgba(66,133,244,0.3)",
                                transition: "box-shadow 0.3s",
                            }}
                        >
                            <span className="text-white/50 text-sm font-bold">SCORE</span>
                            <span style={{ color: "#4285F4" }}>{score}</span>
                        </div>
                    </div>
                </div>

                {/* ── Main panels ── */}
                <div className="flex flex-row justify-center items-center gap-5 h-screen pt-16 pb-3 px-5 animate-introFadeUp">

                    {/* Meme panel */}
                    <div
                        className="flex-1 h-full rounded-3xl overflow-hidden flex flex-col"
                        style={{
                            background: "#0d0f18",
                            border: `1.5px solid rgba(255,255,255,0.07)`,
                            boxShadow: `0 0 0 2px ${accentColor}33, 0 8px 40px rgba(0,0,0,0.6)`,
                        }}
                    >
                        {/* Accent top stripe */}
                        <div className="h-1 w-full flex-shrink-0"
                            style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}44)` }} />

                        {/* Image + skeleton overlay */}
                        <div className="relative flex-1 min-h-0">
                            <img
                                src={memes[currentIndex]?.image}
                                alt={memes[currentIndex]?.name}
                                className="w-full h-full object-contain"
                                onLoad={() => drawMemeSkeleton()}
                            />
                            <canvas
                                ref={memeCanvasRef}
                                width={400}
                                height={500}
                                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                            />
                        </div>

                        {/* Name tag + Skip */}
                        <div className="flex-shrink-0 py-3 px-4 flex items-center justify-between">
                            <span className="text-white/60 font-bold text-sm uppercase tracking-widest">{memes[currentIndex]?.name}</span>
                            <button
                                onClick={() => nextMeme()}
                                className="text-sm font-black uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                                style={{
                                    background: "rgba(255,255,255,0.08)",
                                    border: "1.5px solid rgba(255,255,255,0.15)",
                                    color: "rgba(255,255,255,0.7)",
                                }}
                            >
                                Skip ⏭
                            </button>
                        </div>
                    </div>

                    {/* Webcam panel */}
                    <div
                        className="flex-1 h-full rounded-3xl overflow-hidden flex flex-col"
                        style={{
                            background: "#0d0f18",
                            border: `1.5px solid rgba(255,255,255,0.07)`,
                            boxShadow: matchScore > 0.80
                                ? `0 0 0 2px #34A85388, 0 8px 40px rgba(0,0,0,0.6)`
                                : `0 0 0 2px rgba(255,255,255,0.04), 0 8px 40px rgba(0,0,0,0.6)`,
                            transition: "box-shadow 0.3s",
                        }}
                    >
                        {/* Camera feed + skeleton */}
                        <div className="relative flex-1 min-h-0">
                            <Webcam
                                ref={webcamRef}
                                mirrored={true}
                                audio={false}
                                screenshotFormat="image/jpeg"
                                videoConstraints={{ width: 1280, height: 720, facingMode: "user" }}
                                className="absolute top-0 left-0 w-full h-full object-contain"
                            />
                            <canvas
                                ref={canvasRef}
                                width={800}
                                height={520}
                                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                            />
                            {/* YOU label */}
                            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest"
                                style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", color: "rgba(255,255,255,0.6)" }}>
                                You
                            </div>
                        </div>

                        {/* Match bar */}
                        <div className="flex-shrink-0 px-5 py-4"
                            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                            <div className="flex justify-between items-baseline mb-2">
                                <span className="text-white/40 text-xs font-black uppercase tracking-widest">Match</span>
                                <span
                                    className="text-xl font-black"
                                    style={{ color: barColor, transition: "color 0.2s" }}
                                >
                                    {matchPct}%
                                </span>
                            </div>
                            <div className="w-full h-4 rounded-full overflow-hidden"
                                style={{ background: "rgba(255,255,255,0.07)" }}>
                                <div
                                    className="h-full rounded-full"
                                    style={{
                                        width: `${matchPct}%`,
                                        background: `linear-gradient(90deg, ${barColor}99, ${barColor})`,
                                        boxShadow: matchScore > 0.80 ? `0 0 12px 3px ${barColor}88` : "none",
                                        transition: "width 0.1s, background 0.2s, box-shadow 0.2s",
                                    }}
                                />
                            </div>
                            <p className="text-center text-white/25 text-xs mt-2 font-semibold">
                                {matchScore > 0.80 ? "🟢 Hold it..." : matchScore > 0.50 ? "🟡 Getting close!" : "🔴 Strike the pose!"}
                            </p>
                        </div>
                    </div>
                </div>
            </Background>
        </>
    );
}

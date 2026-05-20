import Background from "../components/Background";
import Webcam from "react-webcam";
import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addEntry } from "../utils/leaderboard";
import { playScore, playTick, playTimeout, playGameOver } from "../utils/sounds";

const VISIBILITY_THRESHOLD = 0.5;
const ROUNDS = 5;
const POSE_TIME = 5;    // seconds the poser has to strike a pose before it locks
const COPY_TIME = 6;    // seconds the copier has to match the pose

// ── Pose helpers ────────────────────────────────────────────────────────────
function normalizePose(pose) {
    if (!pose) return null;
    const lh = pose[23], rh = pose[24];
    if (!lh || !rh) return pose;
    const cx = (lh.x + rh.x) / 2, cy = (lh.y + rh.y) / 2;
    const ls = pose[11], rs = pose[12];
    const scx = ls && rs ? (ls.x + rs.x) / 2 : cx;
    const scy = ls && rs ? (ls.y + rs.y) / 2 : cy;
    const scale = Math.max(0.01, Math.sqrt((scx - cx) ** 2 + (scy - cy) ** 2));
    return pose.map(p => ({ x: (p.x - cx) / scale, y: (p.y - cy) / scale, visibility: p.visibility ?? 1 }));
}

function comparePoses(a, b) {
    if (!a || !b) return 0;
    const na = normalizePose(a), nb = normalizePose(b);
    let total = 0, count = 0;
    for (let i = 11; i < na.length; i++) {
        if (!na[i] || !nb[i]) continue;
        if ((na[i].visibility ?? 1) < VISIBILITY_THRESHOLD) continue;
        if ((nb[i].visibility ?? 1) < VISIBILITY_THRESHOLD) continue;
        const dx = na[i].x - nb[i].x, dy = na[i].y - nb[i].y;
        total += Math.sqrt(dx * dx + dy * dy);
        count++;
    }
    if (count === 0) return 0;
    return Math.exp(-(total / count) * 3);
}

const CONNECTIONS = [
    [11,13],[13,15],[15,17],[15,19],[15,21],
    [12,14],[14,16],[16,18],[16,20],[16,22],
    [11,12],[11,23],[12,24],[23,24],
    [23,25],[25,27],[24,26],[26,28],
];

// Torso height in normalized coords — larger = closer to camera (same heuristic as Game.jsx).
function getPoseTorsoSize(pose) {
    if (!pose) return 0;
    const ls = pose[11], rs = pose[12], lh = pose[23], rh = pose[24];
    if (!ls || !rs || !lh || !rh) return 0;
    const scx = (ls.x + rs.x) / 2, scy = (ls.y + rs.y) / 2;
    const hcx = (lh.x + rh.x) / 2, hcy = (lh.y + rh.y) / 2;
    return Math.sqrt((scx - hcx) ** 2 + (scy - hcy) ** 2);
}

// Among poses on one half of the frame, keep the person closest to the camera.
function pickForegroundOnSide(poses, leftSide) {
    let best = null, bestSize = -1;
    for (const pose of poses) {
        const hipX = getHipX(pose);
        if (hipX === null) continue;
        const onSide = leftSide ? hipX > 0.5 : hipX <= 0.5;
        if (!onSide) continue;
        const size = getPoseTorsoSize(pose);
        if (size > bestSize) {
            bestSize = size;
            best = pose;
        }
    }
    return best;
}

// Split landmarks into [P1, P2], ignoring background people.
// Webcam is mirrored={true}: visual LEFT = raw hip X > 0.5 (P1), visual RIGHT = raw X <= 0.5 (P2).
// When several people share a side, the largest torso wins (foreground player).
function splitPoses(poses) {
    if (!poses || poses.length === 0) return [null, null];
    if (poses.length === 1) {
        const p = poses[0];
        const hipX = getHipX(p);
        return hipX !== null && hipX > 0.5 ? [p, null] : [null, p];
    }
    return [
        pickForegroundOnSide(poses, true),  // P1 — visual left
        pickForegroundOnSide(poses, false), // P2 — visual right
    ];
}

function smoothPose(newPose, prevPose, alpha = 0.35) {
    if (!newPose) return null;
    if (!prevPose) return newPose;
    return newPose.map((pt, i) => {
        const prevPt = prevPose[i];
        if (!prevPt) return pt;
        return {
            x: pt.x * alpha + prevPt.x * (1 - alpha),
            y: pt.y * alpha + prevPt.y * (1 - alpha),
            z: pt.z !== undefined ? pt.z * alpha + (prevPt.z || 0) * (1 - alpha) : undefined,
            visibility: pt.visibility,
        };
    });
}

function getHipX(pose) {
    if (!pose || !pose[23]) return null;
    return (pose[23].x + (pose[24]?.x ?? pose[23].x)) / 2;
}

function clonePose(pose) {
    if (!pose) return null;
    return pose.map(p => ({ ...p }));
}

function drawSkeleton(ctx, pose, w, h, color, mirror = false, glow = false) {
    if (!pose) return;
    const gx = (x) => mirror ? (1 - x) * w : x * w;
    const gy = (y) => y * h;

    if (glow) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 18;
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = glow ? 5 : 3;
    CONNECTIONS.forEach(([a, b]) => {
        const p1 = pose[a], p2 = pose[b];
        if (!p1 || !p2) return;
        if ((p1.visibility ?? 1) < VISIBILITY_THRESHOLD) return;
        if ((p2.visibility ?? 1) < VISIBILITY_THRESHOLD) return;
        ctx.beginPath();
        ctx.moveTo(gx(p1.x), gy(p1.y));
        ctx.lineTo(gx(p2.x), gy(p2.y));
        ctx.stroke();
    });
    pose.forEach((pt, i) => {
        if (i <= 10) return;
        if ((pt.visibility ?? 1) < VISIBILITY_THRESHOLD) return;
        ctx.beginPath();
        ctx.arc(gx(pt.x), gy(pt.y), glow ? 7 : 5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    });

    if (glow) {
        ctx.shadowBlur = 0;
        ctx.shadowColor = "transparent";
    }
}

// ── Component ────────────────────────────────────────────────────────────────
export default function MirrorMatch() {
    const navigate = useNavigate();
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const animRef = useRef(null);

    // Names
    const [p1Name, setP1Name] = useState("");
    const [p2Name, setP2Name] = useState("");
    const [phase, setPhase] = useState("names"); // names | loading | buffer | locking | copying | result | done
    const [bufferCountdown, setBufferCountdown] = useState(3);

    // Game state
    const [round, setRound] = useState(1);
    const [scores, setScores] = useState([0, 0]); // [p1score, p2score]
    const [copyTimeLeft, setCopyTimeLeft] = useState(COPY_TIME);
    const [poseTimeLeft, setPoseTimeLeft] = useState(POSE_TIME);
    const [matchPct, setMatchPct] = useState(0);
    const [roundResult, setRoundResult] = useState(null); // { winner, pct }

    // Refs for game loop
    const phaseRef = useRef("names");
    const round1Ref = useRef(1);
    const isP1PoserRef = useRef(true); // true = P1 poses this round (odd rounds), false = P2 poses
    const lockedPoseRef = useRef(null);  // frozen poser's pose (raw coords, for scoring)
    const livePoserPoseRef = useRef(null); // updated every frame during locking so timer can snapshot it
    const lastValidPoserPoseRef = useRef(null); // tracks last valid poser pose during locking (fallback for null poses)
    const lockTimerRef = useRef(null);
    const copyTimerRef = useRef(null);
    const scoresRef = useRef([0, 0]);
    const smoothedPctRef = useRef(0);
    const prevPose1Ref = useRef(null);
    const prevPose2Ref = useRef(null);

    function setPhaseSync(p) { phaseRef.current = p; setPhase(p); }

    // ── Loading ──────────────────────────────────────────────────────────────
    const [landmarker, setLandmarker] = useState(null);

    async function startLoading() {
        setPhaseSync("loading");
        const vision = await import("@mediapipe/tasks-vision");
        const fr = await vision.FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        const lm = await vision.PoseLandmarker.createFromOptions(fr, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
            },
            runningMode: "VIDEO",
            // Detect extra poses so we can drop background people per side
            numPoses: 4,
        });
        setLandmarker(lm);
        startLoop(lm);
        startBuffer();
    }

    // ── Game loop ────────────────────────────────────────────────────────────
    function startLoop(lm) {
        function loop() {
            const video = webcamRef.current?.video;
            const canvas = canvasRef.current;
            if (!video || video.readyState < 4 || !canvas) {
                animRef.current = requestAnimationFrame(loop);
                return;
            }

            // Sync canvas
            if (canvas.width !== video.videoWidth) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            }

            const res = lm.detectForVideo(video, performance.now());
            let [pose1, pose2] = splitPoses(res.landmarks);

            // Apply temporal smoothing
            pose1 = smoothPose(pose1, prevPose1Ref.current);
            pose2 = smoothPose(pose2, prevPose2Ref.current);
            prevPose1Ref.current = pose1;
            prevPose2Ref.current = pose2;

            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Determine whose pose is whose based on current round parity
            // isP1PoserRef: true = P1 poses this round, false = P2 poses
            const poserPose  = isP1PoserRef.current ? pose1 : pose2;
            const copierPose = isP1PoserRef.current ? pose2 : pose1;
            const poserColor  = isP1PoserRef.current ? "rgba(66,133,244,0.8)"  : "rgba(234,67,53,0.8)";
            const copierColor = isP1PoserRef.current ? "rgba(234,67,53,0.8)" : "rgba(66,133,244,0.8)";

            if (phaseRef.current === "locking") {
                // Draw ONLY the poser's skeleton (Bug 3 fix)
                drawSkeleton(ctx, poserPose,  canvas.width, canvas.height, poserColor,  true);

                // Store current pose AND track last valid pose (Bug 2 fix)
                if (poserPose) {
                    livePoserPoseRef.current = poserPose;
                    lastValidPoserPoseRef.current = poserPose;  // Track last valid
                }
            } else if (phaseRef.current === "copying") {
                // Draw live copier skeleton (yellow)
                drawSkeleton(ctx, copierPose, canvas.width, canvas.height, "rgba(251,188,4,0.85)", true);
                // Draw frozen reference skeleton (green) at ORIGINAL position (no shifting)
                drawSkeleton(ctx, lockedPoseRef.current, canvas.width, canvas.height, "rgba(52,168,83,0.95)", true, true);

                const rawPct = comparePoses(lockedPoseRef.current, copierPose) * 100;
                smoothedPctRef.current = smoothedPctRef.current * 0.7 + rawPct * 0.3;
                setMatchPct(Math.round(smoothedPctRef.current));
            } else if (phaseRef.current === "result") {
                drawSkeleton(ctx, lockedPoseRef.current, canvas.width, canvas.height, "rgba(52,168,83,0.5)", true, true);
            } else if (phaseRef.current === "buffer") {
                // Show both live skeletons during countdown so players can position themselves
                drawSkeleton(ctx, pose1, canvas.width, canvas.height, "rgba(66,133,244,0.5)", true);
                drawSkeleton(ctx, pose2, canvas.width, canvas.height, "rgba(234,67,53,0.5)", true);
            }

            animRef.current = requestAnimationFrame(loop);
        }
        animRef.current = requestAnimationFrame(loop);
    }

    function startLockPhase() {
        setPhaseSync("locking");
        setPoseTimeLeft(POSE_TIME);
        livePoserPoseRef.current = null;
        lastValidPoserPoseRef.current = null;
        let t = POSE_TIME;
        lockTimerRef.current = setInterval(() => {
            t--;
            if (t <= 3) playTick();
            setPoseTimeLeft(t);
            if (t <= 0) {
                clearInterval(lockTimerRef.current);
                // Use fallback: if current pose is null, use last valid pose
                const poseToLock = livePoserPoseRef.current || lastValidPoserPoseRef.current;
                
                // Snapshot poser pose at ORIGINAL position (deep copy so smoothing can't mutate it later)
                lockedPoseRef.current = clonePose(poseToLock);
                
                // DO NOT shift the pose - keep it at the original position
                // displayLockedPoseRef is no longer needed - we'll render lockedPoseRef directly
                startCopyPhase();
            }
        }, 1000);
    }

    function startCopyPhase() {
        setPhaseSync("copying");
        setCopyTimeLeft(COPY_TIME);
        let t = COPY_TIME;
        copyTimerRef.current = setInterval(() => {
            t--;
            if (t <= 3) playTick();
            setCopyTimeLeft(t);
            if (t <= 0) {
                clearInterval(copyTimerRef.current);
                endRound();
            }
        }, 1000);
    }

    function endRound() {
        setPhaseSync("result");
        // Use the smoothed match % accumulated during the copy phase
        const finalPct = lastMatchRef.current;

        // Who was copying this round? Odd rounds: P1 poses → P2 copies. Even rounds: P2 poses → P1 copies.
        const isP1Copying = round1Ref.current % 2 === 0; // even round → P1 copies
        const winner = finalPct >= 60 ? (isP1Copying ? 0 : 1) : -1;

        const newScores = [...scoresRef.current];
        if (winner >= 0) {
            newScores[winner]++;
            scoresRef.current = newScores;
            setScores([...newScores]);
            playScore();
        } else {
            playTimeout();
        }

        setRoundResult({ winner, pct: finalPct, isP1Copying });

        // After 2.5s move to buffer → next round, or end
        setTimeout(() => {
            const nextRound = round1Ref.current + 1;
            if (nextRound > ROUNDS) {
                cancelAnimationFrame(animRef.current);
                setPhaseSync("done");
                playGameOver();
                const w = newScores[0] > newScores[1] ? p1Name : newScores[1] > newScores[0] ? p2Name : "Draw";
                const topScore = Math.max(newScores[0], newScores[1]);
                addEntry("mirror", { name: w, score: topScore });
            } else {
                round1Ref.current = nextRound;
                // Odd rounds → P1 poses; even rounds → P2 poses
                isP1PoserRef.current = nextRound % 2 === 1;
                setRound(nextRound);
                setRoundResult(null);
                lockedPoseRef.current = null;
                livePoserPoseRef.current = null;
                lastValidPoserPoseRef.current = null;
                smoothedPctRef.current = 0;
                // Reset smoothing so old poses don't bleed into the new round
                prevPose1Ref.current = null;
                prevPose2Ref.current = null;
                startBuffer();
            }
        }, 2500);
    }

    function startBuffer() {
        setPhaseSync("buffer");
        setBufferCountdown(3);
        let c = 3;
        const bufInt = setInterval(() => {
            c--;
            if (c <= 0) {
                clearInterval(bufInt);
                startLockPhase();
            } else {
                setBufferCountdown(c);
            }
        }, 1000);
    }

    // Track last match % via ref so endRound can read it
    const lastMatchRef = useRef(0);
    useEffect(() => { lastMatchRef.current = matchPct; }, [matchPct]);

    useEffect(() => {
        return () => {
            cancelAnimationFrame(animRef.current);
            clearInterval(lockTimerRef.current);
            clearInterval(copyTimerRef.current);
        };
    }, []);

    // ── Who is poser / copier this round ─────────────────────────────────────
    const isP1Poser = round % 2 === 1; // odd rounds: P1 poses, P2 copies
    const poserName = isP1Poser ? p1Name : p2Name;
    const copierName = isP1Poser ? p2Name : p1Name;

    // ── NAMES screen ─────────────────────────────────────────────────────────
    if (phase === "names") {
        const ready = p1Name.trim() && p2Name.trim();
        return (
            <Background>
                <div className="flex flex-col items-center justify-center h-screen gap-6 text-white animate-introFadeUp z-20 relative">
                    <div className="text-7xl animate-float">🪞</div>
                    <h1 className="text-5xl font-black" style={{
                        background: "linear-gradient(135deg, #fff, #EA4335)",
                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
                    }}>Mirror Match</h1>
                    <p className="text-white/50 font-semibold">Two players · One camera · {ROUNDS} rounds</p>

                    <div className="flex gap-8 mt-2">
                        {[
                            { label: "Player 1 🔵", val: p1Name, set: setP1Name, color: "#4285F4" },
                            { label: "Player 2 🔴", val: p2Name, set: setP2Name, color: "#EA4335" },
                        ].map(({ label, val, set, color }) => (
                            <div key={label} className="flex flex-col items-center gap-2">
                                <span className="text-sm font-black uppercase tracking-widest" style={{ color }}>{label}</span>
                                <input
                                    type="text" value={val}
                                    onChange={e => set(e.target.value.slice(0, 16))}
                                    onKeyDown={e => { if (e.key === "Enter" && ready) startLoading(); }}
                                    placeholder="Enter name..."
                                    className="w-48 px-5 py-3 rounded-xl text-center text-base font-bold outline-none"
                                    style={{ background: "rgba(255,255,255,0.06)", border: `1.5px solid ${color}44`, color: "white" }}
                                />
                            </div>
                        ))}
                    </div>

                    <button onClick={startLoading} disabled={!ready}
                        className="px-14 py-4 text-lg font-black tracking-widest uppercase rounded-2xl text-white transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                        style={{ background: ready ? "linear-gradient(135deg, #4285F4, #EA4335)" : "#333", boxShadow: ready ? "0 0 30px rgba(234,67,53,0.4)" : "none" }}>
                        Start 🪞
                    </button>

                    <button onClick={() => navigate("/")} className="text-white/30 text-sm font-bold hover:text-white/60 transition-colors">← Back</button>
                </div>
            </Background>
        );
    }

    // ── LOADING screen ────────────────────────────────────────────────────────
    if (phase === "loading") {
        return (
            <Background>
                <div className="flex flex-col items-center justify-center h-screen gap-4 text-white">
                    <div className="text-6xl animate-float">🪞</div>
                    <h2 className="text-2xl font-black">Loading AI model...</h2>
                    <p className="text-white/40 text-sm">Detecting 2 players simultaneously</p>
                </div>
            </Background>
        );
    }

    // ── DONE screen ───────────────────────────────────────────────────────────
    if (phase === "done") {
        const winner = scores[0] > scores[1] ? p1Name : scores[1] > scores[0] ? p2Name : null;
        return (
            <Background>
                <div className="flex flex-col items-center justify-center h-screen gap-6 text-white animate-introFadeUp z-20 relative">
                    <div className="text-8xl animate-float">{winner ? "🏆" : "🤝"}</div>
                    <h2 className="text-3xl font-black">{winner ? `${winner} Wins!` : "It's a Draw!"}</h2>

                    <div className="flex gap-12 mt-2">
                        {[p1Name, p2Name].map((name, i) => (
                            <div key={i} className="text-center">
                                <p className="text-5xl font-black" style={{ color: i === 0 ? "#4285F4" : "#EA4335" }}>{scores[i]}</p>
                                <p className="text-white/40 text-sm font-bold mt-1">{name}</p>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-4 mt-4">
                        <button onClick={() => { setPhase("names"); setScores([0,0]); scoresRef.current=[0,0]; setRound(1); round1Ref.current=1; isP1PoserRef.current=true; lockedPoseRef.current=null; livePoserPoseRef.current=null; lastValidPoserPoseRef.current=null; prevPose1Ref.current=null; prevPose2Ref.current=null; smoothedPctRef.current=0; }}
                            className="px-10 py-4 font-black uppercase tracking-wider rounded-2xl text-white transition-all hover:scale-105 active:scale-95"
                            style={{ background: "linear-gradient(135deg, #4285F4, #EA4335)", boxShadow: "0 0 30px rgba(66,133,244,0.4)" }}>
                            Play Again 🪞
                        </button>
                        <button onClick={() => navigate("/")}
                            className="px-8 py-4 font-black uppercase tracking-wider rounded-2xl transition-all hover:scale-105 active:scale-95"
                            style={{ background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }}>
                            Home
                        </button>
                    </div>
                </div>
            </Background>
        );
    }

    // ── GAME screen (buffer / locking / copying / result) ────────────────────────
    const barColor = matchPct >= 80 ? "#34A853" : matchPct >= 50 ? "#FBBC04" : "#EA4335";

    return (
        <Background>
            {/* HUD — taller, bigger text for booth readability */}
            <div className="absolute top-0 left-0 right-0 h-20 flex items-center justify-between px-8 z-40"
                style={{ background: "rgba(9,10,15,0.85)", backdropFilter: "blur(12px)", borderBottom: "2px solid rgba(255,255,255,0.08)" }}>

                {/* P1 score */}
                <div className="flex items-center gap-3">
                    <span className="text-xl font-black" style={{ color: "#4285F4" }}>{p1Name}</span>
                    <span className="text-4xl font-black text-white">{scores[0]}</span>
                </div>

                {/* Round + phase instruction */}
                <div className="text-center flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-0.5 bg-white/10 rounded-full px-3 py-0.5">
                        <img src="/gdsc-logo.png" alt="GDSC Logo" className="h-3 object-contain brightness-0 invert opacity-70" />
                        <span className="text-white/60 text-xs font-black uppercase tracking-widest">Round {round}/{ROUNDS}</span>
                    </div>
                    <div className="text-white font-black text-xl">
                        {phase === "buffer" ? "Get ready..." :
                         phase === "locking" ? `${poserName} — Strike a pose!` :
                         phase === "copying" ? `${copierName} — Copy it!` :
                         roundResult?.winner >= 0 ? `✅ +1 for ${roundResult.isP1Copying ? p1Name : p2Name}!` : "❌ No point"}
                    </div>
                </div>

                {/* P2 score */}
                <div className="flex items-center gap-3">
                    <span className="text-4xl font-black text-white">{scores[1]}</span>
                    <span className="text-xl font-black" style={{ color: "#EA4335" }}>{p2Name}</span>
                </div>
            </div>

            {/* Webcam + skeleton canvas — ONE instance shared across all active phases */}
            <div className="relative w-full h-screen">
                <Webcam ref={webcamRef} mirrored={true} audio={false}
                    videoConstraints={{ width: 1280, height: 720, facingMode: "user" }}
                    className="absolute inset-0 w-full h-full object-contain" />
                <canvas ref={canvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none" />

                {/* Centre divider */}
                <div className="absolute top-20 bottom-0 left-1/2 -translate-x-1/2 w-0.5 pointer-events-none"
                    style={{ background: "rgba(255,255,255,0.12)" }} />

                {/* Player labels — bigger for booth */}
                <div className="absolute top-24 left-6 z-10 px-5 py-2 rounded-full text-base font-black uppercase tracking-wider"
                    style={{ background: "rgba(66,133,244,0.25)", border: "1.5px solid rgba(66,133,244,0.5)", color: "#4285F4" }}>
                    {p1Name} {isP1Poser && phase === "locking" ? "🎯 POSE" : !isP1Poser && phase === "copying" ? "📋 COPY" : ""}
                </div>
                <div className="absolute top-24 right-6 z-10 px-5 py-2 rounded-full text-base font-black uppercase tracking-wider"
                    style={{ background: "rgba(234,67,53,0.25)", border: "1.5px solid rgba(234,67,53,0.5)", color: "#EA4335" }}>
                    {p2Name} {!isP1Poser && phase === "locking" ? "🎯 POSE" : isP1Poser && phase === "copying" ? "📋 COPY" : ""}
                </div>

                {/* Buffer countdown overlay */}
                {phase === "buffer" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-30"
                        style={{ background: "rgba(9,10,15,0.75)" }}>
                        <div className="text-white/30 text-lg font-black uppercase tracking-widest mb-2">Round {round} of {ROUNDS}</div>
                        <div className="text-6xl mb-4" key={`buf-${bufferCountdown}`}>{bufferCountdown}</div>
                        <div className="text-3xl font-black text-white mb-2">
                            {poserName}'s turn to pose!
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                            <span className="text-lg font-black" style={{ color: isP1Poser ? "#4285F4" : "#EA4335" }}>
                                {poserName} 🎯
                            </span>
                            <span className="text-white/30 text-lg">→</span>
                            <span className="text-lg font-black" style={{ color: isP1Poser ? "#EA4335" : "#4285F4" }}>
                                {copierName} 📋
                            </span>
                        </div>
                        <p className="text-white/40 text-sm font-semibold mt-4">Get into position!</p>
                    </div>
                )}

                {/* Pose timer countdown */}
                {phase === "locking" && (
                    <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3"
                        style={{ background: "rgba(9,10,15,0.7)", backdropFilter: "blur(8px)", borderRadius: "1rem", padding: "1rem 1.5rem", minWidth: "18rem" }}>
                        <p className="text-center text-white/70 text-base font-black uppercase tracking-wider">
                            🎯 {poserName}: strike a pose!
                        </p>
                        <div className="flex items-center justify-center w-16 h-16 rounded-full font-black text-3xl"
                            style={{
                                border: `3px solid ${poseTimeLeft <= 2 ? '#EA4335' : '#4285F4'}`,
                                color: poseTimeLeft <= 2 ? "#EA4335" : "#4285F4",
                                background: "rgba(9,10,15,0.8)",
                                animation: poseTimeLeft <= 2 ? "pulseGlow 0.5s ease-in-out infinite" : "none",
                            }}>
                            {poseTimeLeft}
                        </div>
                        <p className="text-white/40 text-xs font-bold">Pose locks when timer hits 0</p>
                    </div>
                )}

                {/* Copy timer — big visible countdown */}
                {phase === "copying" && (
                    <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20">
                        <div className="flex items-center justify-center w-16 h-16 rounded-full font-black text-2xl"
                            style={{
                                border: `3px solid ${copyTimeLeft <= 3 ? '#EA4335' : '#FBBC04'}`,
                                color: copyTimeLeft <= 3 ? "#EA4335" : "#FBBC04",
                                background: "rgba(9,10,15,0.7)",
                                backdropFilter: "blur(8px)",
                                animation: copyTimeLeft <= 3 ? "pulseGlow 0.5s ease-in-out infinite" : "none",
                            }}>
                            {copyTimeLeft}
                        </div>
                    </div>
                )}

                {/* Match % bar (copying phase) — bigger, clearer */}
                {phase === "copying" && (
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-96 z-20"
                        style={{ background: "rgba(9,10,15,0.7)", backdropFilter: "blur(8px)", borderRadius: "1rem", padding: "1rem 1.5rem" }}>
                        <div className="flex justify-between items-baseline mb-2">
                            <span className="text-white/50 text-sm font-black uppercase tracking-widest">Match</span>
                            <span className="text-2xl font-black" style={{ color: barColor }}>{matchPct}%</span>
                        </div>
                        <div className="w-full h-5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                            <div className="h-full rounded-full transition-all duration-100"
                                style={{ width: `${matchPct}%`, background: `linear-gradient(90deg, ${barColor}99, ${barColor})`, boxShadow: matchPct >= 80 ? `0 0 12px 3px ${barColor}88` : "none" }} />
                        </div>
                        <p className="text-center text-white/40 text-sm mt-2 font-bold">
                            {matchPct >= 80 ? "🟢 Looking good! Hold it!" : matchPct >= 50 ? "🟡 Getting closer!" : "🔴 Match the pose!"}
                        </p>
                    </div>
                )}

                {/* Round result flash — bigger */}
                {phase === "result" && roundResult && (
                    <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                        <div className="px-14 py-8 rounded-3xl text-center animate-popIn"
                            style={{ background: "rgba(9,10,15,0.9)", border: `2px solid ${roundResult.winner >= 0 ? "#34A853" : "#EA4335"}66`, backdropFilter: "blur(16px)" }}>
                            <div className="text-7xl mb-3">{roundResult.winner >= 0 ? "🎉" : "😅"}</div>
                            <div className="text-white font-black text-3xl">
                                {roundResult.winner >= 0 ? `${roundResult.isP1Copying ? p1Name : p2Name} scored!` : "No point — try harder!"}
                            </div>
                            <div className="text-white/50 text-lg font-bold mt-2">{roundResult.pct}% match</div>
                        </div>
                    </div>
                )}
            </div>
        </Background>
    );
}

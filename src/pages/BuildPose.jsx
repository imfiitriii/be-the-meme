import { useRef, useState } from "react";

// All images currently in /public/assets/ that we want to extract poses from.
// Add new filenames here when you add more images to public/assets/.
const ASSET_IMAGES = [
    { file: "pointing.png",        name: "Pointing" },
    { file: "arms_up.png",         name: "Hands Up!" },
    { file: "facepalm.png",        name: "Facepalm" },
    { file: "shrug.png",           name: "IDK Shrug" },
    { file: "pointing_himself.png",name: "Who Me?" },
    { file: "shocked.png",         name: "Shocked" },
    { file: "cinema.png",          name: "Absolute Cinema" },
    { file: "confused.png",        name: "Confused" },
    { file: "67.png",              name: "67" },
    { file: "siuuu.png",            name: "Siuuu" }
];

export default function BuildPose() {
    const [results, setResults] = useState([]); // { name, file, pose, status }
    const [running, setRunning] = useState(false);
    const [done, setDone] = useState(false);

    async function runBatchExtraction() {
        setRunning(true);
        setDone(false);
        setResults(ASSET_IMAGES.map(img => ({ ...img, pose: null, status: "pending" })));

        const vision = await import("@mediapipe/tasks-vision");
        const filesetResolver = await vision.FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        const poseLandmarker = await vision.PoseLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
                modelAssetPath:
                    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            },
            runningMode: "IMAGE",
        });

        const extracted = [];
        for (const img of ASSET_IMAGES) {
            setResults(prev => prev.map(r => r.file === img.file ? { ...r, status: "extracting" } : r));

            try {
                const htmlImg = await loadImage(`/assets/${img.file}`);
                const result = poseLandmarker.detect(htmlImg);
                const pose = result.landmarks?.[0] ?? null;

                extracted.push({ ...img, pose, status: pose ? "done" : "no_pose" });
                setResults(prev => prev.map(r =>
                    r.file === img.file ? { ...r, pose, status: pose ? "done" : "no_pose" } : r
                ));
            } catch (e) {
                extracted.push({ ...img, pose: null, status: "error" });
                setResults(prev => prev.map(r =>
                    r.file === img.file ? { ...r, pose: null, status: "error" } : r
                ));
            }
        }

        setRunning(false);
        setDone(true);
    }

    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    function buildJsonOutput() {
        const entries = results
            .filter(r => r.pose)
            .map(r => ({
                name: r.name,
                image: `/assets/${r.file}`,
                pose: r.pose,
            }));
        return JSON.stringify(entries, null, 2);
    }

    const statusIcon = (s) => ({
        pending: "⏳",
        extracting: "🔄",
        done: "✅",
        no_pose: "⚠️",
        error: "❌",
    }[s] ?? "?");

    return (
        <div style={{ minHeight: "100vh", background: "#090a0f", color: "white", padding: "2rem", fontFamily: "Nunito, sans-serif" }}>
            <h1 style={{ fontSize: "2rem", fontWeight: 900, marginBottom: "0.5rem" }}>🎭 Pose Studio</h1>
            <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "2rem" }}>
                Batch-extract MediaPipe pose landmarks from all meme images. Click <strong>Run All</strong> then copy the output into <code>src/data/memes.json</code>.
            </p>

            <button
                onClick={runBatchExtraction}
                disabled={running}
                style={{
                    background: running ? "#333" : "linear-gradient(135deg,#4285F4,#34A853)",
                    color: "white", border: "none", borderRadius: "12px",
                    padding: "0.9rem 2.5rem", fontSize: "1.1rem", fontWeight: 800,
                    cursor: running ? "not-allowed" : "pointer", marginBottom: "2rem",
                    boxShadow: running ? "none" : "0 0 20px rgba(66,133,244,0.5)",
                }}
            >
                {running ? "⏳ Extracting poses..." : "▶ Run All"}
            </button>

            {/* Status grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                {results.map(r => (
                    <div key={r.file} style={{
                        background: "#0d0f18", border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "12px", padding: "1rem", textAlign: "center",
                    }}>
                        <img src={`/assets/${r.file}`} alt={r.name}
                            style={{ width: "100%", height: "120px", objectFit: "contain", marginBottom: "0.5rem", borderRadius: "8px" }} />
                        <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>{r.name}</div>
                        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", marginBottom: "0.4rem" }}>{r.file}</div>
                        <div style={{ fontSize: "1.4rem" }}>{statusIcon(r.status)}</div>
                        {r.status === "no_pose" && <div style={{ color: "#FBBC04", fontSize: "0.7rem" }}>No person detected</div>}
                    </div>
                ))}
            </div>

            {/* Output */}
            {done && (
                <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <h2 style={{ fontWeight: 800, color: "#34A853" }}>
                            ✅ Done — {results.filter(r => r.pose).length}/{results.length} poses extracted
                        </h2>
                        <button
                            onClick={() => navigator.clipboard.writeText(buildJsonOutput())}
                            style={{
                                background: "#34A853", color: "white", border: "none",
                                borderRadius: "8px", padding: "0.5rem 1.5rem",
                                fontWeight: 800, cursor: "pointer", fontSize: "0.9rem",
                            }}
                        >
                            📋 Copy memes.json
                        </button>
                    </div>
                    <pre style={{
                        background: "#0d0f18", border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "12px", padding: "1.5rem", overflow: "auto",
                        maxHeight: "400px", fontSize: "0.75rem", color: "rgba(255,255,255,0.7)",
                    }}>
                        {buildJsonOutput()}
                    </pre>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", marginTop: "1rem" }}>
                        Copy the above and paste it into <code>src/data/memes.json</code> to add all poses to the game.
                    </p>
                </div>
            )}
        </div>
    );
}
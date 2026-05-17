import { useRef, useState } from "react";

export default function BuildPose() {
    const imageRef = useRef(null);
    const [landmarks, setLandmarks] = useState(null);

    async function extractPose() {
        console.log("Extracting pose...");
        const vision = await import("@mediapipe/tasks-vision");

        const filesetResolver =
            await vision.FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
            );

        const poseLandmarker =
            await vision.PoseLandmarker.createFromOptions(filesetResolver, {
                baseOptions: {
                    modelAssetPath:
                        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
                },
                runningMode: "IMAGE",
            });

        const result = poseLandmarker.detect(imageRef.current);
        setLandmarks(result.landmarks);
    }
    return (
        <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center gap-6">

            <h1 className="text-3xl font-bold">
                Meme Pose Builder
            </h1>

            <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                        imageRef.current.src = URL.createObjectURL(file);
                    }
                }}
            />

            <img
                ref={imageRef}
                alt="upload"
                className="max-w-[500px] rounded-xl"
            />

            <button
                className="bg-blue-500 px-4 py-2 rounded"
                onClick={() => extractPose()}
            >
                Extract Pose
            </button>

            {landmarks && (
                <pre className="bg-zinc-900 p-4 rounded w-full overflow-auto">
                    {JSON.stringify(landmarks, null, 2)}
                </pre>
            )}

        </div>
    );
}
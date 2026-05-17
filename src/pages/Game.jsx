import Button from "../components/Button";
import Background from "../components/Background";
import Webcam from "react-webcam";
import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import memes from "../data/memes.json";

function normalizePose(pose) { // normalize the pose landmarks to be relative to the hips and scale invariant
    if (!pose) return null;

    // use hips as center point
    const leftHip = pose[23];
    const rightHip = pose[24];
    if (!leftHip || !rightHip) return pose;

    const centerX = (leftHip.x + rightHip.x) / 2;
    const centerY = (leftHip.y + rightHip.y) / 2;

    return pose.map(p => ({
        x: p.x - centerX,
        y: p.y - centerY
    }));
}

function comparePoses(userPose, memePose) {
    if (!userPose || !memePose) return 0;
    const u = normalizePose(userPose);
    const m = normalizePose(memePose);

    let total = 0;
    let count = 0;
    for (let i = 0; i < m.length; i++) {
        if (!u[i] || !m[i]) continue;
        const dx = m[i].x - u[i].x;
        const dy = m[i].y - u[i].y;
        total += Math.sqrt(dx * dx + dy * dy);
        count++;
    }

    const avg = total / count;

    // smoother scoring curve (IMPORTANT)
    return Math.exp(-avg * 6);
}
export default function Game() {
    const navigate = useNavigate();
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const canScoreRef = useRef(true);
    const currentIndexRef = useRef(0);
    const holdRef = useRef(0); // to hold the pose for a few frames to make scoring more forgiving

    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [isCorrect, setIsCorrect] = useState(false);

    useEffect(() => {
        setupPoseDetection();
    }, []);

    useEffect(() => {
        currentIndexRef.current = currentIndex;
    }, [currentIndex]);
    function nextMeme() {
        setCurrentIndex((prev) => (prev + 1) % memes.length);
    }

    async function setupPoseDetection() {
        const vision = await import("@mediapipe/tasks-vision"); // importing the vision module from mediapipe

        const filesetResolver =
            await vision.FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm" // resolving the path for the wasm files
            );
        const poseLandmarker =
            await vision.PoseLandmarker.createFromOptions( // creating the ai model using the createFromOptions method 
                filesetResolver,
                {
                    baseOptions: {
                        modelAssetPath:
                            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",// path for the model file
                    },
                    runningMode: "VIDEO",
                    numPoses: 1,
                }
            );
        detect(poseLandmarker);
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
                const memePose = memes[currentIndexRef.current]?.pose; // the current meme pose we are trying to match

                drawLandmarks(results.landmarks);

                const matchScore = comparePoses(userPose, memePose);

                if (matchScore > 0.65) {
                    holdRef.current += 1;
                } else {
                    holdRef.current = 0;
                }

                if (holdRef.current > 7 && canScoreRef.current) {
                    canScoreRef.current = false;

                    setScore(prev => prev + 1);
                    nextMeme();

                    holdRef.current = 0;

                    setTimeout(() => {
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

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!landmarks.length) return

        const points = landmarks[0]; // we are only interested in the first detected pose (if there are multiple people, we ignore the rest)

        const w = canvas.width;
        const h = canvas.height;

        const connections = [ // connections between the landmarks to form the skeleton
            [11, 13], [13, 15], // left arm
            [12, 14], [14, 16], // right arm
            [11, 12], // shoulders
            [11, 23], [12, 24], // torso
            [23, 25], [25, 27], // left leg
            [24, 26], [26, 28], // right leg
        ];

        //  mirror X (
        const getX = (x) => x * w;
        const getY = (y) => y * h;
        // DRAW LINES
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;

        connections.forEach(([a, b]) => {
            const p1 = points[a];
            const p2 = points[b];

            if (!p1 || !p2) return;

            ctx.beginPath();
            ctx.moveTo(getX(p1.x), getY(p1.y));
            ctx.lineTo(getX(p2.x), getY(p2.y));
            ctx.stroke();
        });

        // DRAW JOINTS (dots)
        points.forEach((point) => {
            ctx.beginPath();
            ctx.arc(getX(point.x), getY(point.y), 4, 0, Math.PI * 2);
            ctx.fillStyle = "red";
            ctx.fill();
        });
    }


    return (
        <>
            <Background>
                <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-2xl font-bold z-50">
                    Score: {score}
                </div>
                <div className="flex flex-row justify-center items-center gap-7 h-screen animate-introFadeUp text-white">
                    <div className="bg-[#090a0f] w-[40%] h-[70%] rounded-4xl flex flex-col items-center justify-center gap-4">
                        <img
                            src={memes[currentIndex].image}
                            alt={memes[currentIndex].name}
                            className="w-full h-full object-contain rounded-2xl"
                        />
                    </div>
                    <div className="bg-[#090a0f] w-[40%] h-[70%] rounded-4xl flex justify-center items-center">
                        <div className="relative w-[800px] h-[520px]">
                            <Webcam
                                ref={webcamRef}
                                mirrored={false}
                                audio={false}
                                screenshotFormat="image/jpeg"
                                videoConstraints={{
                                    width: 1280,
                                    height: 720,
                                    facingMode: "user",
                                }}
                                className="absolute top-0 left-0 w-full h-full object-cover rounded-2xl"
                            />
                            <canvas
                                ref={canvasRef}
                                width={800}
                                height={520}
                                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                            />
                        </div>
                    </div>
                </div>
            </Background>
        </>
    )
}

import Button from "../components/Button";
import Background from "../components/Background";
import Webcam from "react-webcam";
import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import memes from "../data/memes.json";

export default function Game() {
    const navigate = useNavigate();
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [isCorrect, setIsCorrect] = useState(false);

    useEffect(() => {
        setupPoseDetection();
    }, []);

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
        async function frameLandmarks() { // function to detect the landmarks in each frame of the video
            if (webcamRef.current && webcamRef.current.video.readyState === 4) {
                const video = webcamRef.current.video; //get video frame from webcam
                const results = poseLandmarker.detectForVideo( // running the detection using the detectForVideo method of the model
                    video,
                    performance.now() // passing the current timestamp for accurate detection
                );
                drawLandmarks(results.landmarks); // function to draw the landmarks on the canvas
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

        // 🪞 mirror X (
        const getX = (x) => (1 - x) * w;
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
                <div className="flex flex-row justify-center items-center gap-7 h-screen animate-introFadeUp text-white">
                    <div className="bg-[#090a0f] w-[40%] h-[70%] rounded-4xl">
                        {/* <img src="" alt="image" /> */}
                    </div>
                    <div className="bg-[#090a0f] w-[40%] h-[70%] rounded-4xl flex justify-center items-center">
                        <div className="relative w-[800px] h-[520px]">
                            <Webcam
                                ref={webcamRef}
                                mirrored={true}
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

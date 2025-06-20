import React, { useRef, useState, useEffect } from "react";
import { FaSun, FaMoon } from "react-icons/fa";

import "./index.css";
function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const snapshotCanvasRef = useRef(null);
  const beepAudio = useRef(new Audio("/beep.mp3"));
  const prevImageRef = useRef(null);
  const [tracking, setTracking] = useState(false);
  const [sensitivity, setSensitivity] = useState(30);
  const [snapshots, setSnapshots] = useState([]);
  const [motionLogs, setMotionLogs] = useState([]);
  const [error, setError] = useState("");
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [motionClips, setMotionClips] = useState([]);



const [darkMode, setDarkMode] = useState(true);
const toggleTheme = () => {
  setDarkMode(!darkMode);
};

const startRecording = () => {
  const stream = canvasRef.current.captureStream();
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  
  const chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    setMotionClips(prev => [url, ...prev.slice(0, 4)]); // Keep last 5 clips
  };

  recorder.start();
  setMediaRecorder(recorder);
  setRecordedChunks([]);
};

const stopRecording = () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    setMediaRecorder(null);
  }
};

  // Camera setup
useEffect(() => {
  const setupCamera = async () => {
    try {
      // List available video devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);

      // Use selected device or fallback to first
      const preferredDeviceId = selectedDeviceId || (videoDevices[0] && videoDevices[0].deviceId);

      if (!preferredDeviceId) {
        setError("No camera device found");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: preferredDeviceId } },
        audio: false,
      });

      // Stop any previous streams
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }

      // Assign new stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setSelectedDeviceId(preferredDeviceId);
      setError(""); // Clear errors on success
    } catch (err) {
      console.error("Camera setup error:", err);
      setError("Camera access denied or not available.");
    }
  };

  setupCamera();

  return () => {
    // Cleanup
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
  };
}, [selectedDeviceId]);

  
 useEffect(() => {
    let animationFrame;
    let lastDetectionTime = 0;
    const detectionInterval = 100; // ms between detections
    
    const detectMotion = (timestamp) => {
      if (!tracking || !videoRef.current || !canvasRef.current) {
        animationFrame = requestAnimationFrame(detectMotion);
        return;
      }

      if (timestamp - lastDetectionTime < detectionInterval) {
        animationFrame = requestAnimationFrame(detectMotion);
        return;
      }
      lastDetectionTime = timestamp;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      // Add this when motion is detected and you're about to play the beep:
        videoRef.current.muted = false;   


      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      // Clear previous drawings
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Draw current video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (!prevImageRef.current) {
        prevImageRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
        animationFrame = requestAnimationFrame(detectMotion);
        return;
      }

      const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const motionMap = new Uint8Array(canvas.width * canvas.height);
      let motionPixels = 0;

      const pixelStep = sensitivity > 70 ? 2 : 4;
      const adaptiveThreshold = Math.max(10, 100 - sensitivity);

      for (let i = 0; i < currentFrame.data.length; i += pixelStep * 4) {
        const idx = i / 4;
        const currentLum = 0.299 * currentFrame.data[i] +
                         0.587 * currentFrame.data[i + 1] +
                         0.114 * currentFrame.data[i + 2];
        const prevLum = 0.299 * prevImageRef.current.data[i] +
                       0.587 * prevImageRef.current.data[i + 1] +
                       0.114 * prevImageRef.current.data[i + 2];
        const diff = Math.abs(currentLum - prevLum);
        if (diff > adaptiveThreshold) {
          motionMap[idx] = 1;
          motionPixels++;
        }
      }

     const motionPixelThreshold = 80 - sensitivity / 2; // e.g. sensitivity 100 → 30 pixels needed
        if (motionPixels > motionPixelThreshold) {


              try {
                videoRef.current.muted = false; // Allow sound
                beepAudio.current.currentTime = 0;
                beepAudio.current.play().catch(err => {
                  console.warn("Audio blocked:", err);
        });
      } catch (err) {
          console.warn("Audio play failed:", err);
      }


        let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
        let motionPoints = [];

        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            if (motionMap[y * canvas.width + x]) {
              motionPoints.push({ x, y });
            }
          }
        }

        setMotionLogs(prevLogs => [
          ...prevLogs.slice(-49),
          {
            timestamp: new Date().toLocaleTimeString(),
            area: motionPixels
          }
        ]);

        if (motionPoints.length > 5) {
          const centroid = motionPoints.reduce((acc, point) => {
            acc.x += point.x;
            acc.y += point.y;
            return acc;
          }, { x: 0, y: 0 });
          centroid.x /= motionPoints.length;
          centroid.y /= motionPoints.length;

          const closestPoints = motionPoints
            .sort((a, b) => {
              const distA = (a.x - centroid.x) ** 2 + (a.y - centroid.y) ** 2;
              const distB = (b.x - centroid.x) ** 2 + (b.y - centroid.y) ** 2;
              return distA - distB;
            })
            .slice(0, Math.floor(motionPoints.length * (0.3 + (sensitivity / 200))));

          if (closestPoints.length > 10) {
            closestPoints.forEach(point => {
              minX = Math.min(minX, point.x);
              minY = Math.min(minY, point.y);
              maxX = Math.max(maxX, point.x);
              maxY = Math.max(maxY, point.y);
            });

            const padding = Math.max(2, 10 - (sensitivity / 15));
            if (maxX > minX && maxY > minY) {
              ctx.strokeStyle = "rgba(255, 0, 0, 0.9)";
              ctx.lineWidth = 1 + (sensitivity / 50);
              ctx.beginPath();
              ctx.rect(
                minX - padding,
                minY - padding,
                (maxX - minX) + padding * 2,
                (maxY - minY) + padding * 2
              );
              ctx.stroke();
            }
          }
        }
      }

      prevImageRef.current = currentFrame;
      animationFrame = requestAnimationFrame(detectMotion);
    };

    animationFrame = requestAnimationFrame(detectMotion);
    return () => cancelAnimationFrame(animationFrame);
  }, [tracking, sensitivity]);

    const captureSnapshot = () => {
    if (!videoRef.current || !snapshotCanvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = snapshotCanvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Draw motion box if tracking
    if (tracking) {
      const motionCtx = canvasRef.current.getContext("2d");
      const motionData = motionCtx.getImageData(0, 0, canvas.width, canvas.height);
      ctx.putImageData(motionData, 0, 0);
    }
     const imageUrl = canvas.toDataURL("image/png");
    setSnapshots(prev => [imageUrl, ...prev.slice(0, 9)]);
  };
return (  
  <div className={`${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}  min-h-screen p-4 transition-all duration-300`}>
      <h1 className="text-10xl font-bold mt-6  underline  md:text-3xl text-center flex-center mb-6 md:mb-6">Precision Motion Tracker</h1>
      <div className="flex justify-between items-center mb-4 px-2">
  
  <button 
    onClick={toggleTheme}
    className="flex items-center  mb-10 gap-2 px-3 py-1 border rounded-md  bg-gray-700 text-white hover:bg-gray-600 transition-all duration-200"
  >
    {darkMode ? <FaMoon /> : <FaSun />}
    <span className="hidden sm:inline">{darkMode ? "Dark" : "Light"} Mode</span>
  </button>
</div>

      {error && <div className="text-red-500 text-center mb-2 md:mb-4 text-sm md:text-base">{error}</div>}
    <div
  className={`max-w-6xl mx-auto gap-2 p-10 rounded transition-all duration-300  mb-20
    ${darkMode 
      ? "bg-gray-900 text-white shadow-[0px_4px_100px_rgba(255,255,255,0.1)]" 
      : "bg-white text-black shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
    }`}
>
        {/* Camera Selection - Full width on mobile, narrower on desktop */}
        <div className="w-full md:w-1/2 lg:w-1/3 text-white mx-auto mb-4">
         <div className="bg-black-100 p-4 rounded-lg shadow-2xl">
          <select 
            value={selectedDeviceId}
            onChange={e => setSelectedDeviceId(e.target.value)}
            className="w-full bg-gray-800 p-2 rounded text-sm md:text-base"
          >
            {devices.map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${device.deviceId.slice(-4)}`}
              </option>
            ))}
          </select>
        </div>
        </div>

        {/* Main Content Area - Flex column on mobile, row on larger screens */}
        <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
          {/* Video Preview - Full width on mobile, side-by-side on larger screens */}
          <div className="w-full lg:w-1/2">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                onClick={() => videoRef.current?.play()} 
                className="w-full h-full object-cover"
              />
              <canvas 
                ref={canvasRef} 
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
              />
            </div>
              <audio ref={beepAudio} src="/beep.mp3" preload="auto" />
           <div className="flex flex-col sm:flex-row flex-wrap gap-2 md:gap-4 mt-4">
          <button 
          onClick={() => setTracking(!tracking)} 
          className={`px-3 py-1 md:px-4 md:py-2 rounded text-sm md:text-base ${tracking ? "bg-red-600  hover:bg-red-700 active:scale-95 px-4 py-2 rounded-lg text-sm md:text-base font-semibold text-white shadow transition duration-200" : 
            "bg-blue-600  hover:bg-blue-700 active:scale-95 px-4 py-2 rounded-lg text-sm md:text-base font-semibold text-white shadow transition duration-200"}`}
          >
          {tracking ? "Stop Tracking" : "Start Tracking"}
        </button>

        <button 
          onClick={captureSnapshot} 
          className="bg-yellow-600 hover:bg-yellow-700 active:scale-95 px-4 py-2 rounded-lg text-sm md:text-base font-semibold text-white shadow transition duration-200"
        >
         Capture Snapshot
        </button>

          <button
          onClick={startRecording}
          disabled={mediaRecorder && mediaRecorder.state === "recording"}
          className="bg-green-600 hover:bg-green-700 active:scale-95 px-4 py-2 rounded-lg text-sm md:text-base font-semibold text-white shadow transition duration-200"
        >
          Start Recording
        </button>

        <button
          onClick={stopRecording}
          disabled={!mediaRecorder || mediaRecorder.state !== "recording"}
          className="bg-red-600 hover:bg-red-700 active:scale-95 px-4 py-2 rounded-lg text-sm md:text-base font-semibold text-white shadow transition duration-200"
        >
          Stop Recording
        </button>
              <div className="flex items-center gap-2 flex-grow">
                <span className="text-sm  font-semibold md:text-base">Sensitivity:</span>
                <input 
                  type="range" 
                  min="10" 
                  max="100" 
                  value={sensitivity} 
                  onChange={e => setSensitivity(Number(e.target.value))} 
                  className="flex-grow max-w-[120px] md:max-w-none"
                  
                />
              </div>
            </div>
          </div>

          {/* Motion Event Log Box */}
<div className="bg-gray-800 rounded-lg p-7 mt-8 shadow-white max-h-49 overflow-y-auto text-sm font-mono">
  <h3 className="text-white font-semibold mb-3">📹 Motion Event Log</h3>
  {motionLogs.length > 0 ? (
    <ul className="space-y-2">
      {motionLogs.map((log, index) => (
        <li key={index} className="flex justify-between border-b  border-gray-700/30 py-1">
          <span className="text-blue-400">[{log.timestamp}]</span>
          <span className="text-yellow-400">Pixels: {log.area}</span>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-gray-400 text-center">No motion detected yet.</p>
  )}
</div>


          {/* Snapshots - Below video on mobile, side-by-side on larger screens */}
          <div className="w-full lg:w-1/2">
            <h2 className="text-lg text-center font-semibold   md:text-xl mb-2">Snapshots</h2>
            {snapshots.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-2">
                {snapshots.map((snapshot, i) => (
                  <img 
                    key={i} 
                    src={snapshot} 
                    alt={`Snapshot ${i}`}
                    className="border border-gray-600 rounded w-full h-auto aspect-square object-cover"
                  />
                ))}
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg p-4 text-center text-gray-400">
                No snapshots yet
              </div>
            )}
            
          </div>

          
        </div>
      </div>
      

      
   <div className="mt-6">
        <h2 className="text-lg md:text-3xl p-2 w-full  font-semibold underline text-center mb-2">Motion Clips</h2>
        {motionClips.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {motionClips.map((clip, i) => (
              <video key={i} src={clip} controls className="w-full rounded-lg border border-gray-600" />
            ))}
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-4 text-center text-gray-400">
            No motion clips yet
    </div>
  )}
</div>
      <canvas ref={snapshotCanvasRef} className="hidden" />
    </div>
  );  
}
export default App;
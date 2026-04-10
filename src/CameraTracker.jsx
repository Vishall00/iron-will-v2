import React, { useEffect, useRef, useState } from 'react';

export default function CameraTracker({ exercises, onComplete }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [count, setCount] = useState(0);
  const [isReady, setIsReady] = useState(false);
  
  const [currentExIdx, setCurrentExIdx] = useState(0);
  const currentEx = exercises[currentExIdx];
  const targetCount = currentEx.target;
  
  // Ref for the state machine
  const stateRef = useRef('UP'); 
  const countRef = useRef(0);

  useEffect(() => {
    // Basic verification that CDNs loaded
    if (!window.Pose || !window.Camera) {
      console.error("MediaPipe not loaded");
      return;
    }

    const pose = new window.Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    pose.onResults(onResults);

    let camera = null;
    if (videoRef.current) {
      camera = new window.Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current) {
            await pose.send({ image: videoRef.current });
          }
        },
        width: 1280,
        height: 720
      });
      camera.start().then(() => setIsReady(true));
    }

    const finishExercise = () => {
       if (currentExIdx + 1 < exercises.length) {
           countRef.current = 0;
           setCount(0);
           setCurrentExIdx(prev => prev + 1);
       } else {
           countRef.current = -100;
           setTimeout(() => onComplete(), 1000);
       }
    };

    function onResults(results) {
      if (!canvasRef.current) return;
      const canvasCtx = canvasRef.current.getContext('2d');
      
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

      if (results.poseLandmarks && countRef.current >= 0) {
        window.drawConnectors(canvasCtx, results.poseLandmarks, window.POSE_CONNECTIONS, { color: '#ef4444', lineWidth: 4 });
        window.drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#ffffff', lineWidth: 2 });

        if (currentEx.type === 'SQUATS') {
           const leftHip = results.poseLandmarks[23];
           const rightHip = results.poseLandmarks[24];
           const leftKnee = results.poseLandmarks[25];
           const rightKnee = results.poseLandmarks[26];

           if (leftHip && rightHip && leftKnee && rightKnee) {
             const avgHipY = (leftHip.y + rightHip.y) / 2;
             const avgKneeY = (leftKnee.y + rightKnee.y) / 2;
             const threshold = avgKneeY - 0.15; 

             if (avgHipY > threshold && stateRef.current === 'UP') {
               stateRef.current = 'DOWN';
             } 
             else if (avgHipY < threshold - 0.1 && stateRef.current === 'DOWN') {
               stateRef.current = 'UP'; 
               countRef.current += 1;
               setCount(countRef.current);
               
               if (countRef.current >= targetCount) {
                 finishExercise();
               }
             }
           }
        } 
        else if (currentEx.type === 'PUSHUPS') {
           const leftShoulder = results.poseLandmarks[11];
           const rightShoulder = results.poseLandmarks[12];
           const leftWrist = results.poseLandmarks[15];
           const rightWrist = results.poseLandmarks[16];

           if (leftShoulder && rightShoulder && leftWrist && rightWrist) {
             const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
             const avgWristY = (leftWrist.y + rightWrist.y) / 2;
             
             // Distance between shoulder and wrist. Small = bottom of pushup. Large = top of plank.
             const dist = avgWristY - avgShoulderY;

             if (dist < 0.15 && stateRef.current === 'UP') {
               stateRef.current = 'DOWN';
             } 
             else if (dist > 0.25 && stateRef.current === 'DOWN') {
               stateRef.current = 'UP';
               countRef.current += 1;
               setCount(countRef.current);
               
               if (countRef.current >= targetCount) {
                 finishExercise();
               }
             }
           }
        }
      }
      canvasCtx.restore();
    }

    return () => {
       if (camera && typeof camera.stop === 'function') {
          camera.stop();
       }
    };
  }, [currentExIdx, exercises, targetCount, onComplete, currentEx.type]);

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '400px', margin: '0 auto', borderRadius: '8px', overflow: 'hidden', border: '2px solid var(--border-subtle)' }}>
      
      {!isReady && (
         <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', zIndex: 10 }}>
            <span className="font-mono text-primary animate-pulse" style={{ animation: 'pulse 2s infinite' }}>INITIALIZING VISION MODEL...</span>
         </div>
      )}

      <video ref={videoRef} style={{ display: 'none' }} playsInline></video>
      <canvas ref={canvasRef} width="1280" height="720" style={{ width: '100%', display: 'block', transform: 'scaleX(-1)' }}></canvas>

      <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.8)', padding: '10px 15px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
        <h4 className="font-mono text-muted" style={{ margin: 0, fontSize: '10px' }}>CURRENT OBJECTIVE</h4>
        <h3 className="font-mono text-main" style={{ margin: 0 }}>{currentEx.type}</h3>
        <h1 className="font-mono text-primary" style={{ margin: 0, fontSize: '32px' }}>{count} / {targetCount}</h1>
      </div>
      
      <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.8)', padding: '5px 10px', borderRadius: '4px' }}>
         <span className="font-mono text-muted" style={{ fontSize: '10px' }}>PHASE {currentExIdx + 1}/{exercises.length}</span>
      </div>
    </div>
  );
}

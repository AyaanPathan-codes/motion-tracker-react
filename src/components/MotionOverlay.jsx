// MotionOverlay.js
import React, { useRef, useImperativeHandle, forwardRef, useState } from "react";

const MotionOverlay = forwardRef((props, ref) => {
  const logContainerRef = useRef(null);
  const [motionEvents, setMotionEvents] = useState([]);

  useImperativeHandle(ref, () => ({
    addMotionEvent(event) {
      setMotionEvents(prev => [
        ...prev.slice(-49),
        event
      ]);

      setTimeout(() => {
        if (logContainerRef.current) {
          logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
      }, 50);
    }
  }));

  return (
    <>
      <canvas
        ref={props.canvasRef}
        className="absolute top-0 left-0 rounded-lg opacity-50 pointer-events-none"
      />
      <div className="bg-gray-800/50 rounded-xl p-4 mt-4">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Motion Event Log
        </h3>
        <div 
          ref={logContainerRef}
          className="h-48 overflow-y-auto bg-gray-900/50 rounded-lg p-3 font-mono text-sm"
        >
          {motionEvents.length > 0 ? (
            <div className="space-y-1">
              {motionEvents.map((event, index) => (
                <div key={index} className="flex justify-between items-center py-1 border-b border-gray-700/30">
                  <span className="text-blue-400">[{event.timestamp}]</span>
                  <span>Area: {Math.round(event.area)}px²</span>
                  <span className="text-yellow-400">Sens: {event.sensitivity}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 text-center py-8">
              No motion events detected yet
            </div>
          )}
        </div>
      </div>
    </>
  );
});

export default MotionOverlay;

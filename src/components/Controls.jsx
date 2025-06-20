import React from "react";

const Controls = ({ tracking, setTracking, sensitivity, setSensitivity }) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 my-4 items-center">
      <button
        onClick={() => setTracking((prev) => !prev)}
        className="bg-blue-600 hover:bg-blue-800 px-4 py-2 rounded shadow"
      >
        {tracking ? "Stop" : "Start"} Tracking
      </button>

      <label className="flex flex-col text-center">
        Sensitivity: {sensitivity}
        <input
          type="range"
          min="1"
          max="100"
          value={sensitivity}
          onChange={(e) => setSensitivity(Number(e.target.value))}
          className="w-40"
        />
      </label>
    </div>
  );
};

export default Controls;

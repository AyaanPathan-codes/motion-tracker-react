import React from "react";

const EventLog = ({ log }) => {
  return (
    <div className="bg-gray-800 p-4 rounded w-full max-w-2xl mt-4">
      <h2 className="text-xl mb-2">Motion Log</h2>
      <ul className="max-h-48 overflow-y-auto text-sm">
        {log.map((entry, idx) => (
          <li key={idx} className="border-b border-gray-700 py-1">
            {entry.time}: {entry.message}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default EventLog;

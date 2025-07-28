import React, { useState, useEffect } from 'react';
import axios from 'axios';

const apiBase = 'http://localhost:5000';

const Home = () => {
  const [rooms, setRooms] = useState({});
  const [booked, setBooked] = useState([]);
  const [numRooms, setNumRooms] = useState(1);

  const fetchRooms = async () => {
    const res = await axios.get(`${apiBase}/rooms`);
    setRooms(res.data);
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleBook = async () => {
    const res = await axios.post(`${apiBase}/book`, { numRooms });
    setBooked(res.data.booked);
    fetchRooms();
  };

  const handleReset = async () => {
    await axios.post(`${apiBase}/reset`);
    fetchRooms();
    setBooked([]);
  };

  const handleRandom = async () => {
    await axios.post(`${apiBase}/random`);
    fetchRooms();
    setBooked([]);
  };

  const renderFloor = (floor) => {
    const start = floor === 10 ? 1001 : floor * 100 + 1;
    const end = floor === 10 ? 1007 : floor * 100 + 10;

    return (
      <div key={floor}>
        <h4>Floor {floor === 10 ? '1000-series' : floor}</h4>
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: end - start + 1 }, (_, i) => {
            const roomNum = start + i;
            const occupied = rooms[roomNum];
            const isNewBooked = booked.includes(roomNum);
            return (
              <div
                key={roomNum}
                className={`w-12 h-8 text-center p-1 rounded ${
                  isNewBooked ? 'bg-green-300' : occupied ? 'bg-red-400' : 'bg-gray-200'
                }`}
              >
                {roomNum}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-4">
        <input
          type="number"
          value={numRooms}
          min={1}
          max={5}
          onChange={(e) => setNumRooms(Number(e.target.value))}
          className="border rounded px-2 py-1"
        />
        <button onClick={handleBook} className="ml-2 px-3 py-1 bg-green-500 text-white rounded">Book</button>
        <button onClick={handleRandom} className="ml-2 px-3 py-1 bg-yellow-500 text-white rounded">Random</button>
        <button onClick={handleReset} className="ml-2 px-3 py-1 bg-red-500 text-white rounded">Reset</button>
      </div>
      {[...Array(9)].map((_, i) => renderFloor(i + 1))}
      {renderFloor(10)}
    </div>
  );
};

export default Home;

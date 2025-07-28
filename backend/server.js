const express = require("express");
const cors = require("cors");

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

let rooms = {};

const generateInitialRooms = () => {
  const newRooms = {};
  for (let floor = 1; floor <= 9; floor++) {
    for (let i = 1; i <= 10; i++) {
      const roomNum = floor * 100 + i;
      newRooms[roomNum] = false;
    }
  }
  for (let i = 1; i <= 7; i++) {
    newRooms[1000 + i] = false;
  }
  return newRooms;
};

rooms = generateInitialRooms();

const travelTime = (roomNums) => {
  if (roomNums.length === 0) return 0;
  const floors = roomNums.map(r => Math.floor(r / 100));
  const rooms = roomNums.map(r => r % 100);
  return (Math.max(...floors) - Math.min(...floors)) * 2 + (Math.max(...rooms) - Math.min(...rooms));
};

app.get("/rooms", (req, res) => res.json(rooms));

app.post("/book", (req, res) => {
  const numRooms = parseInt(req.body.numRooms);
  const available = Object.entries(rooms).filter(([_, occ]) => !occ).map(([num]) => parseInt(num));
  let best = [];
  let bestTime = Infinity;

  for (let i = 0; i < available.length; i++) {
    const combo = [available[i]];
    for (let j = i + 1; j < available.length && combo.length < numRooms; j++) {
      combo.push(available[j]);
    }
    if (combo.length === numRooms) {
      const time = travelTime(combo);
      if (time < bestTime) {
        best = combo;
        bestTime = time;
      }
    }
  }

  if (best.length > 0) {
    best.forEach(num => rooms[num] = true);
    res.json({ booked: best });
  } else {
    res.json({ booked: [] });
  }
});

app.post("/reset", (req, res) => {
  rooms = generateInitialRooms();
  res.json({ status: "reset" });
});

app.post("/random", (req, res) => {
  Object.keys(rooms).forEach(k => rooms[k] = Math.random() < 0.3);
  res.json({ status: "randomized" });
});

app.listen(port, () => console.log(`Server running on port ${port}`));

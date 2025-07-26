# 🏨 Hotel Management System

This is a full-stack hotel room reservation system built with **React** for the frontend and **Express.js** for the backend. It simulates room booking logic based on proximity and travel time rules.

---

## 🚀 Features

- Book up to 5 rooms at once
- Prioritizes rooms on the same floor
- Minimizes total travel time (horizontal & vertical)
- Visual room layout by floor
- Random room occupancy generator
- Reset all bookings easily

---

## 🖥️ Tech Stack

- **Frontend**: React, Axios, TailwindCSS (optional), HTML/CSS
- **Backend**: Node.js, Express.js, CORS

---

## 📦 Project Structure

hotel-room-reservation-system/
├── backend/
│ └── server.js # Express backend
├── frontend/
│ ├── src/
│ │ ├── App.js # React app root
│ │ └── HotelRoomReservationSystem.jsx
├── README.md

yaml
Copy
Edit

---

## 🛠️ Setup Instructions

### 1️⃣ Backend (Express)
```bash
cd backend
npm install express cors
node server.js
Backend runs at http://localhost:5000

2️⃣ Frontend (React)
bash
Copy
Edit
cd frontend
npx create-react-app . --template cra-template
npm install axios
npm start
Frontend runs at http://localhost:3000

🌐 API Endpoints
Method	Endpoint	Description
GET	/rooms	Get all room status
POST	/book	Book optimal N rooms
POST	/reset	Reset all room bookings
POST	/random	Randomize room occupancy

📷 Screenshot
(Optional: Add a screenshot of your UI here)

📤 Deployment Options
Frontend: Vercel

Backend: Render or Glitch

🧑‍💻 Author
👤 AMIT KUMAR

✉️ amitraj02947@gmail.com

📁 GitHub: https://github.com/amitkumar97097

📜 License
This project is licensed under the MIT License.

yaml
Copy
Edit

---

Would you like me to:
- Export the full ZIP file with folder structure?
- Help you write the Git commands to push to GitHub?

Let me know how you'd like to proceed!

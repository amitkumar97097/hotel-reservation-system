# 🏨 Hotel Management System

A full-stack hotel room reservation system built with **React** (frontend) and **Express.js** (backend). It simulates room booking with logic for proximity and travel time optimization.

---

## 🚀 Features

- Book up to 5 rooms simultaneously
- Prioritizes rooms on the same floor
- Minimizes total travel distance (horizontal & vertical)
- Visual grid layout for room assignment
- Random room occupancy generator
- One-click reset for all bookings

---

## 🖥️ Tech Stack

- **Frontend**: React, React Router, Axios, TailwindCSS (optional)
- **Backend**: Node.js, Express.js, CORS

---

## 📦 Project Structure

hotel-room-reservation-system/
├── backend/
│ └── server.js # Express backend server
├── frontend/
│ ├── src/
│ │ ├── App.jsx # Main React Router setup
│ │ ├── pages/
│ │ │ ├── Home.jsx # Hotel Room Reservation UI
│ │ │ ├── About.jsx # About section
│ │ │ └── NotFound.jsx # 404 fallback
├── README.md


---

## 🛠️ Setup Instructions

### 1️⃣ Backend (Express)
```bash
cd backend
npm install express cors
node server.js
Backend runs at: http://localhost:5000
2️⃣ Frontend (React)
cd frontend
npm install
npm start

Frontend runs at: http://localhost:3000

🌐 API Endpoints
Method	Endpoint	Description
GET	/rooms	Get all room statuses
POST	/book	Book N optimal rooms
POST	/reset	Reset all bookings
POST	/random	Randomize room occupancy

📸 Screenshot
(Add a screenshot of your UI here if desired)

📤 Deployment
Frontend: Vercel

Backend: Render or Glitch

👨‍💻 Author
Amit Kumar
📧 amitraj02947@gmail.com
🌐 GitHub Profile

📄 License
This project is licensed under the MIT License.

yaml
Copy
Edit

---

Would you like me to:
- Push this directly to your GitHub repo?
- Export this whole project as a downloadable `.zip`?
- Add deployment steps for Vercel and Render

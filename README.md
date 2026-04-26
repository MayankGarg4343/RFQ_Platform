# 🚀 RFQ British Auction System

A modern, full-stack Request for Quotation (RFQ) platform built to handle real-time supplier bidding using a **British Auction** mechanism. This system features dynamic bidding, live leaderboards, and automatic auction extensions based on highly configurable trigger conditions.

---

## 🛠️ Tech Stack

*   **Frontend**: React.js (Vite), Tailwind CSS v4, Lucide React Icons
*   **Backend**: Node.js, Express.js
*   **Database**: PostgreSQL
*   **Real-time Communication**: WebSockets (`socket.io`)

---

## ✨ Key Features

*   **Real-Time Live Bidding**: See new bids instantly appear on the leaderboard without refreshing the page.
*   **British Auction Engine**: Automatically extends the auction by `Y` minutes if a specific trigger event (e.g., *Any Bid Received*, *Rank Change*, or *L1 Change*) occurs within the final `X` minutes (the trigger window).
*   **Strict Time Constraints**: Auctions respect a hard limit via the `Forced Bid Close Time`, ensuring bidding never goes on indefinitely.
*   **Premium Modern UI**: Built with glassmorphism effects, dynamic status badges, micro-animations, and a highly structured terminal-like dark mode activity feed.
*   **Responsive Design**: Fully optimized for mobile phones, tablets, and desktop monitors using strict Tailwind media queries.
*   **Live Notifications**: Toast popups alert you precisely when an auction starts, when there is 1 minute left, and exactly when it closes.

---

## 📦 Installation & Setup

### 1. Prerequisites
Ensure you have the following installed on your machine:
*   [Node.js](https://nodejs.org/) (v16+)
*   [PostgreSQL](https://www.postgresql.org/)

### 2. Database Configuration
1. Open pgAdmin or your terminal and ensure PostgreSQL is running.
2. In the `backend` folder, locate (or create) the `.env` file and configure your local credentials. Example:
   ```env
   DB_USER=your_postgres_username
   DB_HOST=localhost
   DB_NAME=rfq_system
   DB_PASSWORD=your_postgres_password
   DB_PORT=5432
   PORT=5000
   ```
3. Initialize the database schema and seed the initial supplier data by running:
   ```bash
   cd backend
   npm run init-db
   ```

### 3. Install Dependencies
Open a terminal in the root directory and install both frontend and backend dependencies:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

## 🚀 Running the Application

You will need to run the frontend and backend simultaneously in two separate terminal windows.

**Terminal 1: Start the Backend Server**
```bash
cd backend
npm run dev
```
*(The backend will run on `http://localhost:5000`)*

**Terminal 2: Start the Frontend Application**
```bash
cd frontend
npm start
```
*(The frontend will run on `http://localhost:5173`)*

---

## 🏛️ Project Structure

The project follows a clean architecture pattern to ensure maintainability:

```text
GoCometAssignment/
├── backend/
│   ├── config/          # Database configuration and connection pool
│   ├── controllers/     # Core business logic (rfqController.js contains the Auction Engine)
│   ├── routes/          # Express API route definitions
│   ├── services/        # External services (Socket.io management)
│   ├── initDb.js        # Database initialization script
│   └── server.js        # Main Express application entry point
│
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable React UI components (Dashboard, CreateRFQ, RFQDetails)
│   │   ├── App.jsx      # Main application router and layout
│   │   └── index.css    # Global Tailwind styles and animations
│   └── package.json
│
└── .gitignore           # Comprehensive Git ignore rules
```

---

## 📈 The Auction Engine Logic (How it works)

When a supplier submits a bid, the system evaluates the timestamp of the bid against the auction's configuration.

1. **Trigger Window Check**: Is the current time within `X` minutes of the scheduled closing time?
2. **Condition Check**: Did the bid trigger the configured rule?
   *   `BID_RECEIVED`: Any valid bid triggers an extension.
   *   `RANK_CHANGE`: The bid altered the ranking order of the suppliers.
   *   `L1_CHANGE`: The bid successfully dethroned the previous lowest bidder.
3. **Execution**: If the conditions are met, the `bid_close_time` is pushed back by `Y` minutes.
4. **Safety Net**: If the new calculated close time exceeds the `forced_bid_close_time`, the system strictly truncates the extension to match the forced close time, capping the auction.

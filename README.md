# 🎓 CampusEcho — Smart Campus Query Management System

A full-stack web application for managing campus queries with JWT authentication.

---

## 🏗 Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | HTML5, CSS3, Vanilla JavaScript     |
| Backend    | Node.js + Express.js                |
| Database   | MongoDB + Mongoose                  |
| Auth       | JWT (jsonwebtoken) + bcryptjs       |

---

## 📁 Project Structure

```
campusecho/
├── backend/
│   ├── server.js              # Express app entry point
│   ├── package.json
│   ├── models/
│   │   ├── User.js            # User schema (name, email, password[hashed], role)
│   │   └── Query.js           # Query schema (title, description, category, status...)
│   ├── middleware/
│   │   └── auth.js            # JWT verification middleware
│   └── routes/
│       ├── auth.js            # POST /register, POST /login, GET /me
│       └── query.js           # CRUD for queries + admin routes
└── frontend/
    ├── index.html             # Single-page application
    ├── style.css              # Full design system
    └── script.js             # All JS logic (auth, queries, UI)
```

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js v18+
- MongoDB (local or [MongoDB Atlas](https://cloud.mongodb.com) free tier)

### Step 1: Install Dependencies
```bash
cd campusecho/backend
npm install
```

### Step 2: Configure Environment (Optional)
Create a `.env` file in `/backend`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/campusecho
JWT_SECRET=your_custom_secret_key_here
```

### Step 3: Start MongoDB
```bash
# Local MongoDB
mongod

# OR use MongoDB Atlas — paste your connection string in MONGO_URI
```

### Step 4: Start the Server
```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

### Step 5: Open the App
Visit: **http://localhost:5000**

---

## 🔐 JWT Authentication Flow

```
┌──────────┐        POST /register or /login         ┌──────────────┐
│  Client  │ ──────────────────────────────────────► │    Server    │
│          │                                          │              │
│          │ ◄── { token: "eyJhbG..." } ─────────── │  jwt.sign()  │
│          │                                          └──────────────┘
│  Store   │
│  token   │        GET /queries                      ┌──────────────┐
│  in      │ ──── Authorization: Bearer eyJhbG... ──► │ authMiddleware│
│  local   │                                          │ jwt.verify() │
│  Storage │ ◄───────── { queries: [...] } ─────────  │              │
└──────────┘                                          └──────────────┘
```

**Token Payload:**
```json
{
  "userId": "64a2b3...",
  "role": "student",
  "iat": 1700000000,
  "exp": 1700086400
}
```

---

## 📡 API Reference

### Auth Routes

| Method | Endpoint             | Body                              | Description        |
|--------|----------------------|-----------------------------------|--------------------|
| POST   | `/api/auth/register` | `{name, email, password, dept}`   | Create account     |
| POST   | `/api/auth/login`    | `{email, password}`               | Login, get token   |
| GET    | `/api/auth/me`       | *(token in header)*               | Get current user   |

### Query Routes (All Protected — need JWT)

| Method | Endpoint              | Body / Params            | Description             |
|--------|-----------------------|--------------------------|-------------------------|
| POST   | `/api/queries`        | `{title, desc, cat, pri}`| Submit new query        |
| GET    | `/api/queries`        | `?status=&category=`     | Get my queries          |
| GET    | `/api/queries/:id`    | —                        | Get single query        |
| PUT    | `/api/queries/:id`    | `{status, adminResponse}`| Update query            |
| DELETE | `/api/queries/:id`    | —                        | Delete query            |
| GET    | `/api/admin/queries`  | `?status=&priority=`     | Admin: Get all queries  |

### Sample Responses

**POST /api/auth/login — Success:**
```json
{
  "message": "Welcome back, Raj!",
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "64a2b3c4d5e6f7...",
    "name": "Raj Kumar",
    "email": "raj@campus.edu",
    "role": "student",
    "department": "Computer Science"
  }
}
```

**POST /api/queries — Success:**
```json
{
  "message": "Query submitted successfully!",
  "query": {
    "_id": "64a2b3...",
    "title": "Library books not available",
    "category": "Library",
    "priority": "High",
    "status": "Pending",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Response:**
```json
{
  "error": "Invalid email or password."
}
```

---

## 👥 User Roles

| Role    | Capabilities                                      |
|---------|--------------------------------------------------|
| Student | Register, login, submit queries, view own queries |
| Admin   | View ALL queries, update status, respond          |

**Demo Admin Account:**
- Email: `admin@campus.edu`
- Password: `admin123`

*(Any email containing "admin" gets admin role automatically — change this in production!)*

---

## 🛡 Security Features

- **Password Hashing**: bcrypt with 12 salt rounds
- **JWT Tokens**: 24-hour expiry, signed with secret key
- **Protected Routes**: All query routes require valid JWT
- **Input Validation**: Both client-side and server-side
- **Role-Based Access**: Admin routes blocked for regular users
- **XSS Prevention**: Output escaping in frontend

---

## 🎯 Query Categories & Statuses

**Categories:** Academic, Hostel, Library, Fees & Finance, Transportation, Sports & Activities, IT & Technical, Other

**Priority Levels:** Low → Medium → High → Urgent

**Status Flow:** `Pending` → `In Progress` → `Resolved` / `Closed`

---

## 🔮 Future Improvements

- [ ] Email notifications (Nodemailer)
- [ ] Real-time updates (Socket.io)
- [ ] File attachments for queries
- [ ] Analytics dashboard
- [ ] Push notifications
- [ ] Deployment (Railway / Render / Vercel)

---

## 📝 Final Year Project Notes

This project demonstrates:
1. **RESTful API Design** with Express.js
2. **JWT-based Stateless Authentication**
3. **Password Security** with bcrypt hashing
4. **NoSQL Database Design** with MongoDB/Mongoose
5. **Single-Page Application** patterns in Vanilla JS
6. **Middleware Architecture** in Node.js
7. **Role-Based Access Control (RBAC)**
8. **Responsive UI** without any frameworks

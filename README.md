# CampusEcho - Smart Campus Query Management System

CampusEcho is a full-stack web application for managing campus service queries. It provides role-based student and administrator workflows, secure authentication, query lifecycle management, and a responsive single-page interface.

## Highlights

- JWT-based authentication with bcrypt password hashing
- Role-based access control for student and administrator workflows
- Protected REST API endpoints for registration, login, profile management, and query handling
- Query creation, filtering, status tracking, priority management, and administrator responses
- MongoDB data modeling with Mongoose
- Responsive frontend built with HTML, CSS, and vanilla JavaScript

## Architecture

```text
Single-page frontend
        |
        v
Express REST API
  |-- Authentication and JWT middleware
  |-- Query and admin routes
        |
        v
MongoDB / Mongoose
```

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | HTML5, CSS3, vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Authentication | JSON Web Tokens, bcryptjs |
| Developer tooling | nodemon |

## Project Structure

```text
campusecho/
├── backend/
│   ├── server.js              # Express server and API entry point
│   ├── package.json
│   ├── middleware/
│   │   └── auth.js            # JWT and administrator authorization middleware
│   ├── models/
│   │   ├── User.js
│   │   └── Query.js
│   └── routes/
│       ├── auth.js            # Registration, login, and profile routes
│       └── query.js           # Query and administrator routes
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
└── .gitignore
```

## Run Locally

### 1. Install prerequisites

- Node.js 18+
- MongoDB locally, or a MongoDB Atlas connection string

### 2. Install dependencies

```bash
cd backend
npm install
```

### 3. Configure environment variables

Copy the example file and replace the placeholder values:

```bash
cp .env.example .env
```

Required variables:

```env
PORT=5002
MONGO_URI=mongodb://localhost:27017/campusecho
JWT_SECRET=replace_with_a_long_random_secret
ADMIN_SECRET=replace_with_a_separate_admin_secret
```

Never commit `.env` files or real secrets.

### 4. Start the application

```bash
npm run dev
```

Open [http://localhost:5002](http://localhost:5002).

## API Overview

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Create a student or administrator account |
| POST | `/api/auth/login` | Authenticate and receive a JWT |
| GET | `/api/auth/me` | Retrieve the signed-in user profile |
| POST | `/api/queries` | Submit a query |
| GET | `/api/queries` | View and filter a user's queries |
| PUT | `/api/queries/:id` | Update a query |
| DELETE | `/api/queries/:id` | Delete a query |
| GET | `/api/admin/queries` | View all queries as an administrator |

## Security Notes

- Passwords are hashed before storage.
- JWT secrets and administrator-registration codes must be supplied through environment variables.
- Protected routes require a valid Bearer token.
- Administrative endpoints require an authenticated administrator account.

## Portfolio Notes

CampusEcho demonstrates REST API design, authentication and authorization, database modeling, middleware architecture, and frontend-backend integration.

## Author

[Anshika Vyas](https://github.com/anshikavyas03)

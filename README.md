# CO - CANVAS

## Overview

Co - Canvas is a smart digital whiteboard platform supporting real-time collaboration. The application goes beyond basic drawing by integrating Artificial Intelligence (AI) to assist creativity, along with management tools to optimize teamwork efficiency.

---

## Technical Highlights

The system focuses on solving user experience and data accuracy through:

- **Real-time Sync (WebSocket)**: Synchronize drawing board state between members instantly with ultra-low latency.
- **Smooth-line Algorithm**: Algorithm to process coordinate points, turning rough strokes from mouse/pen into smooth, professional curves.
- **AI Drawing Assistant**: Integrates AI to recognize strokes and suggest corresponding shapes or icons based on user sketches, making idea illustration faster.
- **Role-based Permission**: Detailed permission system (Owner, Editor, Viewer), ensuring data security and control for board owners.

---

## Key Features

- **Direct Note-taking**: Allows taking notes and adding text directly on the whiteboard space to clarify ideas.
- **Collaborative Timer**: Integrated countdown timer helps teams manage time during brainstorming or focused discussions.
- **Smart Toolbar**: Comprehensive toolset with customizable colors, stroke widths, and smart shapes.
- **Project Workspace**: Manage lists of drawing boards by project for teams.

---

## Tech Stack

### Backend (Spring Boot)

| Technology                 | Purpose                                                          |
| :------------------------- | :--------------------------------------------------------------- |
| **Java 17+ / Spring Boot** | Builds robust and stable server-side logic (Uses JDK 25).        |
| **Spring WebSocket**       | Real-time data transmission channel between members.             |
| **PostgreSQL (Neon)**      | Persistent storage for User, Board, and Stroke coordinates data. |
| **AI Integration**         | Processes stroke recognition and suggestion requests.            |

### Frontend (React 19 + Vite)

| Technology          | Purpose                                              |
| :------------------ | :--------------------------------------------------- |
| **Canvas API**      | Main graphics processing engine for the whiteboard.  |
| **Tailwind CSS v4** | Modern interface design, optimizing user experience. |
| **Lucide React**    | Minimalist icon system for Toolbar and Dashboard.    |
| **SWR / Axios**     | Manages data state from API with smart caching.      |

---

## 🛠 Setup & Local Development

### 1. Backend Setup

```bash
cd backend
./mvnw clean install
```

Fill in `backend/src/main/resources/application.properties` (ask team members for all required keys and password).

**Run development server:**

```bash
./mvnw spring-boot:run
```

| Endpoint | URL                     |
| :------- | :---------------------- |
| API Base | `http://localhost:5000` |

### 2. Frontend Setup

```bash
cd frontend
npm install
```

**Run development server:**

```bash
npm run dev
```

| App      | URL                     |
| :------- | :---------------------- |
| Frontend | `http://localhost:3000` |

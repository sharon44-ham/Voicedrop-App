# VoiceDrop 🎙️

A real-time social audio platform where users record and share short voice drops — think Twitter, but for your voice.

Built as a full-stack learning project across 10 system design phases with AI-assisted development (Claude), covering everything from basic CRUD to WebSockets, cloud storage, caching, and production deployment.

**Live:** https://voicedrop-app.vercel.app  
**Backend:** https://voicedrop-backend-99zl.onrender.com

---

## What it does

- Record and post short audio clips directly from the browser
- Real-time feed — new posts appear live without refresh (WebSockets)
- Like, comment, bookmark posts
- User profiles with avatar customisation
- Category-based feed (Talks, Philosophy, Humor, Gyaan)
- Search posts by title
- Online user count shown live

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js, Tailwind CSS, deployed on Vercel |
| Backend | Node.js, Express.js, deployed on Render |
| Database | MongoDB (Mongoose) |
| Auth | JWT (JSON Web Tokens) + bcrypt |
| File Storage | AWS S3 with presigned URLs |
| Real-time | Socket.IO (WebSockets) |
| Caching | Redis via Upstash |
| Rate Limiting | express-rate-limit |
| Validation | express-validator |
| Error Tracking | Sentry |
| Logging | Pino |

---

## System Design Concepts Covered

This project was built in phases, each focused on a specific system design concept:

1. **Monolith architecture** — single Express server handling all routes
2. **REST API design** — structured endpoints, proper HTTP methods and status codes
3. **Authentication** — JWT-based auth, bcrypt password hashing, protected routes
4. **File uploads** — multipart form data, multer, AWS S3 with presigned URLs
5. **Real-time communication** — Socket.IO for live feed, online count, recording indicators
6. **Caching** — Redis (Upstash) to cache feed responses and reduce DB load
7. **Rate limiting** — per-IP limits on posts and auth endpoints to prevent abuse
8. **Input validation** — server-side validation with express-validator
9. **Error handling** — global error handler, Sentry integration, structured logging
10. **Deployment** — environment-based config, Vercel (frontend) + Render (backend)

---

## Project Structure

```
voicedrop/
├── voicedrop-app/          # React frontend
│   └── src/
│       ├── App.js          # Main app component (entire UI)
│       ├── App.test.js     # Smoke test
│       └── index.js        # Entry point
│
└── voicedrop-backend/      # Node.js backend
    ├── server.js           # Express app, all routes
    ├── models/
    │   ├── User.js
    │   ├── Post.js
    │   └── Comment.js
    ├── routes/
    │   └── auth.js
    ├── workers/
    │   └── audioWorker.js  # BullMQ worker (S3 upload)
    └── lib/
        ├── redis.js
        ├── queues.js
        └── logger.js
```

---

## Running Locally

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- AWS S3 bucket
- Redis (local or Upstash)

### Backend

```bash
cd voicedrop-backend
npm install
```

Create a `.env` file:

```
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
AWS_REGION=your_region
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_BUCKET_NAME=your_bucket
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
REDIS_URL=your_redis_url
ALLOWED_ORIGINS=http://localhost:3000
```

```bash
npm start
```

### Frontend

```bash
cd voicedrop-app
npm install
```

Create a `.env.development.local` file:

```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

```bash
npm start
```

---

## API Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/signup` | Register new user | No |
| POST | `/api/auth/login` | Login | No |
| GET | `/api/posts` | Get feed (paginated, sortable) | No |
| POST | `/api/posts` | Create a voice drop | Yes |
| DELETE | `/api/posts/:id` | Delete a post | Yes |
| POST | `/api/posts/:id/like` | Like / unlike a post | Yes |
| POST | `/api/posts/:id/save` | Save / unsave a post | Yes |
| GET | `/api/posts/:id/comments` | Get comments | No |
| POST | `/api/posts/:id/comments` | Add a comment | Yes |
| GET | `/api/posts/saved` | Get saved posts | Yes |
| GET | `/api/posts/search` | Search posts by title | No |
| GET | `/api/user/profile` | Get current user profile | Yes |
| PUT | `/api/user/profile` | Update profile | Yes |

---

## Socket.IO Events

| Event | Direction | Description |
|---|---|---|
| `newPost` | Server → Client | New post broadcast to all users |
| `postReady` | Server → Client | Audio URL ready after S3 upload |
| `postDeleted` | Server → Client | Post removed from all feeds |
| `likeUpdate` | Server → Client | Like count sync across clients |
| `newComment` | Server → Client | Real-time comment delivery |
| `onlineCount` | Server → Client | Live online user count |
| `startRecording` | Client → Server | User started recording |
| `stopRecording` | Client → Server | User stopped recording |

---

## Known Limitations

- Render free tier spins down after inactivity — first request after idle takes ~30 seconds to wake up
- No email verification on signup currently
- Password change not yet supported

---

## Future Work

- [ ] **Upload audio from files** — let users upload existing `.mp3` / `.wav` / `.m4a` files instead of only recording live in browser
- [ ] **Change password** — authenticated users should be able to update their password from profile settings
- [ ] **Email verification** — verify email on signup using a confirmation link (Nodemailer or Resend)
- [ ] **Forgot password / reset flow** — email-based password reset with expiring tokens
- [ ] **Audio waveform visualiser** — real waveform generated from actual audio data instead of random bars
- [ ] **Push notifications** — notify users when someone likes or comments on their post
- [ ] **Follow system** — follow users and get a personalised feed from people you follow
- [ ] **Audio transcription** — auto-generate text transcript of voice drops using Whisper (infrastructure already in place via OpenAI integration)
- [ ] **Proper async job queue** — restore BullMQ + Redis worker for non-blocking S3 uploads at scale
- [ ] **Pagination on saved posts** — currently loads all saved posts at once
- [ ] **Mobile app** — React Native version using the same backend API

---

## Built With

This project was built with AI-assisted development using [Claude](https://claude.ai) as a pair programmer — helping architect each system design phase, write and debug code, and explain concepts hands-on. All debugging of real production issues (CORS errors, audio MIME types, S3 upload pipeline, WebSocket sync, double-post race conditions) was done through active problem solving, not just code generation.

---

## Author

**Maryala Sharanya**  
[GitHub](https://github.com/sharon44-ham) · [LinkedIn](https://www.linkedin.com/in/maryala-sharanya-19b9b9292/)

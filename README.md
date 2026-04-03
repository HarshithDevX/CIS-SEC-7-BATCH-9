# ⬡ WebWatch — Intelligent Website Change Detection System

Monitor competitor websites, detect content changes, classify them with AI, and get email alerts.

---

## 🗂️ Project Structure

```
website-monitor/
├── backend/
│   ├── main.py            ← FastAPI app (all API routes)
│   ├── database.py        ← SQLAlchemy models + CRUD helpers
│   ├── scraper.py         ← Fetch & clean website content
│   ├── diff_engine.py     ← Compare snapshots with difflib
│   ├── classifier.py      ← Claude AI: classify MAJOR / MINOR
│   ├── alerts.py          ← SMTP email alerts
│   ├── scheduler.py       ← APScheduler background jobs
│   ├── .env.example       ← Copy to .env and fill in keys
│   └── requirements.txt
└── frontend/
    ├── public/index.html
    ├── src/
    │   ├── index.js
    │   ├── App.jsx
    │   ├── api.js          ← Axios API calls
    │   ├── index.css       ← Global dark theme styles
    │   └── components/
    │       ├── Dashboard.jsx      ← Main grid + stats
    │       ├── AddSiteModal.jsx   ← Add URL form
    │       ├── SiteDetail.jsx     ← Per-site page
    │       ├── DiffViewer.jsx     ← Change blocks viewer
    │       └── VersionHistory.jsx ← Timeline of snapshots
    └── package.json
```

---

## ⚡ Quick Setup

### 1. Clone / Download the project

```bash
cd website-monitor
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY and SMTP credentials
```

### 3. Run the Backend

```bash
uvicorn main:app --reload --port 8000
```

Visit: http://localhost:8000  
API Docs: http://localhost:8000/docs

### 4. Frontend Setup

```bash
cd ../frontend
npm install
npm start
```

Visit: http://localhost:3000

---

## 🔑 Environment Variables (backend/.env)

| Variable         | Description                                        |
|------------------|----------------------------------------------------|
| ANTHROPIC_API_KEY | Your Claude API key (for AI classification)       |
| SMTP_HOST        | SMTP server (default: smtp.gmail.com)              |
| SMTP_PORT        | SMTP port (default: 587)                           |
| SMTP_USER        | Your email address                                 |
| SMTP_PASS        | Gmail App Password (not your regular password)     |
| FROM_EMAIL       | Sender email address                               |

### Getting a Gmail App Password:
1. Go to https://myaccount.google.com/security
2. Enable 2-Factor Authentication
3. Go to App Passwords → Generate password for "Mail"
4. Paste that 16-character password as SMTP_PASS

### Getting an Anthropic API Key:
1. Visit https://console.anthropic.com
2. Create account → API Keys → New Key
3. Paste as ANTHROPIC_API_KEY

> **Note:** Without these keys, the system still works — it uses rule-based classification and skips email alerts.

---

## 🌐 API Endpoints

| Method | Endpoint                              | Description                    |
|--------|---------------------------------------|--------------------------------|
| GET    | /sites                                | List all monitored sites       |
| POST   | /sites                                | Add a new site to monitor      |
| PATCH  | /sites/{id}                           | Update interval or pause/resume|
| DELETE | /sites/{id}                           | Remove a site                  |
| POST   | /sites/{id}/check                     | Trigger manual check           |
| GET    | /sites/{id}/history                   | Get snapshot history           |
| GET    | /sites/{id}/diff/latest               | Get the latest diff            |
| GET    | /sites/{id}/diff/{snap_a}/{snap_b}    | Compare two specific snapshots |

---

## 🏗️ How It Works

```
User adds URL
     ↓
Scraper fetches page → cleans HTML → extracts text
     ↓
Saves first snapshot to SQLite DB
     ↓
APScheduler runs every N minutes:
  ├── Fetch new content
  ├── Compare hash with last snapshot
  ├── If different → run difflib → compute diff stats
  ├── Claude AI classifies: MAJOR or MINOR
  ├── Save new snapshot with change metadata
  └── If MAJOR → send email alert
     ↓
React frontend shows:
  ├── Dashboard with all sites + status badges
  ├── Diff viewer with highlighted added/removed lines
  └── Version history timeline
```

---

## 🚀 Deployment

### Backend (Render.com — free tier)
1. Push `backend/` to a GitHub repo
2. Create new Web Service on render.com
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables in Render dashboard

### Frontend (Vercel — free tier)
1. Push `frontend/` to GitHub
2. Import on vercel.com
3. Set `REACT_APP_API_URL=https://your-render-app.onrender.com`
4. Deploy

---

## 🛠️ Tech Stack

| Layer        | Technology                |
|--------------|---------------------------|
| Frontend     | React 18, Lucide Icons    |
| Styling      | Custom CSS (dark theme)   |
| API Client   | Axios                     |
| Backend      | FastAPI (Python)          |
| Database     | SQLite (SQLAlchemy ORM)   |
| Scheduler    | APScheduler               |
| Web Scraping | BeautifulSoup4 + Requests |
| Diff Engine  | Python difflib            |
| AI Classify  | Claude API (Anthropic)    |
| Email Alerts | SMTP (Gmail)              |

<div align="center">

# 🧠 Synapse
### Personal Management System

*Your Royal Command Centre for Student Life*

[![Electron](https://img.shields.io/badge/Electron-2B2E3A?style=for-the-badge&logo=electron&logoColor=9FEAF9)](https://www.electronjs.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)](https://www.chartjs.org/)

</div>

---

## 📖 Overview

**Synapse** is a sleek, offline-first desktop application built with Electron for students to manage every aspect of their daily life from a single command centre. It combines wellness tracking, finance management, skill development, and reminders — all stored locally on your machine with no cloud dependency.

> *"Knowledge is the crown that none can take from you."*

---

## ✨ Features

### 🏠 Dashboard
- Unified overview of all modules at a glance
- Live wellness score, finance balance, and active skill count
- Personalized greeting with user profile

### 💪 Wellness Tracker
- **Calorie tracking** — log daily food intake (goal: 2000 kcal)
- **Water intake** — track hydration in litres with tiered scoring (goal: 4L/day)
- **Exercise** — log calories burned per workout session (goal: 400 kcal burned)
- **Sleep tracking** — monitor sleep hours with penalty logic for under 6 hrs
- **Mood tracker** — log daily mood (Energetic / Happy / Neutral / Sad / Angry)
- **Wellness Score** — dynamic 100-point scoring system across all metrics
- **Streak counter** — tracks consecutive days of logging
- **Trend chart** — weekly/monthly wellness score visualization via Chart.js

### 💰 Finance Manager
- Income and expense tracking
- Current balance overview
- Transaction history

### 🎓 Skills Tracker
- Active learning track management
- Skill progress monitoring

### 🔔 Reminders
- Create and manage personal reminders
- Notification support via Electron's native Notification API

### 🔐 Authentication
- Local user registration and login system
- Secure password handling
- Remember me support

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Desktop Shell | Electron |
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Charts | Chart.js |
| Icons | Font Awesome 6 |
| Fonts | Google Fonts (Cinzel, Raleway) |
| Storage | Local JSON files via Node.js `fs` module |
| IPC | Electron contextBridge + ipcMain/ipcRenderer |

---

## 📁 Project Structure

```
synapse/
├── main.js               # Electron main process — window & IPC handlers
├── preload.js            # Secure context bridge (contextBridge)
├── index.html            # App shell — landing page + main layout
├── css/
│   ├── styles.css        # Global styles & design tokens
│   └── dashboard.css     # Dashboard-specific styles
├── js/
│   ├── auth.js           # Login & signup logic
│   ├── dashboard.js      # Dashboard page logic
│   ├── wellness.js       # Wellness module — scoring, tracking, chart
│   ├── finance.js        # Finance module
│   ├── skills.js         # Skills module
│   ├── reminders.js      # Reminders module
│   └── renderer.js       # Page routing & global UI logic
├── data/
│   ├── users.json        # User accounts
│   ├── wellness.json     # Daily wellness logs
│   ├── finance.json      # Financial transactions
│   ├── skills.json       # Skill records
│   └── reminders.json    # Reminder entries
└── assets/
    └── icon.png          # App icon
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v16 or higher
- npm v8 or higher

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/synapse.git

# 2. Navigate into the project
cd synapse

# 3. Install dependencies
npm install

# 4. Run the app
npm start
```

### Development Mode

```bash
# Run with DevTools open
NODE_ENV=development npm start
```

---

## 💾 Data Storage

All data is stored **locally** on your machine as JSON files inside the `/data` directory. There is no internet connection required and no data ever leaves your device.

| File | Contents |
|---|---|
| `users.json` | User accounts and credentials |
| `wellness.json` | Daily health and wellness logs |
| `finance.json` | Income, expenses, transactions |
| `skills.json` | Learning tracks and progress |
| `reminders.json` | Reminders and their status |

Data is read and written via Electron's secure IPC bridge:
```
Renderer (UI) → contextBridge → ipcMain → fs.writeFileSync → JSON file
```

---

## 📊 Wellness Scoring System

Synapse uses a **100-point wellness scoring system** calculated daily:

| Metric | Max Points | Goal | Scoring |
|---|---|---|---|
| Calories Consumed | 20 pts | 2000 kcal | Proportional |
| Water Intake | 20 pts | 4 litres | Tiered (every 1L ≈ 5 pts) |
| Calories Burned | 20 pts | 400 kcal | Tiered (every 100 kcal ≈ 5 pts) |
| Sleep | 20 pts | 8 hours | Tiered (heavy penalty below 6 hrs) |
| Mood | 20 pts | Energetic | Fixed lookup per mood |

---

## 🎨 Design

- **Theme** — Royal dark navy with gold accents (`#c9a84c`)
- **Typography** — Cinzel (headings) + Raleway (body)
- **Custom cursor** — Animated gold dot + ring cursor
- **Animations** — Smooth stagger card animations on page load

---

## 📦 Build for Distribution

```bash
# Package the app
npm run build

# Or using electron-builder
npx electron-builder
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch — `git checkout -b feature/your-feature`
3. Commit your changes — `git commit -m 'Add your feature'`
4. Push to the branch — `git push origin feature/your-feature`
5. Open a Pull Request

---


<div align="center">


*Synapse — Reign over your student life.*

</div>
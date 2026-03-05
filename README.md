# DayShape

A passive health data review app that turns whole-day Apple Watch data into a story. Import a Health Auto Export CSV and instantly see your heart rate timeline, detected events, HRV trends, and recovery metrics.

**Live demo:** [bokonon23.github.io/dayshape](https://bokonon23.github.io/dayshape/)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20.19+ or v22.12+

### Install & Run

```bash
cd dayshape
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

### Usage

1. Export a CSV from **Health Auto Export** (iOS) at per-minute granularity
2. Drag and drop the CSV onto the upload zone (or click to browse)
3. The app detects elevated HR events using baseline-relative thresholds and asks you to label them:
   - *"Looks like something happened at 10:34 — elevated HR for 45 mins, peak 156 bpm. What was this?"*
   - Choose: Sauna, Walk, Workout, Cold Plunge, Other, or Dismiss
4. Confirmed events show full detail views:
   - Full-day heart rate timeline with event overlays
   - Zoomed detail chart with peak and recovery annotations
   - HRV bar chart with post-event highlighting
   - Summary table (peak HR, elevation, recovery time, HRV change, energy, steps)
5. Labels persist in localStorage — reload and re-upload to see them restored

### Build for Production

```bash
npm run build
```

Output goes to `dist/`. Deployed automatically to GitHub Pages on push to master.

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS v4 (dark theme)
- Recharts
- PapaParse

## Data Privacy

All processing happens client-side in the browser. No data is uploaded to any server.

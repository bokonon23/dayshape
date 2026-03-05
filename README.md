# DayShape

A passive health data review app that turns whole-day Apple Watch data into a story. Import a Health Auto Export CSV and instantly see your heart rate timeline, detected sauna sessions, HRV trends, and recovery metrics.

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
3. The app parses the data, detects sauna sessions, and renders:
   - Full-day heart rate timeline with area fill and baseline
   - Zoomed session detail chart with peak and recovery annotations
   - HRV bar chart with post-sauna highlighting
   - Session summary table (peak HR, elevation, recovery time, HRV change, energy, steps)

### Build for Production

```bash
npm run build
```

Output goes to `dist/`.

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS v4 (dark theme)
- Recharts
- PapaParse

## Data Privacy

All processing happens client-side in the browser. No data is uploaded to any server.

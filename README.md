# Compliance Alert Triage System

A professional, production-ready compliance alert management system built for RegTech companies . This application provides a comprehensive interface for triaging, investigating, and managing compliance alerts in real-time.

## Features

### Dashboard Metrics
- **Total Alerts**: Complete count of all compliance alerts
- **Pending Review**: Alerts requiring immediate attention
- **False Positive Rate**: Percentage of dismissed alerts
- **Average Investigation Time**: Mean time to resolve alerts

### Alert Management
- **5 Alert Types**: Market Manipulation, Wash Trading, Spoofing, Insider Trading, Position Limit Breach
- **4 Severity Levels**: Critical (red), High (orange), Medium (yellow), Low (blue)
- **5 Status Options**: New, In Review, Escalated, Dismissed, Resolved

### Filtering & Search
- Real-time search by alert ID, trader name, or trader ID
- Filter by severity level
- Filter by status
- Sort by time (newest/oldest first)
- Sort by severity (critical to low)

### Alert Details Modal
- Complete alert information display
- Trader details and contact information
- Action timeline with chronological events
- Investigation notes textarea
- Action buttons: Start Investigation, Escalate, Dismiss, Mark Resolved
- Close with X button or click outside modal

### UI/UX Features
- Toast notifications for all actions
- Loading states on buttons during operations
- Smooth animations and transitions
- Hover effects on interactive elements
- Empty state when no results match filters
- Export to JSON functionality
- Professional financial industry design
- Responsive layout for all screen sizes

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library
- **React Hot Toast** - Toast notifications

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The production build will be in the `dist` directory.

## Project Structure

```
compliance-alert-system/
├── src/
│   ├── components/
│   │   └── AlertDetailModal.tsx    # Alert detail modal component
│   ├── App.tsx                      # Main application component
│   ├── main.tsx                     # Application entry point
│   ├── index.css                    # Global styles with Tailwind
│   ├── types.ts                     # TypeScript type definitions
│   └── mockData.ts                  # Mock data generator
├── index.html                       # HTML template
├── package.json                     # Dependencies and scripts
├── tsconfig.json                    # TypeScript configuration
├── vite.config.ts                   # Vite configuration
├── tailwind.config.js               # Tailwind CSS configuration
└── postcss.config.js                # PostCSS configuration
```

## Mock Data

The application includes 20 realistic compliance alerts with:
- Varied alert types and severities
- Different trader information across multiple firms
- Realistic timestamps and timelines
- Various status states

## Configuration

All configuration files use ES modules (`export default`):
- `tailwind.config.js` - Configured for Vite + React + TypeScript
- `postcss.config.js` - Includes Tailwind CSS and Autoprefixer
- `src/index.css` - Includes all Tailwind directives

## License

This project is built for demonstration purposes.


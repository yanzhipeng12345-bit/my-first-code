# Frontend Build Instructions

## Prerequisites

- Node.js 22.13.0 or later
- npm or pnpm package manager

## Installation

```bash
cd frontend
npm install
# or
pnpm install
```

## Development Server

```bash
npm run dev
# or
pnpm dev
```

The app will be available at `http://localhost:5173`

## Production Build

```bash
npm run build
# or
pnpm build
```

Output will be in `dist/` directory.

## Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```
VITE_API_URL=https://your-api-endpoint.com
VITE_APP_TITLE=Iron Tracker
VITE_APP_LOGO=/logo.svg
```

## Key Files

- `src/App.tsx` - Main application layout and routing
- `src/pages/` - Page components (Home, History, Stats)
- `src/components/` - Reusable UI components
- `src/lib/calorieCalculator.ts` - Calorie calculation logic (v4.5.1 optimized)
- `src/index.css` - Global styles and Tailwind configuration
- `src/main.tsx` - React entry point

## Styling

This project uses Tailwind CSS 4 with custom theme variables defined in `src/index.css`.

### Color Palette (Midnight Blue + Ice Lemon)

- Background: `#0A0B10` (Deep Blue/Black)
- Primary: `#E2FF62` (Ice Lemon Yellow)
- Text: `#F8FAFC` (Light)
- Muted: `#4A4D57` (Deep Gray-Blue)

### Typography

- Display: **Space Mono** (numbers, data)
- Body: **Inter** (interface text)

## Testing

```bash
npm run test
# or
pnpm test
```

## Deployment

The built `dist/` folder can be deployed to any static hosting service:

- Vercel
- Netlify
- AWS S3 + CloudFront
- GitHub Pages
- Manus (built-in hosting)

Simply upload the contents of `dist/` to your hosting provider.

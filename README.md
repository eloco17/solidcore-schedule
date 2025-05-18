# Solidcore Schedule Bot

A Next.js application for automating Solidcore class bookings. The bot monitors for schedule releases and automatically books classes when they become available.

## Features

- Schedule class bookings in advance
- Automatic booking when schedule is released (24th at 1am for members, 25th for non-members)
- Real-time status updates for scheduled classes
- Modern UI with Tailwind CSS
- TypeScript support

## Prerequisites

- Node.js 18 or later
- npm or yarn
- Solidcore membership account

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd solidcore-schedule
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory with your Solidcore credentials:
```
SOLIDCORE_EMAIL=your-email@example.com
SOLIDCORE_PASSWORD=your-password
```

4. Start the development server:
```bash
npm run dev
```

5. Start the schedule checker in a separate terminal:
```bash
npm run check-schedule
```

## Usage

1. Open the application in your browser at `https://solidcore-schedule.vercel.app/`
2. Select your desired location, class type, day, and time
3. Click "Schedule Class" to add it to your booking list
4. The bot will automatically attempt to book the class when the schedule is released

## Development

- `npm run dev` - Start the development server
- `npm run build` - Build the application
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint
- `npm run check-schedule` - Start the schedule checker

## Project Structure

```
solidcore-schedule/
├── app/                    # Next.js app directory
│   ├── gyms/              # Gym-specific pages
│   │   └── solidcore/     # Solidcore page
│   └── page.tsx           # Landing page
├── components/            # React components
├── lib/                   # Utility functions and types
├── scripts/              # Automation scripts
│   ├── check-schedule.ts # Schedule checker
│   └── schedule-release.ts # Schedule release handler
├── schedule_manager.ts   # Schedule management class
└── public/              # Static assets
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT 

import { NextResponse } from 'next/server';

export async function GET() {
  // Return a mock day with a mock session in the sessions array
  return NextResponse.json({
    days: [
      {
        name: "Monday",
        date: "2024-01-22",
        sessions: [
          {
            id: "mock-session-1",
            title: "Solidcore Power50",
            skillLevel: "All Levels",
            startTime: "06:00",
            endTime: "07:00",
            location: "NY, Chelsea"
          }
        ]
      }
    ],
    message: "Solidcore schedule API placeholder. Replace with real data source."
  });
} 
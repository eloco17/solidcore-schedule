import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { SessionUser } from "@/app/types/session"
import { deleteScheduledJob } from "@/app/actions"

// Helper function to determine if a session is a morning drill
function isMorningDrill(session: any) {
  const title = session.title?.toLowerCase() || '';
  const startTime = session.startTime || '';
  
  // Check if it's a drill session
  const isDrill = title.includes('drill');
  
  // Parse the start time to check if it's morning (before noon)
  const timeMatch = startTime.match(/(\d+):(\d+)\s*(am|pm)/i);
  if (!timeMatch) return false;
  
  const [_, hours, minutes, period] = timeMatch;
  const hour = parseInt(hours);
  const isMorning = period.toLowerCase() === 'am' || (period.toLowerCase() === 'pm' && hour === 12);
  
  return isDrill && isMorning;
}

// Helper function to check if confirmation deadline has passed
function hasPassedConfirmationDeadline(sessionDate: string, sessionTime: string) {
  const now = new Date();
  const [month, day, year] = sessionDate.split('/');
  const [time, period] = sessionTime.split(' ');
  const [hours, minutes] = time.split(':');
  
  // Create session date
  const sessionDateTime = new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    period.toLowerCase() === 'pm' && parseInt(hours) !== 12 ? parseInt(hours) + 12 : parseInt(hours),
    parseInt(minutes)
  );

  // Set confirmation deadline to 9 PM the night before
  const confirmationDeadline = new Date(sessionDateTime);
  confirmationDeadline.setDate(confirmationDeadline.getDate() - 1);
  confirmationDeadline.setHours(21, 0, 0, 0);

  return now > confirmationDeadline;
}

// Helper function to check if within auto-cancel window
function isWithinAutoCancelWindow(sessionDate: string, sessionTime: string) {
  const now = new Date();
  const [month, day, year] = sessionDate.split('/');
  const [time, period] = sessionTime.split(' ');
  const [hours, minutes] = time.split(':');
  
  // Create session date
  const sessionDateTime = new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    period.toLowerCase() === 'pm' && parseInt(hours) !== 12 ? parseInt(hours) + 12 : parseInt(hours),
    parseInt(minutes)
  );

  // Check if we're within 2 hours of the session
  const twohoursBefore = new Date(sessionDateTime);
  twohoursBefore.setHours(twohoursBefore.getHours() - 2);

  return now >= twohoursBefore && now < sessionDateTime;
}

export async function POST(request: Request) {
  try {
    // Get the current user session
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = session.user as SessionUser;
    if (!user.id) {
      return NextResponse.json({ error: "Invalid user session" }, { status: 401 });
    }

    const { sessions } = await request.json();
    if (!Array.isArray(sessions)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const results: Record<string, any> = {};

    // Process each session
    for (const session of sessions) {
      try {
        if (!isMorningDrill(session)) continue;

        const isConfirmed = session.confirmed || false;
        const passedDeadline = hasPassedConfirmationDeadline(session.date, session.startTime);
        const withinCancelWindow = isWithinAutoCancelWindow(session.date, session.startTime);

        // Auto-cancel if:
        // 1. Session is not confirmed AND
        // 2. Confirmation deadline has passed AND
        // 3. We're within the 2-hour window before the session
        if (!isConfirmed && passedDeadline && withinCancelWindow) {
          const result = await deleteScheduledJob(session.id);
          
          results[session.id] = {
            cancelled: result.success,
            reason: "Auto-cancelled: Morning drill not confirmed by 9 PM the night before",
            error: result.success ? null : result.message
          };

          if (result.success) {
            console.log(`Auto-cancelled session ${session.id} for user ${user.id}`);
          }
        } else {
          results[session.id] = {
            cancelled: false,
            reason: isConfirmed ? "Session is confirmed" :
                    !passedDeadline ? "Confirmation deadline not passed" :
                    !withinCancelWindow ? "Not within auto-cancel window" :
                    "Unknown reason"
          };
        }
      } catch (error) {
        console.error(`Error processing session ${session.id}:`, error);
        results[session.id] = {
          cancelled: false,
          error: String(error)
        };
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error in auto-cancel endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 
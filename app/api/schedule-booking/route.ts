import { NextResponse } from 'next/server';
import { CloudTasksClient } from '@google-cloud/tasks';

// GCP project/queue/location config
const PROJECT_ID = process.env.GCP_PROJECT_ID || 'your-gcp-project-id';
const QUEUE_ID = 'solidcore-bot-queue';
const LOCATION = process.env.GCP_LOCATION || 'us-east4';
const BOT_ENDPOINT = 'https://solidcore-bot-726368815164.us-east4.run.app';

// Helper to parse date/time and compute schedule time
function getScheduleTime(date: string, memberType: string) {
  // date: MM/DD or YYYY-MM-DD
  let year, month, day;
  if (date.includes('-')) {
    [year, month, day] = date.split('-').map(Number);
  } else {
    const now = new Date();
    year = now.getFullYear();
    [month, day] = date.split('/').map(Number);
  }
  // Schedule for 24th or 25th at 1:00 AM of the month the class is in
  const scheduleMonth = month - 1; // JS Date months are 0-based
  const triggerDay = memberType === 'member' ? 24 : 25;
  const triggerDate = new Date(year, scheduleMonth, triggerDay, 1, 0, 0, 0);
  return triggerDate;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { classes } = body;
    if (!Array.isArray(classes)) {
      return NextResponse.json({ success: false, message: 'Missing classes array' }, { status: 400 });
    }

    const client = new CloudTasksClient();
    let created = 0;
    for (const c of classes) {
      const { date, time, class_name, user_id, member_type } = c;
      const scheduleTime = getScheduleTime(date, member_type);
      // Prepare the payload for the bot
      const payload = {
        date,
        time,
        class_name,
        user_id,
        member_type,
      };
      const task = {
        httpRequest: {
          httpMethod: 'POST',
          url: BOT_ENDPOINT,
          headers: { 'Content-Type': 'application/json' },
          body: Buffer.from(JSON.stringify(payload)).toString('base64'),
        },
        scheduleTime: { seconds: Math.floor(scheduleTime.getTime() / 1000) },
      };
      const parent = client.queuePath(PROJECT_ID, LOCATION, QUEUE_ID);
      await client.createTask({ parent, task });
      created++;
    }
    return NextResponse.json({ success: true, tasks_created: created });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
} 
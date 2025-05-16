const express = require('express');
const { CloudTasksClient } = require('@google-cloud/tasks');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require("fs").promises
const path = require("path")

const app = express();
app.use(cors());
app.use(bodyParser.json());

// CONFIGURE THESE
const PROJECT_ID = process.env.GCP_PROJECT_ID || 'your-gcp-project-id';
const QUEUE_ID = 'solidcore-bot-queue';
const LOCATION = process.env.GCP_LOCATION || 'us-east4';
const BOT_ENDPOINT = 'https://solidcore-bot-726368815164.us-east4.run.app'; // Your bot endpoint

function getScheduleTime(date, memberType) {
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
  return new Date(year, scheduleMonth, triggerDay, 1, 0, 0, 0);
}

app.post('/api/schedule-booking', async (req, res) => {
  try {
    const { classes } = req.body;
    if (!Array.isArray(classes)) {
      return res.status(400).json({ success: false, message: 'Missing classes array' });
    }

    const client = new CloudTasksClient();
    let created = 0;
    for (const c of classes) {
      const { date, time, class_name, user_id, member_type } = c;
      const scheduleTime = getScheduleTime(date, member_type);
      const payload = { date, time, class_name, user_id, member_type };
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
    res.json({ success: true, tasks_created: created });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e) });
  }
});

// Health check
app.get('/', (req, res) => res.send('Solidcore bot scheduler running!'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


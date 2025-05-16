import { ScheduleManager } from '../schedule_manager';

const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const manager = new ScheduleManager();

async function checkSchedule() {
  console.log('Checking schedule release...');
  
  if (manager.check_schedule_released()) {
    console.log('Schedule is released! Starting booking process...');
    // Import and run the schedule release handler
    const { handleScheduleRelease } = await import('./schedule-release');
    await handleScheduleRelease();
  } else {
    const nextRelease = manager.get_next_release_date();
    console.log(`Schedule not yet released. Next release: ${nextRelease.toLocaleString()}`);
  }
}

// Run initial check
checkSchedule().catch(console.error);

// Set up periodic checks
setInterval(() => {
  checkSchedule().catch(console.error);
}, CHECK_INTERVAL);

console.log('Schedule checker started. Press Ctrl+C to stop.'); 
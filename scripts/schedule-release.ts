import { ScheduleManager } from '../schedule_manager';
import { ScheduledClass } from '../lib/types';

export async function handleScheduleRelease() {
  const manager = new ScheduleManager();
  
  // Get scheduled classes from localStorage
  const scheduledClasses = localStorage.getItem('scheduledClasses');
  if (!scheduledClasses) {
    console.log('No scheduled classes found');
    return;
  }

  const classes: ScheduledClass[] = JSON.parse(scheduledClasses);

  // Check if schedule is released
  if (!manager.check_schedule_released()) {
    console.log('Schedule not yet released');
    return;
  }

  // Book each scheduled class
  for (const classInfo of classes) {
    try {
      // Find registration ID
      const registrationId = await manager.find_class_registration_id(classInfo);
      if (!registrationId) {
        console.log(`No registration ID found for class: ${classInfo.class_type} at ${classInfo.time}`);
        continue;
      }

      // Update class info with registration ID
      classInfo.registration_id = registrationId;
      classInfo.last_checked = new Date().toISOString();

      // Book the class
      const success = await manager.book_class(classInfo);
      if (success) {
        console.log(`Successfully booked class: ${classInfo.class_type} at ${classInfo.time}`);
        classInfo.status = 'booked';
      } else {
        console.log(`Failed to book class: ${classInfo.class_type} at ${classInfo.time}`);
        classInfo.status = 'failed';
      }
    } catch (error) {
      console.error(`Error booking class: ${error}`);
      classInfo.status = 'error';
    }
  }

  // Update localStorage with updated class statuses
  localStorage.setItem('scheduledClasses', JSON.stringify(classes));
}

// Run the script
handleScheduleRelease().catch(console.error); 
import { ScheduledClass } from './lib/types';

export class ScheduleManager {
  private readonly SCHEDULE_RELEASE_DAY = 24; // 24th of the month
  private readonly SCHEDULE_RELEASE_HOUR = 1; // 1 AM
  private readonly BASE_URL = 'https://www.solidcore.co';

  /**
   * Check if the schedule has been released
   * @returns boolean indicating if schedule is released
   */
  check_schedule_released(): boolean {
    const now = new Date();
    const day = now.getDate();
    const hour = now.getHours();

    // Check if it's the release day and hour
    return day >= this.SCHEDULE_RELEASE_DAY && hour >= this.SCHEDULE_RELEASE_HOUR;
  }

  /**
   * Find the registration ID for a class
   * @param classInfo The class information
   * @returns Promise<string | null> The registration ID or null if not found
   */
  async find_class_registration_id(classInfo: ScheduledClass): Promise<string | null> {
    try {
      // TODO: Implement actual API call to find class registration ID
      // This is a placeholder that simulates finding a registration ID
      return `REG-${classInfo.location}-${classInfo.class_type}-${classInfo.day_of_week}-${classInfo.time}`;
    } catch (error) {
      console.error('Error finding class registration ID:', error);
      return null;
    }
  }

  /**
   * Book a class using its registration ID
   * @param classInfo The class information including registration ID
   * @returns Promise<boolean> Success status of the booking
   */
  async book_class(classInfo: ScheduledClass): Promise<boolean> {
    if (!classInfo.registration_id) {
      console.error('No registration ID provided for booking');
      return false;
    }

    try {
      // TODO: Implement actual API call to book the class
      // This is a placeholder that simulates booking a class
      console.log(`Booking class with registration ID: ${classInfo.registration_id}`);
      return true;
    } catch (error) {
      console.error('Error booking class:', error);
      return false;
    }
  }

  /**
   * Get the next schedule release date
   * @returns Date The next schedule release date
   */
  get_next_release_date(): Date {
    const now = new Date();
    const releaseDate = new Date(now.getFullYear(), now.getMonth(), this.SCHEDULE_RELEASE_DAY, this.SCHEDULE_RELEASE_HOUR);

    // If the release date has passed this month, get next month's release date
    if (now > releaseDate) {
      releaseDate.setMonth(releaseDate.getMonth() + 1);
    }

    return releaseDate;
  }
} 
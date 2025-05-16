import json
import datetime
import time
import logging
from pathlib import Path
import requests
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import pickle
import os
import tempfile
import calendar

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ScheduleManager:
    def __init__(self):
        self.schedule_file = "scheduled_classes.json"
        self.pattern_file = "schedule_patterns.json"
        self.locations = {
            "chelsea": {
                "name": "NY, Chelsea",
                "url": "https://solidcore.co/book/new-york/chelsea"
            },
            "downtown-brooklyn": {
                "name": "NY, Downtown Brooklyn",
                "url": "https://solidcore.co/book/new-york/downtown-brooklyn"
            }
            # Add more locations as needed
        }
        self.class_types = {
            "power50": "Power50",
            "power30": "Power30: Core + Upper Body",
            "starter50": "Starter50: Intro To [solidcore]",
            "foundation50": "Foundation50: Build Your Basics"
            # Add more class types as needed
        }
        self.load_scheduled_classes()
        self.load_schedule_patterns()

    def load_scheduled_classes(self):
        """Load scheduled classes from JSON file"""
        if os.path.exists(self.schedule_file):
            with open(self.schedule_file, 'r') as f:
                self.scheduled_classes = json.load(f)
        else:
            self.scheduled_classes = []

    def save_scheduled_classes(self):
        """Save scheduled classes to JSON file"""
        with open(self.schedule_file, 'w') as f:
            json.dump(self.scheduled_classes, f, indent=2)

    def add_class_to_schedule(self, location, class_type, day_of_week, time, coach=None):
        """Add a class to the schedule"""
        class_info = {
            "location": location,
            "class_type": class_type,
            "day_of_week": day_of_week,
            "time": time,
            "coach": coach,
            "status": "scheduled",
            "registration_id": None,
            "last_checked": None
        }
        self.scheduled_classes.append(class_info)
        self.save_scheduled_classes()
        logger.info(f"Added class to schedule: {class_info}")

    def remove_class_from_schedule(self, index):
        """Remove a class from the schedule"""
        if 0 <= index < len(self.scheduled_classes):
            removed = self.scheduled_classes.pop(index)
            self.save_scheduled_classes()
            logger.info(f"Removed class from schedule: {removed}")
            return True
        return False

    def get_schedule_release_date(self):
        """Get the next schedule release date (24th of current/next month)"""
        today = datetime.datetime.now()
        if today.day >= 24:
            # If we're past the 24th, schedule releases next month
            release_date = today.replace(day=24) + datetime.timedelta(days=32)
            release_date = release_date.replace(day=24)
        else:
            # Schedule releases this month
            release_date = today.replace(day=24)
        return release_date

    def check_schedule_released(self):
        """Check if the schedule has been released"""
        release_date = self.get_schedule_release_date()
        return datetime.datetime.now() >= release_date

    def find_class_registration_id(self, class_info):
        """Find the registration ID for a scheduled class"""
        try:
            # Initialize Chrome
            chrome_options = Options()
            chrome_options.add_argument('--headless')  # Run in headless mode
            driver = webdriver.Chrome(options=chrome_options)
            
            # Load cookies
            if os.path.exists("solidcore_cookies.pkl"):
                driver.get("https://solidcore.co")
                with open("solidcore_cookies.pkl", "rb") as f:
                    cookies = pickle.load(f)
                    for cookie in cookies:
                        driver.add_cookie(cookie)
                
                # Navigate to location page
                location_url = self.locations[class_info['location']]['url']
                driver.get(location_url)
                
                # Wait for schedule to load
                time.sleep(5)
                
                # Look for class matching criteria
                # This is a simplified version - you'll need to implement the actual class matching logic
                class_elements = driver.find_elements(By.CSS_SELECTOR, '.class-schedule-item')
                for element in class_elements:
                    if (class_info['class_type'] in element.text and
                        class_info['day_of_week'] in element.text and
                        class_info['time'] in element.text):
                        # Extract registration ID from the element
                        registration_id = element.get_attribute('data-registration-id')
                        if registration_id:
                            return registration_id
                
            return None
        finally:
            driver.quit()

    def book_scheduled_classes(self):
        """Book all scheduled classes that have been found"""
        if not self.check_schedule_released():
            logger.info("Schedule not yet released")
            return

        for class_info in self.scheduled_classes:
            if class_info['status'] == 'scheduled':
                # Find registration ID if not already found
                if not class_info['registration_id']:
                    registration_id = self.find_class_registration_id(class_info)
                    if registration_id:
                        class_info['registration_id'] = registration_id
                        class_info['last_checked'] = datetime.datetime.now().isoformat()
                        self.save_scheduled_classes()
                
                # Book the class if we have a registration ID
                if class_info['registration_id']:
                    if self.book_class(class_info):
                        class_info['status'] = 'booked'
                        self.save_scheduled_classes()
                        logger.info(f"Successfully booked class: {class_info}")

    def book_class(self, class_info):
        """Book a class using the registration ID"""
        try:
            # Load cookies
            with open("solidcore_cookies.pkl", "rb") as f:
                cookies = pickle.load(f)
            cookie_dict = {cookie['name']: cookie['value'] for cookie in cookies}
            
            # Prepare booking request
            url = "https://solidcore.co/assets/ajax/postBook.php"
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'Origin': 'https://solidcore.co',
                'Referer': f"https://solidcore.co/book/new-york/{class_info['location']}/{class_info['registration_id']}"
            }
            
            data = {
                'ProductID': 'undefined',
                'PackageID': 'undefined',
                'spot': 'undefined',
                'addon': '',
                'slug': f"/book/new-york/{class_info['location']}/{class_info['registration_id']}"
            }
            
            # Make booking request
            response = requests.post(url, headers=headers, cookies=cookie_dict, data=data)
            response.raise_for_status()
            
            return '"Status":"Success"' in response.text
            
        except Exception as e:
            logger.error(f"Error booking class: {str(e)}")
            return False

    def load_schedule_patterns(self):
        """Load schedule patterns from JSON file"""
        if os.path.exists(self.pattern_file):
            with open(self.pattern_file, 'r') as f:
                self.schedule_patterns = json.load(f)
        else:
            self.schedule_patterns = {}

    def save_schedule_patterns(self):
        """Save schedule patterns to JSON file"""
        with open(self.pattern_file, 'w') as f:
            json.dump(self.schedule_patterns, f, indent=2)

    def fetch_current_schedule(self, location):
        """Fetch the current month's schedule to establish patterns"""
        try:
            chrome_options = Options()
            chrome_options.add_argument('--headless')
            driver = webdriver.Chrome(options=chrome_options)
            
            if os.path.exists("solidcore_cookies.pkl"):
                driver.get("https://solidcore.co")
                with open("solidcore_cookies.pkl", "rb") as f:
                    cookies = pickle.load(f)
                    for cookie in cookies:
                        driver.add_cookie(cookie)
                
                # Navigate to location page
                location_url = self.locations[location]['url']
                driver.get(location_url)
                
                # Wait for schedule to load
                time.sleep(5)
                
                # Extract schedule information
                schedule_data = []
                class_elements = driver.find_elements(By.CSS_SELECTOR, '.class-schedule-item')
                
                for element in class_elements:
                    try:
                        class_info = {
                            'day_of_week': element.find_element(By.CSS_SELECTOR, '.day-name').text,
                            'time': element.find_element(By.CSS_SELECTOR, '.class-time').text,
                            'class_type': element.find_element(By.CSS_SELECTOR, '.class-name').text,
                            'coach': element.find_element(By.CSS_SELECTOR, '.coach-name').text,
                            'date': element.find_element(By.CSS_SELECTOR, '.date').text
                        }
                        schedule_data.append(class_info)
                    except Exception as e:
                        logger.warning(f"Could not extract class info: {str(e)}")
                
                return schedule_data
                
        finally:
            driver.quit()
        return []

    def analyze_schedule_pattern(self, schedule_data):
        """Analyze schedule data to identify patterns"""
        patterns = {}
        
        # Group classes by day of week
        for class_info in schedule_data:
            day = class_info['day_of_week']
            if day not in patterns:
                patterns[day] = []
            
            # Check if this time slot already exists
            time_slot = {
                'time': class_info['time'],
                'class_type': class_info['class_type'],
                'coach': class_info['coach']
            }
            
            if time_slot not in patterns[day]:
                patterns[day].append(time_slot)
        
        return patterns

    def predict_next_month_schedule(self, location):
        """Predict next month's schedule based on current patterns"""
        # Fetch current schedule
        current_schedule = self.fetch_current_schedule(location)
        
        # Analyze patterns
        patterns = self.analyze_schedule_pattern(current_schedule)
        
        # Save patterns
        self.schedule_patterns[location] = patterns
        self.save_schedule_patterns()
        
        # Generate next month's schedule
        next_month = datetime.datetime.now() + datetime.timedelta(days=32)
        next_month = next_month.replace(day=1)
        last_day = calendar.monthrange(next_month.year, next_month.month)[1]
        
        predicted_schedule = []
        
        # Generate schedule for each day of next month
        for day in range(1, last_day + 1):
            date = next_month.replace(day=day)
            day_name = date.strftime('%A')
            
            # If we have patterns for this day
            if day_name in patterns:
                for time_slot in patterns[day_name]:
                    predicted_schedule.append({
                        'date': date.strftime('%Y-%m-%d'),
                        'day_of_week': day_name,
                        'time': time_slot['time'],
                        'class_type': time_slot['class_type'],
                        'coach': time_slot['coach'],
                        'location': location
                    })
        
        return predicted_schedule

    def get_mirrored_schedule(self, location):
        """Get the mirrored schedule for the next month"""
        # Check if we have cached patterns
        if location not in self.schedule_patterns:
            # If not, fetch and analyze current schedule
            current_schedule = self.fetch_current_schedule(location)
            patterns = self.analyze_schedule_pattern(current_schedule)
            self.schedule_patterns[location] = patterns
            self.save_schedule_patterns()
        
        # Generate next month's schedule
        return self.predict_next_month_schedule(location)

def main():
    # Example usage
    manager = ScheduleManager()
    
    # Get mirrored schedule for Chelsea
    chelsea_schedule = manager.get_mirrored_schedule("chelsea")
    
    # Print the predicted schedule
    print("\nPredicted Schedule for Next Month:")
    for class_info in chelsea_schedule:
        print(f"{class_info['date']} ({class_info['day_of_week']}) - {class_info['time']} - {class_info['class_type']} with {class_info['coach']}")
    
    # Add some classes to schedule
    manager.add_class_to_schedule(
        location="chelsea",
        class_type="power50",
        day_of_week="Monday",
        time="18:00",
        coach="Megha Doshi"
    )
    
    # Start monitoring for schedule release
    while True:
        if manager.check_schedule_released():
            manager.book_scheduled_classes()
            break
        else:
            logger.info("Waiting for schedule release...")
            time.sleep(3600)  # Check every hour

if __name__ == "__main__":
    main() 
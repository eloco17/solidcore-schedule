import time
import os
import logging
import json
import pause
from datetime import datetime, timedelta
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from flask import Flask, request, jsonify
import re

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)

# Create a session with connection pooling but no retries
session = requests.Session()
adapter = HTTPAdapter(pool_connections=10, pool_maxsize=10)
session.mount("https://", adapter)
session.mount("http://", adapter)

# Track successful registrations to prevent duplicates
successful_registrations = set()

# Default headers for all requests
default_headers = {
    'authority': 'api.lifetimefitness.com',
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'en-US,en;q=0.9',
    'Content-type': 'application/json',
    'ocp-apim-subscription-key': '924c03ce573d473793e184219a6a19bd',
    'sec-ch-ua': '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'cross-site',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'origin': 'https://my.lifetime.life',
    'referer': 'https://my.lifetime.life/',
    'x-api-key': '924c03ce573d473793e184219a6a19bd',
    'Connection': 'keep-alive'
}

def find_event_id(date, title, location, min_start_time):
    """Find the event ID using specific class details"""
    try:
        logger.info(f"🔍 Searching for pickleball class on {date} at {min_start_time} with title: {title}")
        logger.info(f"Looking for location containing: {location}")
        
        # Format dates for API
        target_date = datetime.strptime(date, "%Y-%m-%d")
        start_date = target_date.strftime("%m/%d/%Y")
        end_date = (target_date + timedelta(days=1)).strftime("%m/%d/%Y")
        
        # Use the web-schedules API endpoint
        url = (
            f"https://api.lifetimefitness.com/ux/web-schedules/v2/schedules/classes"
            f"?start={start_date.replace('/', '%2F')}"
            f"&end={end_date.replace('/', '%2F')}"
            f"&tags=interest%3APickleball%20Open%20Play"
            f"&locations=PENN%201"
            f"&pageSize=750"
        )
        logger.info(f"API URL: {url}")
        
        # Add timestamp header
        headers = default_headers.copy()
        headers['x-timestamp'] = datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
        
        # Make API call to get classes
        response = session.get(
            url,
            headers=headers,
            timeout=10
        )
        
        logger.info(f"API Response Status: {response.status_code}")
        if response.status_code != 200:
            logger.error(f"API Response Content: {response.text}")
            return None
            
        if response.status_code == 200:
            try:
                classes_data = response.json()
                
                # Log pagination info if available
                pagination_header = response.headers.get('x-pagination')
                if pagination_header:
                    logger.info(f"Pagination info: {pagination_header}")
                
                # Process the classes data
                if 'results' in classes_data:
                    daily_schedules = classes_data['results']
                    logger.info(f"Found {len(daily_schedules)} daily schedules")
                    
                    # Find the schedule for our target date
                    target_schedule = None
                    for schedule in daily_schedules:
                        if schedule.get('day') == date:
                            target_schedule = schedule
                            break
                    
                    if not target_schedule:
                        logger.warning(f"⚠️ No schedule found for target date {date}")
                        return None
                    
                    logger.info(f"Found schedule for {date} with {target_schedule.get('total', 0)} total activities")
                    
                    # Extract classes from the day parts
                    target_classes = []
                    day_parts = target_schedule.get('dayParts', [])
                    
                    # Print all available classes and times
                    logger.info("📋 All available classes for this date:")
                    for day_part in day_parts:
                        day_part_name = day_part.get('name', '')
                        start_times = day_part.get('startTimes', [])
                        
                        for start_time_slot in start_times:
                            time_str = start_time_slot.get('time', '')
                            activities = start_time_slot.get('activities', [])
                            
                            for activity in activities:
                                class_name = activity.get('name', '')
                                class_location = activity.get('location', '')
                                logger.info(f"   • {time_str} - {class_name} at {class_location}")
                                # Add the start time to the activity for easier processing
                                activity['startTime'] = time_str
                                activity['dayPart'] = day_part_name
                                target_classes.append(activity)
                    
                    logger.info(f"Extracted {len(target_classes)} classes for {date}")
                    
                    # Convert min_start_time to 12-hour format with AM/PM for comparison
                    try:
                        # First try to parse as 24-hour format
                        try:
                            target_time = datetime.strptime(min_start_time, "%H:%M").time()
                            # Convert to 12-hour format with AM/PM
                            min_start_time = target_time.strftime("%I:%M %p")
                        except ValueError:
                            # If that fails, assume it's already in 12-hour format
                            pass
                        
                        # Parse the target time
                        target_time = datetime.strptime(min_start_time, "%I:%M %p").time()
                        target_hours = target_time.hour
                        target_minutes = target_time.minute
                        logger.info(f"Target time parsed: {target_hours}:{target_minutes:02d}")
                    except ValueError as e:
                        logger.error(f"Failed to parse target time '{min_start_time}': {str(e)}")
                        return None
                    
                    # Look for the target class
                    for class_item in target_classes:
                        class_name = class_item.get('name', '')
                        class_id = class_item.get('id', '')
                        start_time_str = class_item.get('startTime', '')
                        class_location = class_item.get('location', '')
                        
                        # Parse the start time first
                        try:
                            # Parse the time from the API response
                            api_time = datetime.strptime(start_time_str, "%I:%M %p").time()
                            
                            # Check if times match first
                            time_matches = (api_time.hour == target_hours and 
                                         api_time.minute == target_minutes)
                            
                            # Only proceed with other checks if time matches
                            if time_matches:
                                logger.info(f"🔍 Found class at matching time {start_time_str}: {class_name} in {class_location}")
                                
                                # Check if title and location match
                                title_matches = class_name.strip() == title.strip()
                                
                                # More flexible location matching
                                # Remove 's' from the end of the search term if it exists
                                search_location = location.strip().lower()
                                if search_location.endswith('s'):
                                    search_location = search_location[:-1]
                                
                                # Extract court numbers from both search and API locations
                                def extract_court_numbers(loc):
                                    # Find all numbers in the location string
                                    import re
                                    numbers = re.findall(r'\d+', loc)
                                    return set(numbers) if numbers else set()
                                
                                search_courts = extract_court_numbers(search_location)
                                api_courts = extract_court_numbers(class_location.strip().lower())
                                
                                # Check if the base term (without 's') is in the API location
                                # AND if any court numbers match
                                location_matches = (
                                    search_location in class_location.strip().lower() and
                                    (not search_courts or search_courts.intersection(api_courts))
                                )
                                
                                # Log matching details for debugging
                                logger.info(f"Matching details for {start_time_str} class:")
                                logger.info(f"  Time match: {time_matches} ({api_time.hour}:{api_time.minute:02d} vs {target_hours}:{target_minutes:02d})")
                                logger.info(f"  Title match: {title_matches}")
                                logger.info(f"    Expected: '{title.strip()}'")
                                logger.info(f"    Found: '{class_name.strip()}'")
                                logger.info(f"  Location match: {location_matches}")
                                logger.info(f"    Looking for: '{search_location}'")
                                logger.info(f"    In: '{class_location.strip().lower()}'")
                                logger.info(f"    Search courts: {search_courts}")
                                logger.info(f"    API courts: {api_courts}")
                                
                                if title_matches and location_matches:
                                    logger.info(f"🎯 Found matching class: {class_name} at {start_time_str}")
                                    return class_id
                            
                        except ValueError as e:
                            logger.warning(f"⚠️ Could not parse API time '{start_time_str}': {str(e)}")
                            continue
                    
                    logger.warning(f"❌ No matching class found for {date} at {min_start_time} with title: {title}")
                    return None
                else:
                    logger.warning("⚠️ No 'results' key found in API response")
                    logger.info(f"Response keys: {list(classes_data.keys())}")
                    return None
                    
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON response: {e}")
                logger.error(f"Raw response: {response.text[:200]}...")  # Log first 200 chars of response
                return None
        else:
            logger.error(f"❌ API returned status {response.status_code}")
            return None
    except Exception as e:
        logger.error(f"❌ Error finding event ID: {str(e)}")
        logger.exception("Full traceback:")  # This will log the full stack trace
        return None

def login_to_lifetime(username, password):
    """Login to Lifetime Fitness and return authentication tokens"""
    try:
        response = session.post(
            "https://api.lifetimefitness.com/auth/v2/login",
            headers=default_headers,
            json={"username": username, "password": password},
            timeout=3
        )
        
        if response.status_code == 200:
            result = response.json()
            logger.info("✅ Authentication successful")
            return result
        logger.error(f"❌ Login failed with status: {response.status_code}")
        return None

    except Exception as e:
        logger.error(f"❌ Login error: {str(e)}")
        return None

def create_reservation(token, sso, event_id, member_id):
    """Create a reservation for the class"""
    try:
        # Check if this member has already successfully registered
        if (event_id, member_id) in successful_registrations:
            logger.info(f"✅ Member {member_id} already registered for event {event_id}")
            return None
            
        headers = default_headers.copy()
        headers["x-ltf-profile"] = token
        headers["x-ltf-ssoid"] = sso
        
        # Single attempt with a reasonable timeout
        response = session.post(
            "https://api.lifetimefitness.com/sys/registrations/V3/ux/event",
            headers=headers,
            json={"eventId": event_id, "memberId": [member_id]},
            timeout=3  # Reduced from 5s to 3s
        )
        
        if response.status_code == 200:
            result = response.json()
            reg_id = result.get("regId")
            if reg_id:
                logger.info(f"✅ Created registration with ID: {reg_id}")
                successful_registrations.add((event_id, member_id))
                return reg_id
        logger.error(f"❌ Failed to create registration: {response.status_code}")
        return None
            
    except Exception as e:
        logger.error(f"❌ Create reservation error: {str(e)}")
        return None

def complete_reservation(token, sso, reg_id, member_id):
    """Complete the reservation"""
    try:
        headers = default_headers.copy()
        headers["x-ltf-profile"] = token
        headers["x-ltf-ssoid"] = sso
        
        # Single attempt with a reasonable timeout
        response = session.put(
            f"https://api.lifetimefitness.com/sys/registrations/V3/ux/event/{reg_id}/complete",
            headers=headers,
            json={"memberId": [member_id], "acceptedDocuments": [60]},
            timeout=3  # Reduced from 5s to 3s
        )
        
        if response.status_code == 200:
            logger.info("✅ Successfully completed registration")
            return True
        logger.error(f"❌ Failed to complete registration: {response.status_code}")
        return False
        
    except Exception as e:
        logger.error(f"❌ Complete reservation error: {str(e)}")
        return False

@app.route('/run-bot', methods=['POST'])
def run_bot():
    """Main function to run the bot"""
    try:
        # Get data from request payload
        payload = request.get_json()
        if not payload:
            logger.error("❌ No payload received")
            return jsonify({"status": "error", "message": "No payload received"}), 400
            
        # Extract required information from payload
        date = payload.get('date')
        title = payload.get('title')
        location = payload.get('location')
        min_start_time = payload.get('min_start_time')
        username = payload.get('lifetime_username')
        password = payload.get('lifetime_password')
        member_id = payload.get('member_id')
        
        # Validate required fields
        required_fields = {
            'date': date,
            'title': title,
            'location': location,
            'min_start_time': min_start_time,
            'lifetime_username': username,
            'lifetime_password': password,
            'member_id': member_id
        }
        
        missing_fields = [field for field, value in required_fields.items() if not value]
        if missing_fields:
            error_msg = f"Missing required fields: {', '.join(missing_fields)}"
            logger.error(f"❌ {error_msg}")
            return jsonify({"status": "error", "message": error_msg}), 400
            
        logger.info(f"🎯 Target class: {title} at {min_start_time} on {date} in {location}")
        
        # Find the event ID
        event_id = find_event_id(date, title, location, min_start_time)
        
        if not event_id:
            error_msg = "Could not find event ID"
            logger.error(f"❌ {error_msg}")
            return jsonify({"status": "error", "message": error_msg}), 404
            
        logger.info(f"✅ Found event ID: {event_id}")
        
        # Login to get tokens
        logger.info("Logging in to Lifetime...")
        auth_result = login_to_lifetime(username, password)
        if not auth_result:
            error_msg = "Login failed"
            logger.error(f"❌ {error_msg}")
            return jsonify({"status": "error", "message": error_msg}), 401
            
        token = auth_result["token"]
        sso = auth_result["ssoId"]
        
        # Calculate target datetime (class start time)
        try:
            # First try to parse as 24-hour format
            try:
                time_obj = datetime.strptime(min_start_time, "%H:%M").time()
                # Convert to 12-hour format with AM/PM
                min_start_time = time_obj.strftime("%I:%M %p")
            except ValueError:
                # If that fails, assume it's already in 12-hour format
                pass

            # Now parse in 12-hour format
            time_obj = datetime.strptime(min_start_time, "%I:%M %p").time()
            
            # Create datetime for the class start time
            target_date = datetime.strptime(date, "%Y-%m-%d")
            class_start_time = datetime.combine(target_date, time_obj)
            
            # Convert class start time to UTC (EDT is UTC-4)
            class_start_time_utc = class_start_time + timedelta(hours=4)
            
            # Calculate session open time in UTC (7 days and 22 hours before class start)
            session_open_time_utc = class_start_time_utc - timedelta(days=7, hours=22)
            
            # Add 1 second buffer to ensure we're past the exact time
            booking_time_utc = session_open_time_utc + timedelta(seconds=1)
            
            # Log the timing details in UTC
            logger.info(f"⏰ Timing Details (UTC):")
            logger.info(f"  Current time: {datetime.now().strftime('%Y-%m-%d %I:%M:%S %p')}")
            logger.info(f"  Class starts at (UTC): {class_start_time_utc.strftime('%Y-%m-%d %I:%M:%S %p')}")
            logger.info(f"  Session opens at (UTC): {session_open_time_utc.strftime('%Y-%m-%d %I:%M:%S %p')}")
            logger.info(f"  Will book at (UTC): {booking_time_utc.strftime('%Y-%m-%d %I:%M:%S %p')}")
            
            # Convert back to EDT for display
            session_open_time_edt = session_open_time_utc - timedelta(hours=4)
            booking_time_edt = booking_time_utc - timedelta(hours=4)
            logger.info(f"\n⏰ Timing Details (EDT):")
            logger.info(f"  Session opens at (EDT): {session_open_time_edt.strftime('%Y-%m-%d %I:%M:%S %p')}")
            logger.info(f"  Will book at (EDT): {booking_time_edt.strftime('%Y-%m-%d %I:%M:%S %p')}")
            
            # Wait until booking time in UTC
            logger.info(f"⏰ Waiting until {booking_time_utc.strftime('%Y-%m-%d %I:%M:%S %p')} UTC...")
            pause.until(booking_time_utc)
            
            logger.info("🎯 Executing booking...")
            booking_start_time = datetime.now()
            
            # Create reservation
            reg_id = create_reservation(token, sso, event_id, member_id)
            if not reg_id:
                error_msg = "Failed to create reservation"
                logger.error(f"❌ {error_msg}")
                return jsonify({"status": "error", "message": error_msg}), 400
                
            # Complete reservation
            if complete_reservation(token, sso, reg_id, member_id):
                end_time = datetime.now()
                duration = (end_time - booking_start_time).total_seconds()
                logger.info(f"✅ Booking completed successfully in {duration:.3f} seconds")
                return jsonify({
                    "status": "success",
                    "message": "Booking completed",
                    "event_id": event_id,
                    "registration_id": reg_id,
                    "duration": duration
                }), 200
            else:
                error_msg = "Failed to complete reservation"
                logger.error(f"❌ {error_msg}")
                return jsonify({"status": "error", "message": error_msg}), 400
                
        except ValueError as e:
            error_msg = f"Invalid time format: {str(e)}"
            logger.error(f"❌ {error_msg}")
            return jsonify({"status": "error", "message": error_msg}), 400
        
    except Exception as e:
        error_msg = f"Error in run_bot: {str(e)}"
        logger.error(f"❌ {error_msg}")
        logger.exception("Full traceback:")
        return jsonify({"status": "error", "message": error_msg}), 500

# Test the function
if __name__ == '__main__':
    # Test case
    test_date = "2025-04-28"
    test_title = "Pickleball Open Play: 4.0+ DUPR Optional"
    test_location = "Indoor Pickleball Courts"
    test_time = "11:30 AM"
    
    print("Testing find_event_id function...")
    event_id = find_event_id(test_date, test_title, test_location, test_time)
    if event_id:
        print(f"✅ Found event ID: {event_id}")
    else:
        print("❌ No matching event found")

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)

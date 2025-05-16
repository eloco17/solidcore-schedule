import json
from datetime import datetime, timedelta
import calendar
import os

# Load the original schedule
with open('solidcore_schedule.json', 'r') as f:
    data = json.load(f)

# 1. Extract all classes from the week of 5/18–5/24 (inclusive)
TEMPLATE_MONTH = 5
TEMPLATE_START_DAY = 18
TEMPLATE_END_DAY = 24
TEMPLATE_YEAR = datetime.today().year

template_classes_by_weekday = {i: [] for i in range(7)}
for item in data:
    date_str = item['date']
    try:
        dt = datetime.strptime(date_str, '%m/%d')
        dt = dt.replace(year=TEMPLATE_YEAR)
    except ValueError:
        try:
            dt = datetime.strptime(date_str, '%Y-%m-%d')
        except ValueError:
            continue
    if dt.month == TEMPLATE_MONTH and TEMPLATE_START_DAY <= dt.day <= TEMPLATE_END_DAY:
        weekday = dt.weekday()
        template_classes_by_weekday[weekday].append(item)

# 2. For each week in the next month, for each day, if that day matches a weekday in the template week, copy all classes from that weekday
now = datetime.today()
if now.month == 12:
    next_month = 1
    next_year = now.year + 1
else:
    next_month = now.month + 1
    next_year = now.year

_, last_day = calendar.monthrange(next_year, next_month)
dates_in_next_month = [datetime(next_year, next_month, day) for day in range(1, last_day+1)]

predicted = []
for dt in dates_in_next_month:
    weekday = dt.weekday()
    for orig in template_classes_by_weekday.get(weekday, []):
        new_item = orig.copy()
        new_item['date'] = dt.strftime('%m/%d')  # MM/DD format
        new_item['status'] = 'predicted'
        predicted.append(new_item)

# Remove all classes with 'Off-Peak' in their name
predicted = [item for item in predicted if 'Off-Peak' not in item.get('name', '')]

# Only allow these times for each day (from html_look.py output)
allowed_times = {
    'Sunday': ['1:15pm - 2:05pm (50 min)', '3:00pm - 3:50pm (50 min)', '3:15pm - 4:05pm (50 min)', '5:15pm - 6:05pm (50 min)', '6:15pm - 7:05pm (50 min)', '7:15pm - 8:05pm (50 min)', '8:15pm - 9:05pm (50 min)'],
    'Monday': ['7:05am - 7:55am (50 min)', '8:05am - 8:55am (50 min)', '9:05am - 9:55am (50 min)', '10:05am - 10:55am (50 min)', '10:15am - 11:05am (50 min)', '11:05am - 11:55am (50 min)', '11:15am - 12:05pm (50 min)'],
    'Tuesday': ['6:05am - 6:55am (50 min)', '6:15am - 7:05am (50 min)', '7:05am - 7:55am (50 min)', '7:15am - 8:05am (50 min)', '8:05am - 8:55am (50 min)', '8:15am - 9:05am (50 min)', '11:15am - 12:05pm (50 min)', '1:05pm - 1:55pm (50 min)', '2:15pm - 3:05pm (50 min)', '3:15pm - 4:05pm (50 min)', '5:15pm - 6:05pm (50 min)', '5:30pm - 6:20pm (50 min)', '6:15pm - 7:05pm (50 min)', '6:30pm - 7:20pm (50 min)', '7:15pm - 8:05pm (50 min)', '7:30pm - 8:20pm (50 min)', '8:30pm - 9:20pm (50 min)', '9:15pm - 10:05pm (50 min)', '10:15pm - 11:05pm (50 min)'],
    'Wednesday': ['6:05am - 6:55am (50 min)', '6:15am - 7:05am (50 min)', '7:05am - 7:55am (50 min)', '7:15am - 8:05am (50 min)', '8:05am - 8:55am (50 min)', '8:15am - 9:05am (50 min)', '10:15am - 11:05am (50 min)', '2:15pm - 3:05pm (50 min)', '3:15pm - 4:05pm (50 min)', '5:15pm - 6:05pm (50 min)', '5:30pm - 6:20pm (50 min)', '6:15pm - 7:05pm (50 min)', '6:30pm - 7:20pm (50 min)', '7:15pm - 8:05pm (50 min)', '7:30pm - 8:20pm (50 min)'],
    'Thursday': ['6:05am - 6:55am (50 min)', '6:15am - 7:05am (50 min)', '7:05am - 7:55am (50 min)', '7:15am - 8:05am (50 min)', '8:05am - 8:55am (50 min)', '8:15am - 9:05am (50 min)', '12:15pm - 12:45pm (30 min)', '3:15pm - 4:05pm (50 min)', '5:15pm - 6:05pm (50 min)', '5:30pm - 6:20pm (50 min)', '6:15pm - 7:05pm (50 min)', '6:30pm - 7:20pm (50 min)', '7:15pm - 8:05pm (50 min)', '7:30pm - 8:20pm (50 min)', '9:15pm - 10:05pm (50 min)'],
    'Friday': ['6:15am - 7:05am (50 min)', '7:05am - 7:55am (50 min)', '7:15am - 8:05am (50 min)', '8:05am - 8:55am (50 min)', '8:15am - 9:05am (50 min)', '9:05am - 9:55am (50 min)', '1:05pm - 1:55pm (50 min)', '3:15pm - 4:05pm (50 min)', '5:30pm - 6:20pm (50 min)', '8:15pm - 9:05pm (50 min)'],
    'Saturday': ['6:35am - 7:05am (30 min)', '7:45am - 8:50am (65 min)', '8:15am - 9:05am (50 min)', '10:00am - 10:50am (50 min)', '10:15am - 11:05am (50 min)', '11:00am - 11:50am (50 min)', '11:15am - 12:05pm (50 min)', '12:00pm - 12:50pm (50 min)', '2:15pm - 3:05pm (50 min)', '3:15pm - 4:05pm (50 min)']
}
weekday_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday','Sunday']



# Filter the predicted classes
filtered_predicted = []
for item in predicted:
    # Parse the date to get the weekday
    try:
        dt = datetime.strptime(item['date'], '%m/%d')
    except Exception:
        continue
    weekday = dt.weekday()  # Monday=0, Sunday=6
    weekday_name = weekday_names[weekday]
    if item.get('time') in allowed_times.get(weekday_name, []):
        filtered_predicted.append(item)
    else:
        # Debug: Print out why a class is being filtered out
        print(f"Filtered out: {weekday_name} {item.get('date')} {item.get('time')}")
predicted = filtered_predicted

# 3. Save to public/predicted_next_month_schedule.json
output_path = os.path.join('public', 'predicted_next_month_schedule.json')
with open(output_path, 'w') as f:
    json.dump(predicted, f, indent=2)

print(f"Generated {len(predicted)} predicted classes. Output: {output_path}") 
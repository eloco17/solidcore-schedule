from bs4 import BeautifulSoup
import re

# Load the HTML content (assumed to be saved as a variable called html_content)
with open("solidcore_schedule.html", "r", encoding="utf-8") as file:
    html_content = file.read()

soup = BeautifulSoup(html_content, "html.parser")

# Dictionary to hold the results
results = {}

# Iterate over each schedule-day block
for day_block in soup.select(".schedule-day"):
    # Get day header
    header = day_block.select_one(".schedule-day-header")
    if not header:
        continue
    day = header.get_text(strip=True)

    # Find classes where "class-status" contains "0 of"
    full_classes = []
    for class_item in day_block.select(".class"):
        status = class_item.select_one(".class-status")
        time_div = class_item.select_one(".class-time")
        if status and time_div and "0 of" in status.get_text():
            full_classes.append(time_div.get_text(strip=True))

    if full_classes:
        results[day] = full_classes

print(results)

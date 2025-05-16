import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import json

def fetch_solidcore_schedule(slug="chelsea", date="2025-05-25"):
    url = "https://solidcore.co/assets/ajax/addMoreClassesStaticGrid.php"
    headers = {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent": "Mozilla/5.0",
        "X-Requested-With": "XMLHttpRequest",
        "Origin": "https://solidcore.co",
        "Referer": f"https://solidcore.co/ny/new-york/{slug}/schedule/"
    }
    payload = {
        "slug": slug,
        "dateChange": date
    }

    response = requests.post(url, headers=headers, data=payload)
    response.raise_for_status()
    data = response.json()
    return data.get("finalData", "")  # Extract HTML from the JSON response

def get_next_sunday_or_today():
    today = datetime.today()
    # If today is Sunday, use today; otherwise, go to next Sunday
    return today if today.weekday() == 6 else today + timedelta(days=(6 - today.weekday()))

def parse_classes(html):
    soup = BeautifulSoup(html, "html.parser")
    results = []

    for day in soup.select(".schedule-day"):
        date_tag = day.select_one(".schedule-day-header-date")
        date_str = date_tag.text.strip() if date_tag else "Unknown"

        for li in day.select("ul.classes > li"):
            name_tag = li.select_one("h4.class-name")
            time_tag = li.select_one("div.class-time")
            teacher_tag = li.select_one("div.class-teacher")
            status_tag = li.select_one("div.class-status")

            results.append({
                "date": date_str,
                "name": name_tag.text.strip() if name_tag else "",
                "time": time_tag.text.strip() if time_tag else "",
                "teacher": teacher_tag.text.strip() if teacher_tag else "",
                "status": status_tag.text.strip() if status_tag else ""
            })

    return results

def get_next_sundays(start_date, weeks=5):
    # Only get dates within the current month
    current_month = start_date.month
    dates = []
    current_date = start_date
    
    while len(dates) < weeks and current_date.month == current_month:
        dates.append(current_date)
        current_date += timedelta(weeks=1)
    
    return dates

if __name__ == "__main__":
    date = get_next_sunday_or_today()
    all_data = []

    for _ in range(5):  # Try up to 5 weeks ahead
        date_str = date.strftime("%Y-%m-%d")
        print(f"📆 Fetching week: {date_str}")
        try:
            html = fetch_solidcore_schedule(date=date_str)
            if not html:  # If no HTML content returned
                print("🛑 No data returned — stopping.")
                break
                
            with open(f"raw_{date_str}.html", "w", encoding="utf-8") as f:
                f.write(html)
            week_data = parse_classes(html)

            if not week_data:
                print("🛑 No classes found — stopping.")
                break

            all_data.extend(week_data)
            print(f"✅ Found {len(week_data)} classes for {date_str}")
        except requests.HTTPError as e:
            print(f"❌ Error for {date_str}: {e}")
            break
        except Exception as e:
            print(f"❌ Unexpected error for {date_str}: {e}")
            break

        date += timedelta(weeks=1)

    with open("solidcore_schedule.json", "w") as f:
        json.dump(all_data, f, indent=2)

    # Also save to public/solidcore_schedule.json for frontend use
    try:
        with open("public/solidcore_schedule.json", "w") as f:
            json.dump(all_data, f, indent=2)
        print("✅ Also saved to public/solidcore_schedule.json")
    except Exception as e:
        print(f"❌ Could not save to public/solidcore_schedule.json: {e}")

    print(f"✅ Total classes scraped: {len(all_data)}")


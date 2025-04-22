import time
import pickle  # Save/load cookies
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from datetime import datetime, timedelta
import json
import os

# ✅ CORRECTED Chrome Options (No Overwrites)
chrome_options = webdriver.ChromeOptions()
chrome_options.add_argument('--headless')
chrome_options.add_argument('--no-sandbox')
chrome_options.add_argument("--window-size=1920,1080")
chrome_options.add_argument('--start-maximized')
chrome_options.add_argument('--disable-gpu')
chrome_options.add_argument("--disable-extensions")
chrome_options.add_argument('disable-infobars')

# Try to load parameters from file
params_file = "/home/el3152/bot_params.json"
try:
    if os.path.exists(params_file):
        with open(params_file, 'r') as f:
            params = json.load(f)
        desired_score = params.get('desired_score', "4.0-4.5")
        min_start_time = params.get('min_start_time', "4:00 PM")
        print(f"✅ Loaded parameters from file: desired_score={desired_score}, min_start_time={min_start_time}")
    else:
        # Default values if file doesn't exist
        desired_score = "4.0-4.5"  # Default skill level
        min_start_time = "4:00 PM"  # Default start time
        print(f"⚠️ No parameters file found, using defaults: desired_score={desired_score}, min_start_time={min_start_time}")
except Exception as e:
    print(f"⚠️ Error loading parameters: {e}")
    # Default values if there's an error
    desired_score = "4.0-4.5"  # Default skill level
    min_start_time = "4:00 PM"  # Default start time

# ✅ CORRECTED CHROMEDRIVER PATH
chrome_driver_path = "/usr/bin/chromedriver"  # Ensure correct path
service = Service(chrome_driver_path)

# ✅ CORRECTED DRIVER INITIALIZATION
driver = webdriver.Chrome(service=service, options=chrome_options)
wait = WebDriverWait(driver, 3, poll_frequency=0.1)  # ✅ Smaller poll frequency

# Rest of your script remains the same...


#!/bin/bash

# Set the timezone to Eastern Time (ET)
export TZ="America/New_York"

echo "📌 Current time: $(date +'%H:%M')"

# Download parameters from Cloud Storage
echo "🔄 Downloading parameters..."
/usr/bin/python3 /home/el3152/download_params.py

# 🚀 Run the first script immediately
echo "🚀 Running first script at $(date +'%H:%M')"
/usr/bin/python3 /home/el3152/LT_bot_new8.py

# ⏳ Wait for 2 minutes (120 seconds)
echo "⏳ Waiting 2 minutes before running the second script..."
sleep 120

# 🚀 Run the second script after waiting
echo "🚀 Running second script at $(date +'%H:%M')"
/usr/bin/python3 /home/el3152/LT_bot10.py

echo "✅ All tasks completed!"


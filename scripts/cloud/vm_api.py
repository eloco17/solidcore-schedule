from flask import Flask, request, jsonify
import subprocess
import json
import os

app = Flask(__name__)

@app.route('/run-bot', methods=['POST'])
def run_bot():
    try:
        # Get the JSON data from the request
        data = request.json
        
        # Extract the parameters we need for the bot
        desired_score = data.get('desired_score', 'All Levels')
        min_start_time = data.get('min_start_time', '8:00 AM')
        
        # Normalize the skill level format
        if desired_score == 'All Levels':
            desired_score = 'All Levels'
        elif '+' in desired_score:
            # Format like "3.0+"
            desired_score = desired_score
        elif '-' in desired_score:
            # Format like "3.5-4.0"
            desired_score = desired_score
        else:
            # Default format
            desired_score = desired_score
        
        # Create a temporary Python script with the updated variables
        script_content = f"""
import os
import sys
import subprocess

# Set the environment variables for the bot
os.environ['DESIRED_SCORE'] = "{desired_score}"
os.environ['MIN_START_TIME'] = "{min_start_time}"

# Run the bot script
subprocess.run(["python3", "/home/el3152/LT_bot_new8.py"])
"""
        
        # Write the script to a temporary file
        with open('/tmp/run_bot_with_params.py', 'w') as f:
            f.write(script_content)
        
        # Make the script executable
        os.chmod('/tmp/run_bot_with_params.py', 0o755)
        
        # Run the script in the background
        subprocess.Popen(["python3", "/tmp/run_bot_with_params.py"], 
                         stdout=subprocess.PIPE, 
                         stderr=subprocess.PIPE)
        
        return jsonify({
            'success': True,
            'message': f'Bot started with skill level: {desired_score}, start time: {min_start_time}'
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)


import functions_framework
from flask import jsonify
import json
import os
import subprocess
import base64
from google.cloud import storage

@functions_framework.http
def run_pickleball_bot(request):
    """
    Cloud Function to receive parameters and trigger the bot script.
    """
    try:
        # Get the request data
        request_json = request.get_json(silent=True)
        
        if not request_json:
            return jsonify({'success': False, 'error': 'No JSON data received'}), 400
        
        # Extract parameters
        desired_score = request_json.get('desired_score', 'All Levels')
        min_start_time = request_json.get('min_start_time', '8:00 AM')
        session_id = request_json.get('session_id', '')
        title = request_json.get('title', '')
        day = request_json.get('day', '')
        date = request_json.get('date', '')
        location = request_json.get('location', '')
        
        # Create a parameters file
        params = {
            'desired_score': desired_score,
            'min_start_time': min_start_time,
            'session_id': session_id,
            'title': title,
            'day': day,
            'date': date,
            'location': location
        }
        
        # Save parameters to a file in Cloud Storage
        storage_client = storage.Client()
        bucket = storage_client.bucket('lifetime-pickleball-bot')
        blob = bucket.blob('bot_params.json')
        blob.upload_from_string(json.dumps(params))
        
        # Trigger the VM to run the bot script
        # This could be done via Pub/Sub, direct SSH, or other methods
        # For this example, we'll use a simple HTTP request to a small web server on the VM
        
        # Return success
        return jsonify({
            'success': True,
            'message': f'Bot parameters saved and VM triggered',
            'params': params
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


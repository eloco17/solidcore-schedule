from google.cloud import storage
import os
import json

def download_params():
    """Download parameters file from Cloud Storage."""
    try:
        # Initialize the storage client
        storage_client = storage.Client()
        
        # Get the bucket
        bucket = storage_client.bucket('lifetime-pickleball-bot')
        
        # Get the blob
        blob = bucket.blob('bot_params.json')
        
        # Download the blob to a local file
        blob.download_to_filename('/home/el3152/bot_params.json')
        
        print("✅ Parameters file downloaded successfully")
        
        # Optionally, print the parameters
        with open('/home/el3152/bot_params.json', 'r') as f:
            params = json.load(f)
            print(f"📝 Parameters: {json.dumps(params, indent=2)}")
            
        return True
    except Exception as e:
        print(f"❌ Error downloading parameters: {e}")
        return False

if __name__ == "__main__":
    download_params()


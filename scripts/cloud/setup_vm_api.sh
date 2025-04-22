#!/bin/bash

# Install required packages
sudo apt-get update
sudo apt-get install -y python3-pip

# Install Flask and other dependencies
pip3 install flask gunicorn

# Create a systemd service file for the API
cat > /tmp/bot-api.service << EOL
[Unit]
Description=Pickleball Bot API
After=network.target

[Service]
User=$(whoami)
WorkingDirectory=$(pwd)
ExecStart=$(which gunicorn) --bind 0.0.0.0:8080 vm_api:app
Restart=always

[Install]
WantedBy=multi-user.target
EOL

# Move the service file to the systemd directory
sudo mv /tmp/bot-api.service /etc/systemd/system/

# Reload systemd, enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable bot-api
sudo systemctl start bot-api

# Check the status
sudo systemctl status bot-api

echo "API setup complete! It should be running on port 8080."
echo "Make sure to open this port in your GCP firewall rules."


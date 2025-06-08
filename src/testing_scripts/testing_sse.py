import requests
from sseclient import SSEClient
import json
import sys
from termcolor import colored
from datetime import datetime

def pretty_print_json(data):
    """Pretty print JSON data"""
    return json.dumps(data, indent=4)

def log_with_timestamp(message, color='white'):
    """Log messages with timestamp and optional color"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(colored(f"[{timestamp}] {message}", color))

def test_sse_endpoint(url, token, body):
    """
    Test an SSE endpoint by sending a POST request and streaming the response.
    
    Args:
        url (str): The endpoint URL (e.g., 'http://localhost:3000/askAI').
        token (str): Bearer token for Authorization header.
        body (dict): JSON body with userMessage, url, and context.
    """
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    try:
        # Send POST request and stream the response
        response = requests.post(url, json=body, headers=headers, stream=True)

        # Check if the request was successful
        if response.status_code != 200:
            log_with_timestamp(f"Error: Request failed with status {response.status_code}: {response.text}", 'red')
            return

        # Verify SSE content type
        if response.headers.get("Content-Type") != "text/event-stream":
            log_with_timestamp(f"Error: Expected Content-Type 'text/event-stream', got '{response.headers.get('Content-Type')}'", 'red')
            return

        # Parse SSE stream
        client = SSEClient(response)
        log_with_timestamp("Connected to SSE stream. Receiving events...\n", 'green')

        streamEvent = False
        for event in client.events():
            # Skip empty events
            if not event.event and not event.data:
                continue

            # Parse event data
            try:
                data = json.loads(event.data) if event.data else {}
            except json.JSONDecodeError:
                data = event.data  # Fallback to raw data if not JSON

            # Log event details in a cleaner way
            if(event.event != "stream"):
                log_with_timestamp(f"Event: {event.event or 'message'}", 'cyan')
                log_with_timestamp(f"Data: {pretty_print_json(data)}", 'yellow')
                log_with_timestamp(f"ID: {event.id or 'N/A'}", 'magenta')
                print("-" * 50)
            else:
                if not streamEvent:
                    streamEvent = True
                    log_with_timestamp(f"Update: Response Stream Started, User will start getting response from this point of time", 'green')

            # Stop on complete or error events
            if event.event in ["complete", "error"]:
                log_with_timestamp("Stream ended.", 'red')
                break

    except requests.exceptions.RequestException as e:
        log_with_timestamp(f"Connection error: {e}", 'red')
    except Exception as e:
        log_with_timestamp(f"Unexpected error: {e}", 'red')

if __name__ == "__main__":
    # Configuration
    ENDPOINT_URL = "http://localhost:3000/askAI"
    BEARER_TOKEN = "eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDExMUFBQSIsImtpZCI6Imluc18ydjltNlhLd3dja2plSXBBVFM2Sm9jREUzMG8iLCJ0eXAiOiJKV1QifQ.eyJleHAiOjIwNjQ3NTg5OTIsImZ2YSI6Wzk5OTk5LC0xXSwiaWF0IjoxNzQ5Mzk4OTkyLCJpc3MiOiJodHRwczovL21lYXN1cmVkLW1vbmtleS0zNS5jbGVyay5hY2NvdW50cy5kZXYiLCJuYmYiOjE3NDkzOTg5ODIsInNpZCI6InNlc3NfMnlFVHhBTnhUcHRCeFV2cVN2Z3pDNW51SUQyIiwic3ViIjoidXNlcl8yeUVRYzVYNGJXM1VselRCcTE1Mk45OGo0ZTIifQ.qAW-wRxLtyOGdQ94tmxXqhdTRCi6qgyXJ5gGASlYbWLYX1SA_Lutr__uX6d6wyzE3LgTQBd-tXD9W2RFcTe5sdsA4A6Hz1Zdfkp80XFx2M-o63nDZaKYDqGCJkBNkH_EerMsFjcvGJ1Kc4NPqqd8qagOmSgdTdPWvddnF955egzLXxPHRzV0xsnNCZlKE3tZeJD5J9-beF6KoSulVbUzuM3-B5GzJ6-t1HeYusObWvhPceGw7xcMTBrIMjR4VP2UuuxKA5Fvf4su39HYekfx20Skac6efzV9BLi_TAcdRA7xPIknKHij19K92kX7Vw4eSBvva7u16xm7iywK271fHA"  # Replace with your actual token
    user_message = input("User Message: ")
    if(user_message.__len__() ==0):
       user_message = "Can you please give me a gist of this website?"
    REQUEST_BODY = {
        "userMessage": user_message,
        "url": "https://github.com/thomasdondorf/puppeteer-cluster",
        "context": """"""
    }
    # Run the test
    log_with_timestamp(f"Sending POST request to {ENDPOINT_URL}", 'blue')
    log_with_timestamp(f"Body: {pretty_print_json(REQUEST_BODY)}", 'green')
    log_with_timestamp(f"Authorization: Bearer {BEARER_TOKEN[:5]}... (truncated)", 'yellow')
    log_with_timestamp("---", 'grey')
    test_sse_endpoint(ENDPOINT_URL, BEARER_TOKEN, REQUEST_BODY)

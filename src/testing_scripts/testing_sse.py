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

        for event in client.events():
            flagged = False 
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
                if not flagged:
                    flagged = True
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
    BEARER_TOKEN = "eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDExMUFBQSIsImtpZCI6Imluc18ydjltNlhLd3dja2plSXBBVFM2Sm9jREUzMG8iLCJ0eXAiOiJKV1QifQ.eyJleHAiOjIwNjA0MTA0OTAsImZ2YSI6Wzk5OTk5LC0xXSwiaWF0IjoxNzQ1MDUwNDkwLCJpc3MiOiJodHRwczovL21lYXN1cmVkLW1vbmtleS0zNS5jbGVyay5hY2NvdW50cy5kZXYiLCJuYmYiOjE3NDUwNTA0ODAsInNpZCI6InNlc3NfMnZ3SzFYVnJIeUxabzM3YUJxbm5Rb2ZUMDJCIiwic3ViIjoidXNlcl8ydndKcUtEUnloZXdCakJTdUFySUw2V1hCbTEifQ.HY2h1hX9BTDY7vP2MqYMAzoKp8lMZNhYGpfV01mkuKhZ-WOtZ04tMzMftuUjpDOSFVtoeECbvEawidHfaV53PfeLQ8j_gni8tmxFj717UuQFzVTRSsu57IDe1Ed1V5vajeV4jrGaXbkFDMFW6nqlDwUWmbfZVXhXn4mTpDRrjYaCFgb2KmkaldROqKjYc2zSRPzLxyNvd_EFOhSsaw9fJ0LuQVpCfe_tbiJdk7sHw0JJj8fpBCQK7QkCYa3gnDolLKgIA5JjaIQFAM_6h_8QZKWGijDknrqg2MBD3rzsQXU7yX9a3eVVIAbzJ0DPUcEONb5O-RVGTupoIzithdv3FA"  # Replace with your actual token
    user_message = input("User Message: ")
    if(user_message.__len__() ==0):
       user_message = "Can you please give me a gist of this website?"
    REQUEST_BODY = {
        "userMessage": user_message,
        "url": "https://www.assemblyai.com/dashboard/account/pricing",
        "context": """Add credits to your account to unlock full API access, more capabilities, and dedicated support. With pay as you go, you'll get everything included in our free offering, plus:

        Streaming Speech-to-Text: Transcribe live audio streams with high accuracy and low latency
        LeMUR: Apply LLMs directly to voice data to get deeper insights from transcripts
        Unlimited transcriptions per month: Transcribe as many files as you need, with no restrictions
        Concurrency of up to 200 files: Process more files, faster. Contact us post-upgrade for even higher concurrency limits
        Transfer remaining credits: Any unused free credits will automatically transfer over to your balance"""
    }
    # Run the test
    log_with_timestamp(f"Sending POST request to {ENDPOINT_URL}", 'blue')
    log_with_timestamp(f"Body: {pretty_print_json(REQUEST_BODY)}", 'green')
    log_with_timestamp(f"Authorization: Bearer {BEARER_TOKEN[:5]}... (truncated)", 'yellow')
    log_with_timestamp("---", 'grey')
    test_sse_endpoint(ENDPOINT_URL, BEARER_TOKEN, REQUEST_BODY)

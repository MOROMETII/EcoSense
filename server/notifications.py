from flask import request
import requests

def send_push(token, title, body):
    url = "https://exp.host/--/api/v2/push/send"
    message = {
        "to": token,
        "title": title,
        "body": body,
        "sound": "default"
    }

    response = requests.post(url, json=message)
    return response.json()
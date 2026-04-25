from flask import request
import requests

from db import get_db

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

def get_user_tokens(username):
    db=get_db()
    cursor=db.execute("SELECT devices FROM users WHERE Username=?",(username,))

    result=cursor.fetchall()
    data=[]
    for row in result:
        if not row[0]:continue
        data.append(row[0])
    return data

def get_all_tokens():
    db=get_db()
    query = f"SELECT Username FROM users"
    cursor=db.execute(query)
    results=cursor.fetchall()
    usernames=[row[0]for row in results]
    tokenlist=[]
    for username in usernames:
        o=get_user_tokens(username)
        for _ in o:
            tokenlist+=_.split(":")
    # print(tokenlist)
    return tokenlist

def save_token(token, DeviceName, username):
    existing_tokens = get_user_tokens(username)
    new_token_entry = f"{DeviceName}:{token}"
    
    if existing_tokens:
        if isinstance(existing_tokens, list):
            for ltoks in existing_tokens:
                for etoks in ltoks.split(":"):
                    if etoks==token:return
            tokens_string = ','.join(existing_tokens) + ',' + new_token_entry
        else:
            for etoks in existing_tokens.split(":"):
                if etoks==token:return
            tokens_string = existing_tokens + ',' + new_token_entry
    else:
        tokens_string = new_token_entry
    
    db = get_db()
    cursor = db.execute(
        "UPDATE users SET devices = ? WHERE Username = ?",
        (tokens_string, username)
    )
    db.commit()
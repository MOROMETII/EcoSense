#!/bin/python3
from flask import Flask, render_template, request
import sqlite3
import hashlib
import requests

from users import *
from db import get_db
from notifications import send_push, save_token, get_all_tokens, get_user_tokens

app = Flask(__name__,
            template_folder="template",
            static_folder="static"
)

@app.route("/register",methods=["POST"])
def register():
    if request.method != "POST":
        return {"error": "Method Not Allowed"}, 405 

    # read data
    data=request.get_json()
    username=data.get("username")
    password=data.get("password")
    mail=data.get("mail")

    return register_new_user_endpoint(username,mail,password)

@app.route("/login",methods=["GET"])
def login():
    if request.method!="GET":
        return {"error": "Method Not Allowed"}, 405 
    
    username = request.args.get('username',None)
    password = request.args.get('password',None)
    mail = request.args.get('mail',None)

    if mail==None:
        return check_login_endpoint_username(username,password)
    else:
        return check_login_endpoint_mail(mail,password)

@app.route("/register-token", methods=['POST'])
def register_token():
    token = request.json.get("token")
    DeviceName = request.json.get("deviceName")
    username=request.json.get("username")
    print(DeviceName)
    save_token(token,DeviceName,username)
    return {"status": "ok"}

@app.route("/sendall", methods=['POST'])
def send():
    tokens=get_all_tokens()
    for token in tokens:
        send_push(token, "Hello", "Test notification")
    return {"status": "sent"}

@app.route("/logout",methods=["GET","POST"])
def logout():
    return {"status":"iesi afara frate"},200

@app.route("/")
def index():
    return render_template("index.html")

if __name__=="__main__":
    app.run(debug=True, port=6969)
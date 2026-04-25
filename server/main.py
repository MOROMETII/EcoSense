#!/bin/python3
from flask import Flask, render_template, request
import sqlite3
import hashlib

from users import *
from db import get_db

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

@app.route("/")
def index():
    return render_template("index.html")

if __name__=="__main__":
    get_db()
    app.run(debug=True, port=6969)
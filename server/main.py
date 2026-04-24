#!/bin/python3
from flask import Flask, render_template, request
import sqlite3
import hashlib

from db import get_db

app = Flask(__name__,
            template_folder="template",
            static_folder="static"
)

@app.route("/register",methods=['POST'])
def register():
    if request.method != "POST":
        return {"error": "Method Not Allowed"}, 405 

    # read data
    data=request.get_json()
    username=data.get("username")
    password=data.get("password")
    mail=data.get("mail")

    # check if data exists
    if username==None or mail==None or password==None:
        return {"error": "Missing required fields: username, password, and mail are required"}, 400

    hpassword=hashlib.sha256(password.encode()).hexdigest()
    
    # check data in database
    db=get_db()
    o=db.execute("SELECT * FROM users WHERE Username = ? AND Password = ?", (username,hpassword))
    user=o.fetchall()
    if user:
        return {"error": "User already exists!"}, 400

    db.execute("INSERT INTO users (Username, Password, Mail) VALUES (?, ?, ?)", (username, hpassword, mail))
    db.commit()
    
    # we are good to go
    return {"status": "Success"}, 200


@app.route("/")
def index():
    return render_template("index.html")

if __name__=="__main__":
    app.run(debug=True, port=6969)
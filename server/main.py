#!/bin/python3
from flask import Flask, render_template

app = Flask(__name__,template_folder='template')


@app.route('/hello')
def hello():
    return 'Hello, World!'

@app.route('/')
def index():
    return render_template('index.html')

if __name__=="__main__":
    app.run(debug=True, port=6969)
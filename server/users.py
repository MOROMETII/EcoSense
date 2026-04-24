import hashlib
from db import get_db

def register_new_user_endpoint(username,mail,password):
    # check if data exists
    if username==None or mail==None or password==None:
        return {"error": "Missing required fields: username, password, and/or mail are required"}, 400

    if len(password) < 6:
        return {"error": "Password must be at least 6 characters"}, 400

    hpassword=hashlib.sha256(password.encode()).hexdigest()
    
    # check data in database
    db=get_db()
    existing_user = db.execute(
        "SELECT * FROM users WHERE Username = ?", 
        (username,)
    ).fetchone()
    
    if existing_user:
        return {"error": "Username already exists!"}, 400
    
    # Check if email already exists
    existing_mail = db.execute(
        "SELECT * FROM users WHERE Mail = ?", 
        (mail,)
    ).fetchone()
    
    if existing_mail:
        return {"error": "Email already registered!"}, 400

    try:
        db.execute("INSERT INTO users (Username, Password, Mail) VALUES (?, ?, ?)", (username, hpassword, mail))
        db.commit()
        
        # we are good to go
        return {"status": "Success"}, 200
    except Exception as e:
        print(e)
        db.rollback()
        return {"error": f"Registration failed: {str(e)}"}, 500



def check_login_endpoint_username(username,password):
    if username==None or password==None:
        return {"error": "Missing required fields: username and/or password"}, 400
    
    hpassword=hashlib.sha256(password.encode()).hexdigest()

    db=get_db()
    o=db.execute("SELECT * FROM users WHERE Username = ? AND Password = ?", (username,hpassword))
    res=o.fetchall()
    if not res:
        return {"error": "User not found!"}, 400
    
    return {"status": "Success"}, 200

def check_login_endpoint_mail(mail,password):
    if mail==None or password==None:
        return {"error": "Missing required fields: username and/or password"}, 400
    
    hpassword=hashlib.sha256(password.encode()).hexdigest()

    db=get_db()
    o=db.execute("SELECT * FROM users WHERE Mail = ? AND Password = ?", (mail,hpassword))
    res=o.fetchall()
    if not res:
        return {"error": "User not found!"}, 400
    
    return {"status": "Success"}, 200
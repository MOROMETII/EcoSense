from flask import Blueprint, request
from services.auth_service import register_new_user, check_login
from services.push_service import delete_user_token

bp = Blueprint("auth", __name__)

@bp.route("/register", methods=["POST"])
def register():
    if request.method != "POST":
        return {"error": "Method Not Allowed"}, 405 
    
    data=request.get_json()
    username=data.get("username")
    password=data.get("password")
    mail=data.get("mail")

    return register_new_user(username,mail,password)

@bp.route("/login", methods=["GET"])
def login():
    username = request.args.get("username")
    mail = request.args.get("mail")
    password = request.args.get("password")

    if not password:
        return {"error": "password is required"}, 400

    if username:
        return check_login(username=username, password=password)
    elif mail:
        return check_login(mail=mail, password=password)
    else:
        return {"error": "username or mail is required"}, 400

#logout - delete row din devices cu tokenul respectiv, ca sa nu mai primesti notif pe tel dupa ce te-ai delogat
#cam redundant sa ceri si username, cand trimite jwt token, dar wtv
@bp.route("/logout", methods=["POST"])
def logout():
    data = request.get_json()
    if not data:
        return {"error": "Invalid JSON body"}, 400

    token = data.get("token")
    username = data.get("username")

    if not token or not username:
        return {"error": "token and username are required"}, 400

    delete_user_token(token, username)
    return {"status": "logged out"}, 200
from flask import Flask, jsonify, render_template
from routers import auth, building, tracking, predictions, notifications
#from inference import _load_artifacts

from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__,
            template_folder="template",
            static_folder="static"
)

app.register_blueprint(auth.bp)
app.register_blueprint(building.bp)
app.register_blueprint(tracking.bp)
#app.register_blueprint(predictions.bp)
app.register_blueprint(notifications.bp)

@app.route("/")
def index():
    return render_template("index.html")

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found."}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"error": "Method not allowed."}), 405

@app.errorhandler(500)
def internal_error(e):
    return jsonify({"error": "Internal server error.", "detail": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=6969)
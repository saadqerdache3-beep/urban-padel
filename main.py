"""
main.py — Point d'entrée Urban Padel
En local  : python main.py  (Flask dev server, port 5000)
En prod   : gunicorn main:app  (via Procfile / railway.json)
"""
import os
from app.api.server import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "1") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug, use_reloader=debug)

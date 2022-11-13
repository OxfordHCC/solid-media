from flask import Flask, request, jsonify
# from flask_ngrok import run_with_ngrok # uncomment to use ngrok
from flask_cors import CORS

import recommendation

app = Flask(__name__)
CORS(app)

# run_with_ngrok(app) # uncomment to use ngrok
  
@app.route("/", methods=['POST'])
def generate_recos():
    movies = request.get_json()
    res = recommendation.results(movies)
    print(res)
    return jsonify(res)
    
# app.run() 

if __name__=='__main__':
    app.run(port = 5000, debug = True)
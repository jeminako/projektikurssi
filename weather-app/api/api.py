from flask import Flask
import bs4 as bs
import requests

app = Flask(__name__)

source =  requests.get('https://agile-woodland-41168.herokuapp.com/ennusteet')

@app.route('/api', methods=['GET'])
def index():
    return source.json()

if __name__ == '__main__':
    app.run(debug=True)
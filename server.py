from flask import Flask, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)

PORT = 3001

# Helper to get database file path
def db_path(file):
    return os.path.join(os.path.dirname(__file__), 'db', file)

def read_json(file):
    with open(db_path(file), 'r', encoding='utf-8') as f:
        return json.load(f)

def write_json(file, data):
    with open(db_path(file), 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

# GET /api/knowledge - Knowledge base articles
@app.route('/api/knowledge', methods=['GET'])
def get_knowledge():
    return jsonify(read_json('knowledge.json'))

# GET /api/tenants - All tenants
@app.route('/api/tenants', methods=['GET'])
def get_tenants():
    return jsonify(read_json('tenants.json'))

# GET /api/tenants/:id - Single tenant
@app.route('/api/tenants/<tenant_id>', methods=['GET'])
def get_tenant(tenant_id):
    tenants = read_json('tenants.json')
    tenant = next((t for t in tenants if t['id'] == tenant_id), None)
    if not tenant:
        return jsonify({'error': 'Tenant not found'}), 404
    return jsonify(tenant)

# Health check
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    print(f'API server running at http://localhost:{PORT}')
    app.run(host='0.0.0.0', port=PORT, debug=True)


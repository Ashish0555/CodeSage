import os
os.environ['DATABASE_URL'] = 'sqlite:///./test.db'
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    response = client.get('/api/health')
    assert response.status_code == 200
    assert response.json()['ok'] is True

def test_auth_contract():
    response = client.post('/api/auth/register', json={'name':'Test','email':'test@example.com','password':'secret123'})
    assert response.status_code in (201, 409)
    if response.status_code == 201:
        assert 'token' in response.json()

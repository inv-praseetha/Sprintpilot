import requests

res = requests.post("http://127.0.0.1:8000/api/projects/", json={"project_id": "PRJ-001"})
print(res.status_code)
print(res.json())

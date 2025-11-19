import requests
import json

BASE_URL = "http://localhost:8001"

# Test query
print("Testing RAG query with detailed error...")
try:
    response = requests.post(
        f"{BASE_URL}/query",
        json={"query": "Apa itu Python?"}
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Answer: {result['answer']}")
        print(f"Sources: {len(result['sources'])} documents")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Exception: {e}")

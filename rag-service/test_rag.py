"""
Simple test script for RAG Service
Run: python test_rag.py
"""
import requests
import json

BASE_URL = "http://localhost:8001"

def test_health():
    print("Testing health endpoint...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}\n")

def test_ingest():
    print("Testing document ingestion...")
    doc = {
        "content": """
        Python adalah bahasa pemrograman tingkat tinggi yang populer.
        Python digunakan untuk web development, data science, AI, dan automation.
        FastAPI adalah framework web modern untuk Python yang sangat cepat.
        """,
        "metadata": {"topic": "programming", "language": "python"}
    }
    response = requests.post(f"{BASE_URL}/ingest", json=doc)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}\n")

def test_query():
    print("Testing RAG query...")
    query = {
        "query": "Apa itu Python dan untuk apa digunakan?"
    }
    response = requests.post(f"{BASE_URL}/query", json=query)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Answer: {result['answer']}")
    print(f"Sources: {len(result['sources'])} documents\n")

if __name__ == "__main__":
    try:
        test_health()
        test_ingest()
        test_query()
        print("All tests completed!")
    except Exception as e:
        print(f"Error: {e}")

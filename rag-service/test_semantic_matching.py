"""
Test script to verify semantic matching works for Q&A pairs
"""
from langchain_openai import OpenAIEmbeddings
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from dotenv import load_dotenv
import os

load_dotenv()

# Initialize embeddings
embeddings = OpenAIEmbeddings(
    model="text-embedding-3-large",
    openai_api_key=os.getenv("OPENAI_API_KEY")
)

# Original Q&A pair
original_question = "Apakah UT memiliki program pascasarjana?"
answer = """Universitas Terbuka (UT) memiliki program Pascasarjana (S2 & S3) melalui Sekolah Pascasarjana-nya programnya: 
Magister Manajemen (S2) 
Magister Ilmu Administrasi (Publik) 
Magister Hukum 
Doktor Ilmu Manajemen (S3) 
Doktor Administrasi Publik"""

# User's different question
user_question = "Adakah program magister di UT?"

# Create embeddings
print("Creating embeddings...")
original_q_embedding = embeddings.embed_query(original_question)
user_q_embedding = embeddings.embed_query(user_question)
answer_embedding = embeddings.embed_query(answer)

# Calculate similarities
similarity_q_to_q = cosine_similarity(
    [user_q_embedding], 
    [original_q_embedding]
)[0][0]

similarity_user_to_answer = cosine_similarity(
    [user_q_embedding], 
    [answer_embedding]
)[0][0]

# Display results
print("\n" + "="*70)
print("SEMANTIC SIMILARITY TEST")
print("="*70)
print(f"\nOriginal Question: {original_question}")
print(f"User Question: {user_question}")
print(f"\n{'Similarity Score':<40} {'Value':<10} {'Status'}")
print("-"*70)
print(f"{'User Q → Original Q':<40} {similarity_q_to_q:.4f}     {'✅ HIGH' if similarity_q_to_q > 0.7 else '⚠️ MEDIUM' if similarity_q_to_q > 0.5 else '❌ LOW'}")
print(f"{'User Q → Answer':<40} {similarity_user_to_answer:.4f}     {'✅ HIGH' if similarity_user_to_answer > 0.7 else '⚠️ MEDIUM' if similarity_user_to_answer > 0.5 else '❌ LOW'}")

print("\n" + "="*70)
print("CONCLUSION")
print("="*70)

if similarity_q_to_q > 0.6 or similarity_user_to_answer > 0.6:
    print("✅ SISTEM AKAN MENEMUKAN DATA Q&A INI!")
    print("   Pertanyaan user cukup mirip secara semantik.")
    print("   Data Q&A akan masuk dalam top results retrieval.")
else:
    print("⚠️ Similarity agak rendah, tapi masih bisa ditemukan dengan:")
    print("   - Hybrid search (BM25 keyword matching)")
    print("   - Query expansion")
    print("   - TOP_K yang cukup besar (20)")

print("\nNote: Threshold similarity untuk retrieval biasanya > 0.5")
print("="*70)

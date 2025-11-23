import mysql.connector
from config import settings

def check_data():
    try:
        conn = mysql.connector.connect(**settings.db_config)
        cursor = conn.cursor(dictionary=True)
        
        print("\n--- CHECKING DATA ---")
        
        # 1. Cek Total Pesan
        cursor.execute("SELECT COUNT(*) as total FROM chat_messages")
        total = cursor.fetchone()['total']
        print(f"Total Messages in DB: {total}")
        
        # 2. Cek 5 Pesan Terakhir (Tanggalnya)
        cursor.execute("SELECT id, role, created_at, content FROM chat_messages ORDER BY created_at DESC LIMIT 5")
        msgs = cursor.fetchall()
        print("\nLatest 5 Messages:")
        for m in msgs:
            print(f"- [{m['created_at']}] {m['role']}: {m['content'][:50]}...")
            
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_data()

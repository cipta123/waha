import mysql.connector

def check_data():
    db_config = {
        "host": "localhost",
        "port": 3306,
        "user": "root",
        "password": "",
        "database": "waha_rag_service"
    }

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        print("\n--- CHECKING DATA ---")
        
        # 1. Cek Total Pesan
        cursor.execute("SELECT COUNT(*) as total FROM chat_messages")
        total = cursor.fetchone()['total']
        print(f"Total Messages in DB: {total}")
        
        if total > 0:
            # 2. Cek 5 Pesan Terakhir (Tanggalnya)
            cursor.execute("SELECT id, role, created_at, content FROM chat_messages ORDER BY created_at DESC LIMIT 5")
            msgs = cursor.fetchall()
            print("\nLatest 5 Messages:")
            for m in msgs:
                print(f"- [{m['created_at']}] {m['role']}: {m['content'][:50]}...")
        else:
            print("Tabel chat_messages KOSONG.")
            
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_data()

import mysql.connector

def clear_data():
    db_config = {
        "host": "localhost",
        "port": 3306,
        "user": "root",
        "password": "",
        "database": "waha_rag_service"
    }

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        print("\n--- CLEARING DATABASE ---")
        
        # Matikan pengecekan Foreign Key agar bisa TRUNCATE
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
        
        # Kosongkan tabel pesan
        cursor.execute("TRUNCATE TABLE chat_messages")
        print("✅ Tabel 'chat_messages' berhasil dikosongkan.")
        
        # Kosongkan tabel sesi (opsional, tapi bagus biar bersih total)
        cursor.execute("TRUNCATE TABLE chat_sessions")
        print("✅ Tabel 'chat_sessions' berhasil dikosongkan.")
        
        # Hidupkan lagi Foreign Key checks
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
        
        conn.commit()
        cursor.close()
        conn.close()
        print("\nDatabase waha_rag_service sekarang BERSIH.")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    clear_data()

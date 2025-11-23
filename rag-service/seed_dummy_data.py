import mysql.connector
from datetime import datetime, timedelta
import random

def seed_data():
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
        
        print("\n--- SEEDING DUMMY DATA ---")
        
        users = ["628123456789@c.us", "628987654321@c.us", "62811223344@c.us"]
        agents = ["admin", "cs_budi", "cs_siti"]
        intents = ["greeting", "pricing", "technical_issue", "closing"]
        
        # Create sessions first
        for user in users:
            cursor.execute(
                "INSERT IGNORE INTO chat_sessions (user_id, status, last_active) VALUES (%s, 'ai', NOW())",
                (user,)
            )
        
        # Generate messages for the last 3 days
        for i in range(20):
            user = random.choice(users)
            days_ago = random.randint(0, 2)
            msg_time = datetime.now() - timedelta(days=days_ago, hours=random.randint(1, 10))
            
            # User message
            cursor.execute("""
                INSERT INTO chat_messages (user_id, role, content, created_at)
                VALUES (%s, 'user', 'Halo kak, mau tanya dong', %s)
            """, (user, msg_time))
            
            # Reply (AI or Human)
            msg_time += timedelta(seconds=random.randint(5, 120))
            is_ai = random.choice([True, False])
            
            if is_ai:
                cursor.execute("""
                    INSERT INTO chat_messages (user_id, role, content, intent, response_time, created_at)
                    VALUES (%s, 'assistant', 'Halo, ada yang bisa dibantu?', %s, %s, %s)
                """, (user, random.choice(intents), random.uniform(1.0, 5.0), msg_time))
            else:
                cursor.execute("""
                    INSERT INTO chat_messages (user_id, role, content, agent_id, created_at)
                    VALUES (%s, 'assistant', 'Halo, saya agen manusia.', %s, %s)
                """, (user, random.choice(agents), msg_time))
                
        conn.commit()
        cursor.close()
        conn.close()
        print("Inserted 20 dummy conversations.")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    seed_data()

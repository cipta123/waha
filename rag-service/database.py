import mysql.connector
from mysql.connector import Error
from config import settings
import json
from datetime import datetime

class Database:
    def __init__(self):
        self.config = {
            'host': settings.mysql_host,
            'port': settings.mysql_port,
            'user': settings.mysql_user,
            'password': settings.mysql_password,
            'database': settings.mysql_db
        }
        self.init_db()

    def get_connection(self):
        """Create a database connection"""
        # First try connecting without database to check if it exists
        try:
            if not self.config.get('database'):
                return mysql.connector.connect(
                    host=self.config['host'],
                    port=self.config['port'],
                    user=self.config['user'],
                    password=self.config['password']
                )
            
            return mysql.connector.connect(**self.config)
        except Error as e:
            # If database doesn't exist, try creating it
            if e.errno == 1049: # Unknown database
                print(f"Database {self.config['database']} not found. Creating it...")
                temp_config = self.config.copy()
                del temp_config['database']
                conn = mysql.connector.connect(**temp_config)
                cursor = conn.cursor()
                cursor.execute(f"CREATE DATABASE IF NOT EXISTS {self.config['database']}")
                cursor.close()
                conn.close()
                return mysql.connector.connect(**self.config)
            raise e

    def init_db(self):
        """Initialize database tables"""
        try:
            conn = self.get_connection()
            if conn.is_connected():
                cursor = conn.cursor()
                
                # Create sessions table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS chat_sessions (
                        user_id VARCHAR(255) PRIMARY KEY,
                        status ENUM('ai', 'human') DEFAULT 'ai',
                        last_active DATETIME,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        metadata JSON
                    )
                """)
                
                # Create messages table (for history)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS chat_messages (
                        id BIGINT AUTO_INCREMENT PRIMARY KEY,
                        user_id VARCHAR(255),
                        role ENUM('user', 'assistant', 'system'),
                        content TEXT,
                        intent VARCHAR(100),
                        response_time FLOAT,
                        agent_id VARCHAR(100),
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES chat_sessions(user_id),
                        INDEX idx_user_created (user_id, created_at)
                    )
                """)
                
                # Check if new columns exist (for existing tables)
                try:
                    cursor.execute("SHOW COLUMNS FROM chat_messages LIKE 'intent'")
                    if not cursor.fetchone():
                        cursor.execute("ALTER TABLE chat_messages ADD COLUMN intent VARCHAR(100)")
                        cursor.execute("ALTER TABLE chat_messages ADD COLUMN response_time FLOAT")
                    
                    cursor.execute("SHOW COLUMNS FROM chat_messages LIKE 'agent_id'")
                    if not cursor.fetchone():
                        cursor.execute("ALTER TABLE chat_messages ADD COLUMN agent_id VARCHAR(100)")
                except Exception as e:
                    print(f"Warning creating columns: {e}")

                conn.commit()
                cursor.close()
                conn.close()
                print("Database initialized successfully")
        except Error as e:
            print(f"Error initializing database: {e}")

    def get_analytics_summary(self, days: int = 7):
        """Get analytics data for dashboard"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 1. Total Chats per Day
            cursor.execute(f"""
                SELECT DATE(created_at) as date, COUNT(*) as count
                FROM chat_messages 
                WHERE role = 'user' 
                AND created_at >= DATE_SUB(NOW(), INTERVAL {days} DAY)
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            """)
            daily_chats = cursor.fetchall()
            
            # 2. AI vs Human Ratio
            cursor.execute(f"""
                SELECT 
                    COUNT(CASE WHEN role = 'assistant' AND agent_id IS NULL THEN 1 END) as ai_replies,
                    COUNT(CASE WHEN role = 'assistant' AND agent_id IS NOT NULL THEN 1 END) as human_replies
                FROM chat_messages
                WHERE role = 'assistant'
                AND created_at >= DATE_SUB(NOW(), INTERVAL {days} DAY)
            """)
            ratio = cursor.fetchone()
            
            # 3. Top Topics (Intents)
            cursor.execute(f"""
                SELECT intent, COUNT(*) as count
                FROM chat_messages
                WHERE intent IS NOT NULL AND intent != 'None'
                AND created_at >= DATE_SUB(NOW(), INTERVAL {days} DAY)
                GROUP BY intent
                ORDER BY count DESC
                LIMIT 5
            """)
            top_intents = cursor.fetchall()
            
            # 4. Average Response Time (AI)
            cursor.execute(f"""
                SELECT AVG(response_time) as avg_time
                FROM chat_messages
                WHERE response_time IS NOT NULL
                AND created_at >= DATE_SUB(NOW(), INTERVAL {days} DAY)
            """)
            avg_time = cursor.fetchone()

            # 5. Agent Performance
            cursor.execute(f"""
                SELECT agent_id, COUNT(*) as count
                FROM chat_messages
                WHERE role = 'assistant' AND agent_id IS NOT NULL
                AND created_at >= DATE_SUB(NOW(), INTERVAL {days} DAY)
                GROUP BY agent_id
                ORDER BY count DESC
            """)
            agent_performance = cursor.fetchall()
            
            cursor.close()
            conn.close()
            
            return {
                "daily_chats": daily_chats,
                "ratio": ratio,
                "top_intents": top_intents,
                "avg_response_time": avg_time['avg_time'] if avg_time else 0,
                "agent_performance": agent_performance
            }
        except Error as e:
            print(f"Analytics error: {e}")
            return {}

    def get_message_reports(self, start_date: str = None, end_date: str = None, agent_id: str = None, intent: str = None, search: str = None, limit: int = 50, offset: int = 0):
        """Get filtered message logs for reporting"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            query = "SELECT * FROM chat_messages WHERE 1=1"
            params = []
            
            if start_date:
                query += " AND created_at >= %s"
                params.append(start_date)
            if end_date:
                query += " AND created_at <= %s"
                # Append end of day time to include logs from that day
                params.append(f"{end_date} 23:59:59")
            
            if agent_id:
                if agent_id == 'ai':
                    query += " AND role = 'assistant' AND agent_id IS NULL"
                elif agent_id == 'human': # Any human
                    query += " AND agent_id IS NOT NULL"
                else:
                    query += " AND agent_id = %s"
                    params.append(agent_id)
            
            if intent:
                query += " AND intent LIKE %s"
                params.append(f"%{intent}%")
                
            if search:
                query += " AND content LIKE %s"
                params.append(f"%{search}%")
                
            # Count total for pagination
            count_query = query.replace("SELECT *", "SELECT COUNT(*) as total")
            cursor.execute(count_query, tuple(params))
            total = cursor.fetchone()['total']
            
            # Fetch data
            query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            
            cursor.execute(query, tuple(params))
            messages = cursor.fetchall()
            
            cursor.close()
            conn.close()
            
            return {
                "messages": messages,
                "total": total,
                "limit": limit,
                "offset": offset
            }
        except Error as e:
            print(f"Report error: {e}")
            return {"messages": [], "total": 0}

    def get_session(self, user_id: str):
        """Get or create session from database"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            cursor.execute("SELECT * FROM chat_sessions WHERE user_id = %s", (user_id,))
            session = cursor.fetchone()
            
            if not session:
                # Create new session
                now = datetime.now()
                cursor.execute(
                    "INSERT INTO chat_sessions (user_id, status, last_active, metadata) VALUES (%s, %s, %s, %s)",
                    (user_id, 'ai', now, '{}')
                )
                conn.commit()
                session = {
                    "user_id": user_id,
                    "status": "ai",
                    "last_active": now,
                    "metadata": {}
                }
            
            # Get history (last 10 messages)
            cursor.execute(
                "SELECT role, content, created_at FROM chat_messages WHERE user_id = %s ORDER BY created_at DESC LIMIT 10",
                (user_id,)
            )
            history = cursor.fetchall()
            # Reverse to chronological order (oldest first) for RAG context
            session["history"] = history[::-1]
            
            cursor.close()
            conn.close()
            return session
        except Error as e:
            print(f"Database error in get_session: {e}")
            # Fallback structure
            return {"user_id": user_id, "status": "ai", "last_active": datetime.now(), "history": []}

    def update_session(self, user_id: str, status: str = None):
        """Update session status and timestamp"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            now = datetime.now()
            if status:
                cursor.execute(
                    "UPDATE chat_sessions SET status = %s, last_active = %s WHERE user_id = %s",
                    (status, now, user_id)
                )
            else:
                cursor.execute(
                    "UPDATE chat_sessions SET last_active = %s WHERE user_id = %s",
                    (now, user_id)
                )
            
            conn.commit()
            cursor.close()
            conn.close()
        except Error as e:
            print(f"Database error in update_session: {e}")

    def add_message(self, user_id: str, role: str, content: str, intent: str = None, response_time: float = None, agent_id: str = None):
        """Add message to history"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute(
                "INSERT INTO chat_messages (user_id, role, content, intent, response_time, agent_id) VALUES (%s, %s, %s, %s, %s, %s)",
                (user_id, role, content, intent, response_time, agent_id)
            )
            
            conn.commit()
            cursor.close()
            conn.close()
        except Error as e:
            print(f"Database error in add_message: {e}")

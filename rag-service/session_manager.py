from typing import Dict, Optional
from datetime import datetime, timedelta
from database import Database

class SessionManager:
    def __init__(self):
        # Initialize Database Connection
        self.db = Database()
        self.human_mode_timeout_hours = 24  # Reset to AI after 24 hours inactivity
    
    def get_session(self, user_id: str) -> Dict:
        """Get session from database"""
        return self.db.get_session(user_id)
    
    def update_activity(self, user_id: str):
        """Update timestamp activity"""
        self.db.update_session(user_id)
    
    def set_human_mode(self, user_id: str):
        """Switch user to human agent mode"""
        self.db.update_session(user_id, status="human")
        
    def set_ai_mode(self, user_id: str):
        """Switch user back to AI mode"""
        self.db.update_session(user_id, status="ai")
        
    def should_ai_reply(self, user_id: str) -> bool:
        """Check if AI should reply based on session status"""
        session = self.get_session(user_id)
        
        # Check timeout
        last_active = session["last_active"]
        if isinstance(last_active, str):
             try:
                 last_active = datetime.fromisoformat(last_active)
             except:
                 pass # Keep as is if parsing fails or it's already datetime
             
        if not isinstance(last_active, datetime):
             last_active = datetime.now()

        if datetime.now() - last_active > timedelta(hours=self.human_mode_timeout_hours):
            # Reset to AI if timed out
            self.set_ai_mode(user_id)
            return True
            
        return session["status"] == "ai"
        
    def add_history(self, user_id: str, role: str, content: str, intent: str = None, response_time: float = None, agent_id: str = None):
        """Add message to conversation history"""
        self.db.add_message(user_id, role, content, intent, response_time, agent_id)

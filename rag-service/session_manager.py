from typing import Dict, Optional
from datetime import datetime, timedelta

class SessionManager:
    def __init__(self):
        # In-memory storage: { "user_id": { "status": "ai"|"human", "last_active": datetime } }
        self.sessions: Dict[str, Dict] = {}
        self.human_mode_timeout_hours = 24  # Reset to AI after 24 hours inactivity
    
    def get_session(self, user_id: str) -> Dict:
        if user_id not in self.sessions:
            self.sessions[user_id] = {
                "status": "ai",
                "last_active": datetime.now(),
                "history": []
            }
        return self.sessions[user_id]
    
    def update_activity(self, user_id: str):
        """Update timestamp activity"""
        if user_id in self.sessions:
            self.sessions[user_id]["last_active"] = datetime.now()
    
    def set_human_mode(self, user_id: str):
        """Switch user to human agent mode"""
        session = self.get_session(user_id)
        session["status"] = "human"
        session["last_active"] = datetime.now()
        
    def set_ai_mode(self, user_id: str):
        """Switch user back to AI mode"""
        session = self.get_session(user_id)
        session["status"] = "ai"
        session["last_active"] = datetime.now()
        
    def should_ai_reply(self, user_id: str) -> bool:
        """Check if AI should reply based on session status"""
        session = self.get_session(user_id)
        
        # Check timeout
        last_active = session["last_active"]
        if datetime.now() - last_active > timedelta(hours=self.human_mode_timeout_hours):
            # Reset to AI if timed out
            self.set_ai_mode(user_id)
            return True
            
        return session["status"] == "ai"

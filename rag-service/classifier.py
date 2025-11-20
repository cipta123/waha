import json
from typing import Dict, Any
from config import settings
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from groq import Groq
import google.generativeai as genai

class MessageRouter:
    def __init__(self):
        self.settings = settings
        self._initialize_llm()
        
    def _initialize_llm(self):
        """Initialize a lightweight LLM for classification"""
        # We prefer faster models for classification
        if self.settings.llm_provider == "openai":
            self.llm = ChatOpenAI(
                model="gpt-4o-mini", # Fast and cheap
                temperature=0, # Deterministic for classification
                openai_api_key=self.settings.openai_api_key
            )
            self.mode = "langchain"
        elif self.settings.llm_provider == "gemini":
            genai.configure(api_key=self.settings.google_api_key)
            self.llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-flash", # Flash is faster
                temperature=0,
                google_api_key=self.settings.google_api_key
            )
            self.mode = "langchain"
        else:
            # Groq
            self.client = Groq(api_key=self.settings.groq_api_key)
            self.model = "llama3-70b-8192" # or a smaller one if available like 8b for speed
            self.mode = "groq"

    def classify(self, message: str) -> Dict[str, Any]:
        """
        Classify user message intent
        Returns: { "action": "ai_reply" | "human_handoff", "reason": "..." }
        """
        
        system_prompt = """
        Anda adalah AI Router untuk Customer Service Universitas Terbuka.
        Tugas: Analisis pesan user dan tentukan siapa yang harus menjawab.
        
        KATEGORI 1: "human_handoff" (Serahkan ke Manusia)
        Pilih ini jika pesan berisi:
        - Kekecewaan, marah, sarkasme, atau emosi negatif.
        - Komplain spesifik (nilai salah, website error, pembayaran gagal).
        - Permintaan eksplisit bicara dengan admin/orang/staf.
        - Data pribadi sensitif yang minta dicek (NIM, NIK, No HP).
        - Kasus kompleks yang butuh investigasi.
        
        KATEGORI 2: "ai_reply" (Jawab oleh AI)
        Pilih ini jika pesan berisi:
        - Pertanyaan umum (kurikulum, biaya, jadwal, syarat).
        - Definisi atau informasi yang ada di brosur/website.
        - Sapaan (Halo, Pagi, Assalamualaikum).
        - Pertanyaan "Bagaimana cara...", "Apa itu...".
        
        OUTPUT JSON ONLY:
        {
            "action": "ai_reply" atau "human_handoff",
            "reason": "alasan singkat",
            "suggested_response": "pesan singkat untuk user jika handoff (opsional)"
        }
        """
        
        user_prompt = f"Pesan User: {message}"
        
        try:
            if self.mode == "groq":
                completion = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0,
                    response_format={"type": "json_object"}
                )
                result_text = completion.choices[0].message.content
            else:
                # Langchain approach
                messages = [
                    ("system", system_prompt),
                    ("human", user_prompt)
                ]
                response = self.llm.invoke(messages)
                result_text = response.content
            
            # Clean up json string if needed (sometimes LLMs add markdown ```json ... ```)
            result_text = result_text.replace("```json", "").replace("```", "").strip()
            return json.loads(result_text)
            
        except Exception as e:
            print(f"Classification error: {e}")
            # Fallback to AI reply if classification fails, or safe fail
            return {"action": "ai_reply", "reason": "Error in classification, defaulting to AI"}

import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure the API key
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    print("Error: GOOGLE_API_KEY not found in .env file.")
else:
    try:
        genai.configure(api_key=api_key)

        print("\nAvailable Gemini models for 'generateContent':")
        for m in genai.list_models():
          if 'generateContent' in m.supported_generation_methods:
            print(f"- {m.name}")
        print("\n")
    except Exception as e:
        print(f"An error occurred: {e}")

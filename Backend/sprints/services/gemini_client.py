import os
import time
from google.genai.errors import APIError

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None

def get_gemini_client(api_key):
    if genai is None:
        raise ImportError("google-genai SDK is not installed on the backend.")
    return genai.Client(api_key=api_key)

def generate_schedule_content(prompt, response_schema, api_key):
    """
    Invokes Gemini API with primary and fallback models, using exponential backoff retry.
    """
    if genai is None or types is None:
        raise ImportError("google-genai SDK is not installed on the backend.")
        
    primary_model = os.environ.get("GEMINI_MODEL", "gemini-3.1-flash-lite")
    models_to_try = [primary_model, "gemini-3.1-flash-lite", "gemini-3-flash-preview"]
    # Remove duplicates while keeping order
    models_to_try = list(dict.fromkeys([m for m in models_to_try if m]))
    
    response = None
    last_err = None

    for model_name in models_to_try:
        for attempt in range(3):
            try:
                client = get_gemini_client(api_key)
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=response_schema,
                        temperature=0.1,
                    ),
                )
                break  # Success
            except APIError as e:
                last_err = e
                # Retry if service is unavailable (503), timed out (504), or rate-limited (429)
                if e.code in [429, 503, 504]:
                    time.sleep(2 ** attempt)
                    continue
                else:
                    break  # Skip to next model for wrong name/config
            except Exception as e:
                last_err = e
                break
        
        if response is not None:
            break

    if response is None:
        raise Exception(f"AI service currently unavailable. Details: {str(last_err)}")
        
    return response.text

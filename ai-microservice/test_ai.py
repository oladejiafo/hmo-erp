# test_ai.py
import os
from dotenv import load_dotenv

# Load .env FIRST, before any other imports
load_dotenv()

print(f"After load_dotenv - ANTHROPIC: {os.getenv('ANTHROPIC_API_KEY', 'NOT FOUND')[:15]}...")
print(f"After load_dotenv - OPENAI: {os.getenv('OPENAI_API_KEY', 'NOT FOUND')[:15]}...")

# Now import the router
import asyncio
from routers._client import call_ai

async def test():
    print("\nTesting AI service directly...")
    
    result = await call_ai(
        system="You are a helpful assistant. Keep responses very short.",
        user_message="Say hello in one word",
        max_tokens=50,
        expect_json=False,
        provider="anthropic"
    )
    
    print(f"Result: {result}")
    
    if result and isinstance(result, str):
        print(f"✅ Success: {result}")
    elif result and result.get("text"):
        print(f"✅ Success: {result['text']}")
    else:
        print("❌ Failed - check error logs above")

if __name__ == "__main__":
    asyncio.run(test())
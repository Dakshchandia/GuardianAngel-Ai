"""Run this with the same Python that runs uvicorn to install missing deps."""
import subprocess
import sys

packages = [
    "openai==1.30.1",
    "twilio==9.1.0",
    "python-dotenv==1.0.1",
    "fastapi==0.111.0",
    "uvicorn[standard]==0.29.0",
    "python-multipart==0.0.9",
    "pydantic==2.7.1",
    "httpx==0.27.0",
]

print(f"Installing into: {sys.executable}")
for pkg in packages:
    result = subprocess.run(
        [sys.executable, "-m", "pip", "install", pkg, "--quiet"],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        print(f"  ✓ {pkg}")
    else:
        print(f"  ✗ {pkg}: {result.stderr.strip()}")

# Verify openai
try:
    import openai
    print(f"\nopenai version: {openai.__version__} ✓")
except ImportError:
    print("\nopenai: STILL NOT INSTALLED ✗")

print("\nDone.")

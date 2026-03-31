FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Order service runs on port 8083
EXPOSE 8083

ENV PORT=8083
ENV HOST=0.0.0.0

# Run with the app package (app/main.py → app.main:app)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8083"]

FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# API Gateway runs on port 8080
EXPOSE 8080

ENV PORT=8080

CMD ["uvicorn", "gateway:app", "--host", "0.0.0.0", "--port", "8080"]

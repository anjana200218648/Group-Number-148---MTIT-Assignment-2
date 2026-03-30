FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Copy Firebase service account key into image
# (Alternatively, mount it as a Docker secret or use FIREBASE_CREDENTIALS_JSON env var)
COPY order-management-service.json ./order-management-service.json

# Order service runs on port 8083
EXPOSE 8083

# Set environment so uvicorn knows the port
ENV PORT=8083
ENV HOST=0.0.0.0

# Run with the app package (using module path since app is a package)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8083"]

FROM python:3.11-slim

WORKDIR /app

COPY services/payment/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/payment/app/ ./app/
COPY libs/shared/ ./shared/
COPY libs/contracts/ ./contracts/

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

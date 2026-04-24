FROM python:3.11-slim

WORKDIR /app

COPY services/payment/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/payment/app/ ./app/
COPY libs/shared/ ./shared/
COPY libs/contracts/ ./contracts/

# Defaults for AWS deployment. Overridden by compose (= "rabbitmq") for local dev.
ENV PAYMENT_EVENT_PUBLISHER_BACKEND=eventbridge \
    PAYMENT_EVENTBRIDGE_BUS_NAME=thub.domain.events

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

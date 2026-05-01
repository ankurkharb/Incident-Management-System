FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir httpx

COPY simulate_failure.py .

CMD ["python", "simulate_failure.py"]

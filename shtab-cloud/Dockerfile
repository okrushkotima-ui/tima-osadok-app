FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 SHTAB_DATA_DIR=/tmp/shtab_data SHTAB_MAX_UPLOAD_BYTES=31457280
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libglib2.0-0 libgl1 && rm -rf /var/lib/apt/lists/*
COPY shtab_v04_code.zip /tmp/shtab_v04_code.zip
RUN echo "1acc928edda66c193a2519e915310d1fab88e03063c223de1a5d26bde102c016  /tmp/shtab_v04_code.zip" | sha256sum -c - && python -m zipfile -e /tmp/shtab_v04_code.zip /app && rm /tmp/shtab_v04_code.zip
RUN pip install --no-cache-dir -r requirements.txt
EXPOSE 10000
CMD ["sh","-c","exec uvicorn server.app_v04:create_app_v04 --factory --host 0.0.0.0 --port ${PORT:-10000} --workers 1"]

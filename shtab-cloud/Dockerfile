FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 SHTAB_DATA_DIR=/tmp/shtab_data SHTAB_MAX_UPLOAD_BYTES=31457280
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libglib2.0-0 libgl1 && rm -rf /var/lib/apt/lists/*
COPY shtab_v04_code.zip /tmp/shtab_v04_code.zip
RUN echo "1acc928edda66c193a2519e915310d1fab88e03063c223de1a5d26bde102c016  /tmp/shtab_v04_code.zip" | sha256sum -c - && python -m zipfile -e /tmp/shtab_v04_code.zip /app && rm /tmp/shtab_v04_code.zip
COPY fix_inline_assets.py /tmp/fix_inline_assets.py
RUN python /tmp/fix_inline_assets.py /app && rm -f /tmp/fix_inline_assets.py
COPY ui_v05 /tmp/ui_v05
RUN cp /tmp/ui_v05/shtab04.html /app/static/shtab04.html && \
    cp /tmp/ui_v05/shtab04.css /app/static/shtab04.css && \
    cp /tmp/ui_v05/shtab04.js /app/static/shtab04.js && \
    rm -rf /tmp/ui_v05
# V0.6: actual authenticated role/file handoff transport; no agent impersonation.
COPY handoff_v06.py /app/server/handoff_v06.py
COPY ffmpeg_editor_adapter_v06.py /app/server/ffmpeg_editor_adapter_v06.py
COPY patch_route_v06.py /tmp/patch_route_v06.py
RUN python /tmp/patch_route_v06.py /app && rm /tmp/patch_route_v06.py
ENV SHTAB_ROLE_ROUTE_V06=1
RUN pip install --no-cache-dir -r requirements.txt
EXPOSE 10000
CMD ["sh","-c","exec uvicorn server.app_v04:create_app_v04 --factory --host 0.0.0.0 --port ${PORT:-10000} --workers 1"]

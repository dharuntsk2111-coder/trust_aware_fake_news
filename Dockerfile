# Backend image for Hugging Face Spaces (Docker SDK, free CPU tier).
#
# Only the Python half of the project goes in — the React UI is deployed
# separately as a static site. Python 3.11 matches the local runtime, which is
# the version every dependency in requirements.txt has a wheel for.

FROM python:3.11-slim

# Spaces runs the container as uid 1000. Caches must live somewhere that user
# can write, or the model download fails on startup.
RUN useradd -m -u 1000 user
ENV HOME=/home/user \
    HF_HOME=/home/user/.cache/huggingface \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt ./

# torch is installed first, from the CPU-only index, so pip cannot resolve the
# default PyPI build that bundles CUDA (several GB that would never be used).
RUN pip install --no-cache-dir torch==2.11.0 \
        --index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir -r requirements.txt \
        --extra-index-url https://download.pytorch.org/whl/cpu

COPY --chown=user:user src/ ./src/
COPY --chown=user:user api/ ./api/

USER user

# Spaces expects the app on 7860.
EXPOSE 7860

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "7860"]

# Debian-based "slim", not Alpine: torch/rdkit/numpy ship as manylinux
# (glibc) wheels and would need a slow from-source build on musl libc.
# Slim keeps the base small while staying wheel-compatible.
FROM python:3.12-slim

WORKDIR /app

# Dependencies in their own layer, installed before the code is copied in,
# so editing api/ doesn't invalidate the (slow — torch, rdkit) install cache.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code only — no data/, frontend/, or training scripts.
COPY api/ ./api/
COPY models/ ./models/
COPY utils/ ./utils/

# Only the three checkpoints the live API actually loads (see
# api/main.py:get_models) — not the rest of results/, which is
# experimental checkpoints and evaluation output the runtime never reads.
COPY results/best_tox21_multitask.pt results/best_esol.pt results/best_chembl_multitask.pt ./results/

# $PORT is injected by the host (e.g. Render); 8000 is the local default.
ENV PORT=8000
EXPOSE 8000

# DATABASE_URL is read from the environment at runtime (api/database.py) —
# deliberately not set here and never baked into the image. Provide it via
# `docker run -e` or docker-compose's environment: block.
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT}"]

FROM mcr.microsoft.com/playwright:v1.55.0-noble
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg python3 python3-pip python3-venv curl \
  && rm -rf /var/lib/apt/lists/*
RUN python3 -m pip install --break-system-packages fastapi "uvicorn[standard]" sqlalchemy pydantic markdown
WORKDIR /runner
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY runner.mjs ./
ENTRYPOINT ["node", "runner.mjs"]

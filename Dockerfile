FROM node:22-slim

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json* ./

RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .

RUN npm run build

ENV NODE_ENV=production
ENV PORT=7860
ENV HOSTNAME=0.0.0.0

EXPOSE 7860

CMD ["npm", "run", "start"]

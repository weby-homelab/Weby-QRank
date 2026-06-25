# Build Frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Build Backend and Final Image
FROM node:22-alpine
WORKDIR /app/backend
COPY backend/package*.json ./
# Install production dependencies
RUN npm install --production
COPY backend/ ./
# Copy built frontend to public directory
COPY --from=frontend-builder /app/frontend/dist ./public
# Create data directory for volume mapping
RUN mkdir -p data
ENV DB_PATH=/app/backend/data/qrank.db
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]

# Online server for Multiverse Mayhem: serves the web game and runs the multiverse.
FROM node:22-alpine
WORKDIR /app
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev
COPY index.html ./
COPY vendor ./vendor
COPY shared ./shared
COPY sim ./sim
COPY js ./js
COPY server/server.js ./server/
RUN mkdir -p server/data && chown node:node server/data
ENV PORT=8790 NODE_ENV=production
EXPOSE 8790
USER node
CMD ["node", "server/server.js"]

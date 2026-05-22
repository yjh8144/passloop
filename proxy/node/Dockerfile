FROM node:20-slim
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY server.js .
ENV PORT=3001
EXPOSE 3001
CMD ["node", "server.js"]

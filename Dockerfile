FROM node:20-bookworm-slim
WORKDIR /app
RUN echo "Hello Render"
CMD ["node", "-e", "console.log('works')"]

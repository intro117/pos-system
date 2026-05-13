FROM node:18-alpine AS build
WORKDIR /app
COPY package.json .
RUN npm install --legacy-peer-deps
RUN npm install ajv@^8.12.0 ajv-keywords@^5.1.0 --legacy-peer-deps
COPY . .
ENV GENERATE_SOURCEMAP=false
ENV CI=false
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

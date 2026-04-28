FROM node:latest
WORKDIR /src
COPY package*.json /src/
RUN npm install -g supervisor && npm install
COPY . /src
EXPOSE 3000

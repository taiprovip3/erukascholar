FROM node:20

WORKDIR /app

COPY . .

RUN yarn install

EXPOSE 443

CMD [ "yarn", "dev" ]
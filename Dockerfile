# Dockerfile
FROM alpine:latest

# Установка зависимостей
RUN apk add --no-cache \
    ca-certificates \
    unzip \
    curl

# Создание пользователя и директорий
RUN adduser -D -s /bin/sh -h /app pocketbase && \
    mkdir -p /app/pb_data && \
    chown -R pocketbase:pocketbase /app

# Скачивание PocketBase
ARG PB_VERSION=0.22.18
RUN curl -L -o /tmp/pb.zip \
    https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip && \
    unzip /tmp/pb.zip -d /app/ && \
    rm /tmp/pb.zip

# Копирование данных из git репозитория
COPY --chown=pocketbase:pocketbase pb_data/ /app/pb_data/

USER pocketbase
WORKDIR /app
EXPOSE 8090

ENTRYPOINT ["./pocketbase"]
CMD ["serve", "--http=0.0.0.0:8090"]
FROM alpine:latest

# Установка зависимостей
RUN apk add --no-cache unzip

# Создание пользователя и директорий
RUN adduser -D -s /bin/sh -h /app pocketbase && \
    mkdir -p /app/pb_data && \
    chown -R pocketbase:pocketbase /app

# Копируем локальный ZIP файл
COPY pocketbase_0.29.2_linux_amd64.zip /tmp/pb.zip

# Распаковываем PocketBase (без комментариев в команде!)
RUN unzip /tmp/pb.zip -d /app/ && \
    rm /tmp/pb.zip && \
    chmod +x /app/pocketbase

# Копируем данные из git репозитория
COPY --chown=pocketbase:pocketbase pb_data/ /app/pb_data/

USER pocketbase
WORKDIR /app
EXPOSE 8090

CMD ["./pocketbase", "serve", "--http=0.0.0.0:8090"]
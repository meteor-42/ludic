FROM alpine:latest

# Установка только unzip (curl не нужен)
RUN apk add --no-cache unzip

# Создание пользователя
RUN adduser -D -s /bin/sh -h /app pocketbase && \
    mkdir -p /app/pb_data && \
    chown -R pocketbase:pocketbase /app

# Копируем локальный ZIP файл
COPY pocketbase_0.22.18_linux_amd64.zip /tmp/pb.zip

# Распаковываем PocketBase
RUN unzip /tmp/pb.zip -d /app/ && \
    rm /tmp/pb.zip && \
    chmod +x /app/pocketbase

# Копируем данные из git репозитория
COPY --chown=pocketbase:pocketbase pb_data/ /app/pb_data/

USER pocketbase
WORKDIR /app
EXPOSE 8090

ENTRYPOINT ["./pocketbase"]
CMD ["serve", "--http=0.0.0.0:8090"]
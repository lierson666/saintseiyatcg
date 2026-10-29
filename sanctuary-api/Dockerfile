# sanctuary-api: só biblioteca padrão, nada para instalar.
FROM python:3.12-alpine
WORKDIR /app
COPY server.py .
RUN adduser -D -u 10001 sanctuary && mkdir /data && chown sanctuary /data
USER sanctuary
VOLUME /data
EXPOSE 8080
CMD ["python", "-u", "server.py"]

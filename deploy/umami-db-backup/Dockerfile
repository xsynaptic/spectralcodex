FROM postgres:15.19-alpine

COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh \
    && mkdir -p /etc/crontabs \
    && echo "0 3 * * * /usr/local/bin/backup.sh" > /etc/crontabs/root

ENTRYPOINT []
CMD ["crond", "-f", "-d", "0"]

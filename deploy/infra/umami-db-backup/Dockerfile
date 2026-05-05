FROM postgres:15.16-alpine

COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh \
    && mkdir -p /etc/crontabs \
    && echo "0 3 * * * /usr/local/bin/backup.sh" > /etc/crontabs/root

ENTRYPOINT []
CMD ["crond", "-f", "-d", "0"]

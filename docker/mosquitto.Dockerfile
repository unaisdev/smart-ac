FROM eclipse-mosquitto:2

COPY mosquitto/config/mosquitto.conf /mosquitto/config/mosquitto.conf

USER root
RUN mosquitto_passwd -c -b /mosquitto/config/passwd smartac smartac \
  && chown mosquitto:mosquitto /mosquitto/config/passwd
USER mosquitto

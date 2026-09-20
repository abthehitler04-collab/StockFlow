FROM php:8.3-apache

WORKDIR /var/www/html

COPY . /var/www/html/

RUN a2enmod headers rewrite \
    && chown -R www-data:www-data /var/www/html/storage \
    && chmod -R 750 /var/www/html/storage

EXPOSE 80

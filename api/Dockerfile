FROM dunglas/frankenphp:1-php8.4

# Installation des drivers PostgreSQL et Zip (requis par Composer)
RUN install-php-extensions pdo_pgsql zip

# Ajout de Composer pour gérer les paquets
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
#!/bin/bash
set -e

echo "🏔️ Initialisation de la boutique WooCommerce VisuAlpes..."

# Check if wp can connect to DB
echo "⏳ Vérification de la connexion à la base de données shop_db..."
until docker compose run --rm wp wp db check --path=/var/www/html >/dev/null 2>&1; do
  echo "En attente de shop_db..."
  sleep 2
done

echo "✅ Base de données connectée !"

# Check if WordPress is already installed
if docker compose run --rm wp wp core is-installed --path=/var/www/html 2>/dev/null; then
  echo "ℹ️ WordPress est déjà installé."
else
  echo "🚀 Installation de WordPress..."
  docker compose run --rm wp wp core install \
    --path=/var/www/html \
    --url="http://localhost:8080" \
    --title="VisuAlpes" \
    --admin_user="admin" \
    --admin_password="password123" \
    --admin_email="admin@visualpes.fr" \
    --skip-email
  echo "✅ WordPress installé avec succès !"
fi

# Set site title & description
docker compose run --rm wp wp option update blogname "VisuAlpes" --path=/var/www/html || true
docker compose run --rm wp wp option update blogdescription "Mobilier & Signalétique Connectée Haute Montagne" --path=/var/www/html || true

# Set site language to French
echo "🇫🇷 Configuration de la langue en Français..."
docker compose run --rm wp wp language core install fr_FR --activate --path=/var/www/html 2>/dev/null || true

# Install and activate WooCommerce
echo "📦 Installation et activation de WooCommerce..."
if ! docker compose run --rm wp wp plugin is-installed woocommerce --path=/var/www/html 2>/dev/null; then
  docker compose run --rm wp wp plugin install woocommerce --version=9.3.3 --activate --path=/var/www/html
else
  docker compose run --rm wp wp plugin activate woocommerce --path=/var/www/html || true
fi

# Install and activate Stancer
echo "💳 Installation et activation du plugin Stancer..."
if ! docker compose run --rm wp wp plugin is-installed stancer --path=/var/www/html 2>/dev/null; then
  docker compose run --rm wp wp plugin install stancer --activate --path=/var/www/html || true
else
  docker compose run --rm wp wp plugin activate stancer --path=/var/www/html || true
fi

# Install and activate Fintecture
echo "🏦 Installation et activation du plugin Fintecture..."
if ! docker compose run --rm wp wp plugin is-installed fintecture-payment-gateway --path=/var/www/html 2>/dev/null; then
  docker compose run --rm wp wp plugin install fintecture-payment-gateway --activate --path=/var/www/html || true
else
  docker compose run --rm wp wp plugin activate fintecture-payment-gateway --path=/var/www/html || true
fi

# Configure WooCommerce basics (currency EUR)
docker compose run --rm wp wp option update woocommerce_currency "EUR" --path=/var/www/html || true
docker compose run --rm wp wp option update woocommerce_currency_pos "right_space" --path=/var/www/html || true

# Install & Activate Storefront Theme
echo "🎨 Installation et configuration de la charte graphique VisuAlpes..."
if ! docker compose run --rm wp wp theme is-installed storefront --path=/var/www/html 2>/dev/null; then
  docker compose run --rm wp wp theme install storefront --path=/var/www/html
fi

# Deploy Child Theme
docker compose exec -u 33:33 shop mkdir -p /var/www/html/wp-content/themes/visualpes-storefront
docker compose cp scripts/theme/style.css shop:/var/www/html/wp-content/themes/visualpes-storefront/style.css
docker compose cp scripts/theme/functions.php shop:/var/www/html/wp-content/themes/visualpes-storefront/functions.php
docker compose run --rm wp wp theme activate visualpes-storefront --path=/var/www/html

# Deploy Brand Assets (Logo, Favicon, Banner)
docker compose cp pwa/public/logo-white.png shop:/var/www/html/logo-white.png
docker compose cp pwa/public/icon-va-light.png shop:/var/www/html/icon-va-light.png
docker compose cp pwa/public/alpes-bg.jpg shop:/var/www/html/alpes-bg.jpg

# Import Logo into Media Library if needed
LOGO_ID=$(docker compose run --rm wp wp post list --post_type=attachment --title="VisuAlpes Logo Blanc" --field=ID --path=/var/www/html 2>/dev/null || true)
if [ -z "$LOGO_ID" ]; then
  LOGO_ID=$(docker compose run --rm wp wp media import /var/www/html/logo-white.png --title="VisuAlpes Logo Blanc" --porcelain --path=/var/www/html)
fi
docker compose run --rm wp wp theme mod set custom_logo "$LOGO_ID" --path=/var/www/html

# Import Favicon / Site Icon
ICON_ID=$(docker compose run --rm wp wp post list --post_type=attachment --title="VisuAlpes Favicon" --field=ID --path=/var/www/html 2>/dev/null || true)
if [ -z "$ICON_ID" ]; then
  ICON_ID=$(docker compose run --rm wp wp media import /var/www/html/icon-va-light.png --title="VisuAlpes Favicon" --porcelain --path=/var/www/html)
fi
docker compose run --rm wp wp option update site_icon "$ICON_ID" --path=/var/www/html

# Set Homepage to Shop catalog
SHOP_PAGE_ID=$(docker compose run --rm wp wp post list --post_type=page --name=shop --field=ID --path=/var/www/html 2>/dev/null || echo "6")
docker compose run --rm wp wp option update show_on_front page --path=/var/www/html || true
docker compose run --rm wp wp option update page_on_front "$SHOP_PAGE_ID" --path=/var/www/html || true

# Copy Product Visuals
docker compose cp pwa/public/storyboard/home-hero.jpg shop:/var/www/html/prod-socle.jpg
docker compose cp pwa/public/storyboard/chalet_cimes_hd.jpg shop:/var/www/html/prod-tag.jpg
docker compose cp pwa/public/storyboard/chalet_horizon_hd.jpg shop:/var/www/html/prod-pack5.jpg

# Create products if they don't exist
echo "🛍️ Création du catalogue de produits VisuAlpes..."

create_product_if_not_exists() {
  SKU=$1
  NAME=$2
  PRICE=$3
  QTY=$4
  DESC=$5
  IMG_FILE=$6

  EXISTING_ID=$(docker compose run --rm wp wp wc product list --sku="$SKU" --field=id --user=admin --path=/var/www/html 2>/dev/null || true)

  if [ -z "$EXISTING_ID" ]; then
    echo "  -> Création du produit: $NAME ($SKU) - $PRICE €"
    PRODUCT_ID=$(docker compose run --rm wp wp wc product create \
      --name="$NAME" \
      --type="simple" \
      --regular_price="$PRICE" \
      --sku="$SKU" \
      --description="$DESC" \
      --manage_stock=true \
      --stock_quantity="$QTY" \
      --status="publish" \
      --user=admin \
      --porcelain \
      --path=/var/www/html)
    
    if [ -n "$IMG_FILE" ]; then
      docker compose run --rm wp wp media import "$IMG_FILE" --post_id="$PRODUCT_ID" --featured_image --path=/var/www/html 2>/dev/null || true
    fi
    echo "  ✅ Produit $SKU créé avec succès (ID: $PRODUCT_ID)"
  else
    echo "  ℹ️ Produit $SKU existe déjà (ID: $EXISTING_ID)"
    # Ensure thumbnail
    HAS_THUMB=$(docker compose run --rm wp wp post meta get "$EXISTING_ID" _thumbnail_id --path=/var/www/html 2>/dev/null || true)
    if [ -z "$HAS_THUMB" ] && [ -n "$IMG_FILE" ]; then
      docker compose run --rm wp wp media import "$IMG_FILE" --post_id="$EXISTING_ID" --featured_image --path=/var/www/html 2>/dev/null || true
    fi
  fi
}

create_product_if_not_exists "PACK-SOCLE-BRONZE" "Pack Socle Bronze & Tags NFC Haute Montagne" "289.00" "50" "Comprend le socle usiné en bronze alpin haute densité et un jeu de puces NFC étanches prêtes pour l'atelier." "/var/www/html/prod-socle.jpg"
create_product_if_not_exists "TAG-ZONE-NFC" "Tag NFC Mural Inox Alpin" "49.00" "100" "Balise NFC individuelle en acier inoxydable gravé au laser, résistante aux températures extrêmes." "/var/www/html/prod-tag.jpg"
create_product_if_not_exists "PACK-PILOTE-5" "Pack Pilote 5 Chalets Prestige" "1190.00" "20" "Kit complet pour 5 résidences haut de gamme : 5 socles bronze, 25 tags muraux et accès ERP prioritaire." "/var/www/html/prod-pack5.jpg"

# Setup Webhook to Symfony ERP
echo "🔗 Configuration du Webhook WooCommerce vers Symfony ERP (http://api/api/webhooks/orders)..."
WEBHOOK_EXISTS=$(docker compose run --rm wp wp wc webhook list --user=admin --field=name --path=/var/www/html 2>/dev/null | grep "VisuAlpes ERP Webhook" || true)

if [ -z "$WEBHOOK_EXISTS" ]; then
  docker compose run --rm wp wp wc webhook create \
    --name="VisuAlpes ERP Webhook" \
    --topic="order.created" \
    --delivery_url="http://api/api/webhooks/orders" \
    --secret="visualpes-webhook-secret-2026" \
    --status="active" \
    --user=admin \
    --path=/var/www/html
  echo "✅ Webhook créé et activé !"
else
  echo "ℹ️ Webhook déjà existant et actif."
fi

echo ""
echo "🎉 Initialisation et personnalisation de la boutique VisuAlpes terminées !"
echo "🌐 URL Boutique : http://localhost:8080"
echo "🔐 Admin : admin / password123"
echo "⚡ Webhook connecté à l'ERP Symfony : http://api/api/webhooks/orders"

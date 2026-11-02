<?php
if (!defined('ABSPATH')) exit;

/**
 * VisuAlpes Storefront Child Theme Functions
 */

// Enqueue styles
add_action('wp_enqueue_scripts', function() {
    wp_enqueue_style('storefront-parent-style', get_template_directory_uri() . '/style.css');
    wp_enqueue_style('visualpes-child-style', get_stylesheet_directory_uri() . '/style.css', ['storefront-parent-style'], '1.0.2');
});

// Custom Hero Banner on Shop homepage
add_action('storefront_before_content', function() {
    if (is_shop() || is_front_page()) {
        ?>
        <section class="va-shop-hero">
            <div class="col-full">
                <div class="va-shop-hero-badge">
                    <span>✦</span> Collection Atelier Alpin — Haute Horlogerie & Puces NFC <span>✦</span>
                </div>
                <h1>Mobilier Connecté &<br><span class="gold">Signalétique d'Art Alpin</span></h1>
                <p class="subtitle">
                    Socles en bronze massif usiné, balises NFC étanches et intégration ERP instantanée.
                    Conçu et façonné au cœur des Alpes pour résidences et chalets de prestige.
                </p>
                <div class="va-shop-trust">
                    <div class="va-shop-trust-item">
                        <span class="icon">🇫🇷</span> <strong>100% Fabriqué en France</strong>
                    </div>
                    <div class="va-shop-trust-item">
                        <span class="icon">💳</span> <strong>Stancer & Fintecture</strong> (Paiements certifiés)
                    </div>
                    <div class="va-shop-trust-item">
                        <span class="icon">📦</span> <strong>Expédition Boxtal</strong> (Colissimo / Chronopost)
                    </div>
                    <div class="va-shop-trust-item">
                        <span class="icon">📄</span> <strong>Factur-X Pennylane</strong>
                    </div>
                </div>
            </div>
        </section>
        <?php
    }
}, 5);

// Custom Footer text
add_action('init', function() {
    remove_action('storefront_footer', 'storefront_credit', 20);
    add_action('storefront_footer', function() {
        ?>
        <div class="site-info" style="text-align: center; font-size: 0.85rem; color: #9E9995;">
            <p style="margin-bottom: 0.5rem;">
                © <?php echo date('Y'); ?> <strong>VisuAlpes</strong> — Atelier d'artisanat et technologie connectée haute montagne.
            </p>
            <p style="font-size: 0.75rem; opacity: 0.7;">
                Paiements sécurisés par <strong>Stancer</strong> (CB) & <strong>Fintecture</strong> (Virement immédiat) · Facturation <strong>Pennylane</strong> (Factur-X) · Logistique <strong>Boxtal</strong>
            </p>
        </div>
        <?php
    }, 20);
});


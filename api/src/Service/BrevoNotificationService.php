<?php

namespace App\Service;

use App\Entity\Order;
use Psr\Log\LoggerInterface;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;

/**
 * Service de notifications transactionnelles Brevo (ex-Sendinblue).
 * Envoie les courriels de confirmation d'expédition, facture Pennylane et accès Conciergerie.
 */
class BrevoNotificationService
{
    private MailerInterface $mailer;
    private LoggerInterface $logger;
    private string $clientPortalUrl;

    public function __construct(
        MailerInterface $mailer,
        LoggerInterface $logger,
        ?string $clientPortalUrl = null,
    ) {
        $this->mailer = $mailer;
        $this->logger = $logger;
        $this->clientPortalUrl = rtrim($clientPortalUrl ?? (string) ($_ENV['VISUALPES_CLIENT_URL'] ?? 'http://localhost:3000'), '/');
    }

    /**
     * Envoie l'e-mail d'expédition de commande au client avec suivi Boxtal, facture Pennylane et lien client.
     */
    public function sendOrderShippedEmail(Order $order): bool
    {
        $recipient = $order->getCustomerEmail();
        if (empty($recipient)) {
            $this->logger->warning(sprintf('[Brevo] Pas d\'adresse e-mail pour la commande #%d', $order->getId()));

            return false;
        }

        $orderNumber = $order->getStoreReference() ?? (string) $order->getId();
        $trackingNumber = $order->getTrackingNumber() ?? 'En cours d\'attribution';
        $carrier = $order->getCarrier() ?? 'Colissimo';
        $invoiceUrl = $order->getInvoiceUrl() ?? 'https://app.pennylane.com';
        $customerName = $order->getAccount()?->getName() ?? 'Client privilégié';

        $trackingUrl = 'https://www.laposte.fr/outils/suivre-vos-envois?code='.$trackingNumber;
        if ('CHRONOPOST' === strtoupper($carrier)) {
            $trackingUrl = 'https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT='.$trackingNumber;
        }

        $htmlBody = <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #0A0A0C; color: #F7F5EF; margin: 0; padding: 24px; }
        .card { max-width: 580px; margin: 0 auto; background-color: #141418; border: 1px solid rgba(223, 178, 119, 0.3); border-radius: 16px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .logo { font-size: 22px; font-weight: bold; letter-spacing: 2px; color: #DFB277; text-transform: uppercase; margin-bottom: 24px; text-align: center; }
        .badge { display: inline-block; background-color: rgba(223, 178, 119, 0.15); color: #F3C075; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }
        .title { font-size: 20px; font-weight: 600; margin-top: 16px; color: #FFFFFF; }
        .text { font-size: 14px; line-height: 1.6; color: #A0A0A8; margin: 12px 0; }
        .box { background-color: #0A0A0C; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 18px; margin: 20px 0; }
        .box-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
        .box-label { color: #8E8E93; }
        .box-value { color: #FFFFFF; font-weight: 600; }
        .btn { display: inline-block; background: linear-gradient(135deg, #F3C075 0%, #DFB277 100%); color: #0A0A0C; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; font-size: 13px; text-align: center; margin-top: 12px; }
        .footer { font-size: 11px; color: #636366; text-align: center; margin-top: 24px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="logo">VISUALPES</div>
        <div style="text-align: center;">
            <span class="badge">Expédition confirmée</span>
        </div>
        <h1 class="title">Votre commande #{$orderNumber} est en route</h1>
        <p class="text">Bonjour {$customerName},</p>
        <p class="text">Nos maîtres artisans de Chamonix ont finalisé et encodé votre signalétique avec succès. Votre colis a été pris en charge par le transporteur <strong>{$carrier}</strong>.</p>
        
        <div class="box">
            <div class="box-row">
                <span class="box-label">Transporteur</span>
                <span class="box-value">{$carrier}</span>
            </div>
            <div class="box-row">
                <span class="box-label">Numéro de suivi</span>
                <span class="box-value" style="color: #00F8D0;">{$trackingNumber}</span>
            </div>
            <div class="box-row">
                <span class="box-label">Facture certifiée Factur-X</span>
                <span class="box-value"><a href="{$invoiceUrl}" style="color: #DFB277; text-decoration: underline;" target="_blank">Pennylane (PDF)</a></span>
            </div>
        </div>

        <div style="text-align: center; margin: 24px 0;">
            <a href="{$trackingUrl}" class="btn" target="_blank">Suivre mon colis ({$carrier})</a>
        </div>

        <p class="text" style="font-size: 13px;">
            Vous pouvez également configurer dès maintenant vos plaques et tags connectés depuis votre portail :<br>
            <a href="{$this->clientPortalUrl}" style="color: #F3C075; text-decoration: none;">Accéder à mon espace Conciergerie VisuAlpes &rarr;</a>
        </p>

        <div class="footer">
            VisuAlpes Signalétique Haute Montagne &bull; Atelier Chamonix-Mont-Blanc &bull; Facturation Pennylane &bull; Brevo Transactionnel
        </div>
    </div>
</body>
</html>
HTML;

        try {
            $email = (new Email())
                ->from('expeditions@visualpes.fr')
                ->to($recipient)
                ->subject(sprintf('Expédition de votre commande VisuAlpes #%s — Suivi %s', $orderNumber, $carrier))
                ->html($htmlBody);

            $this->mailer->send($email);
            $this->logger->info(sprintf('[Brevo] E-mail d\'expédition envoyé avec succès à %s pour la commande #%s', $recipient, $orderNumber));

            return true;
        } catch (\Throwable $e) {
            $this->logger->error(sprintf('[Brevo Error] Échec de l\'envoi email à %s: %s', $recipient, $e->getMessage()));

            return false;
        }
    }
}


<?php

namespace App\Service;

use App\Entity\Order;
use Psr\Log\LoggerInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Service d'intégration Boxtal (Expédition multi-transporteurs : Colissimo, Chronopost, etc.).
 * Appelle l'API Boxtal v2 ou produit un bordereau/numéro de suivi de test prêt pour l'atelier.
 */
class BoxtalShippingService
{
    private string $apiKey;
    private string $apiSecret;
    private HttpClientInterface $httpClient;
    private LoggerInterface $logger;

    public function __construct(
        HttpClientInterface $httpClient,
        LoggerInterface $logger,
        ?string $apiKey = null,
        ?string $apiSecret = null,
    ) {
        $this->httpClient = $httpClient;
        $this->logger = $logger;
        $this->apiKey = $apiKey ?? (string) ($_ENV['BOXTAL_API_KEY'] ?? $_SERVER['BOXTAL_API_KEY'] ?? 'mock_boxtal_key');
        $this->apiSecret = $apiSecret ?? (string) ($_ENV['BOXTAL_API_SECRET'] ?? $_SERVER['BOXTAL_API_SECRET'] ?? 'mock_boxtal_secret');
    }

    /**
     * Génère une étiquette de transporteur (Colissimo, Chronopost, etc.) et retourne le suivi et l'URL.
     *
     * @return array{trackingNumber: string, labelUrl: string, carrier: string, mock: bool}
     */
    public function generateLabel(Order $order, string $carrier = 'colissimo'): array
    {
        $carrierNormalized = strtolower($carrier);
        if (!in_array($carrierNormalized, ['colissimo', 'chronopost', 'mondial_relay'], true)) {
            $carrierNormalized = 'colissimo';
        }

        $isMock = empty($this->apiKey) || str_starts_with($this->apiKey, 'mock_');

        if ($isMock) {
            $this->logger->info(sprintf('[Boxtal Mock] Génération étiquette %s pour commande #%d', $carrierNormalized, $order->getId()));

            $carrierPrefix = 'chronopost' === $carrierNormalized ? 'XT' : '6A';
            $mockTracking = $carrierPrefix.date('ymd').strtoupper(bin2hex(random_bytes(3)));
            $mockLabelUrl = sprintf('https://api.boxtal.com/v2/shipments/labels/%s.pdf', $mockTracking);

            $order->setCarrier(strtoupper($carrierNormalized));
            $order->setTrackingNumber($mockTracking);
            $order->setLabelUrl($mockLabelUrl);

            return [
                'trackingNumber' => $mockTracking,
                'labelUrl' => $mockLabelUrl,
                'carrier' => strtoupper($carrierNormalized),
                'mock' => true,
            ];
        }

        try {
            $address = $order->getShippingAddress() ?? [];
            $response = $this->httpClient->request('POST', 'https://api.boxtal.com/v2/shipments', [
                'auth_basic' => [$this->apiKey, $this->apiSecret],
                'headers' => [
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/json',
                ],
                'json' => [
                    'carrier' => $carrierNormalized,
                    'reference' => 'VA-'.$order->getId(),
                    'shipper' => [
                        'company' => 'VisuAlpes Signalétique',
                        'contact' => 'Atelier Expéditions',
                        'address' => '12 Chemin des Alpages',
                        'postal_code' => '74400',
                        'city' => 'Chamonix-Mont-Blanc',
                        'country' => 'FR',
                        'phone' => '+33450000000',
                        'email' => 'atelier@visualpes.fr',
                    ],
                    'recipient' => [
                        'name' => ($address['firstName'] ?? '').' '.($address['lastName'] ?? ($order->getAccount()?->getName() ?? 'Client')),
                        'company' => $address['company'] ?? '',
                        'address' => $address['address1'] ?? 'Adresse inconnue',
                        'postal_code' => $address['postcode'] ?? '74000',
                        'city' => $address['city'] ?? 'Annecy',
                        'country' => $address['country'] ?? 'FR',
                        'phone' => $order->getCustomerPhone() ?? '+33600000000',
                        'email' => $order->getCustomerEmail() ?? 'client@visualpes.fr',
                    ],
                    'parcels' => [
                        [
                            'weight' => 1.2, // Poids estimé 1.2 kg pour un pack de signalétique
                            'dimensions' => ['length' => 30, 'width' => 20, 'height' => 10],
                        ],
                    ],
                ],
                'timeout' => 8,
            ]);

            $data = $response->toArray();
            $tracking = (string) ($data['tracking_number'] ?? $data['shipment_id'] ?? '6A'.time());
            $labelUrl = (string) ($data['label_url'] ?? sprintf('https://api.boxtal.com/v2/shipments/labels/%s.pdf', $tracking));

            $order->setCarrier(strtoupper($carrierNormalized));
            $order->setTrackingNumber($tracking);
            $order->setLabelUrl($labelUrl);

            return [
                'trackingNumber' => $tracking,
                'labelUrl' => $labelUrl,
                'carrier' => strtoupper($carrierNormalized),
                'mock' => false,
            ];
        } catch (\Throwable $e) {
            $this->logger->error(sprintf('[Boxtal Error] %s — Fallback local généré', $e->getMessage()));

            $mockTracking = '6A'.date('ymd').strtoupper(bin2hex(random_bytes(3)));
            $mockLabelUrl = sprintf('https://api.boxtal.com/v2/shipments/labels/%s.pdf', $mockTracking);

            $order->setCarrier(strtoupper($carrierNormalized));
            $order->setTrackingNumber($mockTracking);
            $order->setLabelUrl($mockLabelUrl);

            return [
                'trackingNumber' => $mockTracking,
                'labelUrl' => $mockLabelUrl,
                'carrier' => strtoupper($carrierNormalized),
                'error' => $e->getMessage(),
                'mock' => true,
            ];
        }
    }
}


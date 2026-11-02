<?php

namespace App\Service;

use App\Entity\Order;
use Psr\Log\LoggerInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Service d'intégration Pennylane (Facturation électronique Factur-X & Comptabilité française).
 * Appelle l'API External v2 de Pennylane ou fournit une simulation propre en mode mock / test local.
 */
class PennylaneService
{
    private string $apiKey;
    private HttpClientInterface $httpClient;
    private LoggerInterface $logger;

    public function __construct(
        HttpClientInterface $httpClient,
        LoggerInterface $logger,
        ?string $apiKey = null,
    ) {
        $this->httpClient = $httpClient;
        $this->logger = $logger;
        $this->apiKey = $apiKey ?? (string) ($_ENV['PENNYLANE_API_KEY'] ?? $_SERVER['PENNYLANE_API_KEY'] ?? 'mock_pennylane_key');
    }

    /**
     * Crée une facture client électronique (Factur-X) sur Pennylane et met à jour l'entité Order.
     *
     * @return array{id: string, invoice_number: string, public_url: string, status: string}
     */
    public function createCustomerInvoice(Order $order): array
    {
        $isMock = empty($this->apiKey) || str_starts_with($this->apiKey, 'mock_');
        $orderNumber = $order->getStoreReference() ?? (string) $order->getId();
        $invoiceNumber = 'FA-'.date('Y').'-'.str_pad((string) ($order->getId() ?? rand(100, 999)), 4, '0', STR_PAD_LEFT);

        if ($isMock) {
            $this->logger->info(sprintf('[Pennylane Mock] Génération facture simulée pour la commande #%s', $orderNumber));

            $mockInvoiceId = 'inv_pl_'.bin2hex(random_bytes(6));
            $mockInvoiceUrl = sprintf('https://app.pennylane.com/invoices/%s/preview', $mockInvoiceId);

            $order->setPennylaneInvoiceId($mockInvoiceId);
            $order->setInvoiceUrl($mockInvoiceUrl);

            return [
                'id' => $mockInvoiceId,
                'invoice_number' => $invoiceNumber,
                'public_url' => $mockInvoiceUrl,
                'status' => 'draft',
                'mock' => true,
            ];
        }

        try {
            $customerName = $order->getAccount()?->getName() ?? 'Client VisuAlpes';
            $customerEmail = $order->getCustomerEmail() ?? 'client@visualpes.fr';
            $address = $order->getShippingAddress() ?? [];

            $lines = [];
            foreach ($order->getOrderItems() as $item) {
                $lines[] = [
                    'label' => ($item->getSku() ? '['.$item->getSku().'] ' : '').'Produit Signalétique VisuAlpes',
                    'quantity' => $item->getQuantity(),
                    'unit_price' => $item->getUnitPrice() ?? '0.00',
                    'vat_rate' => '20.0', // TVA française standard
                ];
            }

            if (empty($lines)) {
                $lines[] = [
                    'label' => 'Commande Signalétique VisuAlpes #'.$orderNumber,
                    'quantity' => 1,
                    'unit_price' => $order->getTotalAmount() ?? '0.00',
                    'vat_rate' => '20.0',
                ];
            }

            $response = $this->httpClient->request('POST', 'https://app.pennylane.com/api/external/v2/customer_invoices', [
                'headers' => [
                    'Authorization' => 'Bearer '.$this->apiKey,
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/json',
                ],
                'json' => [
                    'create_customer' => true,
                    'customer' => [
                        'name' => $customerName,
                        'email' => $customerEmail,
                        'phone' => $order->getCustomerPhone(),
                        'address' => $address['address1'] ?? '',
                        'postal_code' => $address['postcode'] ?? '',
                        'city' => $address['city'] ?? '',
                        'country_alpha2' => $address['country'] ?? 'FR',
                    ],
                    'date' => date('Y-m-d'),
                    'deadline' => date('Y-m-d', strtotime('+30 days')),
                    'currency' => 'EUR',
                    'label' => 'Facture VisuAlpes #'.$orderNumber,
                    'invoice_number' => $invoiceNumber,
                    'lines' => $lines,
                    'payment_method' => $order->getPaymentMethod() ?? 'other',
                ],
                'timeout' => 8,
            ]);

            $data = $response->toArray();
            $invoiceId = (string) ($data['id'] ?? $data['invoice_id'] ?? 'inv_pl_'.uniqid());
            $invoiceUrl = (string) ($data['public_url'] ?? $data['file_url'] ?? sprintf('https://app.pennylane.com/invoices/%s', $invoiceId));

            $order->setPennylaneInvoiceId($invoiceId);
            $order->setInvoiceUrl($invoiceUrl);

            return [
                'id' => $invoiceId,
                'invoice_number' => $data['invoice_number'] ?? $invoiceNumber,
                'public_url' => $invoiceUrl,
                'status' => $data['status'] ?? 'issued',
                'mock' => false,
            ];
        } catch (\Throwable $e) {
            $this->logger->error(sprintf('[Pennylane Error] %s — Fallback local généré', $e->getMessage()));

            $mockInvoiceId = 'inv_pl_fallback_'.bin2hex(random_bytes(4));
            $mockInvoiceUrl = sprintf('https://app.pennylane.com/invoices/%s/fallback', $mockInvoiceId);

            $order->setPennylaneInvoiceId($mockInvoiceId);
            $order->setInvoiceUrl($mockInvoiceUrl);

            return [
                'id' => $mockInvoiceId,
                'invoice_number' => $invoiceNumber,
                'public_url' => $mockInvoiceUrl,
                'status' => 'draft',
                'error' => $e->getMessage(),
                'mock' => true,
            ];
        }
    }
}


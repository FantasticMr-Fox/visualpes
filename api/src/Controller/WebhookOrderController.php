<?php

namespace App\Controller;

use App\Entity\Account;
use App\Entity\Order;
use App\Entity\OrderItem;
use App\Repository\AccountRepository;
use App\Repository\OrderRepository;
use App\Repository\StockItemRepository;
use App\Service\PennylaneService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Récepteur Webhook E-commerce (WooCommerce / Make.com) — Intégration stack FR.
 * Gère le ping WooCommerce, vérifie les signatures (HMAC SHA-256 ou token X-Webhook-Secret),
 * stocke les métadonnées de paiement Stancer/Fintecture, adresse d'expédition Boxtal,
 * et déclenche la facturation Factur-X Pennylane.
 */
final class WebhookOrderController extends AbstractController
{
    #[Route('/api/webhooks/orders', name: 'api_webhook_orders', methods: ['POST'])]
    public function receiveOrder(
        Request $request,
        OrderRepository $orderRepository,
        AccountRepository $accountRepository,
        StockItemRepository $stockItemRepository,
        PennylaneService $pennylaneService,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $rawContent = $request->getContent() ?: '';
        $expectedSecret = (string) ($_ENV['WEBHOOK_SECRET'] ?? $_SERVER['WEBHOOK_SECRET'] ?? 'visualpes-webhook-secret-2026');

        // 1. Validation de l'authentification (X-Webhook-Secret ou X-WC-Webhook-Signature HMAC-SHA256)
        $providedSecret = $request->headers->get('X-Webhook-Secret');
        $wcSignature = $request->headers->get('X-WC-Webhook-Signature');

        if ($wcSignature) {
            $computedSignature = base64_encode(hash_hmac('sha256', $rawContent, $expectedSecret, true));
            if (!hash_equals($computedSignature, $wcSignature)) {
                return $this->json(['error' => 'Signature WooCommerce HMAC-SHA256 invalide.'], Response::HTTP_UNAUTHORIZED);
            }
        } elseif (null !== $providedSecret && '' !== $providedSecret && !hash_equals($expectedSecret, $providedSecret)) {
            return $this->json(['error' => 'Signature X-Webhook-Secret invalide.'], Response::HTTP_UNAUTHORIZED);
        }

        // 2. Gestion du ping initial de test de webhook de WooCommerce
        $webhookEvent = $request->headers->get('X-WC-Webhook-Event');
        if ('ping' === $webhookEvent) {
            return $this->json(['status' => 'pong', 'message' => 'Webhook WooCommerce VisuAlpes connecté avec succès.'], Response::HTTP_OK);
        }

        $payload = json_decode($rawContent ?: '{}', true);
        if (!\is_array($payload)) {
            return $this->json(['error' => 'Payload JSON invalide.'], Response::HTTP_BAD_REQUEST);
        }

        // Si c'est un ping dans le corps JSON
        if (isset($payload['webhook_id']) && !isset($payload['line_items']) && !isset($payload['items'])) {
            return $this->json(['status' => 'pong', 'webhook_id' => $payload['webhook_id']], Response::HTTP_OK);
        }

        // 3. Déduplication / Idempotence (storeReference ou externalOrderId)
        $externalOrderId = trim((string) ($payload['id'] ?? $payload['externalOrderId'] ?? ''));
        $storeReference = trim((string) ($payload['number'] ?? $payload['order_number'] ?? $payload['storeReference'] ?? ($externalOrderId ? 'WC-'.$externalOrderId : '')));

        if ('' !== $storeReference) {
            $existingOrder = $orderRepository->findOneBy(['storeReference' => $storeReference]);
            if (null !== $existingOrder) {
                return $this->json([
                    'id' => $existingOrder->getId(),
                    'storeReference' => $existingOrder->getStoreReference(),
                    'status' => $existingOrder->getStatus(),
                    'pennylaneInvoiceId' => $existingOrder->getPennylaneInvoiceId(),
                    'idempotent' => true,
                ], Response::HTTP_OK);
            }
        }

        // 4. Extraction des informations Client & Facturation
        $billing = \is_array($payload['billing'] ?? null) ? $payload['billing'] : [];
        $shipping = \is_array($payload['shipping'] ?? null) ? $payload['shipping'] : [];

        $customerName = trim((string) (
            $payload['customerName']
            ?? $billing['company']
            ?? trim(($billing['first_name'] ?? '').' '.($billing['last_name'] ?? ''))
            ?? 'Client Boutique Web'
        ));
        if ('' === $customerName) {
            $customerName = 'Client Boutique Web';
        }

        $customerType = strtoupper(trim((string) ($payload['customerType'] ?? (!empty($billing['company']) ? 'B2B' : 'B2C'))));
        if (!\in_array($customerType, ['B2B', 'B2C'], true)) {
            $customerType = 'B2C';
        }

        $account = $accountRepository->findOneBy(['name' => $customerName]);
        if (null === $account) {
            $account = new Account();
            $account->setName($customerName);
            $account->setType($customerType);
            $entityManager->persist($account);
        }

        // 5. Création de l'Order enrichie
        $order = new Order();
        $order->setAccount($account);
        $order->setStatus('pending');
        if ('' !== $storeReference) {
            $order->setStoreReference($storeReference);
        }
        if ('' !== $externalOrderId) {
            $order->setExternalOrderId($externalOrderId);
        }

        // Méthode de paiement (Stancer, Fintecture, virement, etc.)
        $rawPaymentMethod = strtolower((string) ($payload['payment_method'] ?? $payload['paymentMethod'] ?? 'stancer'));
        if (str_contains($rawPaymentMethod, 'stancer')) {
            $order->setPaymentMethod('stancer');
        } elseif (str_contains($rawPaymentMethod, 'fintecture')) {
            $order->setPaymentMethod('fintecture');
        } elseif (str_contains($rawPaymentMethod, 'bacs') || str_contains($rawPaymentMethod, 'virement')) {
            $order->setPaymentMethod('bacs');
        } else {
            $order->setPaymentMethod($rawPaymentMethod ?: 'stancer');
        }

        // Contact client
        $customerEmail = trim((string) ($billing['email'] ?? $payload['customerEmail'] ?? $payload['email'] ?? ''));
        if ('' !== $customerEmail) {
            $order->setCustomerEmail($customerEmail);
        }
        $customerPhone = trim((string) ($billing['phone'] ?? $shipping['phone'] ?? $payload['customerPhone'] ?? ''));
        if ('' !== $customerPhone) {
            $order->setCustomerPhone($customerPhone);
        }

        // Adresse d'expédition normalisée pour Boxtal
        $shippingAddress = [
            'firstName' => $shipping['first_name'] ?? $billing['first_name'] ?? '',
            'lastName' => $shipping['last_name'] ?? $billing['last_name'] ?? '',
            'company' => $shipping['company'] ?? $billing['company'] ?? '',
            'address1' => $shipping['address_1'] ?? $billing['address_1'] ?? '',
            'postcode' => $shipping['postcode'] ?? $billing['postcode'] ?? '',
            'city' => $shipping['city'] ?? $billing['city'] ?? '',
            'country' => $shipping['country'] ?? $billing['country'] ?? 'FR',
        ];
        $order->setShippingAddress($shippingAddress);

        // Montant total
        $total = (string) ($payload['total'] ?? $payload['totalAmount'] ?? '0.00');
        $order->setTotalAmount($total);

        // Notes d'atelier / client
        $notes = trim((string) ($payload['workshopNotes'] ?? $payload['customer_note'] ?? ''));
        if ('' !== $notes) {
            $order->setWorkshopNotes($notes);
        }

        // 6. Lignes de commande & Produits
        $rawItems = \is_array($payload['items'] ?? null)
            ? $payload['items']
            : (\is_array($payload['line_items'] ?? null) ? $payload['line_items'] : []);

        if ([] === $rawItems) {
            return $this->json(['error' => 'La commande doit contenir au moins une ligne (items / line_items).'], Response::HTTP_BAD_REQUEST);
        }

        foreach ($rawItems as $rawItem) {
            if (!\is_array($rawItem)) {
                continue;
            }
            $productName = trim((string) ($rawItem['productName'] ?? $rawItem['name'] ?? 'Support NFC VisuAlpes'));
            $quantity = max(1, (int) ($rawItem['quantity'] ?? 1));
            $unitPrice = (string) ($rawItem['price'] ?? $rawItem['unitPrice'] ?? '0.00');
            $sku = trim((string) ($rawItem['sku'] ?? ''));

            $orderItem = new OrderItem();
            $orderItem->setProductName('' !== $productName ? $productName : 'Support NFC VisuAlpes');
            $orderItem->setQuantity($quantity);
            if ('' !== $sku) {
                $orderItem->setSku($sku);
            }
            if ('' !== $unitPrice) {
                $orderItem->setUnitPrice($unitPrice);
            }

            // Liaison éventuelle avec le catalogue de stock atelier (via code ou name)
            $stockItem = null;
            if (!empty($rawItem['stockItemId'])) {
                $stockItem = $stockItemRepository->find((int) $rawItem['stockItemId']);
            } elseif ('' !== $sku) {
                $stockItem = $stockItemRepository->findOneBy(['code' => $sku]);
            }
            if (null === $stockItem && '' !== $productName) {
                $stockItem = $stockItemRepository->findOneBy(['name' => $productName]);
            }
            if (null !== $stockItem) {
                $orderItem->setStockItem($stockItem);
            }

            $order->addOrderItem($orderItem);
        }

        // 7. Persistance préalable pour attribution ID Doctrine
        $entityManager->persist($order);
        $entityManager->flush();

        // 8. Génération automatique de la facture Factur-X Pennylane
        $invoiceResult = $pennylaneService->createCustomerInvoice($order);
        $entityManager->flush();

        return $this->json([
            'id' => $order->getId(),
            'storeReference' => $order->getStoreReference(),
            'status' => $order->getStatus(),
            'paymentMethod' => $order->getPaymentMethod(),
            'totalAmount' => $order->getTotalAmount(),
            'accountName' => $account->getName(),
            'itemsCount' => $order->getOrderItems()->count(),
            'pennylaneInvoiceId' => $order->getPennylaneInvoiceId(),
            'invoiceUrl' => $order->getInvoiceUrl(),
            'pennylane' => $invoiceResult,
        ], Response::HTTP_CREATED);
    }
}

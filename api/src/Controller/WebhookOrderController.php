<?php

namespace App\Controller;

use App\Entity\Account;
use App\Entity\Order;
use App\Entity\OrderItem;
use App\Repository\AccountRepository;
use App\Repository\OrderRepository;
use App\Repository\StockItemRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Récepteur Webhook E-commerce (Make.com / WooCommerce) — Blueprint V1.0 (Run 2).
 */
final class WebhookOrderController extends AbstractController
{
    #[Route('/api/webhooks/orders', name: 'api_webhook_orders', methods: ['POST'])]
    public function receiveOrder(
        Request $request,
        OrderRepository $orderRepository,
        AccountRepository $accountRepository,
        StockItemRepository $stockItemRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $expectedSecret = (string) ($_ENV['WEBHOOK_SECRET'] ?? $_SERVER['WEBHOOK_SECRET'] ?? 'visualpes-webhook-secret-2026');
        $providedSecret = $request->headers->get('X-Webhook-Secret');

        if (null !== $providedSecret && '' !== $providedSecret && !hash_equals($expectedSecret, $providedSecret)) {
            return $this->json(['error' => 'Signature X-Webhook-Secret invalide.'], Response::HTTP_UNAUTHORIZED);
        }

        $payload = json_decode($request->getContent() ?: '{}', true);
        if (!\is_array($payload)) {
            return $this->json(['error' => 'Payload JSON invalide.'], Response::HTTP_BAD_REQUEST);
        }

        $storeReference = trim((string) ($payload['storeReference'] ?? $payload['number'] ?? $payload['order_number'] ?? ''));
        if ('' !== $storeReference) {
            $existingOrder = $orderRepository->findOneBy(['storeReference' => $storeReference]);
            if (null !== $existingOrder) {
                return $this->json([
                    'id' => $existingOrder->getId(),
                    'storeReference' => $existingOrder->getStoreReference(),
                    'status' => $existingOrder->getStatus(),
                    'idempotent' => true,
                ], Response::HTTP_OK);
            }
        }

        $billing = \is_array($payload['billing'] ?? null) ? $payload['billing'] : [];
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

        $order = new Order();
        $order->setAccount($account);
        $order->setStatus('pending');
        if ('' !== $storeReference) {
            $order->setStoreReference($storeReference);
        }

        $notes = trim((string) ($payload['workshopNotes'] ?? $payload['customer_note'] ?? ''));
        if ('' !== $notes) {
            $order->setWorkshopNotes($notes);
        }

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

            $orderItem = new OrderItem();
            $orderItem->setProductName('' !== $productName ? $productName : 'Support NFC VisuAlpes');
            $orderItem->setQuantity($quantity);

            $stockItem = null;
            if (!empty($rawItem['stockItemId'])) {
                $stockItem = $stockItemRepository->find((int) $rawItem['stockItemId']);
            } elseif (!empty($rawItem['sku'])) {
                $stockItem = $stockItemRepository->findOneBy(['sku' => trim((string) $rawItem['sku'])]);
            }
            if (null !== $stockItem) {
                $orderItem->setStockItem($stockItem);
            }

            $order->addOrderItem($orderItem);
        }

        $entityManager->persist($order);
        $entityManager->flush();

        return $this->json([
            'id' => $order->getId(),
            'storeReference' => $order->getStoreReference(),
            'status' => $order->getStatus(),
            'accountName' => $account->getName(),
            'itemsCount' => $order->getOrderItems()->count(),
        ], Response::HTTP_CREATED);
    }
}


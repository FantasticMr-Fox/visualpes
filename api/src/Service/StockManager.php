<?php

namespace App\Service;

use App\Entity\Order;
use App\Entity\StockItem;
use App\Entity\StockOrder;
use App\Repository\StockItemRepository;
use App\Repository\StockOrderRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Gère la consommation automatique de stock lors du passage d'une commande en fabrication
 * ("processing"), le déclenchement automatique d'une commande de réapprovisionnement
 * (StockOrder) sous le seuil d'alerte, et l'incrémentation du stock à réception.
 */
final readonly class StockManager
{
    public const COMPONENT_CODES = ['patin_tpu', 'socle_ciment', 'plaque_bois'];

    public function __construct(
        private StockItemRepository $stockItemRepository,
        private StockOrderRepository $stockOrderRepository,
        private EntityManagerInterface $entityManager,
    ) {
    }

    public function consumeForOrderIfNeeded(Order $order): void
    {
        if ('processing' !== $order->getStatus() || $order->isStockDeducted()) {
            return;
        }

        $unitsToConsume = 0;
        foreach ($order->getOrderItems() as $orderItem) {
            $unitsToConsume += max(0, (int) $orderItem->getQuantity());
        }
        if (0 === $unitsToConsume) {
            $unitsToConsume = 1;
        }

        foreach (self::COMPONENT_CODES as $code) {
            $stockItem = $this->stockItemRepository->findOneBy(['code' => $code]);
            if (null === $stockItem) {
                continue;
            }

            $stockItem->setQuantity($stockItem->getQuantity() - $unitsToConsume);
            $this->ensureReplenishmentIfBelowThreshold($stockItem);
        }

        $order->setStockDeducted(true);
    }

    public function ensureReplenishmentIfBelowThreshold(StockItem $stockItem): ?StockOrder
    {
        if ($stockItem->getQuantity() > $stockItem->getAlertThreshold()) {
            return null;
        }

        foreach ($stockItem->getStockOrders() as $existing) {
            if (\in_array($existing->getStatus(), [StockOrder::STATUS_PENDING, StockOrder::STATUS_ORDERED], true)) {
                return null;
            }
        }

        if ($this->stockOrderRepository->hasOpenOrderForItem($stockItem)) {
            return null;
        }

        $deficit = max(0, $stockItem->getAlertThreshold() - $stockItem->getQuantity());
        $qtyToOrder = max($stockItem->getReorderQuantity(), $deficit + $stockItem->getReorderQuantity());

        $stockOrder = (new StockOrder())
            ->setStockItem($stockItem)
            ->setQuantity($qtyToOrder)
            ->setStatus(StockOrder::STATUS_PENDING)
            ->setIsAuto(true);

        $stockItem->getStockOrders()->add($stockOrder);
        $this->entityManager->persist($stockOrder);

        return $stockOrder;
    }

    public function applyStockOrderReceiptIfNeeded(StockOrder $stockOrder): void
    {
        if (StockOrder::STATUS_RECEIVED !== $stockOrder->getStatus() || null !== $stockOrder->getReceivedAt()) {
            return;
        }

        $stockItem = $stockOrder->getStockItem();
        if (null !== $stockItem) {
            $stockItem->setQuantity($stockItem->getQuantity() + $stockOrder->getQuantity());
        }

        $stockOrder->setReceivedAt(new \DateTimeImmutable());
    }
}

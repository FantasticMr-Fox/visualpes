<?php

namespace App\Service;

use App\Entity\Order;
use App\Entity\OrderItem;
use App\Entity\StockItem;
use App\Repository\OrderRepository;
use App\Repository\StockItemRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Gère le stock de l'atelier (où VisuAlpes est son propre fabricant/fournisseur) :
 * 1. Lorsqu'une commande client passe en fabrication ("processing"), déduit 1 patin TPU +
 *    1 socle ciment + 1 plaque bois par support commandé.
 * 2. Dès qu'un composant passe sous son seuil d'alerte (quantity <= alertThreshold), génère
 *    automatiquement une fiche de commande interne (Order avec isStockOrder=true) directement
 *    dans le Kanban de production (sans doublon tant qu'une fiche stock est déjà ouverte).
 * 3. Lorsqu'une fiche de commande de stock passe à "completed" ("Terminé"), ré-incrémente
 *    automatiquement le stock du composant fabriqué.
 */
final readonly class StockManager
{
    public const COMPONENT_CODES = ['patin_tpu', 'socle_ciment', 'plaque_bois'];

    public function __construct(
        private StockItemRepository $stockItemRepository,
        private OrderRepository $orderRepository,
        private EntityManagerInterface $entityManager,
    ) {
    }

    public function handleOrderTransition(Order $order): void
    {
        if ($order->getIsStockOrder()) {
            $this->creditStockWhenCompleted($order);

            return;
        }

        $this->consumeForClientOrderIfNeeded($order);
    }

    private function consumeForClientOrderIfNeeded(Order $order): void
    {
        if ('processing' !== $order->getStatus() || $order->getStockDeducted()) {
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

    private function creditStockWhenCompleted(Order $order): void
    {
        if ('completed' !== $order->getStatus() || $order->getStockCredited()) {
            return;
        }

        $stockItem = $order->getTargetStockItem();
        if (null === $stockItem) {
            return;
        }

        $producedUnits = 0;
        foreach ($order->getOrderItems() as $orderItem) {
            $producedUnits += max(0, (int) $orderItem->getQuantity());
        }
        if (0 === $producedUnits) {
            $producedUnits = $stockItem->getReorderQuantity();
        }

        $stockItem->setQuantity($stockItem->getQuantity() + $producedUnits);
        $order->setStockCredited(true);
    }

    public function ensureReplenishmentIfBelowThreshold(StockItem $stockItem): ?Order
    {
        if ($stockItem->getQuantity() > $stockItem->getAlertThreshold()) {
            return null;
        }

        foreach ($stockItem->getStockReplenishmentOrders() as $existing) {
            if ('completed' !== $existing->getStatus()) {
                return null;
            }
        }

        if ($this->orderRepository->hasOpenStockOrderForItem($stockItem)) {
            return null;
        }

        $deficit = max(0, $stockItem->getAlertThreshold() - $stockItem->getQuantity());
        $qtyToProduce = max($stockItem->getReorderQuantity(), $deficit + $stockItem->getReorderQuantity());

        $itemLine = (new OrderItem())
            ->setProductName(\sprintf('Production stock : %s', $stockItem->getName()))
            ->setQuantity($qtyToProduce);

        $stockOrder = (new Order())
            ->setStatus('pending')
            ->setIsStockOrder(true)
            ->setTargetStockItem($stockItem)
            ->addOrderItem($itemLine);

        $stockItem->getStockReplenishmentOrders()->add($stockOrder);
        $this->entityManager->persist($stockOrder);

        return $stockOrder;
    }
}

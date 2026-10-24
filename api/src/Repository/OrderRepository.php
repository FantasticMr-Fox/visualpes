<?php

namespace App\Repository;

use App\Entity\Order;
use App\Entity\StockItem;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Order>
 */
class OrderRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Order::class);
    }

    public function hasOpenStockOrderForItem(StockItem $stockItem): bool
    {
        if (null === $stockItem->getId()) {
            return false;
        }

        $count = (int) $this->createQueryBuilder('o')
            ->select('COUNT(o.id)')
            ->where('o.isStockOrder = true')
            ->andWhere('o.targetStockItem = :item')
            ->andWhere('o.status != :completed')
            ->setParameter('item', $stockItem)
            ->setParameter('completed', 'completed')
            ->getQuery()
            ->getSingleScalarResult();

        return $count > 0;
    }
}

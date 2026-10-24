<?php

namespace App\Repository;

use App\Entity\StockItem;
use App\Entity\StockOrder;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<StockOrder>
 */
class StockOrderRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, StockOrder::class);
    }

    public function hasOpenOrderForItem(StockItem $stockItem): bool
    {
        if (null === $stockItem->getId()) {
            return false;
        }

        $count = (int) $this->createQueryBuilder('so')
            ->select('COUNT(so.id)')
            ->where('so.stockItem = :item')
            ->andWhere('so.status IN (:openStatuses)')
            ->setParameter('item', $stockItem)
            ->setParameter('openStatuses', [StockOrder::STATUS_PENDING, StockOrder::STATUS_ORDERED])
            ->getQuery()
            ->getSingleScalarResult();

        return $count > 0;
    }
}

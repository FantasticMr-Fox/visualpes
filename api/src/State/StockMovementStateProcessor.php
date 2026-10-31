<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\StockMovement;
use App\Service\StockManager;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * @implements ProcessorInterface<StockMovement, StockMovement>
 */
final readonly class StockMovementStateProcessor implements ProcessorInterface
{
    /**
     * @param ProcessorInterface<StockMovement, StockMovement> $persistProcessor
     */
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private ProcessorInterface $persistProcessor,
        private StockManager $stockManager,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        if ($data instanceof StockMovement) {
            $stockItem = $data->getStockItem();
            if ($stockItem) {
                $qty = abs($data->getQuantity());

                if ('in' === $data->getType()) {
                    $stockItem->setQuantity($stockItem->getQuantity() + $qty);
                } elseif ('out' === $data->getType()) {
                    $stockItem->setQuantity(max(0, $stockItem->getQuantity() - $qty));
                }

                $stockItem->setUpdatedAt(new \DateTimeImmutable());
                $this->stockManager->ensureReplenishmentIfBelowThreshold($stockItem);
            }
        }

        return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
    }
}


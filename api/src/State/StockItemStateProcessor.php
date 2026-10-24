<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\StockItem;
use App\Service\StockManager;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * @implements ProcessorInterface<StockItem, StockItem>
 */
final readonly class StockItemStateProcessor implements ProcessorInterface
{
    /**
     * @param ProcessorInterface<StockItem, StockItem> $persistProcessor
     */
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private ProcessorInterface $persistProcessor,
        private StockManager $stockManager,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        if ($data instanceof StockItem) {
            $this->stockManager->ensureReplenishmentIfBelowThreshold($data);
        }

        return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
    }
}

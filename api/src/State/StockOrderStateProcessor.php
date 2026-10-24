<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\StockOrder;
use App\Service\StockManager;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * @implements ProcessorInterface<StockOrder, StockOrder>
 */
final readonly class StockOrderStateProcessor implements ProcessorInterface
{
    /**
     * @param ProcessorInterface<StockOrder, StockOrder> $persistProcessor
     */
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private ProcessorInterface $persistProcessor,
        private StockManager $stockManager,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        if ($data instanceof StockOrder) {
            $this->stockManager->applyStockOrderReceiptIfNeeded($data);
        }

        return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
    }
}

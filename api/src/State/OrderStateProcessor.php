<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Order;
use App\Service\StockManager;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * @implements ProcessorInterface<Order, Order>
 */
final readonly class OrderStateProcessor implements ProcessorInterface
{
    /**
     * @param ProcessorInterface<Order, Order> $persistProcessor
     */
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private ProcessorInterface $persistProcessor,
        private StockManager $stockManager,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        if ($data instanceof Order) {
            foreach ($data->getOrderItems() as $item) {
                if (null === $item->getParentOrder()) {
                    $item->setParentOrder($data);
                }
            }
            $this->stockManager->handleOrderTransition($data);
        }

        return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
    }
}

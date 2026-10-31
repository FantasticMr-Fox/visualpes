<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\SupplierOrder;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * @implements ProcessorInterface<SupplierOrder, SupplierOrder>
 */
final readonly class SupplierOrderStateProcessor implements ProcessorInterface
{
    /**
     * @param ProcessorInterface<SupplierOrder, SupplierOrder> $persistProcessor
     */
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private ProcessorInterface $persistProcessor,
        private EntityManagerInterface $entityManager,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        if ($data instanceof SupplierOrder) {
            // Relier les articles au bon de commande parent
            foreach ($data->getItems() as $item) {
                if (null === $item->getSupplierOrder()) {
                    $item->setSupplierOrder($data);
                }
            }

            // Si le statut passe à 'sent'
            if ('sent' === $data->getStatus() && null === $data->getSentAt()) {
                $data->setSentAt(new \DateTimeImmutable());
                // Marquer les matières premières liées comme étant en commande
                foreach ($data->getItems() as $item) {
                    $stockItem = $item->getStockItem();
                    if ($stockItem && 'raw_material' === $stockItem->getType()) {
                        $stockItem->setSupplierOrderStatus('ordered');
                        $stockItem->setSupplierOrderQuantity($item->getQuantity());
                    }
                }
            }

            // Si le statut passe à 'received' : incrémenter le stock correspondant
            if ('received' === $data->getStatus() && null === $data->getReceivedAt()) {
                $data->setReceivedAt(new \DateTimeImmutable());
                foreach ($data->getItems() as $item) {
                    $stockItem = $item->getStockItem();
                    if ($stockItem) {
                        $stockItem->setQuantity($stockItem->getQuantity() + $item->getQuantity());
                        $stockItem->setSupplierOrderStatus('none');
                        $stockItem->setSupplierOrderQuantity(null);
                    }
                }
            }
        }

        return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
    }
}


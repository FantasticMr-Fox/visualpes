<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\NfcTag;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * @implements ProcessorInterface<NfcTag, NfcTag>
 */
final readonly class NfcTagStateProcessor implements ProcessorInterface
{
    /**
     * @param ProcessorInterface<NfcTag, NfcTag> $persistProcessor
     */
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private ProcessorInterface $persistProcessor,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        if ($data instanceof NfcTag) {
            if (null !== $data->getShortUid()) {
                $data->setShortUid(strtoupper(trim($data->getShortUid())));
            }

            if (\in_array($data->getStatus(), ['encoded', 'assigned'], true) && null === $data->getEncodeAt()) {
                $data->setEncodeAt(new \DateTime());
            }
        }

        return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
    }
}


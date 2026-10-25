<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\Metadata\Post;
use ApiPlatform\State\ProcessorInterface;
use App\AI\RagConciergeService;
use App\Entity\SupportTicket;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Exécute automatiquement le triage IA & la génération de brouillon RAG (`aiDraft`, `aiConfidence`, `issueType`)
 * lors de la création d'un ticket SAV ou lorsque la régénération du diagnostic IA est demandée.
 *
 * @implements ProcessorInterface<SupportTicket, SupportTicket>
 */
final readonly class SupportTicketStateProcessor implements ProcessorInterface
{
    /**
     * @param ProcessorInterface<SupportTicket, SupportTicket> $persistProcessor
     */
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private ProcessorInterface $persistProcessor,
        private RagConciergeService $ragConcierge,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        if (!$data instanceof SupportTicket) {
            return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
        }

        if (null === $data->getProperty() && null !== $data->getNfcTag()?->getZone()?->getProperty()) {
            $data->setProperty($data->getNfcTag()->getZone()->getProperty());
        }

        $shouldRunAiTriage = $operation instanceof Post
            || null === $data->getAiDraft()
            || '' === trim((string) $data->getAiDraft());

        if ($shouldRunAiTriage) {
            $triage = $this->ragConcierge->triageSupportTicket($data);
            $data->setIssueType($triage['issueType']);
            $data->setAiDraft($triage['aiDraft']);
            $data->setAiConfidence($triage['aiConfidence']);
        }

        return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
    }
}


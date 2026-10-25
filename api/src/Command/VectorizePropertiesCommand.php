<?php

namespace App\Command;

use App\AI\RagConciergeService;
use App\Repository\PropertyRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:vectorize-properties',
    description: 'Calcule et met à jour les vecteurs RAG (instructionsVector) de tous les logements VisuAlpes.',
)]
final class VectorizePropertiesCommand extends Command
{
    public function __construct(
        private readonly PropertyRepository $propertyRepository,
        private readonly RagConciergeService $ragConcierge,
        private readonly EntityManagerInterface $entityManager,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $properties = $this->propertyRepository->findAll();

        if ([] === $properties) {
            $io->warning('Aucune propriété à vectoriser.');

            return Command::SUCCESS;
        }

        $rows = [];
        foreach ($properties as $property) {
            $vector = $this->ragConcierge->vectorizeProperty($property);
            $nonZero = \count(array_filter($vector, static fn (float $v): bool => abs($v) > 1e-6));
            $rows[] = [
                (string) $property->getId(),
                (string) $property->getName(),
                \sprintf('%d dim (%d actives)', \count($vector), $nonZero),
            ];
        }

        $this->entityManager->flush();

        $io->table(['ID', 'Propriété', 'Vecteur RAG'], $rows);
        $io->success(\sprintf('%d propriété(s) vectorisée(s) avec succès.', \count($properties)));

        return Command::SUCCESS;
    }
}


<?php

namespace App\Command;

use App\Entity\StockItem;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(
    name: 'app:init-stock-categories',
    description: 'Initialise les types de stock (matières premières vs produits préproduits)',
)]
final class InitStockCategoriesCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $repo = $this->entityManager->getRepository(StockItem::class);

        // Update existing
        if ($tpu = $repo->findOneBy(['code' => 'bobine_tpu'])) {
            $tpu->setType('raw_material');
            $tpu->setName('Bobine Filament TPU Noir (1kg)');
            $tpu->setSupplier('Extrud3D Europe');
        }
        if ($patin = $repo->findOneBy(['code' => 'patin_tpu'])) {
            $patin->setType('pre_produced');
            $patin->setName('Patin TPU Antidérapant (Préproduit)');
        }
        if ($bois = $repo->findOneBy(['code' => 'plaque_bois'])) {
            $bois->setType('pre_produced');
            $bois->setName('Plaque Bois Usinée (Prête personnalisation)');
        }
        if ($ciment = $repo->findOneBy(['code' => 'socle_ciment'])) {
            $ciment->setType('pre_produced');
            $ciment->setName('Socle Ciment Coulé (Prêt assemblage)');
        }

        // Add new raw materials if not existing
        $raws = [
            [
                'code' => 'puce_nfc_ntag',
                'name' => 'Puces NFC NTAG213 (Rouleau 25mm)',
                'unit' => 'pcs',
                'qty' => 350,
                'threshold' => 100,
                'reorder' => 500,
                'supplier' => 'NXP Semiconductors / Identiv',
            ],
            [
                'code' => 'bois_meleze_brut',
                'name' => 'Plot Bois Mélèze Alpin Massif',
                'unit' => 'm²',
                'qty' => 15,
                'threshold' => 5,
                'reorder' => 20,
                'supplier' => 'Scierie Artisanale du Mont-Blanc',
            ],
            [
                'code' => 'sac_ciment_fibre',
                'name' => 'Ciment Fin Architectural 25kg',
                'unit' => 'sac',
                'qty' => 8,
                'threshold' => 3,
                'reorder' => 10,
                'supplier' => 'Matériaux & Bétons de Savoie',
            ],
            [
                'code' => 'plaque_laiton_brut',
                'name' => 'Feuilles Laiton Brossé 1mm',
                'unit' => 'pcs',
                'qty' => 45,
                'threshold' => 15,
                'reorder' => 50,
                'supplier' => 'Métaux Alpins Précision',
            ],
        ];

        foreach ($raws as $r) {
            if (!$repo->findOneBy(['code' => $r['code']])) {
                $item = new StockItem();
                $item->setCode($r['code']);
                $item->setName($r['name']);
                $item->setType('raw_material');
                $item->setUnit($r['unit']);
                $item->setQuantity($r['qty']);
                $item->setAlertThreshold($r['threshold']);
                $item->setReorderQuantity($r['reorder']);
                $item->setSupplier($r['supplier']);
                $this->entityManager->persist($item);
            }
        }

        $this->entityManager->flush();

        $output->writeln('<info>Stock items categorized and initialized successfully.</info>');

        return Command::SUCCESS;
    }
}

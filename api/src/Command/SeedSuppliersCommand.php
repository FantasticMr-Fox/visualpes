<?php

namespace App\Command;

use App\Entity\StockItem;
use App\Entity\Supplier;
use App\Entity\SupplierOrder;
use App\Entity\SupplierOrderItem;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(
    name: 'app:seed-suppliers',
    description: 'Seed default suppliers and link them with raw materials'
)]
class SeedSuppliersCommand extends Command
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $supplierRepo = $this->em->getRepository(Supplier::class);
        $stockRepo = $this->em->getRepository(StockItem::class);

        $suppliersData = [
            [
                'name' => 'Scierie Artisanale du Mont-Blanc',
                'contactName' => 'Jean-Marc D.',
                'email' => 'commandes@scierie-montblanc.fr',
                'phone' => '04 50 12 34 56',
                'address' => '124 Route des Alpages, 74400 Chamonix',
                'leadTimeDays' => 7,
                'notes' => 'Fournisseur de mélèze alpin sélectionné PEFC. Livraison le mardi.',
                'linkedCodes' => ['bois_meleze_brut'],
            ],
            [
                'name' => 'Matériaux & Bétons de Savoie',
                'contactName' => 'Claire L.',
                'email' => 'contact@betons-savoie.fr',
                'phone' => '04 79 33 22 11',
                'address' => '45 ZI des Glaires, 73000 Chambéry',
                'leadTimeDays' => 4,
                'notes' => 'Ciments fins architecturaux ultra-haute performance.',
                'linkedCodes' => ['sac_ciment_fibre'],
            ],
            [
                'name' => 'Extrud3D Europe',
                'contactName' => 'Marc Dupont',
                'email' => 'b2b@extrud3d.eu',
                'phone' => '01 45 67 89 00',
                'address' => ' Parc Technologique, 69007 Lyon',
                'leadTimeDays' => 3,
                'notes' => 'Filaments techniques TPU 95A, PETG et composites carbone.',
                'linkedCodes' => ['bobine_tpu'],
            ],
            [
                'name' => 'Métaux Alpins Précision',
                'contactName' => 'Alain Rey',
                'email' => 'pro@metaux-alpins.fr',
                'phone' => '04 50 98 76 54',
                'address' => '8 Rue de la Fonderie, 74300 Cluses',
                'leadTimeDays' => 5,
                'notes' => 'Décolletage de haute précision, inserts taraudés laiton et inox.',
                'linkedCodes' => ['insert_metal'],
            ],
            [
                'name' => 'Alpes RFID Solutions',
                'contactName' => 'Sophie V.',
                'email' => 'orders@alpes-rfid.com',
                'phone' => '04 76 55 44 33',
                'address' => '18 Avenue Innovallée, 38240 Meylan',
                'leadTimeDays' => 4,
                'notes' => 'Puces NFC NTAG213 & NTAG215 étanches haute durabilité.',
                'linkedCodes' => ['puce_nfc'],
            ],
        ];

        $createdSuppliers = [];

        foreach ($suppliersData as $data) {
            $existing = $supplierRepo->findOneBy(['name' => $data['name']]);
            if (!$existing) {
                $supplier = new Supplier();
                $supplier->setName($data['name']);
                $supplier->setContactName($data['contactName']);
                $supplier->setEmail($data['email']);
                $supplier->setPhone($data['phone']);
                $supplier->setAddress($data['address']);
                $supplier->setLeadTimeDays($data['leadTimeDays']);
                $supplier->setNotes($data['notes']);
                $this->em->persist($supplier);
                $output->writeln("Created supplier: {$data['name']}");
                $createdSuppliers[$data['name']] = $supplier;
            } else {
                $createdSuppliers[$data['name']] = $existing;
            }

            // Sync supplier name in StockItems
            foreach ($data['linkedCodes'] as $code) {
                $stockItem = $stockRepo->findOneBy(['code' => $code]);
                if ($stockItem) {
                    $stockItem->setSupplier($data['name']);
                }
            }
        }

        $this->em->flush();

        // Create a sample purchase order if none exists
        $orderRepo = $this->em->getRepository(SupplierOrder::class);
        if ($orderRepo->count([]) === 0 && isset($createdSuppliers['Scierie Artisanale du Mont-Blanc'])) {
            $supplier = $createdSuppliers['Scierie Artisanale du Mont-Blanc'];
            $stockItem = $stockRepo->findOneBy(['code' => 'bois_meleze_brut']);

            $order = new SupplierOrder();
            $order->setReference('BC-2026-0001');
            $order->setSupplier($supplier);
            $order->setStatus('draft');
            $order->setNotes('Commande test de réapprovisionnement bois de mélèze certifié.');
            $order->setExpectedDeliveryDate(new \DateTimeImmutable('+7 days'));

            $item = new SupplierOrderItem();
            $item->setSupplierOrder($order);
            $item->setStockItem($stockItem);
            $item->setProductName($stockItem ? $stockItem->getName() : 'Plot Bois Mélèze Alpin Massif');
            $item->setQuantity(20);
            $item->setUnit('plots');
            $item->setUnitPrice(45.50);

            $order->addItem($item);
            $this->em->persist($order);
            $this->em->flush();
            $output->writeln("Created sample supplier order: BC-2026-0001");
        }

        $output->writeln('Suppliers seeding completed!');
        return Command::SUCCESS;
    }
}


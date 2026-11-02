<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261101112217 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE "order" ADD external_order_id VARCHAR(100) DEFAULT NULL');
        $this->addSql('ALTER TABLE "order" ADD payment_method VARCHAR(50) DEFAULT NULL');
        $this->addSql('ALTER TABLE "order" ADD customer_email VARCHAR(180) DEFAULT NULL');
        $this->addSql('ALTER TABLE "order" ADD customer_phone VARCHAR(50) DEFAULT NULL');
        $this->addSql('ALTER TABLE "order" ADD shipping_address JSON DEFAULT NULL');
        $this->addSql('ALTER TABLE "order" ADD total_amount NUMERIC(10, 2) DEFAULT NULL');
        $this->addSql('ALTER TABLE "order" ADD carrier VARCHAR(50) DEFAULT NULL');
        $this->addSql('ALTER TABLE "order" ADD label_url TEXT DEFAULT NULL');
        $this->addSql('ALTER TABLE "order" ADD pennylane_invoice_id VARCHAR(100) DEFAULT NULL');
        $this->addSql('ALTER TABLE "order" ADD invoice_url TEXT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE "order" DROP external_order_id');
        $this->addSql('ALTER TABLE "order" DROP payment_method');
        $this->addSql('ALTER TABLE "order" DROP customer_email');
        $this->addSql('ALTER TABLE "order" DROP customer_phone');
        $this->addSql('ALTER TABLE "order" DROP shipping_address');
        $this->addSql('ALTER TABLE "order" DROP total_amount');
        $this->addSql('ALTER TABLE "order" DROP carrier');
        $this->addSql('ALTER TABLE "order" DROP label_url');
        $this->addSql('ALTER TABLE "order" DROP pennylane_invoice_id');
        $this->addSql('ALTER TABLE "order" DROP invoice_url');
    }
}

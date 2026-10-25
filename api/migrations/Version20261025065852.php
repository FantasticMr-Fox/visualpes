<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261025065852 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Blueprint V1.0 : extension pgvector, Property.instructionsVector, Order.storeReference et enrichissement IA SupportTicket';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE EXTENSION IF NOT EXISTS vector');
        $this->addSql('ALTER TABLE "order" ADD store_reference VARCHAR(100) DEFAULT NULL');
        $this->addSql('ALTER TABLE property ADD instructions_vector JSON DEFAULT NULL');
        $this->addSql('ALTER TABLE support_ticket ADD issue_type VARCHAR(50) DEFAULT \'other\' NOT NULL');
        $this->addSql('ALTER TABLE support_ticket ADD is_ai_resolved BOOLEAN DEFAULT false NOT NULL');
        $this->addSql('ALTER TABLE support_ticket ADD property_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE support_ticket ADD nfc_tag_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE support_ticket ADD CONSTRAINT FK_1F5A4D53549213EC FOREIGN KEY (property_id) REFERENCES property (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE support_ticket ADD CONSTRAINT FK_1F5A4D538334582F FOREIGN KEY (nfc_tag_id) REFERENCES nfc_tag (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('CREATE INDEX IDX_1F5A4D53549213EC ON support_ticket (property_id)');
        $this->addSql('CREATE INDEX IDX_1F5A4D538334582F ON support_ticket (nfc_tag_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE "order" DROP store_reference');
        $this->addSql('ALTER TABLE property DROP instructions_vector');
        $this->addSql('ALTER TABLE support_ticket DROP CONSTRAINT FK_1F5A4D53549213EC');
        $this->addSql('ALTER TABLE support_ticket DROP CONSTRAINT FK_1F5A4D538334582F');
        $this->addSql('DROP INDEX IDX_1F5A4D53549213EC');
        $this->addSql('DROP INDEX IDX_1F5A4D538334582F');
        $this->addSql('ALTER TABLE support_ticket DROP issue_type');
        $this->addSql('ALTER TABLE support_ticket DROP is_ai_resolved');
        $this->addSql('ALTER TABLE support_ticket DROP property_id');
        $this->addSql('ALTER TABLE support_ticket DROP nfc_tag_id');
    }
}

<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261026150002 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE account ADD contact_email VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE account ADD contact_phone VARCHAR(50) DEFAULT NULL');
        $this->addSql('ALTER TABLE account ADD billing_address VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE account ADD notes TEXT DEFAULT NULL');
        $this->addSql('ALTER TABLE account ADD created_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE account DROP contact_email');
        $this->addSql('ALTER TABLE account DROP contact_phone');
        $this->addSql('ALTER TABLE account DROP billing_address');
        $this->addSql('ALTER TABLE account DROP notes');
        $this->addSql('ALTER TABLE account DROP created_at');
    }
}

<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261023144633 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE property ADD wifi_password VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE property RENAME COLUMN wifi_code TO wifi_ssid');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE property ADD wifi_code VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE property DROP wifi_ssid');
        $this->addSql('ALTER TABLE property DROP wifi_password');
    }
}

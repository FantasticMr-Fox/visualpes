<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261024205313 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE property ADD wifi_access_code VARCHAR(512) DEFAULT NULL');
        $this->addSql('ALTER TABLE property ALTER wifi_ssid TYPE VARCHAR(512)');
        $this->addSql('ALTER TABLE property ALTER wifi_password TYPE VARCHAR(512)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE property DROP wifi_access_code');
        $this->addSql('ALTER TABLE property ALTER wifi_ssid TYPE VARCHAR(255)');
        $this->addSql('ALTER TABLE property ALTER wifi_password TYPE VARCHAR(255)');
    }
}

<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261026144959 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE property ADD address VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE property ADD resort VARCHAR(120) DEFAULT NULL');
        $this->addSql('ALTER TABLE property ADD typology VARCHAR(60) DEFAULT \'Chalet\'');
        $this->addSql('ALTER TABLE property ADD capacity INT DEFAULT NULL');
        $this->addSql('ALTER TABLE property ADD bedrooms INT DEFAULT NULL');
        $this->addSql('ALTER TABLE property ADD key_box_code VARCHAR(100) DEFAULT NULL');
        $this->addSql('ALTER TABLE property ADD cover_image_url VARCHAR(512) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE property DROP address');
        $this->addSql('ALTER TABLE property DROP resort');
        $this->addSql('ALTER TABLE property DROP typology');
        $this->addSql('ALTER TABLE property DROP capacity');
        $this->addSql('ALTER TABLE property DROP bedrooms');
        $this->addSql('ALTER TABLE property DROP key_box_code');
        $this->addSql('ALTER TABLE property DROP cover_image_url');
    }
}

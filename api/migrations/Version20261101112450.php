<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261101112450 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE order_item ADD sku VARCHAR(80) DEFAULT NULL');
        $this->addSql('ALTER TABLE order_item ADD unit_price NUMERIC(10, 2) DEFAULT NULL');
        $this->addSql('ALTER TABLE order_item ADD stock_item_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE order_item ADD CONSTRAINT FK_52EA1F09BC942FD FOREIGN KEY (stock_item_id) REFERENCES stock_item (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('CREATE INDEX IDX_52EA1F09BC942FD ON order_item (stock_item_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE order_item DROP CONSTRAINT FK_52EA1F09BC942FD');
        $this->addSql('DROP INDEX IDX_52EA1F09BC942FD');
        $this->addSql('ALTER TABLE order_item DROP sku');
        $this->addSql('ALTER TABLE order_item DROP unit_price');
        $this->addSql('ALTER TABLE order_item DROP stock_item_id');
    }
}

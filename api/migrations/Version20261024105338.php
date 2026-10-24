<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261024105338 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE nfc_tag ADD zone_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE nfc_tag ADD order_item_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE nfc_tag ADD CONSTRAINT FK_297C78799F2C3FAB FOREIGN KEY (zone_id) REFERENCES zone (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE nfc_tag ADD CONSTRAINT FK_297C7879E415FB15 FOREIGN KEY (order_item_id) REFERENCES order_item (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('CREATE INDEX IDX_297C78799F2C3FAB ON nfc_tag (zone_id)');
        $this->addSql('CREATE INDEX IDX_297C7879E415FB15 ON nfc_tag (order_item_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE nfc_tag DROP CONSTRAINT FK_297C78799F2C3FAB');
        $this->addSql('ALTER TABLE nfc_tag DROP CONSTRAINT FK_297C7879E415FB15');
        $this->addSql('DROP INDEX IDX_297C78799F2C3FAB');
        $this->addSql('DROP INDEX IDX_297C7879E415FB15');
        $this->addSql('ALTER TABLE nfc_tag DROP zone_id');
        $this->addSql('ALTER TABLE nfc_tag DROP order_item_id');
    }
}

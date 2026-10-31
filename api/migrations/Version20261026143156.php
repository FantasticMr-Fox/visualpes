<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261026143156 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE user_property (user_id INT NOT NULL, property_id INT NOT NULL, PRIMARY KEY (user_id, property_id))');
        $this->addSql('CREATE INDEX IDX_6B7FF8DEA76ED395 ON user_property (user_id)');
        $this->addSql('CREATE INDEX IDX_6B7FF8DE549213EC ON user_property (property_id)');
        $this->addSql('ALTER TABLE user_property ADD CONSTRAINT FK_6B7FF8DEA76ED395 FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE user_property ADD CONSTRAINT FK_6B7FF8DE549213EC FOREIGN KEY (property_id) REFERENCES property (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE user_property DROP CONSTRAINT FK_6B7FF8DEA76ED395');
        $this->addSql('ALTER TABLE user_property DROP CONSTRAINT FK_6B7FF8DE549213EC');
        $this->addSql('DROP TABLE user_property');
    }
}

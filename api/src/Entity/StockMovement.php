<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use App\State\StockMovementStateProcessor;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity]
#[ApiResource(
    operations: [
        new GetCollection(order: ['createdAt' => 'DESC'], paginationItemsPerPage: 40),
        new Get(),
        new Post(processor: StockMovementStateProcessor::class),
        new Delete(),
    ],
    normalizationContext: ['groups' => ['stock_movement:read']],
    denormalizationContext: ['groups' => ['stock_movement:write']],
    security: "is_granted('ROLE_ADMIN')",
)]
class StockMovement
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['stock_movement:read'])]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'movements')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    #[Assert\NotNull]
    #[Groups(['stock_movement:read', 'stock_movement:write'])]
    private ?StockItem $stockItem = null;

    #[ORM\Column(length: 20)]
    #[Assert\Choice(choices: ['in', 'out', 'adjustment'])]
    #[Groups(['stock_movement:read', 'stock_movement:write'])]
    private string $type = 'in';

    #[ORM\Column]
    #[Assert\Positive]
    #[Groups(['stock_movement:read', 'stock_movement:write'])]
    private int $quantity = 1;

    #[ORM\Column(length: 100, nullable: true)]
    #[Groups(['stock_movement:read', 'stock_movement:write'])]
    private ?string $reference = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['stock_movement:read', 'stock_movement:write'])]
    private ?string $notes = null;

    #[ORM\Column]
    #[Groups(['stock_movement:read'])]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getStockItem(): ?StockItem
    {
        return $this->stockItem;
    }

    public function setStockItem(?StockItem $stockItem): static
    {
        $this->stockItem = $stockItem;

        return $this;
    }

    public function getType(): string
    {
        return $this->type;
    }

    public function setType(string $type): static
    {
        $this->type = $type;

        return $this;
    }

    public function getQuantity(): int
    {
        return $this->quantity;
    }

    public function setQuantity(int $quantity): static
    {
        $this->quantity = $quantity;

        return $this;
    }

    public function getReference(): ?string
    {
        return $this->reference;
    }

    public function setReference(?string $reference): static
    {
        $this->reference = $reference;

        return $this;
    }

    public function getNotes(): ?string
    {
        return $this->notes;
    }

    public function setNotes(?string $notes): static
    {
        $this->notes = $notes;

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeImmutable $createdAt): static
    {
        $this->createdAt = $createdAt;

        return $this;
    }
}


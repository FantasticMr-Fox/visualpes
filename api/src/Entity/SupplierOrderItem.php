<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity]
#[ApiResource(
    operations: [
        new GetCollection(),
        new Get(),
        new Post(),
        new Patch(),
        new Delete(),
    ],
    normalizationContext: ['groups' => ['supplier_order:read']],
    denormalizationContext: ['groups' => ['supplier_order:write']],
    security: "is_granted('ROLE_ADMIN')",
)]
class SupplierOrderItem
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['supplier_order:read'])]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'items')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?SupplierOrder $supplierOrder = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    #[Groups(['supplier_order:read', 'supplier_order:write'])]
    private ?StockItem $stockItem = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank]
    #[Groups(['supplier_order:read', 'supplier_order:write'])]
    private ?string $productName = null;

    #[ORM\Column]
    #[Assert\Positive]
    #[Groups(['supplier_order:read', 'supplier_order:write'])]
    private int $quantity = 1;

    #[ORM\Column(length: 20, options: ['default' => 'pcs'])]
    #[Groups(['supplier_order:read', 'supplier_order:write'])]
    private string $unit = 'pcs';

    #[ORM\Column(nullable: true)]
    #[Groups(['supplier_order:read', 'supplier_order:write'])]
    private ?float $unitPrice = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getSupplierOrder(): ?SupplierOrder
    {
        return $this->supplierOrder;
    }

    public function setSupplierOrder(?SupplierOrder $supplierOrder): static
    {
        $this->supplierOrder = $supplierOrder;

        return $this;
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

    public function getProductName(): ?string
    {
        return $this->productName;
    }

    public function setProductName(string $productName): static
    {
        $this->productName = $productName;

        return $this;
    }

    public function getQuantity(): int
    {
        return $this->quantity;
    }

    public function setQuantity(int $quantity): static
    {
        $this->quantity = max(1, $quantity);

        return $this;
    }

    public function getUnit(): string
    {
        return $this->unit;
    }

    public function setUnit(string $unit): static
    {
        $this->unit = $unit;

        return $this;
    }

    public function getUnitPrice(): ?float
    {
        return $this->unitPrice;
    }

    public function setUnitPrice(?float $unitPrice): static
    {
        $this->unitPrice = $unitPrice;

        return $this;
    }

    #[Groups(['supplier_order:read'])]
    public function getTotalPrice(): ?float
    {
        if (null === $this->unitPrice) {
            return null;
        }

        return round($this->unitPrice * $this->quantity, 2);
    }
}


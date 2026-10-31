<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Repository\StockItemRepository;
use App\State\StockItemStateProcessor;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: StockItemRepository::class)]
#[UniqueEntity(fields: ['code'])]
#[ApiResource(
    operations: [
        new GetCollection(),
        new Get(),
        new Post(processor: StockItemStateProcessor::class),
        new Patch(processor: StockItemStateProcessor::class),
        new Delete(),
    ],
    normalizationContext: ['groups' => ['stock_item:read']],
    denormalizationContext: ['groups' => ['stock_item:write']],
    security: "is_granted('ROLE_ADMIN')",
    mercure: ['private' => true],
)]
class StockItem
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['stock_item:read', 'order:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 60, unique: true)]
    #[Assert\NotBlank]
    #[Groups(['stock_item:read', 'stock_item:write', 'order:read'])]
    private ?string $code = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank]
    #[Groups(['stock_item:read', 'stock_item:write', 'order:read'])]
    private ?string $name = null;

    #[ORM\Column(length: 30, options: ['default' => 'pre_produced'])]
    #[Groups(['stock_item:read', 'stock_item:write', 'order:read'])]
    private string $type = 'pre_produced';

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['stock_item:read', 'stock_item:write'])]
    private ?string $supplier = null;

    #[ORM\Column]
    #[Assert\PositiveOrZero(message: 'La quantité en stock ne peut pas être négative.')]
    #[Groups(['stock_item:read', 'stock_item:write'])]
    private int $quantity = 0;

    #[ORM\Column(length: 30, options: ['default' => 'none'])]
    #[Groups(['stock_item:read', 'stock_item:write'])]
    private string $supplierOrderStatus = 'none';

    #[ORM\Column(nullable: true)]
    #[Groups(['stock_item:read', 'stock_item:write'])]
    private ?int $supplierOrderQuantity = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['stock_item:read'])]
    private ?\DateTimeImmutable $supplierOrderedAt = null;

    #[ORM\Column]
    #[Assert\PositiveOrZero]
    #[Groups(['stock_item:read', 'stock_item:write'])]
    private int $alertThreshold = 10;

    #[ORM\Column]
    #[Assert\Positive]
    #[Groups(['stock_item:read', 'stock_item:write'])]
    private int $reorderQuantity = 50;

    #[ORM\Column(length: 20)]
    #[Groups(['stock_item:read', 'stock_item:write', 'order:read'])]
    private string $unit = 'pcs';

    #[ORM\Column]
    #[Groups(['stock_item:read'])]
    private ?\DateTimeImmutable $updatedAt = null;

    /**
     * @var Collection<int, Order>
     */
    #[ORM\OneToMany(targetEntity: Order::class, mappedBy: 'targetStockItem')]
    private Collection $stockReplenishmentOrders;

    /**
     * @var Collection<int, StockMovement>
     */
    #[ORM\OneToMany(targetEntity: StockMovement::class, mappedBy: 'stockItem')]
    private Collection $movements;

    public function __construct()
    {
        $this->updatedAt = new \DateTimeImmutable();
        $this->stockReplenishmentOrders = new ArrayCollection();
        $this->movements = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getCode(): ?string
    {
        return $this->code;
    }

    public function setCode(string $code): static
    {
        $this->code = $code;

        return $this;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = $name;

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

    public function getSupplier(): ?string
    {
        return $this->supplier;
    }

    public function setSupplier(?string $supplier): static
    {
        $this->supplier = $supplier;

        return $this;
    }

    public function getQuantity(): int
    {
        return $this->quantity;
    }

    public function setQuantity(int $quantity): static
    {
        $this->quantity = max(0, $quantity);
        $this->updatedAt = new \DateTimeImmutable();

        return $this;
    }

    public function getSupplierOrderStatus(): string
    {
        return $this->supplierOrderStatus;
    }

    public function setSupplierOrderStatus(string $supplierOrderStatus): static
    {
        $this->supplierOrderStatus = $supplierOrderStatus;

        return $this;
    }

    public function getSupplierOrderQuantity(): ?int
    {
        return $this->supplierOrderQuantity;
    }

    public function setSupplierOrderQuantity(?int $supplierOrderQuantity): static
    {
        $this->supplierOrderQuantity = $supplierOrderQuantity;

        return $this;
    }

    public function getSupplierOrderedAt(): ?\DateTimeImmutable
    {
        return $this->supplierOrderedAt;
    }

    public function setSupplierOrderedAt(?\DateTimeImmutable $supplierOrderedAt): static
    {
        $this->supplierOrderedAt = $supplierOrderedAt;

        return $this;
    }

    public function getAlertThreshold(): int
    {
        return $this->alertThreshold;
    }

    public function setAlertThreshold(int $alertThreshold): static
    {
        $this->alertThreshold = $alertThreshold;
        $this->updatedAt = new \DateTimeImmutable();

        return $this;
    }

    public function getReorderQuantity(): int
    {
        return $this->reorderQuantity;
    }

    public function setReorderQuantity(int $reorderQuantity): static
    {
        $this->reorderQuantity = $reorderQuantity;

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

    public function getUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function setUpdatedAt(\DateTimeImmutable $updatedAt): static
    {
        $this->updatedAt = $updatedAt;

        return $this;
    }

    /**
     * @return Collection<int, Order>
     */
    public function getStockReplenishmentOrders(): Collection
    {
        return $this->stockReplenishmentOrders;
    }
}

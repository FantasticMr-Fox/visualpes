<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Repository\StockOrderRepository;
use App\State\StockOrderStateProcessor;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\SerializedName;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: StockOrderRepository::class)]
#[ApiResource(
    operations: [
        new GetCollection(),
        new Get(),
        new Post(processor: StockOrderStateProcessor::class),
        new Patch(processor: StockOrderStateProcessor::class),
        new Delete(),
    ],
    normalizationContext: ['groups' => ['stock_order:read']],
    denormalizationContext: ['groups' => ['stock_order:write']],
    security: "is_granted('ROLE_ADMIN')",
    mercure: ['private' => true],
)]
class StockOrder
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_ORDERED = 'ordered';
    public const STATUS_RECEIVED = 'received';
    public const STATUS_CANCELLED = 'cancelled';

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_ORDERED,
        self::STATUS_RECEIVED,
        self::STATUS_CANCELLED,
    ];

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['stock_order:read'])]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'stockOrders')]
    #[ORM\JoinColumn(nullable: false)]
    #[Assert\NotNull]
    #[Groups(['stock_order:read', 'stock_order:write'])]
    private ?StockItem $stockItem = null;

    #[ORM\Column]
    #[Assert\Positive]
    #[Groups(['stock_order:read', 'stock_order:write'])]
    private int $quantity = 1;

    #[ORM\Column(length: 30)]
    #[Assert\Choice(choices: self::STATUSES)]
    #[Groups(['stock_order:read', 'stock_order:write'])]
    private string $status = self::STATUS_PENDING;

    #[ORM\Column]
    #[Groups(['stock_order:read'])]
    #[SerializedName('isAuto')]
    private bool $isAuto = false;

    #[ORM\Column]
    #[Groups(['stock_order:read'])]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['stock_order:read'])]
    private ?\DateTimeImmutable $receivedAt = null;

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

    public function getQuantity(): int
    {
        return $this->quantity;
    }

    public function setQuantity(int $quantity): static
    {
        $this->quantity = $quantity;

        return $this;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function setStatus(string $status): static
    {
        $this->status = $status;

        return $this;
    }

    public function getIsAuto(): bool
    {
        return $this->isAuto;
    }

    public function setIsAuto(bool $isAuto): static
    {
        $this->isAuto = $isAuto;

        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getReceivedAt(): ?\DateTimeImmutable
    {
        return $this->receivedAt;
    }

    public function setReceivedAt(?\DateTimeImmutable $receivedAt): static
    {
        $this->receivedAt = $receivedAt;

        return $this;
    }
}

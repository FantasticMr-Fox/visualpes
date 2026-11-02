<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Repository\OrderRepository;
use App\State\OrderStateProcessor;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: OrderRepository::class)]
#[ORM\Table(name: '`order`')]
#[ApiResource(
    operations: [
        new GetCollection(),
        new Get(),
        new Post(security: "is_granted('ROLE_ADMIN')", processor: OrderStateProcessor::class),
        new Patch(security: "is_granted('ROLE_ADMIN')", processor: OrderStateProcessor::class),
        new Delete(security: "is_granted('ROLE_ADMIN')"),
    ],
    normalizationContext: ['groups' => ['order:read']],
    denormalizationContext: ['groups' => ['order:write']],
    security: "is_granted('ROLE_USER')",
    mercure: [
        'private' => true,
        'topics' => [
            '@=iri(object)',
            '@=object.getAccount() ? iri(object.getAccount()) ~ "/orders/" ~ object.getId() : iri(object)',
        ],
    ],
)]
class Order
{
    public const STATUSES = ['pending', 'processing', 'quality_check', 'shipped', 'completed'];

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['order:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 50)]
    #[Assert\NotBlank]
    #[Assert\Choice(choices: self::STATUSES)]
    #[Groups(['order:read', 'order:write'])]
    private ?string $status = 'pending';

    #[ORM\Column]
    #[ApiProperty(writable: false)]
    #[Groups(['order:read'])]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column(options: ['default' => false])]
    #[Groups(['order:read'])]
    private bool $stockDeducted = false;

    #[ORM\Column(options: ['default' => false])]
    #[Groups(['order:read', 'order:write'])]
    private bool $isStockOrder = false;

    #[ORM\Column(options: ['default' => false])]
    #[Groups(['order:read'])]
    private bool $stockCredited = false;

    #[ORM\ManyToOne(inversedBy: 'stockReplenishmentOrders')]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    #[Groups(['order:read', 'order:write'])]
    private ?StockItem $targetStockItem = null;

    #[ORM\ManyToOne(inversedBy: 'orders')]
    #[ORM\JoinColumn(nullable: true)]
    #[Groups(['order:read', 'order:write'])]
    private ?Account $account = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['order:read', 'order:write'])]
    private ?string $workshopNotes = null;

    #[ORM\Column(length: 120, nullable: true)]
    #[Groups(['order:read', 'order:write'])]
    private ?string $trackingNumber = null;

    #[ORM\Column(length: 100, nullable: true)]
    #[Groups(['order:read', 'order:write'])]
    private ?string $storeReference = null;

    // --- Champs E-commerce FR & Logistique ---
    #[ORM\Column(length: 100, nullable: true)]
    #[Groups(['order:read', 'order:write'])]
    private ?string $externalOrderId = null;

    #[ORM\Column(length: 50, nullable: true)]
    #[Groups(['order:read', 'order:write'])]
    private ?string $paymentMethod = null;

    #[ORM\Column(length: 180, nullable: true)]
    #[Groups(['order:read', 'order:write'])]
    private ?string $customerEmail = null;

    #[ORM\Column(length: 50, nullable: true)]
    #[Groups(['order:read', 'order:write'])]
    private ?string $customerPhone = null;

    #[ORM\Column(type: Types::JSON, nullable: true)]
    #[Groups(['order:read', 'order:write'])]
    private ?array $shippingAddress = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2, nullable: true)]
    #[Groups(['order:read', 'order:write'])]
    private ?string $totalAmount = null;

    #[ORM\Column(length: 50, nullable: true)]
    #[Groups(['order:read', 'order:write'])]
    private ?string $carrier = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['order:read', 'order:write'])]
    private ?string $labelUrl = null;

    #[ORM\Column(length: 100, nullable: true)]
    #[Groups(['order:read', 'order:write'])]
    private ?string $pennylaneInvoiceId = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['order:read', 'order:write'])]
    private ?string $invoiceUrl = null;

    /**
     * @var Collection<int, OrderItem>
     */
    #[ORM\OneToMany(targetEntity: OrderItem::class, mappedBy: 'parentOrder', cascade: ['persist', 'remove'], orphanRemoval: true)]
    #[Groups(['order:read', 'order:write'])]
    private Collection $orderItems;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->orderItems = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getStatus(): ?string
    {
        return $this->status;
    }

    public function setStatus(string $status): static
    {
        $this->status = $status;

        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeImmutable $createdAt): static
    {
        $this->createdAt = $createdAt;

        return $this;
    }

    public function getStockDeducted(): bool
    {
        return $this->stockDeducted;
    }

    public function setStockDeducted(bool $stockDeducted): static
    {
        $this->stockDeducted = $stockDeducted;

        return $this;
    }

    public function getIsStockOrder(): bool
    {
        return $this->isStockOrder;
    }

    public function setIsStockOrder(bool $isStockOrder): static
    {
        $this->isStockOrder = $isStockOrder;

        return $this;
    }

    public function getStockCredited(): bool
    {
        return $this->stockCredited;
    }

    public function setStockCredited(bool $stockCredited): static
    {
        $this->stockCredited = $stockCredited;

        return $this;
    }

    public function getTargetStockItem(): ?StockItem
    {
        return $this->targetStockItem;
    }

    public function setTargetStockItem(?StockItem $targetStockItem): static
    {
        $this->targetStockItem = $targetStockItem;

        return $this;
    }

    public function getAccount(): ?Account
    {
        return $this->account;
    }

    public function setAccount(?Account $account): static
    {
        $this->account = $account;

        return $this;
    }

    public function getWorkshopNotes(): ?string
    {
        return $this->workshopNotes;
    }

    public function setWorkshopNotes(?string $workshopNotes): static
    {
        $this->workshopNotes = $workshopNotes;

        return $this;
    }

    public function getTrackingNumber(): ?string
    {
        return $this->trackingNumber;
    }

    public function setTrackingNumber(?string $trackingNumber): static
    {
        $this->trackingNumber = $trackingNumber;

        return $this;
    }

    public function getStoreReference(): ?string
    {
        return $this->storeReference;
    }

    public function setStoreReference(?string $storeReference): static
    {
        $this->storeReference = $storeReference;

        return $this;
    }

    public function getExternalOrderId(): ?string
    {
        return $this->externalOrderId;
    }

    public function setExternalOrderId(?string $externalOrderId): static
    {
        $this->externalOrderId = $externalOrderId;

        return $this;
    }

    public function getPaymentMethod(): ?string
    {
        return $this->paymentMethod;
    }

    public function setPaymentMethod(?string $paymentMethod): static
    {
        $this->paymentMethod = $paymentMethod;

        return $this;
    }

    public function getCustomerEmail(): ?string
    {
        return $this->customerEmail;
    }

    public function setCustomerEmail(?string $customerEmail): static
    {
        $this->customerEmail = $customerEmail;

        return $this;
    }

    public function getCustomerPhone(): ?string
    {
        return $this->customerPhone;
    }

    public function setCustomerPhone(?string $customerPhone): static
    {
        $this->customerPhone = $customerPhone;

        return $this;
    }

    public function getShippingAddress(): ?array
    {
        return $this->shippingAddress;
    }

    public function setShippingAddress(?array $shippingAddress): static
    {
        $this->shippingAddress = $shippingAddress;

        return $this;
    }

    public function getTotalAmount(): ?string
    {
        return $this->totalAmount;
    }

    public function setTotalAmount(?string $totalAmount): static
    {
        $this->totalAmount = $totalAmount;

        return $this;
    }

    public function getCarrier(): ?string
    {
        return $this->carrier;
    }

    public function setCarrier(?string $carrier): static
    {
        $this->carrier = $carrier;

        return $this;
    }

    public function getLabelUrl(): ?string
    {
        return $this->labelUrl;
    }

    public function setLabelUrl(?string $labelUrl): static
    {
        $this->labelUrl = $labelUrl;

        return $this;
    }

    public function getPennylaneInvoiceId(): ?string
    {
        return $this->pennylaneInvoiceId;
    }

    public function setPennylaneInvoiceId(?string $pennylaneInvoiceId): static
    {
        $this->pennylaneInvoiceId = $pennylaneInvoiceId;

        return $this;
    }

    public function getInvoiceUrl(): ?string
    {
        return $this->invoiceUrl;
    }

    public function setInvoiceUrl(?string $invoiceUrl): static
    {
        $this->invoiceUrl = $invoiceUrl;

        return $this;
    }

    /**
     * @return Collection<int, OrderItem>
     */
    public function getOrderItems(): Collection
    {
        return $this->orderItems;
    }

    public function addOrderItem(OrderItem $orderItem): static
    {
        if (!$this->orderItems->contains($orderItem)) {
            $this->orderItems->add($orderItem);
            $orderItem->setParentOrder($this);
        }

        return $this;
    }

    public function removeOrderItem(OrderItem $orderItem): static
    {
        if ($this->orderItems->removeElement($orderItem)) {
            if ($orderItem->getParentOrder() === $this) {
                $orderItem->setParentOrder(null);
            }
        }

        return $this;
    }
}

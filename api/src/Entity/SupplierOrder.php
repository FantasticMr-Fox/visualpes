<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\State\SupplierOrderStateProcessor;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity]
#[UniqueEntity(fields: ['reference'])]
#[ApiResource(
    operations: [
        new GetCollection(order: ['createdAt' => 'DESC']),
        new Get(),
        new Post(processor: SupplierOrderStateProcessor::class),
        new Patch(processor: SupplierOrderStateProcessor::class),
        new Delete(),
    ],
    normalizationContext: ['groups' => ['supplier_order:read']],
    denormalizationContext: ['groups' => ['supplier_order:write']],
    security: "is_granted('ROLE_ADMIN')",
)]
class SupplierOrder
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['supplier_order:read', 'supplier:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 60, unique: true)]
    #[Assert\NotBlank]
    #[Groups(['supplier_order:read', 'supplier_order:write', 'supplier:read'])]
    private ?string $reference = null;

    #[ORM\ManyToOne(inversedBy: 'orders')]
    #[ORM\JoinColumn(nullable: false)]
    #[Assert\NotNull]
    #[Groups(['supplier_order:read', 'supplier_order:write'])]
    private ?Supplier $supplier = null;

    #[ORM\Column(length: 30, options: ['default' => 'draft'])]
    #[Assert\Choice(choices: ['draft', 'sent', 'received', 'cancelled'])]
    #[Groups(['supplier_order:read', 'supplier_order:write', 'supplier:read'])]
    private string $status = 'draft';

    #[ORM\Column(type: 'text', nullable: true)]
    #[Groups(['supplier_order:read', 'supplier_order:write'])]
    private ?string $notes = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['supplier_order:read', 'supplier_order:write'])]
    private ?\DateTimeImmutable $expectedDeliveryDate = null;

    #[ORM\Column]
    #[Groups(['supplier_order:read', 'supplier:read'])]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(nullable: true)]
    #[Groups(['supplier_order:read', 'supplier_order:write'])]
    private ?\DateTimeImmutable $sentAt = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['supplier_order:read', 'supplier_order:write'])]
    private ?\DateTimeImmutable $receivedAt = null;

    /**
     * @var Collection<int, SupplierOrderItem>
     */
    #[ORM\OneToMany(targetEntity: SupplierOrderItem::class, mappedBy: 'supplierOrder', cascade: ['persist', 'remove'], orphanRemoval: true)]
    #[Groups(['supplier_order:read', 'supplier_order:write'])]
    private Collection $items;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->items = new ArrayCollection();
        $this->reference = 'BC-' . date('Y') . '-' . strtoupper(substr(uniqid(), -5));
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getReference(): ?string
    {
        return $this->reference;
    }

    public function setReference(string $reference): static
    {
        $this->reference = $reference;

        return $this;
    }

    public function getSupplier(): ?Supplier
    {
        return $this->supplier;
    }

    public function setSupplier(?Supplier $supplier): static
    {
        $this->supplier = $supplier;

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

    public function getNotes(): ?string
    {
        return $this->notes;
    }

    public function setNotes(?string $notes): static
    {
        $this->notes = $notes;

        return $this;
    }

    public function getExpectedDeliveryDate(): ?\DateTimeImmutable
    {
        return $this->expectedDeliveryDate;
    }

    public function setExpectedDeliveryDate(?\DateTimeImmutable $expectedDeliveryDate): static
    {
        $this->expectedDeliveryDate = $expectedDeliveryDate;

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

    public function getSentAt(): ?\DateTimeImmutable
    {
        return $this->sentAt;
    }

    public function setSentAt(?\DateTimeImmutable $sentAt): static
    {
        $this->sentAt = $sentAt;

        return $this;
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

    /**
     * @return Collection<int, SupplierOrderItem>
     */
    public function getItems(): Collection
    {
        return $this->items;
    }

    public function addItem(SupplierOrderItem $item): static
    {
        if (!$this->items->contains($item)) {
            $this->items->add($item);
            $item->setSupplierOrder($this);
        }

        return $this;
    }

    public function removeItem(SupplierOrderItem $item): static
    {
        if ($this->items->removeElement($item)) {
            // set the owning side to null (unless already changed)
            if ($item->getSupplierOrder() === $this) {
                $item->setSupplierOrder(null);
            }
        }

        return $this;
    }

    #[Groups(['supplier_order:read', 'supplier:read'])]
    public function getTotalAmount(): float
    {
        $total = 0.0;
        foreach ($this->items as $item) {
            $total += ($item->getUnitPrice() ?? 0.0) * $item->getQuantity();
        }

        return round($total, 2);
    }

    #[Groups(['supplier_order:read', 'supplier:read'])]
    public function getTotalQuantity(): int
    {
        $total = 0;
        foreach ($this->items as $item) {
            $total += $item->getQuantity();
        }

        return $total;
    }
}


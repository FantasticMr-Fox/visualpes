<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Repository\OrderItemRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity(repositoryClass: OrderItemRepository::class)]
#[ApiResource(
    operations: [
        new GetCollection(),
        new Get(),
        new Post(security: "is_granted('ROLE_ADMIN')"),
        new Patch(security: "is_granted('ROLE_ADMIN')"),
        new Delete(security: "is_granted('ROLE_ADMIN')"),
    ],
    security: "is_granted('ROLE_USER')",
)]
class OrderItem
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['order:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Groups(['order:read', 'order:write'])]
    private ?string $productName = null;

    #[ORM\Column]
    #[Groups(['order:read', 'order:write'])]
    private ?int $quantity = null;

    #[ORM\Column(length: 80, nullable: true)]
    #[Groups(['order:read', 'order:write'])]
    private ?string $sku = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2, nullable: true)]
    #[Groups(['order:read', 'order:write'])]
    private ?string $unitPrice = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    #[Groups(['order:read', 'order:write'])]
    private ?StockItem $stockItem = null;

    #[ORM\ManyToOne(inversedBy: 'orderItems')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Order $parentOrder = null;

    /**
     * @var Collection<int, NfcTag>
     */
    #[ORM\OneToMany(targetEntity: NfcTag::class, mappedBy: 'orderItem')]
    #[ApiProperty(security: "is_granted('ROLE_ADMIN')")]
    #[Groups(['order:read'])]
    private Collection $nfcTags;

    public function __construct()
    {
        $this->nfcTags = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
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

    public function getQuantity(): ?int
    {
        return $this->quantity;
    }

    public function setQuantity(int $quantity): static
    {
        $this->quantity = $quantity;

        return $this;
    }

    public function getSku(): ?string
    {
        return $this->sku;
    }

    public function setSku(?string $sku): static
    {
        $this->sku = $sku;

        return $this;
    }

    public function getUnitPrice(): ?string
    {
        return $this->unitPrice;
    }

    public function setUnitPrice(?string $unitPrice): static
    {
        $this->unitPrice = $unitPrice;

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

    public function getParentOrder(): ?Order
    {
        return $this->parentOrder;
    }

    public function setParentOrder(?Order $parentOrder): static
    {
        $this->parentOrder = $parentOrder;

        return $this;
    }

    /**
     * @return Collection<int, NfcTag>
     */
    public function getNfcTags(): Collection
    {
        return $this->nfcTags;
    }

    public function addNfcTag(NfcTag $nfcTag): static
    {
        if (!$this->nfcTags->contains($nfcTag)) {
            $this->nfcTags->add($nfcTag);
            $nfcTag->setOrderItem($this);
        }

        return $this;
    }

    public function removeNfcTag(NfcTag $nfcTag): static
    {
        if ($this->nfcTags->removeElement($nfcTag) && $nfcTag->getOrderItem() === $this) {
            $nfcTag->setOrderItem(null);
        }

        return $this;
    }
}

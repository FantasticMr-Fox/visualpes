<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
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
    normalizationContext: ['groups' => ['supplier:read']],
    denormalizationContext: ['groups' => ['supplier:write']],
    security: "is_granted('ROLE_ADMIN')",
)]
class Supplier
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['supplier:read', 'supplier_order:read', 'stock_item:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank]
    #[Groups(['supplier:read', 'supplier:write', 'supplier_order:read', 'stock_item:read'])]
    private ?string $name = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['supplier:read', 'supplier:write', 'supplier_order:read'])]
    private ?string $contactName = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Assert\Email]
    #[Groups(['supplier:read', 'supplier:write', 'supplier_order:read'])]
    private ?string $email = null;

    #[ORM\Column(length: 50, nullable: true)]
    #[Groups(['supplier:read', 'supplier:write', 'supplier_order:read'])]
    private ?string $phone = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['supplier:read', 'supplier:write', 'supplier_order:read'])]
    private ?string $address = null;

    #[ORM\Column(options: ['default' => 5])]
    #[Groups(['supplier:read', 'supplier:write'])]
    private int $leadTimeDays = 5;

    #[ORM\Column(type: 'text', nullable: true)]
    #[Groups(['supplier:read', 'supplier:write'])]
    private ?string $notes = null;

    #[ORM\Column]
    #[Groups(['supplier:read'])]
    private \DateTimeImmutable $createdAt;

    /**
     * @var Collection<int, SupplierOrder>
     */
    #[ORM\OneToMany(targetEntity: SupplierOrder::class, mappedBy: 'supplier')]
    private Collection $orders;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->orders = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
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

    public function getContactName(): ?string
    {
        return $this->contactName;
    }

    public function setContactName(?string $contactName): static
    {
        $this->contactName = $contactName;

        return $this;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(?string $email): static
    {
        $this->email = $email;

        return $this;
    }

    public function getPhone(): ?string
    {
        return $this->phone;
    }

    public function setPhone(?string $phone): static
    {
        $this->phone = $phone;

        return $this;
    }

    public function getAddress(): ?string
    {
        return $this->address;
    }

    public function setAddress(?string $address): static
    {
        $this->address = $address;

        return $this;
    }

    public function getLeadTimeDays(): int
    {
        return $this->leadTimeDays;
    }

    public function setLeadTimeDays(int $leadTimeDays): static
    {
        $this->leadTimeDays = $leadTimeDays;

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

    /**
     * @return Collection<int, SupplierOrder>
     */
    public function getOrders(): Collection
    {
        return $this->orders;
    }
}


<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Repository\NfcTagRepository;
use App\State\NfcTagStateProcessor;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: NfcTagRepository::class)]
#[UniqueEntity(fields: ['shortUid'])]
#[ApiResource(
    operations: [
        new GetCollection(),
        new Get(),
        new Post(processor: NfcTagStateProcessor::class),
        new Patch(processor: NfcTagStateProcessor::class),
        new Delete(),
    ],
    security: "is_granted('ROLE_ADMIN')",
)]
class NfcTag
{
    public const STATUSES = ['stock', 'encoded', 'assigned', 'defective'];

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['order:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 10, unique: true)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 10)]
    #[Groups(['order:read'])]
    private ?string $shortUid = null;

    #[ORM\Column(length: 20)]
    #[Assert\NotBlank]
    #[Assert\Choice(choices: self::STATUSES)]
    #[Groups(['order:read'])]
    private ?string $status = 'stock';

    #[ORM\Column(nullable: true)]
    #[Groups(['order:read'])]
    private ?\DateTime $encodeAt = null;

    #[ORM\ManyToOne(inversedBy: 'nfcTags')]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    #[Groups(['order:read'])]
    private ?Zone $zone = null;

    #[ORM\ManyToOne(inversedBy: 'nfcTags')]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?OrderItem $orderItem = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getShortUid(): ?string
    {
        return $this->shortUid;
    }

    public function setShortUid(string $shortUid): static
    {
        $this->shortUid = $shortUid;

        return $this;
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

    public function getEncodeAt(): ?\DateTime
    {
        return $this->encodeAt;
    }

    public function setEncodeAt(?\DateTime $encodeAt): static
    {
        $this->encodeAt = $encodeAt;

        return $this;
    }

    public function getZone(): ?Zone
    {
        return $this->zone;
    }

    public function setZone(?Zone $zone): static
    {
        $this->zone = $zone;

        return $this;
    }

    public function getOrderItem(): ?OrderItem
    {
        return $this->orderItem;
    }

    public function setOrderItem(?OrderItem $orderItem): static
    {
        $this->orderItem = $orderItem;

        return $this;
    }
}

<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Repository\NfcTagRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: NfcTagRepository::class)]
#[ApiResource(
    operations: [
        new GetCollection(),
        new Get(),
        new Post(),
        new Patch(),
        new Delete(),
    ],
    security: "is_granted('ROLE_ADMIN')",
)]
class NfcTag
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 10, unique: true)]
    private ?string $shortUid = null;

    #[ORM\Column(length: 20)]
    private ?string $status = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTime $encodeAt = null;

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
}

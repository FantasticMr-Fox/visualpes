<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Repository\ZoneRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ZoneRepository::class)]
#[ApiResource(
    operations: [
        new GetCollection(),
        new Get(),
        new Post(securityPostDenormalize: "is_granted('ROLE_ADMIN') or object.getProperty()?.getAccount() === user.getAccount()"),
        new Patch(securityPostDenormalize: "is_granted('ROLE_ADMIN') or object.getProperty()?.getAccount() === user.getAccount()"),
        new Delete(),
    ],
    security: "is_granted('ROLE_USER')",
)]
class Zone
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $name = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $mountType = null;

    #[ORM\ManyToOne(inversedBy: 'zones')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Property $property = null;

    /**
     * @var Collection<int, NfcTag>
     */
    #[ORM\OneToMany(targetEntity: NfcTag::class, mappedBy: 'zone')]
    #[ApiProperty(security: "is_granted('ROLE_ADMIN')")]
    private Collection $nfcTags;

    public function __construct()
    {
        $this->nfcTags = new ArrayCollection();
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

    public function getMountType(): ?string
    {
        return $this->mountType;
    }

    public function setMountType(?string $mountType): static
    {
        $this->mountType = $mountType;

        return $this;
    }

    public function getProperty(): ?Property
    {
        return $this->property;
    }

    public function setProperty(?Property $property): static
    {
        $this->property = $property;

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
            $nfcTag->setZone($this);
        }

        return $this;
    }

    public function removeNfcTag(NfcTag $nfcTag): static
    {
        if ($this->nfcTags->removeElement($nfcTag) && $nfcTag->getZone() === $this) {
            $nfcTag->setZone(null);
        }

        return $this;
    }
}

<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Repository\PropertyRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: PropertyRepository::class)]
#[ApiResource(
    operations: [
        new GetCollection(),
        new Get(),
        new Post(securityPostDenormalize: "is_granted('ROLE_ADMIN') or object.getAccount() === user.getAccount()"),
        new Patch(securityPostDenormalize: "is_granted('ROLE_ADMIN') or object.getAccount() === user.getAccount()"),
        new Delete(),
    ],
    security: "is_granted('ROLE_USER')",
)]
class Property
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $name = null;


    #[ORM\Column(length: 255, nullable: true)]
    private ?string $externalGuideUrl = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $instructions = null;

    #[ORM\ManyToOne(inversedBy: 'properties')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Account $account = null;

    /**
     * @var Collection<int, Zone>
     */
    #[ORM\OneToMany(targetEntity: Zone::class, mappedBy: 'property', orphanRemoval: true)]
    private Collection $zones;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $wifiSSID = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $wifiPassword = null;

    public function __construct()
    {
        $this->zones = new ArrayCollection();
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

    public function getExternalGuideUrl(): ?string
    {
        return $this->externalGuideUrl;
    }

    public function setExternalGuideUrl(?string $externalGuideUrl): static
    {
        $this->externalGuideUrl = $externalGuideUrl;

        return $this;
    }

    public function getInstructions(): ?string
    {
        return $this->instructions;
    }

    public function setInstructions(?string $instructions): static
    {
        $this->instructions = $instructions;

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

    /**
     * @return Collection<int, Zone>
     */
    public function getZones(): Collection
    {
        return $this->zones;
    }

    public function addZone(Zone $zone): static
    {
        if (!$this->zones->contains($zone)) {
            $this->zones->add($zone);
            $zone->setProperty($this);
        }

        return $this;
    }

    public function removeZone(Zone $zone): static
    {
        if ($this->zones->removeElement($zone)) {
            // set the owning side to null (unless already changed)
            if ($zone->getProperty() === $this) {
                $zone->setProperty(null);
            }
        }

        return $this;
    }

    public function getWifiSSID(): ?string
    {
        return $this->wifiSSID;
    }

    public function setWifiSSID(?string $wifiSSID): static
    {
        $this->wifiSSID = $wifiSSID;

        return $this;
    }

    public function getWifiPassword(): ?string
    {
        return $this->wifiPassword;
    }

    public function setWifiPassword(?string $wifiPassword): static
    {
        $this->wifiPassword = $wifiPassword;

        return $this;
    }
}

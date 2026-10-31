<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Repository\PropertyRepository;
use App\State\PropertyStateProcessor;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: PropertyRepository::class)]
#[ApiResource(
    operations: [
        new GetCollection(),
        new Get(),
        new Post(
            securityPostDenormalize: "is_granted('ROLE_ADMIN') or object.getAccount() === user.getAccount()",
            processor: PropertyStateProcessor::class,
        ),
        new Patch(
            securityPostDenormalize: "is_granted('ROLE_ADMIN') or object.getAccount() === user.getAccount()",
            processor: PropertyStateProcessor::class,
        ),
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
    private ?string $address = null;

    #[ORM\Column(length: 120, nullable: true)]
    private ?string $resort = null;

    #[ORM\Column(length: 60, nullable: true, options: ['default' => 'Chalet'])]
    private ?string $typology = 'Chalet';

    #[ORM\Column(nullable: true)]
    private ?int $capacity = null;

    #[ORM\Column(nullable: true)]
    private ?int $bedrooms = null;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $keyBoxCode = null;

    #[ORM\Column(length: 512, nullable: true)]
    private ?string $coverImageUrl = null;

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

    /**
     * Utilisateurs affectés spécifiquement à cette propriété.
     * @var Collection<int, User>
     */
    #[ORM\ManyToMany(targetEntity: User::class, mappedBy: 'properties')]
    private Collection $assignedUsers;

    #[ORM\Column(length: 512, nullable: true)]
    private ?string $wifiSSID = null;

    #[ORM\Column(length: 512, nullable: true)]
    #[ApiProperty(readable: false, writable: true)]
    private ?string $wifiPassword = null;

    #[ORM\Column(length: 512, nullable: true)]
    #[ApiProperty(readable: false, writable: true)]
    private ?string $wifiAccessCode = null;

    /**
     * @var list<float>|null
     */
    #[ORM\Column(type: Types::JSON, nullable: true)]
    #[ApiProperty(readable: false, writable: false)]
    private ?array $instructionsVector = null;

    public function __construct()
    {
        $this->zones = new ArrayCollection();
        $this->assignedUsers = new ArrayCollection();
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

    public function getWifiAccessCode(): ?string
    {
        return $this->wifiAccessCode;
    }

    public function setWifiAccessCode(?string $wifiAccessCode): static
    {
        $this->wifiAccessCode = $wifiAccessCode;

        return $this;
    }

    /**
     * @return list<float>|null
     */
    public function getInstructionsVector(): ?array
    {
        return $this->instructionsVector;
    }

    /**
     * @param list<float>|null $instructionsVector
     */
    public function setInstructionsVector(?array $instructionsVector): static
    {
        $this->instructionsVector = $instructionsVector;

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

    public function getResort(): ?string
    {
        return $this->resort;
    }

    public function setResort(?string $resort): static
    {
        $this->resort = $resort;

        return $this;
    }

    public function getTypology(): ?string
    {
        return $this->typology;
    }

    public function setTypology(?string $typology): static
    {
        $this->typology = $typology;

        return $this;
    }

    public function getCapacity(): ?int
    {
        return $this->capacity;
    }

    public function setCapacity(?int $capacity): static
    {
        $this->capacity = $capacity;

        return $this;
    }

    public function getBedrooms(): ?int
    {
        return $this->bedrooms;
    }

    public function setBedrooms(?int $bedrooms): static
    {
        $this->bedrooms = $bedrooms;

        return $this;
    }

    public function getKeyBoxCode(): ?string
    {
        return $this->keyBoxCode;
    }

    public function setKeyBoxCode(?string $keyBoxCode): static
    {
        $this->keyBoxCode = $keyBoxCode;

        return $this;
    }

    public function getCoverImageUrl(): ?string
    {
        return $this->coverImageUrl;
    }

    public function setCoverImageUrl(?string $coverImageUrl): static
    {
        $this->coverImageUrl = $coverImageUrl;

        return $this;
    }

    /**
     * @return Collection<int, User>
     */
    public function getAssignedUsers(): Collection
    {
        return $this->assignedUsers;
    }

    public function addAssignedUser(User $user): static
    {
        if (!$this->assignedUsers->contains($user)) {
            $this->assignedUsers->add($user);
            $user->addProperty($this);
        }

        return $this;
    }

    public function removeAssignedUser(User $user): static
    {
        if ($this->assignedUsers->removeElement($user)) {
            $user->removeProperty($this);
        }

        return $this;
    }
}

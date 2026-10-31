<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Repository\UserRepository;
use App\State\UserPasswordHasherProcessor;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ApiResource(
    operations: [
        new GetCollection(),
        new Get(),
        new Post(
            security: "is_granted('ROLE_ADMIN') or is_granted('ROLE_ACCOUNT_ADMIN')",
            validationContext: ['groups' => ['Default', 'user:create']],
            processor: UserPasswordHasherProcessor::class,
        ),
        new Patch(
            security: "is_granted('ROLE_ADMIN') or (is_granted('ROLE_ACCOUNT_ADMIN') and object.getAccount() == user.getAccount())",
            processor: UserPasswordHasherProcessor::class,
        ),
        new Delete(
            security: "is_granted('ROLE_ADMIN') or (is_granted('ROLE_ACCOUNT_ADMIN') and object.getAccount() == user.getAccount() and object != user)"
        ),
    ],
    security: "is_granted('ROLE_USER')",
)]
#[ORM\Table(name: '`user`')]
#[ORM\UniqueConstraint(name: 'UNIQ_IDENTIFIER_EMAIL', fields: ['email'])]
#[UniqueEntity(fields: ['email'])]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 180)]
    #[Assert\NotBlank]
    #[Assert\Email]
    private ?string $email = null;

    /**
     * @var list<string> The user roles
     */
    #[ORM\Column]
    private array $roles = [];

    /**
     * @var string The hashed password
     */
    #[ORM\Column]
    #[ApiProperty(readable: false, writable: false)]
    private ?string $password = null;

    /**
     * Mot de passe en clair, jamais persisté ni renvoyé : haché par UserPasswordHasherProcessor.
     */
    #[ApiProperty(readable: false)]
    #[Assert\NotBlank(groups: ['user:create'])]
    #[Assert\Length(min: 8)]
    private ?string $plainPassword = null;

    #[ORM\ManyToOne(inversedBy: 'users')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Account $account = null;

    #[ORM\Column(options: ['default' => false])]
    private bool $twoFactorEnabled = false;

    #[ORM\Column(length: 20, options: ['default' => 'email'])]
    private string $twoFactorMethod = 'email';

    #[ORM\Column(length: 255, nullable: true)]
    #[ApiProperty(readable: false, writable: false)]
    private ?string $totpSecret = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[ApiProperty(readable: false, writable: false)]
    private ?string $twoFactorCodeHash = null;

    #[ORM\Column(nullable: true)]
    #[ApiProperty(readable: false, writable: false)]
    private ?\DateTimeImmutable $twoFactorExpiresAt = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[ApiProperty(readable: false, writable: false)]
    private ?string $resetTokenHash = null;

    #[ORM\Column(nullable: true)]
    #[ApiProperty(readable: false, writable: false)]
    private ?\DateTimeImmutable $resetTokenExpiresAt = null;

    /**
     * @var Collection<int, Property>
     */
    #[ORM\ManyToMany(targetEntity: Property::class, inversedBy: 'assignedUsers')]
    #[ORM\JoinTable(name: 'user_property')]
    private Collection $properties;

    public function __construct()
    {
        $this->properties = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(string $email): static
    {
        $this->email = $email;

        return $this;
    }

    /**
     * A visual identifier that represents this user.
     *
     * @see UserInterface
     */
    public function getUserIdentifier(): string
    {
        return (string) $this->email;
    }

    /**
     * @see UserInterface
     */
    public function getRoles(): array
    {
        $roles = $this->roles;
        // guarantee every user at least has ROLE_USER
        $roles[] = 'ROLE_USER';

        return array_unique($roles);
    }

    /**
     * @param list<string> $roles
     */
    public function setRoles(array $roles): static
    {
        $this->roles = $roles;

        return $this;
    }

    /**
     * @see PasswordAuthenticatedUserInterface
     */
    public function getPassword(): ?string
    {
        return $this->password;
    }

    public function setPassword(string $password): static
    {
        $this->password = $password;

        return $this;
    }

    public function getPlainPassword(): ?string
    {
        return $this->plainPassword;
    }

    public function setPlainPassword(?string $plainPassword): static
    {
        $this->plainPassword = $plainPassword;

        return $this;
    }

    /**
     * Ensure the session doesn't contain actual password hashes by CRC32C-hashing them, as supported since Symfony 7.3.
     */
    public function __serialize(): array
    {
        $data = (array) $this;
        $data["\0" . self::class . "\0password"] = hash('crc32c', $this->password);
        
        return $data;
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

    public function isTwoFactorEnabled(): bool
    {
        return $this->twoFactorEnabled;
    }

    public function setTwoFactorEnabled(bool $twoFactorEnabled): static
    {
        $this->twoFactorEnabled = $twoFactorEnabled;

        return $this;
    }

    public function getTwoFactorMethod(): string
    {
        return $this->twoFactorMethod;
    }

    public function setTwoFactorMethod(string $twoFactorMethod): static
    {
        $this->twoFactorMethod = $twoFactorMethod;

        return $this;
    }

    public function getTotpSecret(): ?string
    {
        return $this->totpSecret;
    }

    public function setTotpSecret(?string $totpSecret): static
    {
        $this->totpSecret = $totpSecret;

        return $this;
    }

    public function getTwoFactorCodeHash(): ?string
    {
        return $this->twoFactorCodeHash;
    }

    public function setTwoFactorCodeHash(?string $twoFactorCodeHash): static
    {
        $this->twoFactorCodeHash = $twoFactorCodeHash;

        return $this;
    }

    public function getTwoFactorExpiresAt(): ?\DateTimeImmutable
    {
        return $this->twoFactorExpiresAt;
    }

    public function setTwoFactorExpiresAt(?\DateTimeImmutable $twoFactorExpiresAt): static
    {
        $this->twoFactorExpiresAt = $twoFactorExpiresAt;

        return $this;
    }

    public function getResetTokenHash(): ?string
    {
        return $this->resetTokenHash;
    }

    public function setResetTokenHash(?string $resetTokenHash): static
    {
        $this->resetTokenHash = $resetTokenHash;

        return $this;
    }

    public function getResetTokenExpiresAt(): ?\DateTimeImmutable
    {
        return $this->resetTokenExpiresAt;
    }

    public function setResetTokenExpiresAt(?\DateTimeImmutable $resetTokenExpiresAt): static
    {
        $this->resetTokenExpiresAt = $resetTokenExpiresAt;

        return $this;
    }

    /**
     * @return Collection<int, Property>
     */
    public function getProperties(): Collection
    {
        return $this->properties;
    }

    public function addProperty(Property $property): static
    {
        if (!$this->properties->contains($property)) {
            $this->properties->add($property);
        }

        return $this;
    }

    public function removeProperty(Property $property): static
    {
        $this->properties->removeElement($property);

        return $this;
    }
}

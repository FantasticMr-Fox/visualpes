<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Repository\SupportTicketRepository;
use App\State\SupportTicketStateProcessor;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: SupportTicketRepository::class)]
#[ApiResource(
    operations: [
        new GetCollection(),
        new Get(),
        new Post(
            securityPostDenormalize: "is_granted('ROLE_ADMIN') or object.getAccount() === user.getAccount()",
            processor: SupportTicketStateProcessor::class,
        ),
        new Patch(
            securityPostDenormalize: "is_granted('ROLE_ADMIN') or object.getAccount() === user.getAccount()",
            processor: SupportTicketStateProcessor::class,
        ),
        new Delete(),
    ],
    security: "is_granted('ROLE_USER')",
)]
class SupportTicket
{
    public const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
    public const ISSUE_TYPES = ['nfc_defect', 'wifi_issue', 'guide_update', 'billing', 'other'];

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank]
    private ?string $subject = null;

    #[ORM\Column(type: Types::TEXT)]
    #[Assert\NotBlank]
    private ?string $message = null;

    #[ORM\Column(length: 50)]
    #[Assert\NotBlank]
    #[Assert\Choice(choices: self::STATUSES)]
    #[ApiProperty(
        default: 'open',
        securityPostDenormalize: "is_granted('ROLE_ADMIN')",
        extraProperties: ['throw_on_access_denied' => true],
    )]
    private ?string $status = 'open';

    #[ORM\Column(length: 50, options: ['default' => 'other'])]
    #[Assert\Choice(choices: self::ISSUE_TYPES)]
    private string $issueType = 'other';

    #[ORM\Column(options: ['default' => false])]
    #[ApiProperty(
        securityPostDenormalize: "is_granted('ROLE_ADMIN')",
        extraProperties: ['throw_on_access_denied' => true],
    )]
    private bool $isAiResolved = false;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[ApiProperty(
        security: "is_granted('ROLE_ADMIN')",
        securityPostDenormalize: "is_granted('ROLE_ADMIN')",
        extraProperties: ['throw_on_access_denied' => true],
    )]
    private ?string $aiDraft = null;

    #[ORM\Column(nullable: true)]
    #[Assert\Range(min: 0, max: 1)]
    #[ApiProperty(
        security: "is_granted('ROLE_ADMIN')",
        securityPostDenormalize: "is_granted('ROLE_ADMIN')",
        extraProperties: ['throw_on_access_denied' => true],
    )]
    private ?float $aiConfidence = null;

    #[ORM\ManyToOne(inversedBy: 'supportTickets')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Account $account = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Property $property = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?NfcTag $nfcTag = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getSubject(): ?string
    {
        return $this->subject;
    }

    public function setSubject(string $subject): static
    {
        $this->subject = $subject;

        return $this;
    }

    public function getMessage(): ?string
    {
        return $this->message;
    }

    public function setMessage(string $message): static
    {
        $this->message = $message;

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

    public function getIssueType(): string
    {
        return $this->issueType;
    }

    public function setIssueType(string $issueType): static
    {
        $this->issueType = $issueType;

        return $this;
    }

    public function getIsAiResolved(): bool
    {
        return $this->isAiResolved;
    }

    public function setIsAiResolved(bool $isAiResolved): static
    {
        $this->isAiResolved = $isAiResolved;

        return $this;
    }

    public function getAiDraft(): ?string
    {
        return $this->aiDraft;
    }

    public function setAiDraft(?string $aiDraft): static
    {
        $this->aiDraft = $aiDraft;

        return $this;
    }

    public function getAiConfidence(): ?float
    {
        return $this->aiConfidence;
    }

    public function setAiConfidence(?float $aiConfidence): static
    {
        $this->aiConfidence = $aiConfidence;

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

    public function getProperty(): ?Property
    {
        return $this->property;
    }

    public function setProperty(?Property $property): static
    {
        $this->property = $property;

        return $this;
    }

    public function getNfcTag(): ?NfcTag
    {
        return $this->nfcTag;
    }

    public function setNfcTag(?NfcTag $nfcTag): static
    {
        $this->nfcTag = $nfcTag;

        return $this;
    }
}

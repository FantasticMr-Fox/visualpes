<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Repository\SupportTicketRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: SupportTicketRepository::class)]
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
class SupportTicket
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $subject = null;

    #[ORM\Column(type: Types::TEXT)]
    private ?string $message = null;

    #[ORM\Column(length: 50)]
    private ?string $status = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $aiDraft = null;

    #[ORM\Column(nullable: true)]
    private ?float $aiConfidence = null;

    #[ORM\ManyToOne(inversedBy: 'supportTickets')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Account $account = null;

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
}

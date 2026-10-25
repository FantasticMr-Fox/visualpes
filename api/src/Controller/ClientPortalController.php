<?php

namespace App\Controller;

use App\Entity\Account;
use App\Entity\NfcTag;
use App\Entity\User;
use App\Repository\AccountRepository;
use App\Repository\NfcTagRepository;
use App\Repository\UserRepository;
use App\Repository\ZoneRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Endpoints dédiés à l'Espace Client B2B / B2C (Run 3 — Dashboard B2B & Phygital).
 * Isolés sur le compte (`Account`) de l'utilisateur authentifié (ou `?accountId=` pour un admin).
 */
#[Route('/api/client')]
final class ClientPortalController extends AbstractController
{
    #[Route('/overview', name: 'api_client_overview', methods: ['GET'])]
    public function overview(
        Request $request,
        AccountRepository $accountRepository,
        NfcTagRepository $nfcTagRepository,
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Authentification requise.'], Response::HTTP_UNAUTHORIZED);
        }

        $account = $this->resolveTargetAccount($user, $request, $accountRepository);
        if (null === $account) {
            return $this->json(['error' => 'Aucun compte client rattaché.'], Response::HTTP_NOT_FOUND);
        }

        // Collecter toutes les puces NFC rattachées aux commandes ou aux zones de ce compte
        $allTags = $nfcTagRepository->findAll();
        $clientTags = [];
        foreach ($allTags as $tag) {
            if (!$this->doesTagBelongToAccount($tag, $account)) {
                continue;
            }
            $zone = $tag->getZone();
            $prop = $zone?->getProperty();
            $orderItem = $tag->getOrderItem();
            $clientTags[] = [
                'id' => $tag->getId(),
                'shortUid' => $tag->getShortUid(),
                'status' => $tag->getStatus(),
                'encodeAt' => $tag->getEncodeAt()?->format(\DateTimeInterface::ATOM),
                'zoneId' => $zone?->getId(),
                'zoneIri' => null !== $zone ? '/api/zones/'.$zone->getId() : null,
                'zoneName' => $zone?->getName(),
                'propertyId' => $prop?->getId(),
                'propertyName' => $prop?->getName(),
                'productName' => $orderItem?->getProductName(),
                'orderId' => $orderItem?->getParentOrder()?->getId(),
            ];
        }

        $tickets = [];
        foreach ($account->getSupportTickets() as $ticket) {
            $isResolved = 'resolved' === $ticket->getStatus() || 'closed' === $ticket->getStatus() || $ticket->getIsAiResolved();
            $tickets[] = [
                'id' => $ticket->getId(),
                '@id' => '/api/support_tickets/'.$ticket->getId(),
                'subject' => $ticket->getSubject(),
                'message' => $ticket->getMessage(),
                'status' => $ticket->getStatus(),
                'issueType' => $ticket->getIssueType(),
                'isAiResolved' => $ticket->getIsAiResolved(),
                'resolutionMessage' => $isResolved ? $ticket->getAiDraft() : null,
                'propertyId' => $ticket->getProperty()?->getId(),
                'propertyName' => $ticket->getProperty()?->getName(),
                'nfcTagShortUid' => $ticket->getNfcTag()?->getShortUid(),
            ];
        }

        return $this->json([
            'account' => [
                'id' => $account->getId(),
                '@id' => '/api/accounts/'.$account->getId(),
                'name' => $account->getName(),
                'type' => $account->getType(),
            ],
            'currentUser' => [
                'id' => $user->getId(),
                'email' => $user->getEmail(),
                'roles' => $user->getRoles(),
            ],
            'nfcTags' => $clientTags,
            'tickets' => $tickets,
        ]);
    }

    #[Route('/nfc-tags/{id}/assign-zone', name: 'api_client_nfc_assign_zone', methods: ['POST'], requirements: ['id' => '\d+'])]
    public function assignNfcZone(
        int $id,
        Request $request,
        AccountRepository $accountRepository,
        NfcTagRepository $nfcTagRepository,
        ZoneRepository $zoneRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Authentification requise.'], Response::HTTP_UNAUTHORIZED);
        }

        $account = $this->resolveTargetAccount($user, $request, $accountRepository);
        $tag = $nfcTagRepository->find($id);
        if (null === $account || null === $tag || !$this->doesTagBelongToAccount($tag, $account)) {
            return $this->json(['error' => 'Support NFC introuvable sur votre compte.'], Response::HTTP_NOT_FOUND);
        }

        $payload = json_decode($request->getContent() ?: '{}', true);
        $zoneId = \is_array($payload) && isset($payload['zoneId']) && null !== $payload['zoneId'] && '' !== (string) $payload['zoneId']
            ? (int) $payload['zoneId']
            : null;

        if (null === $zoneId) {
            $tag->setZone(null);
            if ('assigned' === $tag->getStatus()) {
                $tag->setStatus('encoded');
            }
        } else {
            $zone = $zoneRepository->find($zoneId);
            if (null === $zone || $zone->getProperty()?->getAccount()?->getId() !== $account->getId()) {
                return $this->json(['error' => 'Zone invalide pour ce compte.'], Response::HTTP_FORBIDDEN);
            }
            $tag->setZone($zone);
            if ('defective' !== $tag->getStatus()) {
                $tag->setStatus('assigned');
            }
        }

        $entityManager->flush();

        return $this->json([
            'id' => $tag->getId(),
            'shortUid' => $tag->getShortUid(),
            'status' => $tag->getStatus(),
            'zoneId' => $tag->getZone()?->getId(),
            'zoneName' => $tag->getZone()?->getName(),
        ]);
    }

    #[Route('/team', name: 'api_client_team_create', methods: ['POST'])]
    public function createTeamMember(
        Request $request,
        AccountRepository $accountRepository,
        UserRepository $userRepository,
        UserPasswordHasherInterface $passwordHasher,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Authentification requise.'], Response::HTTP_UNAUTHORIZED);
        }

        $account = $this->resolveTargetAccount($user, $request, $accountRepository);
        if (null === $account) {
            return $this->json(['error' => 'Compte introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $payload = json_decode($request->getContent() ?: '{}', true);
        $email = \is_array($payload) ? strtolower(trim((string) ($payload['email'] ?? ''))) : '';
        $plainPassword = \is_array($payload) ? (string) ($payload['plainPassword'] ?? '') : '';

        if ('' === $email || !filter_var($email, \FILTER_VALIDATE_EMAIL)) {
            return $this->json(['error' => 'Adresse email invalide.'], Response::HTTP_BAD_REQUEST);
        }
        if (\strlen($plainPassword) < 8) {
            return $this->json(['error' => 'Le mot de passe doit contenir au moins 8 caractères.'], Response::HTTP_BAD_REQUEST);
        }
        if (null !== $userRepository->findOneBy(['email' => $email])) {
            return $this->json(['error' => 'Cette adresse email est déjà utilisée.'], Response::HTTP_CONFLICT);
        }

        $member = new User();
        $member->setEmail($email);
        $member->setRoles(['ROLE_USER']);
        $member->setAccount($account);
        $member->setPassword($passwordHasher->hashPassword($member, $plainPassword));

        $entityManager->persist($member);
        $entityManager->flush();

        return $this->json([
            'id' => $member->getId(),
            '@id' => '/api/users/'.$member->getId(),
            'email' => $member->getEmail(),
            'roles' => $member->getRoles(),
            'account' => '/api/accounts/'.$account->getId(),
        ], Response::HTTP_CREATED);
    }

    #[Route('/team/{id}/password', name: 'api_client_team_password', methods: ['PATCH'], requirements: ['id' => '\d+'])]
    public function updateTeamPassword(
        int $id,
        Request $request,
        AccountRepository $accountRepository,
        UserRepository $userRepository,
        UserPasswordHasherInterface $passwordHasher,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Authentification requise.'], Response::HTTP_UNAUTHORIZED);
        }

        $account = $this->resolveTargetAccount($user, $request, $accountRepository);
        $member = $userRepository->find($id);
        if (null === $account || null === $member || $member->getAccount()?->getId() !== $account->getId()) {
            return $this->json(['error' => 'Collaborateur introuvable sur votre compte.'], Response::HTTP_NOT_FOUND);
        }

        $payload = json_decode($request->getContent() ?: '{}', true);
        $plainPassword = \is_array($payload) ? (string) ($payload['plainPassword'] ?? '') : '';
        if (\strlen($plainPassword) < 8) {
            return $this->json(['error' => 'Le mot de passe doit contenir au moins 8 caractères.'], Response::HTTP_BAD_REQUEST);
        }

        $member->setPassword($passwordHasher->hashPassword($member, $plainPassword));
        $entityManager->flush();

        return $this->json(['status' => 'ok']);
    }

    #[Route('/team/{id}', name: 'api_client_team_delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function deleteTeamMember(
        int $id,
        Request $request,
        AccountRepository $accountRepository,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Authentification requise.'], Response::HTTP_UNAUTHORIZED);
        }

        if ($user->getId() === $id) {
            return $this->json(['error' => 'Vous ne pouvez pas supprimer votre propre accès actif.'], Response::HTTP_BAD_REQUEST);
        }

        $account = $this->resolveTargetAccount($user, $request, $accountRepository);
        $member = $userRepository->find($id);
        if (null === $account || null === $member || $member->getAccount()?->getId() !== $account->getId()) {
            return $this->json(['error' => 'Collaborateur introuvable sur votre compte.'], Response::HTTP_NOT_FOUND);
        }

        $entityManager->remove($member);
        $entityManager->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    private function resolveTargetAccount(User $user, Request $request, AccountRepository $accountRepository): ?Account
    {
        if ($this->isGranted('ROLE_ADMIN')) {
            $requestedId = (int) $request->query->get('accountId', 0);
            if ($requestedId > 0) {
                $found = $accountRepository->find($requestedId);
                if (null !== $found) {
                    return $found;
                }
            }
        }

        return $user->getAccount();
    }

    private function doesTagBelongToAccount(NfcTag $tag, Account $account): bool
    {
        $zoneAccount = $tag->getZone()?->getProperty()?->getAccount();
        if (null !== $zoneAccount && $zoneAccount->getId() === $account->getId()) {
            return true;
        }

        $orderAccount = $tag->getOrderItem()?->getParentOrder()?->getAccount();
        if (null !== $orderAccount && $orderAccount->getId() === $account->getId()) {
            return true;
        }

        return false;
    }
}


<?php

namespace App\Controller;

use App\Entity\Property;
use App\Entity\User;
use App\Repository\PropertyRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/properties')]
#[IsGranted('ROLE_USER')]
final class PropertyUsersController extends AbstractController
{
    /**
     * Met à jour directement la liste des collaborateurs / utilisateurs habilités sur une propriété.
     */
    #[Route('/{id}/assigned-users', name: 'api_property_update_assigned_users', methods: ['POST', 'PUT'], requirements: ['id' => '\d+'])]
    public function updateAssignedUsers(
        int $id,
        Request $request,
        PropertyRepository $propertyRepository,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $currentUser = $this->getUser();
        if (!$currentUser instanceof User) {
            return $this->json(['error' => 'Authentification requise.'], Response::HTTP_UNAUTHORIZED);
        }

        $property = $propertyRepository->find($id);
        if (null === $property) {
            return $this->json(['error' => 'Propriété introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $canManage = $this->isGranted('ROLE_ADMIN') || ($this->isGranted('ROLE_ACCOUNT_ADMIN') && $currentUser->getAccount()?->getId() === $property->getAccount()?->getId());
        if (!$canManage) {
            return $this->json(['error' => 'Seul un administrateur du compte ou du système peut affecter les droits d\'accès aux hébergements.'], Response::HTTP_FORBIDDEN);
        }

        $payload = json_decode($request->getContent() ?: '{}', true);
        if (!\is_array($payload)) {
            return $this->json(['error' => 'Payload invalide.'], Response::HTTP_BAD_REQUEST);
        }

        $targetUserIris = [];
        if (isset($payload['userIris']) && \is_array($payload['userIris'])) {
            $targetUserIris = $payload['userIris'];
        } elseif (isset($payload['userIds']) && \is_array($payload['userIds'])) {
            foreach ($payload['userIds'] as $uid) {
                $targetUserIris[] = '/api/users/'.(int) $uid;
            }
        }

        // Récupérer tous les utilisateurs du compte de la propriété
        $accountUsers = $property->getAccount()?->getUsers() ?? [];

        foreach ($accountUsers as $member) {
            $memberIri = '/api/users/'.$member->getId();
            $shouldHaveAccess = \in_array($memberIri, $targetUserIris, true);

            if ($shouldHaveAccess && !$member->getProperties()->contains($property)) {
                $member->addProperty($property);
            } elseif (!$shouldHaveAccess && $member->getProperties()->contains($property)) {
                $member->removeProperty($property);
            }
        }

        $entityManager->flush();

        $activeIris = [];
        foreach ($property->getAssignedUsers() as $u) {
            $activeIris[] = '/api/users/'.$u->getId();
        }

        return $this->json([
            'success' => true,
            'propertyId' => $property->getId(),
            'assignedUsers' => $activeIris,
        ]);
    }
}


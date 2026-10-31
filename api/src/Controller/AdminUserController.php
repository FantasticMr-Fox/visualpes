<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\AppMailerService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Endpoints d'administration atelier / SAV pour la gestion avancée des utilisateurs.
 */
#[Route('/api/admin/users')]
#[IsGranted('ROLE_USER')]
final class AdminUserController extends AbstractController
{
    /**
     * Déclenche la régénération à distance du mot de passe d'un utilisateur par le SAV ou l'administrateur du compte.
     * Génère un mot de passe temporaire robuste et mémorisable (ou applique un mot de passe personnalisé),
     * met à jour le hash, et renvoie le mot de passe en clair pour affichage immédiat au support.
     */
    #[Route('/{id}/regenerate-password', name: 'api_admin_user_regenerate_password', methods: ['POST'], requirements: ['id' => '\d+'])]
    public function regeneratePassword(
        int $id,
        Request $request,
        UserRepository $userRepository,
        UserPasswordHasherInterface $passwordHasher,
        AppMailerService $appMailer,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $currentUser = $this->getUser();
        if (!$currentUser instanceof User) {
            return $this->json(['error' => 'Authentification requise.'], Response::HTTP_UNAUTHORIZED);
        }

        $user = $userRepository->find($id);
        if (null === $user) {
            return $this->json(['error' => 'Utilisateur introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $canManage = $this->isGranted('ROLE_ADMIN') || ($this->isGranted('ROLE_ACCOUNT_ADMIN') && $currentUser->getAccount()?->getId() === $user->getAccount()?->getId());
        if (!$canManage) {
            return $this->json(['error' => 'Seul un administrateur peut régénérer un mot de passe.'], Response::HTTP_FORBIDDEN);
        }

        $payload = json_decode($request->getContent() ?: '{}', true);
        $customPassword = \is_array($payload) && !empty($payload['customPassword'])
            ? trim((string) $payload['customPassword'])
            : null;

        $notifyEmail = !\is_array($payload) || !isset($payload['notifyEmail']) || (bool) $payload['notifyEmail'];

        if (null !== $customPassword) {
            if (\strlen($customPassword) < 8) {
                return $this->json(['error' => 'Le mot de passe doit comporter au moins 8 caractères.'], Response::HTTP_BAD_REQUEST);
            }
            $plainPassword = $customPassword;
        } else {
            // Mot de passe temporaire convivial et sécurisé : ex Alpes-2026-7K9p
            $chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
            $randomPart = '';
            for ($i = 0; $i < 6; ++$i) {
                $randomPart .= $chars[random_int(0, \strlen($chars) - 1)];
            }
            $plainPassword = 'Alpes-' . date('Y') . '-' . $randomPart;
        }

        $user->setPassword($passwordHasher->hashPassword($user, $plainPassword));
        $user->setResetTokenHash(null);
        $user->setResetTokenExpiresAt(null);
        $entityManager->flush();

        $emailSent = false;
        if ($notifyEmail) {
            try {
                $appMailer->sendPasswordChangedNotice($user);
                $emailSent = true;
            } catch (\Throwable) {
                $emailSent = false;
            }
        }

        return $this->json([
            'success' => true,
            'message' => 'Mot de passe régénéré avec succès.',
            'userId' => $user->getId(),
            'email' => $user->getEmail(),
            'temporaryPassword' => $plainPassword,
            'emailSent' => $emailSent,
        ]);
    }

    /**
     * Envoie un lien officiel de réinitialisation par e-mail avec un code sécurisé à 6 chiffres.
     */
    #[Route('/{id}/send-reset-link', name: 'api_admin_user_send_reset_link', methods: ['POST'], requirements: ['id' => '\d+'])]
    public function sendResetLink(
        int $id,
        Request $request,
        UserRepository $userRepository,
        AppMailerService $appMailer,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $currentUser = $this->getUser();
        if (!$currentUser instanceof User) {
            return $this->json(['error' => 'Authentification requise.'], Response::HTTP_UNAUTHORIZED);
        }

        $user = $userRepository->find($id);
        if (null === $user) {
            return $this->json(['error' => 'Utilisateur introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $canManage = $this->isGranted('ROLE_ADMIN') || ($this->isGranted('ROLE_ACCOUNT_ADMIN') && $currentUser->getAccount()?->getId() === $user->getAccount()?->getId());
        if (!$canManage) {
            return $this->json(['error' => 'Action non autorisée.'], Response::HTTP_FORBIDDEN);
        }

        $code = (string) random_int(100000, 999999);
        $user->setResetTokenHash(hash('sha256', $code));
        $user->setResetTokenExpiresAt(new \DateTimeImmutable('+30 minutes'));
        $entityManager->flush();

        $origin = $request->headers->get('Origin') ?: 'http://localhost:3000';
        $resetUrl = \sprintf(
            '%s/forgot-password?email=%s&code=%s',
            rtrim($origin, '/'),
            rawurlencode($user->getEmail()),
            rawurlencode($code)
        );

        $emailSent = false;
        try {
            $appMailer->sendPasswordReset($user, $code, $resetUrl);
            $emailSent = true;
        } catch (\Throwable) {
            $emailSent = false;
        }

        return $this->json([
            'success' => true,
            'message' => 'Lien de réinitialisation transmis par e-mail.',
            'userId' => $user->getId(),
            'email' => $user->getEmail(),
            'resetUrl' => $resetUrl,
            'code' => $code,
            'emailSent' => $emailSent,
        ]);
    }
}


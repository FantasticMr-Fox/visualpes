<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\EmailLogRepository;
use App\Repository\UserRepository;
use App\Security\TotpAuthenticator;
use App\Service\AppMailerService;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/auth')]
final class AuthSecurityController extends AbstractController
{
    #[Route('/login', name: 'api_auth_login', methods: ['POST'])]
    public function login(
        Request $request,
        UserRepository $userRepository,
        UserPasswordHasherInterface $passwordHasher,
        JWTTokenManagerInterface $jwtManager,
        TotpAuthenticator $totp,
        AppMailerService $appMailer,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $payload = json_decode($request->getContent() ?: '{}', true);
        if (!\is_array($payload)) {
            return $this->json(['error' => 'Payload JSON invalide.'], Response::HTTP_BAD_REQUEST);
        }

        $email = strtolower(trim((string) ($payload['email'] ?? '')));
        $password = (string) ($payload['password'] ?? '');

        $user = '' !== $email ? $userRepository->findOneBy(['email' => $email]) : null;
        if (null === $user || !$passwordHasher->isPasswordValid($user, $password)) {
            return $this->json(['error' => 'Identifiants incorrects.'], Response::HTTP_UNAUTHORIZED);
        }

        if (!$user->isTwoFactorEnabled()) {
            return $this->json([
                'twoFactorRequired' => false,
                'token' => $jwtManager->create($user),
                'user' => [
                    'id' => $user->getId(),
                    'email' => $user->getEmail(),
                    'roles' => $user->getRoles(),
                ],
            ]);
        }

        $method = $user->getTwoFactorMethod();
        $challengeToken = $totp->createChallengeToken((int) $user->getId(), $method, 600);

        if ('email' === $method || null === $user->getTotpSecret()) {
            $code = (string) random_int(100000, 999999);
            $user->setTwoFactorCodeHash(hash('sha256', $code));
            $user->setTwoFactorExpiresAt(new \DateTimeImmutable('+10 minutes'));
            $entityManager->flush();

            $appMailer->sendTwoFactorCode($user, $code);

            return $this->json([
                'twoFactorRequired' => true,
                'method' => 'email',
                'challengeToken' => $challengeToken,
                'message' => 'Un code de sécurité à 6 chiffres vient d\'être envoyé à votre adresse e-mail.',
            ]);
        }

        return $this->json([
            'twoFactorRequired' => true,
            'method' => 'totp',
            'challengeToken' => $challengeToken,
            'message' => 'Saisissez le code à 6 chiffres de votre application d\'authentification (ou demandez un code par e-mail).',
        ]);
    }

    #[Route('/2fa/verify', name: 'api_auth_2fa_verify', methods: ['POST'])]
    public function verifyTwoFactor(
        Request $request,
        UserRepository $userRepository,
        TotpAuthenticator $totp,
        JWTTokenManagerInterface $jwtManager,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $payload = json_decode($request->getContent() ?: '{}', true);
        if (!\is_array($payload)) {
            return $this->json(['error' => 'Payload JSON invalide.'], Response::HTTP_BAD_REQUEST);
        }

        $challengeToken = trim((string) ($payload['challengeToken'] ?? ''));
        $code = preg_replace('/\D+/', '', (string) ($payload['code'] ?? '')) ?? '';

        $challenge = $totp->verifyChallengeToken($challengeToken);
        if (null === $challenge) {
            return $this->json(['error' => 'Session de vérification expirée. Veuillez vous reconnecter.'], Response::HTTP_UNAUTHORIZED);
        }

        $user = $userRepository->find($challenge['uid']);
        if (null === $user) {
            return $this->json(['error' => 'Utilisateur introuvable.'], Response::HTTP_UNAUTHORIZED);
        }

        $valid = false;
        $now = new \DateTimeImmutable();

        // 1. Vérification du code OTP envoyé par e-mail (s'il existe et n'est pas expiré)
        if (
            null !== $user->getTwoFactorCodeHash()
            && null !== $user->getTwoFactorExpiresAt()
            && $user->getTwoFactorExpiresAt() >= $now
            && hash_equals($user->getTwoFactorCodeHash(), hash('sha256', $code))
        ) {
            $valid = true;
        }

        // 2. Vérification du code TOTP RFC 6238 (si configuré)
        if (!$valid && null !== $user->getTotpSecret() && '' !== $user->getTotpSecret()) {
            $valid = $totp->verifyTotpCode($user->getTotpSecret(), $code);
        }

        if (!$valid) {
            return $this->json(['error' => 'Code de vérification à 6 chiffres invalide ou expiré.'], Response::HTTP_UNAUTHORIZED);
        }

        $user->setTwoFactorCodeHash(null);
        $user->setTwoFactorExpiresAt(null);
        $entityManager->flush();

        return $this->json([
            'token' => $jwtManager->create($user),
            'user' => [
                'id' => $user->getId(),
                'email' => $user->getEmail(),
                'roles' => $user->getRoles(),
            ],
        ]);
    }

    #[Route('/2fa/resend-email', name: 'api_auth_2fa_resend_email', methods: ['POST'])]
    public function resendTwoFactorEmail(
        Request $request,
        UserRepository $userRepository,
        TotpAuthenticator $totp,
        AppMailerService $appMailer,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $payload = json_decode($request->getContent() ?: '{}', true);
        $challengeToken = \is_array($payload) ? trim((string) ($payload['challengeToken'] ?? '')) : '';

        $challenge = $totp->verifyChallengeToken($challengeToken);
        if (null === $challenge) {
            return $this->json(['error' => 'Session expirée.'], Response::HTTP_UNAUTHORIZED);
        }

        $user = $userRepository->find($challenge['uid']);
        if (null === $user) {
            return $this->json(['error' => 'Utilisateur introuvable.'], Response::HTTP_UNAUTHORIZED);
        }

        $code = (string) random_int(100000, 999999);
        $user->setTwoFactorCodeHash(hash('sha256', $code));
        $user->setTwoFactorExpiresAt(new \DateTimeImmutable('+10 minutes'));
        $entityManager->flush();

        $appMailer->sendTwoFactorCode($user, $code);

        return $this->json([
            'sent' => true,
            'message' => 'Un nouveau code à 6 chiffres vient d\'être envoyé par e-mail.',
        ]);
    }

    #[Route('/forgot-password', name: 'api_auth_forgot_password', methods: ['POST'])]
    public function forgotPassword(
        Request $request,
        UserRepository $userRepository,
        AppMailerService $appMailer,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $payload = json_decode($request->getContent() ?: '{}', true);
        $email = \is_array($payload) ? strtolower(trim((string) ($payload['email'] ?? ''))) : '';

        if ('' !== $email) {
            $user = $userRepository->findOneBy(['email' => $email]);
            if (null !== $user) {
                $code = (string) random_int(100000, 999999);
                $user->setResetTokenHash(hash('sha256', $code));
                $user->setResetTokenExpiresAt(new \DateTimeImmutable('+30 minutes'));
                $entityManager->flush();

                $origin = $request->headers->get('Origin') ?: 'http://localhost:3000';
                $resetUrl = \sprintf(
                    '%s/forgot-password?email=%s&code=%s',
                    rtrim($origin, '/'),
                    rawurlencode($email),
                    rawurlencode($code)
                );

                $appMailer->sendPasswordReset($user, $code, $resetUrl);
            }
        }

        return $this->json([
            'sent' => true,
            'message' => 'Si un compte est associé à cette adresse e-mail, un code de réinitialisation (valable 30 minutes) vient de vous être envoyé.',
        ]);
    }

    #[Route('/reset-password', name: 'api_auth_reset_password', methods: ['POST'])]
    public function resetPassword(
        Request $request,
        UserRepository $userRepository,
        UserPasswordHasherInterface $passwordHasher,
        AppMailerService $appMailer,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $payload = json_decode($request->getContent() ?: '{}', true);
        if (!\is_array($payload)) {
            return $this->json(['error' => 'Payload JSON invalide.'], Response::HTTP_BAD_REQUEST);
        }

        $email = strtolower(trim((string) ($payload['email'] ?? '')));
        $code = preg_replace('/\D+/', '', (string) ($payload['code'] ?? '')) ?? '';
        $newPassword = (string) ($payload['newPassword'] ?? '');

        if (\strlen($newPassword) < 8) {
            return $this->json(['error' => 'Le nouveau mot de passe doit contenir au moins 8 caractères.'], Response::HTTP_BAD_REQUEST);
        }

        $user = '' !== $email ? $userRepository->findOneBy(['email' => $email]) : null;
        $now = new \DateTimeImmutable();

        if (
            null === $user
            || null === $user->getResetTokenHash()
            || null === $user->getResetTokenExpiresAt()
            || $user->getResetTokenExpiresAt() < $now
            || !hash_equals($user->getResetTokenHash(), hash('sha256', $code))
        ) {
            return $this->json(['error' => 'Code de réinitialisation invalide ou expiré.'], Response::HTTP_BAD_REQUEST);
        }

        $user->setPassword($passwordHasher->hashPassword($user, $newPassword));
        $user->setResetTokenHash(null);
        $user->setResetTokenExpiresAt(null);
        $entityManager->flush();

        $appMailer->sendPasswordChangedNotice($user);

        return $this->json([
            'reset' => true,
            'message' => 'Votre mot de passe a été réinitialisé avec succès. Vous pouvez vous connecter.',
        ]);
    }

    #[Route('/me', name: 'api_auth_me', methods: ['GET'])]
    public function me(): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Non authentifié.'], Response::HTTP_UNAUTHORIZED);
        }

        return $this->json([
            'id' => $user->getId(),
            'email' => $user->getEmail(),
            'roles' => $user->getRoles(),
            'twoFactorEnabled' => $user->isTwoFactorEnabled(),
            'twoFactorMethod' => $user->getTwoFactorMethod(),
            'hasTotpSecret' => null !== $user->getTotpSecret() && '' !== $user->getTotpSecret(),
        ]);
    }

    #[Route('/2fa/setup', name: 'api_auth_2fa_setup', methods: ['POST'])]
    public function setupTwoFactor(
        Request $request,
        TotpAuthenticator $totp,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Non authentifié.'], Response::HTTP_UNAUTHORIZED);
        }

        $payload = json_decode($request->getContent() ?: '{}', true);
        $method = \is_array($payload) ? trim((string) ($payload['method'] ?? 'email')) : 'email';

        if ('totp' === $method) {
            $secret = $totp->generateSecret();
            $user->setTotpSecret($secret);
            $entityManager->flush();

            return $this->json([
                'method' => 'totp',
                'secret' => $secret,
                'otpAuthUri' => $totp->getOtpAuthUri((string) $user->getEmail(), $secret),
                'twoFactorEnabled' => $user->isTwoFactorEnabled(),
            ]);
        }

        $user->setTwoFactorMethod('email');
        $user->setTwoFactorEnabled(true);
        $entityManager->flush();

        return $this->json([
            'method' => 'email',
            'twoFactorEnabled' => true,
            'twoFactorMethod' => 'email',
        ]);
    }

    #[Route('/2fa/confirm-totp', name: 'api_auth_2fa_confirm_totp', methods: ['POST'])]
    public function confirmTotp(
        Request $request,
        TotpAuthenticator $totp,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Non authentifié.'], Response::HTTP_UNAUTHORIZED);
        }

        $secret = $user->getTotpSecret();
        if (null === $secret || '' === $secret) {
            return $this->json(['error' => 'Veuillez d\'abord initialiser la clé TOTP.'], Response::HTTP_BAD_REQUEST);
        }

        $payload = json_decode($request->getContent() ?: '{}', true);
        $code = \is_array($payload) ? (string) ($payload['code'] ?? '') : '';

        if (!$totp->verifyTotpCode($secret, $code)) {
            return $this->json(['error' => 'Code à 6 chiffres incorrect. Vérifiez votre application d\'authentification.'], Response::HTTP_BAD_REQUEST);
        }

        $user->setTwoFactorMethod('totp');
        $user->setTwoFactorEnabled(true);
        $entityManager->flush();

        return $this->json([
            'twoFactorEnabled' => true,
            'twoFactorMethod' => 'totp',
        ]);
    }

    #[Route('/2fa/disable', name: 'api_auth_2fa_disable', methods: ['POST'])]
    public function disableTwoFactor(EntityManagerInterface $entityManager): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Non authentifié.'], Response::HTTP_UNAUTHORIZED);
        }

        $user->setTwoFactorEnabled(false);
        $user->setTwoFactorCodeHash(null);
        $user->setTwoFactorExpiresAt(null);
        $entityManager->flush();

        return $this->json([
            'twoFactorEnabled' => false,
            'twoFactorMethod' => $user->getTwoFactorMethod(),
        ]);
    }

    #[Route('/emails', name: 'api_auth_emails', methods: ['GET'])]
    public function listEmails(EmailLogRepository $emailLogRepository): JsonResponse
    {
        if (!$this->isGranted('ROLE_ADMIN')) {
            return $this->json(['error' => 'Accès réservé aux administrateurs.'], Response::HTTP_FORBIDDEN);
        }

        $logs = $emailLogRepository->findBy([], ['sentAt' => 'DESC'], 30);
        $items = array_map(static fn ($log): array => [
            'id' => $log->getId(),
            'recipient' => $log->getRecipient(),
            'subject' => $log->getSubject(),
            'category' => $log->getCategory(),
            'status' => $log->getStatus(),
            'sentAt' => $log->getSentAt()->format(\DateTimeInterface::ATOM),
            'textBody' => $log->getTextBody(),
        ], $logs);

        return $this->json(['items' => $items]);
    }
}


<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\PropertyRepository;
use App\Security\WifiCredentialCrypto;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class PropertyWifiController extends AbstractController
{
    #[Route('/api/properties/{id}/reveal-wifi', name: 'api_property_reveal_wifi', methods: ['POST'])]
    public function __invoke(
        int $id,
        PropertyRepository $propertyRepository,
        WifiCredentialCrypto $wifiCrypto,
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Authentification requise.'], Response::HTTP_UNAUTHORIZED);
        }

        $property = $propertyRepository->find($id);
        if (null === $property) {
            return $this->json(['error' => 'Propriété introuvable.'], Response::HTTP_NOT_FOUND);
        }

        // Seul le titulaire du compte propriétaire du logement peut déchiffrer et voir son mot de passe Wi-Fi
        if (null === $user->getAccount() || $user->getAccount()->getId() !== $property->getAccount()?->getId()) {
            return $this->json([
                'error' => 'Confidentialité client : seul le titulaire du compte peut révéler le mot de passe Wi-Fi en clair.',
            ], Response::HTTP_FORBIDDEN);
        }

        $accessCode = $wifiCrypto->decrypt($property->getWifiAccessCode());

        return $this->json([
            'wifiSSID' => $wifiCrypto->decrypt($property->getWifiSSID()),
            'wifiPassword' => $wifiCrypto->decrypt($property->getWifiPassword()),
            'wifiAccessCode' => $accessCode,
            'wifiProtectedByCode' => null !== $accessCode && '' !== trim($accessCode),
        ]);
    }
}

<?php

namespace App\Controller;

use App\Entity\NfcTag;
use App\Entity\Property;
use App\Repository\NfcTagRepository;
use App\Security\WifiCredentialCrypto;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class PublicGuideController extends AbstractController
{
    #[Route('/api/public/guide/{shortUid}', name: 'api_public_guide', methods: ['GET'])]
    public function show(
        string $shortUid,
        NfcTagRepository $nfcTagRepository,
        WifiCredentialCrypto $wifiCrypto,
    ): JsonResponse {
        [$tag, $errorResponse] = $this->resolveActiveTag($shortUid, $nfcTagRepository);
        if (null !== $errorResponse) {
            return $errorResponse;
        }

        $zone = $tag->getZone();
        $property = $this->resolveProperty($tag);
        $orderItem = $tag->getOrderItem();
        $account = $property?->getAccount() ?? $orderItem?->getParentOrder()?->getAccount();

        $plainSsid = null !== $property ? $wifiCrypto->decrypt($property->getWifiSSID()) : null;
        $hasPassword = null !== $property && null !== $property->getWifiPassword() && '' !== $property->getWifiPassword();
        $hasAccessCode = null !== $property && null !== $property->getWifiAccessCode() && '' !== $property->getWifiAccessCode();

        return $this->json([
            'shortUid' => $tag->getShortUid(),
            'status' => $tag->getStatus(),
            'encodeAt' => $tag->getEncodeAt()?->format(\DateTimeInterface::ATOM),
            'productName' => $orderItem?->getProductName(),
            'orderId' => $orderItem?->getParentOrder()?->getId(),
            'accountName' => $account?->getName(),
            'zone' => null !== $zone ? [
                'id' => $zone->getId(),
                'name' => $zone->getName(),
                'mountType' => $zone->getMountType(),
            ] : null,
            'property' => null !== $property ? [
                'id' => $property->getId(),
                'name' => $property->getName(),
                'wifiConfigured' => (null !== $plainSsid && '' !== $plainSsid && $hasPassword),
                'wifiProtectedByCode' => $hasAccessCode,
                'wifiSsidMasked' => $wifiCrypto->maskSsid($plainSsid),
                'externalGuideUrl' => $property->getExternalGuideUrl(),
                'instructions' => $property->getInstructions(),
            ] : null,
        ]);
    }

    #[Route('/api/public/guide/{shortUid}/unlock-wifi', name: 'api_public_guide_unlock_wifi', methods: ['POST'])]
    public function unlockWifi(
        string $shortUid,
        Request $request,
        NfcTagRepository $nfcTagRepository,
        WifiCredentialCrypto $wifiCrypto,
    ): JsonResponse {
        [$tag, $errorResponse] = $this->resolveActiveTag($shortUid, $nfcTagRepository);
        if (null !== $errorResponse) {
            return $errorResponse;
        }

        $property = $this->resolveProperty($tag);
        if (null === $property) {
            return $this->json(['error' => 'Aucune propriété rattachée à ce support NFC.'], Response::HTTP_NOT_FOUND);
        }

        $expectedCode = $wifiCrypto->decrypt($property->getWifiAccessCode());
        if (null !== $expectedCode && '' !== trim($expectedCode)) {
            $payload = json_decode($request->getContent() ?: '{}', true);
            $providedCode = \is_array($payload) ? (string) ($payload['accessCode'] ?? '') : '';

            if (!hash_equals(trim($expectedCode), trim($providedCode))) {
                return $this->json([
                    'error' => 'Code d\'accès logement incorrect.',
                ], Response::HTTP_FORBIDDEN);
            }
        }

        $ssid = $wifiCrypto->decrypt($property->getWifiSSID());
        $password = $wifiCrypto->decrypt($property->getWifiPassword());

        if (null === $ssid || '' === $ssid) {
            return $this->json(['error' => 'Wi-Fi non configuré sur ce logement.'], Response::HTTP_NOT_FOUND);
        }

        $escapedSsid = addcslashes($ssid, '\\;,"');
        $escapedPass = addcslashes((string) $password, '\\;,"');
        $qrPayload = \sprintf('WIFI:T:WPA;S:%s;P:%s;;', $escapedSsid, $escapedPass);

        return $this->json([
            'wifiSSID' => $ssid,
            'wifiPassword' => $password,
            'wifiQrPayload' => $qrPayload,
        ]);
    }

    /**
     * @return array{0: ?NfcTag, 1: ?JsonResponse}
     */
    private function resolveActiveTag(string $shortUid, NfcTagRepository $nfcTagRepository): array
    {
        $normalizedUid = strtoupper(trim($shortUid));
        $tag = $nfcTagRepository->findOneBy(['shortUid' => $normalizedUid])
            ?? $nfcTagRepository->findOneBy(['shortUid' => trim($shortUid)]);

        if (null === $tag) {
            return [null, $this->json([
                'error' => 'Ce support NFC VisuAlpes n\'est pas encore enregistré.',
                'shortUid' => $normalizedUid,
            ], Response::HTTP_NOT_FOUND)];
        }

        if ('defective' === $tag->getStatus()) {
            return [null, $this->json([
                'error' => 'Ce support NFC a été désactivé (marqué défectueux).',
                'shortUid' => $tag->getShortUid(),
                'status' => $tag->getStatus(),
            ], Response::HTTP_GONE)];
        }

        return [$tag, null];
    }

    private function resolveProperty(NfcTag $tag): ?Property
    {
        $property = $tag->getZone()?->getProperty();
        $orderAccount = $tag->getOrderItem()?->getParentOrder()?->getAccount();

        if (null === $property && null !== $orderAccount && !$orderAccount->getProperties()->isEmpty()) {
            $property = $orderAccount->getProperties()->first() ?: null;
        }

        return $property;
    }
}

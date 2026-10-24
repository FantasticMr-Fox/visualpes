<?php

namespace App\Controller;

use App\Repository\NfcTagRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class PublicGuideController extends AbstractController
{
    #[Route('/api/public/guide/{shortUid}', name: 'api_public_guide', methods: ['GET'])]
    public function __invoke(string $shortUid, NfcTagRepository $nfcTagRepository): JsonResponse
    {
        $normalizedUid = strtoupper(trim($shortUid));
        $tag = $nfcTagRepository->findOneBy(['shortUid' => $normalizedUid])
            ?? $nfcTagRepository->findOneBy(['shortUid' => trim($shortUid)]);

        if (null === $tag) {
            return $this->json([
                'error' => 'Ce support NFC VisuAlpes n\'est pas encore enregistré.',
                'shortUid' => $normalizedUid,
            ], Response::HTTP_NOT_FOUND);
        }

        if ('defective' === $tag->getStatus()) {
            return $this->json([
                'error' => 'Ce support NFC a été désactivé (marqué défectueux).',
                'shortUid' => $tag->getShortUid(),
                'status' => $tag->getStatus(),
            ], Response::HTTP_GONE);
        }

        $zone = $tag->getZone();
        $property = $zone?->getProperty();
        $orderItem = $tag->getOrderItem();
        $orderAccount = $orderItem?->getParentOrder()?->getAccount();

        if (null === $property && null !== $orderAccount && !$orderAccount->getProperties()->isEmpty()) {
            $property = $orderAccount->getProperties()->first() ?: null;
        }

        $account = $property?->getAccount() ?? $orderAccount;

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
                'wifiSSID' => $property->getWifiSSID(),
                'wifiPassword' => $property->getWifiPassword(),
                'externalGuideUrl' => $property->getExternalGuideUrl(),
                'instructions' => $property->getInstructions(),
            ] : null,
        ]);
    }
}


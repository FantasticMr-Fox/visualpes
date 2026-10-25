<?php

namespace App\Controller;

use App\AI\RagConciergeService;
use App\Entity\Account;
use App\Entity\NfcTag;
use App\Entity\Property;
use App\Entity\SupportTicket;
use App\Entity\Zone;
use App\Repository\NfcTagRepository;
use App\Repository\PropertyRepository;
use App\Security\WifiCredentialCrypto;
use Doctrine\ORM\EntityManagerInterface;
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
            'needsPairing' => null === $zone && null === $property,
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

    #[Route('/api/public/guide/{shortUid}/ask', name: 'api_public_guide_ask', methods: ['POST'])]
    public function askConcierge(
        string $shortUid,
        Request $request,
        NfcTagRepository $nfcTagRepository,
        RagConciergeService $ragConcierge,
    ): JsonResponse {
        [$tag, $errorResponse] = $this->resolveActiveTag($shortUid, $nfcTagRepository);
        if (null !== $errorResponse) {
            return $errorResponse;
        }

        $property = $this->resolveProperty($tag);
        if (null === $property) {
            return $this->json(['error' => 'Aucune propriété configurée sur ce support NFC.'], Response::HTTP_NOT_FOUND);
        }

        $payload = json_decode($request->getContent() ?: '{}', true);
        $question = \is_array($payload) ? trim((string) ($payload['question'] ?? '')) : '';

        if ('' === $question) {
            return $this->json(['error' => 'Veuillez saisir une question pour le Concierge Virtuel.'], Response::HTTP_BAD_REQUEST);
        }

        $result = $ragConcierge->answerGuestQuestion($property, $tag->getZone(), $question);

        return $this->json([
            'shortUid' => $tag->getShortUid(),
            'propertyName' => $property->getName(),
            'question' => $question,
            'answer' => $result['answer'],
            'confidence' => $result['confidence'],
            'matchedExcerpts' => $result['matchedExcerpts'],
            'suggestWifiCard' => $result['suggestWifiCard'],
        ]);
    }

    #[Route('/api/public/guide/{shortUid}/report-issue', name: 'api_public_guide_report_issue', methods: ['POST'])]
    public function reportIssue(
        string $shortUid,
        Request $request,
        NfcTagRepository $nfcTagRepository,
        RagConciergeService $ragConcierge,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        [$tag, $errorResponse] = $this->resolveActiveTag($shortUid, $nfcTagRepository);
        if (null !== $errorResponse) {
            return $errorResponse;
        }

        $property = $this->resolveProperty($tag);
        $account = $property?->getAccount() ?? $tag->getOrderItem()?->getParentOrder()?->getAccount();
        if (null === $account) {
            return $this->json(['error' => 'Aucun compte rattaché à ce support NFC.'], Response::HTTP_BAD_REQUEST);
        }

        $payload = json_decode($request->getContent() ?: '{}', true);
        $subject = \is_array($payload) ? trim((string) ($payload['subject'] ?? '')) : '';
        $message = \is_array($payload) ? trim((string) ($payload['message'] ?? '')) : '';
        $issueType = \is_array($payload) ? trim((string) ($payload['issueType'] ?? 'other')) : 'other';

        if ('' === $subject || '' === $message) {
            return $this->json(['error' => 'Le sujet et la description du signalement sont requis.'], Response::HTTP_BAD_REQUEST);
        }

        $ticket = new SupportTicket();
        $ticket->setAccount($account);
        $ticket->setProperty($property);
        $ticket->setNfcTag($tag);
        $ticket->setSubject($subject);
        $ticket->setMessage($message);
        if (\in_array($issueType, SupportTicket::ISSUE_TYPES, true)) {
            $ticket->setIssueType($issueType);
        }

        $triage = $ragConcierge->triageSupportTicket($ticket);
        $ticket->setIssueType($triage['issueType']);
        $ticket->setAiDraft($triage['aiDraft']);
        $ticket->setAiConfidence($triage['aiConfidence']);

        $entityManager->persist($ticket);
        $entityManager->flush();

        return $this->json([
            'id' => $ticket->getId(),
            'status' => $ticket->getStatus(),
            'issueType' => $ticket->getIssueType(),
            'aiConfidence' => $ticket->getAiConfidence(),
        ], Response::HTTP_CREATED);
    }

    #[Route('/api/public/tap/{shortUid}', name: 'api_public_tap_inspect', methods: ['GET'])]
    public function inspectTap(
        string $shortUid,
        NfcTagRepository $nfcTagRepository,
    ): JsonResponse {
        [$tag, $errorResponse] = $this->resolveActiveTag($shortUid, $nfcTagRepository);
        if (null !== $errorResponse) {
            return $errorResponse;
        }

        $zone = $tag->getZone();
        $zoneProperty = $zone?->getProperty();
        $orderAccount = $tag->getOrderItem()?->getParentOrder()?->getAccount();
        $isPaired = null !== $zoneProperty && 'stock' !== $tag->getStatus();

        $existingProperties = [];
        if (null !== $orderAccount) {
            foreach ($orderAccount->getProperties() as $prop) {
                $existingProperties[] = [
                    'id' => $prop->getId(),
                    'name' => $prop->getName(),
                ];
            }
        }

        return $this->json([
            'shortUid' => $tag->getShortUid(),
            'status' => $tag->getStatus(),
            'paired' => $isPaired,
            'redirectUrl' => $isPaired ? '/g/'.$tag->getShortUid() : null,
            'productName' => $tag->getOrderItem()?->getProductName(),
            'accountName' => ($zoneProperty?->getAccount() ?? $orderAccount)?->getName(),
            'propertyName' => $zoneProperty?->getName(),
            'zoneName' => $zone?->getName(),
            'existingProperties' => $existingProperties,
        ]);
    }

    #[Route('/api/public/tap/{shortUid}/pair', name: 'api_public_tap_pair', methods: ['POST'])]
    public function pairTap(
        string $shortUid,
        Request $request,
        NfcTagRepository $nfcTagRepository,
        PropertyRepository $propertyRepository,
        WifiCredentialCrypto $wifiCrypto,
        RagConciergeService $ragConcierge,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        [$tag, $errorResponse] = $this->resolveActiveTag($shortUid, $nfcTagRepository);
        if (null !== $errorResponse) {
            return $errorResponse;
        }

        $payload = json_decode($request->getContent() ?: '{}', true);
        if (!\is_array($payload)) {
            return $this->json(['error' => 'Payload JSON invalide.'], Response::HTTP_BAD_REQUEST);
        }

        $account = $tag->getZone()?->getProperty()?->getAccount()
            ?? $tag->getOrderItem()?->getParentOrder()?->getAccount();

        $property = null;
        $requestedPropertyId = isset($payload['propertyId']) ? (int) $payload['propertyId'] : 0;
        if ($requestedPropertyId > 0) {
            $candidate = $propertyRepository->find($requestedPropertyId);
            if (null !== $candidate && (null === $account || $candidate->getAccount()?->getId() === $account->getId())) {
                $property = $candidate;
                $account = $candidate->getAccount();
            }
        }

        $accountName = trim((string) ($payload['accountName'] ?? ''));
        if (null === $account) {
            $account = new Account();
            $account->setName('' !== $accountName ? $accountName : 'Propriétaire Magic Scan #'.$tag->getShortUid());
            $account->setType('B2C');
            $entityManager->persist($account);
        }

        $propertyName = trim((string) ($payload['propertyName'] ?? ''));
        if (null === $property) {
            if ('' === $propertyName) {
                return $this->json(['error' => 'Veuillez indiquer le nom de votre logement.'], Response::HTTP_BAD_REQUEST);
            }
            $property = new Property();
            $property->setName($propertyName);
            $property->setAccount($account);
            $entityManager->persist($property);
        } elseif ('' !== $propertyName) {
            $property->setName($propertyName);
        }

        if (isset($payload['wifiSSID']) && '' !== trim((string) $payload['wifiSSID'])) {
            $property->setWifiSSID($wifiCrypto->encrypt(trim((string) $payload['wifiSSID'])));
        }
        if (isset($payload['wifiPassword']) && '' !== trim((string) $payload['wifiPassword'])) {
            $property->setWifiPassword($wifiCrypto->encrypt((string) $payload['wifiPassword']));
        }
        if (isset($payload['wifiAccessCode'])) {
            $pin = trim((string) $payload['wifiAccessCode']);
            $property->setWifiAccessCode('' !== $pin ? $wifiCrypto->encrypt($pin) : null);
        }
        if (isset($payload['externalGuideUrl'])) {
            $url = trim((string) $payload['externalGuideUrl']);
            $property->setExternalGuideUrl('' !== $url ? $url : null);
        }
        if (isset($payload['instructions'])) {
            $instr = trim((string) $payload['instructions']);
            $property->setInstructions('' !== $instr ? $instr : null);
        }

        $zoneName = trim((string) ($payload['zoneName'] ?? ''));
        if ('' === $zoneName) {
            $zoneName = 'Entrée Principale';
        }
        $mountType = trim((string) ($payload['mountType'] ?? ''));
        if ('' === $mountType) {
            $mountType = $tag->getOrderItem()?->getProductName() ?? 'Support NFC VisuAlpes';
        }

        $zone = $tag->getZone();
        if (null === $zone || $zone->getProperty()?->getId() !== $property->getId()) {
            $zone = new Zone();
            $zone->setProperty($property);
            $property->addZone($zone);
            $entityManager->persist($zone);
        }
        $zone->setName($zoneName);
        $zone->setMountType($mountType);

        $tag->setZone($zone);
        $tag->setStatus('assigned');
        if (null === $tag->getEncodeAt()) {
            $tag->setEncodeAt(new \DateTime());
        }

        $ragConcierge->vectorizeProperty($property);

        $entityManager->flush();

        return $this->json([
            'paired' => true,
            'shortUid' => $tag->getShortUid(),
            'redirectUrl' => '/g/'.$tag->getShortUid(),
            'propertyName' => $property->getName(),
            'zoneName' => $zone->getName(),
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

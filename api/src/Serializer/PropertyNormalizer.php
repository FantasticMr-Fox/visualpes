<?php

namespace App\Serializer;

use App\Entity\Property;
use App\Entity\User;
use App\Security\WifiCredentialCrypto;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\Serializer\Normalizer\NormalizerAwareInterface;
use Symfony\Component\Serializer\Normalizer\NormalizerAwareTrait;
use Symfony\Component\Serializer\Normalizer\NormalizerInterface;

final class PropertyNormalizer implements NormalizerInterface, NormalizerAwareInterface
{
    use NormalizerAwareTrait;

    private const ALREADY_CALLED = 'VISUALPES_PROPERTY_NORMALIZER_ALREADY_CALLED';

    public function __construct(
        private readonly WifiCredentialCrypto $wifiCrypto,
        private readonly Security $security,
    ) {
    }

    public function normalize(mixed $data, ?string $format = null, array $context = []): array|string|int|float|bool|\ArrayObject|null
    {
        $context[self::ALREADY_CALLED] = true;
        $normalized = $this->normalizer->normalize($data, $format, $context);

        if (!$data instanceof Property || !\is_array($normalized)) {
            return $normalized;
        }

        $plainSsid = $this->wifiCrypto->decrypt($data->getWifiSSID());
        $hasPassword = null !== $data->getWifiPassword() && '' !== $data->getWifiPassword();
        $hasAccessCode = null !== $data->getWifiAccessCode() && '' !== $data->getWifiAccessCode();

        $user = $this->security->getUser();
        $isAccountOwner = $user instanceof User
            && null !== $user->getAccount()?->getId()
            && $user->getAccount()->getId() === $data->getAccount()?->getId();

        $normalized['wifiSSID'] = $isAccountOwner
            ? $plainSsid
            : $this->wifiCrypto->maskSsid($plainSsid);
        $normalized['wifiSsidMasked'] = $this->wifiCrypto->maskSsid($plainSsid);
        $normalized['wifiConfigured'] = (null !== $plainSsid && '' !== $plainSsid && $hasPassword);
        $normalized['wifiProtectedByCode'] = $hasAccessCode;
        $normalized['canManageWifi'] = $isAccountOwner;

        unset($normalized['wifiPassword'], $normalized['wifiAccessCode']);

        return $normalized;
    }

    public function supportsNormalization(mixed $data, ?string $format = null, array $context = []): bool
    {
        if (isset($context[self::ALREADY_CALLED])) {
            return false;
        }

        return $data instanceof Property;
    }

    public function getSupportedTypes(?string $format): array
    {
        return [
            Property::class => false,
        ];
    }
}

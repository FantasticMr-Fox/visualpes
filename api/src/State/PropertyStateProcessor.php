<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Property;
use App\Entity\User;
use App\Security\WifiCredentialCrypto;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * Chiffre au repos (AES-256-GCM) le SSID, le mot de passe Wi-Fi et le code d'accès
 * d'une propriété, préserve le mot de passe existant s'il est laissé vide à l'édition,
 * et interdit au staff atelier (hors propriétaire du compte) d'écraser le Wi-Fi d'un client.
 *
 * @implements ProcessorInterface<Property, Property>
 */
final readonly class PropertyStateProcessor implements ProcessorInterface
{
    /**
     * @param ProcessorInterface<Property, Property> $persistProcessor
     */
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private ProcessorInterface $persistProcessor,
        private WifiCredentialCrypto $wifiCrypto,
        private Security $security,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        if (!$data instanceof Property) {
            return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
        }

        $previous = $context['previous_data'] ?? null;
        $user = $this->security->getUser();
        $isAccountOwner = $user instanceof User
            && null !== $user->getAccount()?->getId()
            && $user->getAccount()->getId() === $data->getAccount()?->getId();

        if ($previous instanceof Property) {
            $incomingSsid = $data->getWifiSSID();
            $incomingPass = $data->getWifiPassword();
            $incomingCode = $data->getWifiAccessCode();

            $previousDecryptedSsid = $this->wifiCrypto->decrypt($previous->getWifiSSID());
            $previousMaskedSsid = $this->wifiCrypto->maskSsid($previousDecryptedSsid);

            // Si un admin atelier modifie une propriété appartenant à un autre compte client,
            // il ne peut pas modifier les identifiants Wi-Fi du client.
            if (!$isAccountOwner) {
                $triedChangingPass = null !== $incomingPass
                    && '' !== trim($incomingPass)
                    && $incomingPass !== $previous->getWifiPassword();
                $triedChangingSsid = null !== $incomingSsid
                    && '' !== trim($incomingSsid)
                    && $incomingSsid !== $previous->getWifiSSID()
                    && $incomingSsid !== $previousDecryptedSsid
                    && $incomingSsid !== $previousMaskedSsid;

                if ($triedChangingPass || $triedChangingSsid) {
                    throw new AccessDeniedHttpException('Confidentialité client : seul le titulaire du compte peut définir ou modifier ses identifiants Wi-Fi.');
                }

                $data->setWifiSSID($previous->getWifiSSID());
                $data->setWifiPassword($previous->getWifiPassword());
                $data->setWifiAccessCode($previous->getWifiAccessCode());

                return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
            }

            // Préservation du SSID si inchangé ou masqué
            if (null === $incomingSsid || '' === trim($incomingSsid) || $incomingSsid === $previousMaskedSsid) {
                $data->setWifiSSID($previous->getWifiSSID());
            } else {
                $data->setWifiSSID($this->wifiCrypto->encrypt(trim($incomingSsid)));
            }

            // Préservation du mot de passe Wi-Fi existant si le champ est laissé vide à l'édition
            if (null === $incomingPass || '' === trim($incomingPass) || $incomingPass === $previous->getWifiPassword()) {
                $data->setWifiPassword($previous->getWifiPassword());
            } else {
                $data->setWifiPassword($this->wifiCrypto->encrypt($incomingPass));
            }

            // Code PIN voyageur : vide ("CLEAR") l'efface, null conserve l'existant, sinon chiffre
            if (null === $incomingCode || $incomingCode === $previous->getWifiAccessCode()) {
                $data->setWifiAccessCode($previous->getWifiAccessCode());
            } elseif ('CLEAR' === trim($incomingCode) || '' === trim($incomingCode)) {
                $data->setWifiAccessCode(null);
            } else {
                $data->setWifiAccessCode($this->wifiCrypto->encrypt(trim($incomingCode)));
            }
        } else {
            // Création d'une nouvelle propriété
            if (null !== $data->getWifiSSID() && '' !== trim($data->getWifiSSID())) {
                $data->setWifiSSID($this->wifiCrypto->encrypt(trim($data->getWifiSSID())));
            } else {
                $data->setWifiSSID(null);
            }

            if (null !== $data->getWifiPassword() && '' !== trim($data->getWifiPassword())) {
                $data->setWifiPassword($this->wifiCrypto->encrypt($data->getWifiPassword()));
            } else {
                $data->setWifiPassword(null);
            }

            if (null !== $data->getWifiAccessCode() && '' !== trim($data->getWifiAccessCode()) && 'CLEAR' !== trim($data->getWifiAccessCode())) {
                $data->setWifiAccessCode($this->wifiCrypto->encrypt(trim($data->getWifiAccessCode())));
            } else {
                $data->setWifiAccessCode(null);
            }
        }

        return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
    }
}

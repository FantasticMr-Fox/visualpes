<?php

namespace App\Security;

use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Chiffrement authentifié au repos (AES-256-GCM) pour les identifiants Wi-Fi
 * (SSID, mot de passe Wi-Fi et code PIN d'accès voyageur).
 */
final readonly class WifiCredentialCrypto
{
    private const PREFIX = 'enc:gcm:v1:';
    private const CIPHER = 'aes-256-gcm';
    private const IV_LENGTH = 12;
    private const TAG_LENGTH = 16;

    private string $key;

    public function __construct(
        #[Autowire('%kernel.secret%')]
        string $appSecret,
    ) {
        $this->key = hash('sha256', $appSecret.':visualpes-wifi-v1', true);
    }

    public function isEncrypted(?string $value): bool
    {
        return null !== $value && str_starts_with($value, self::PREFIX);
    }

    public function encrypt(?string $plaintext): ?string
    {
        if (null === $plaintext || '' === $plaintext) {
            return null;
        }

        if ($this->isEncrypted($plaintext)) {
            return $plaintext;
        }

        $iv = random_bytes(self::IV_LENGTH);
        $tag = '';
        $ciphertext = openssl_encrypt(
            $plaintext,
            self::CIPHER,
            $this->key,
            \OPENSSL_RAW_DATA,
            $iv,
            $tag,
            '',
            self::TAG_LENGTH,
        );

        if (false === $ciphertext) {
            throw new \RuntimeException('Échec du chiffrement AES-256-GCM des identifiants Wi-Fi.');
        }

        return self::PREFIX.base64_encode($iv.$tag.$ciphertext);
    }

    public function decrypt(?string $stored): ?string
    {
        if (null === $stored || '' === $stored) {
            return null;
        }

        if (!$this->isEncrypted($stored)) {
            // Compatibilité descendante avec une valeur historique non encore chiffrée
            return $stored;
        }

        $raw = base64_decode(substr($stored, \strlen(self::PREFIX)), true);
        if (false === $raw || \strlen($raw) < self::IV_LENGTH + self::TAG_LENGTH) {
            return null;
        }

        $iv = substr($raw, 0, self::IV_LENGTH);
        $tag = substr($raw, self::IV_LENGTH, self::TAG_LENGTH);
        $ciphertext = substr($raw, self::IV_LENGTH + self::TAG_LENGTH);

        $decrypted = openssl_decrypt(
            $ciphertext,
            self::CIPHER,
            $this->key,
            \OPENSSL_RAW_DATA,
            $iv,
            $tag,
        );

        return false === $decrypted ? null : $decrypted;
    }

    public function maskSsid(?string $ssid): ?string
    {
        if (null === $ssid || '' === $ssid) {
            return null;
        }

        $len = mb_strlen($ssid);
        if ($len <= 4) {
            return mb_substr($ssid, 0, 1).'•••';
        }

        return mb_substr($ssid, 0, 3).'••••'.mb_substr($ssid, -2);
    }
}

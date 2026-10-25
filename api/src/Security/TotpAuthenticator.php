<?php

namespace App\Security;

/**
 * Implémentation RFC 6238 TOTP (Google Authenticator / Apple Passwords / Authy)
 * et jetons de challenge 2FA signés HMAC-SHA256.
 */
final readonly class TotpAuthenticator
{
    private const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    private string $signingKey;

    public function __construct()
    {
        $secret = (string) ($_ENV['APP_SECRET'] ?? $_SERVER['APP_SECRET'] ?? '');
        $jwtPass = (string) ($_ENV['JWT_PASSPHRASE'] ?? $_SERVER['JWT_PASSPHRASE'] ?? 'visualpes-2fa-default-key');
        $this->signingKey = hash('sha256', 'visualpes-2fa-v1:'.$secret.':'.$jwtPass);
    }

    /**
     * Génère un secret Base32 de 16 caractères (80 bits) compatible RFC 6238.
     */
    public function generateSecret(int $length = 16): string
    {
        $bytes = random_bytes($length);
        $secret = '';
        for ($i = 0; $i < $length; ++$i) {
            $secret .= self::BASE32_ALPHABET[\ord($bytes[$i]) & 31];
        }

        return $secret;
    }

    public function getOtpAuthUri(string $email, string $secret, string $issuer = 'VisuAlpes'): string
    {
        $label = rawurlencode($issuer.':'.$email);
        $query = http_build_query([
            'secret' => $secret,
            'issuer' => $issuer,
            'algorithm' => 'SHA1',
            'digits' => 6,
            'period' => 30,
        ]);

        return \sprintf('otpauth://totp/%s?%s', $label, $query);
    }

    public function verifyTotpCode(string $base32Secret, string $code, int $window = 1, ?int $timestamp = null): bool
    {
        $cleanCode = preg_replace('/\D+/', '', $code) ?? '';
        if (6 !== \strlen($cleanCode)) {
            return false;
        }

        $now = $timestamp ?? time();
        $timeSlice = (int) floor($now / 30);

        for ($offset = -$window; $offset <= $window; ++$offset) {
            if (hash_equals($this->computeCode($base32Secret, $timeSlice + $offset), $cleanCode)) {
                return true;
            }
        }

        return false;
    }

    public function computeCode(string $base32Secret, ?int $timeSlice = null): string
    {
        $slice = $timeSlice ?? (int) floor(time() / 30);
        $secretKey = $this->base32Decode($base32Secret);

        $timeBytes = pack('N*', 0).pack('N*', $slice);
        $hmac = hash_hmac('sha1', $timeBytes, $secretKey, true);
        $offset = \ord($hmac[19]) & 0x0F;

        $binary = ((\ord($hmac[$offset]) & 0x7F) << 24)
            | ((\ord($hmac[$offset + 1]) & 0xFF) << 16)
            | ((\ord($hmac[$offset + 2]) & 0xFF) << 8)
            | (\ord($hmac[$offset + 3]) & 0xFF);

        $otp = $binary % 1000000;

        return str_pad((string) $otp, 6, '0', \STR_PAD_LEFT);
    }

    /**
     * Crée un jeton temporaire signé HMAC-SHA256 pour l'étape de validation 2FA.
     */
    public function createChallengeToken(int $userId, string $method, int $ttlSeconds = 600): string
    {
        $payload = [
            'uid' => $userId,
            'm' => $method,
            'exp' => time() + $ttlSeconds,
            'nonce' => bin2hex(random_bytes(8)),
        ];
        $encoded = rtrim(strtr(base64_encode((string) json_encode($payload)), '+/', '-_'), '=');
        $sig = hash_hmac('sha256', $encoded, $this->signingKey);

        return $encoded.'.'.$sig;
    }

    /**
     * @return array{uid: int, m: string, exp: int}|null
     */
    public function verifyChallengeToken(string $challengeToken): ?array
    {
        $parts = explode('.', $challengeToken, 2);
        if (2 !== \count($parts)) {
            return null;
        }
        [$encoded, $sig] = $parts;
        $expectedSig = hash_hmac('sha256', $encoded, $this->signingKey);
        if (!hash_equals($expectedSig, $sig)) {
            return null;
        }

        $raw = base64_decode(strtr($encoded, '-_', '+/'), true);
        if (false === $raw) {
            return null;
        }
        $data = json_decode($raw, true);
        if (!\is_array($data) || !isset($data['uid'], $data['m'], $data['exp'])) {
            return null;
        }
        if ((int) $data['exp'] < time()) {
            return null;
        }

        return [
            'uid' => (int) $data['uid'],
            'm' => (string) $data['m'],
            'exp' => (int) $data['exp'],
        ];
    }

    private function base32Decode(string $input): string
    {
        $clean = strtoupper(preg_replace('/[^A-Z2-7]/', '', $input) ?? '');
        $buffer = 0;
        $bitsLeft = 0;
        $output = '';

        $len = \strlen($clean);
        for ($i = 0; $i < $len; ++$i) {
            $val = strpos(self::BASE32_ALPHABET, $clean[$i]);
            if (false === $val) {
                continue;
            }
            $buffer = ($buffer << 5) | $val;
            $bitsLeft += 5;
            if ($bitsLeft >= 8) {
                $bitsLeft -= 8;
                $output .= \chr(($buffer >> $bitsLeft) & 0xFF);
            }
        }

        return $output;
    }
}

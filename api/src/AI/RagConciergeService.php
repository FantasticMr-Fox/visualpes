<?php

namespace App\AI;

use App\Entity\NfcTag;
use App\Entity\Property;
use App\Entity\SupportTicket;
use App\Entity\Zone;
use App\Security\WifiCredentialCrypto;

/**
 * Moteur RAG (Retrieval-Augmented Generation) & Triage SAV IA pour VisuAlpes.
 *
 * - Vectorise les instructions des logements (vecteur normalisé L2 de dimension 64)
 * - Répond aux questions des voyageurs sur `/g/[shortUid]` (Concierge Virtuel)
 * - Trie et génère un brouillon de réponse contextualisé pour les tickets SAV (`SupportTicket`)
 */
final readonly class RagConciergeService
{
    public const VECTOR_DIM = 64;

    /**
     * @var array<int, list<string>>
     */
    private const SEMANTIC_CLUSTERS = [
        0 => ['arrivee', 'checkin', 'check-in', 'cle', 'cles', 'boite', 'digicode', 'code', 'entree', 'accueil', 'heure'],
        1 => ['depart', 'checkout', 'check-out', 'quitter', 'rendre', 'fin', 'sortie', 'liberer'],
        2 => ['menage', 'proprete', 'draps', 'serviettes', 'linge', 'lave-linge', 'lessive', 'aspirateur'],
        3 => ['poubelle', 'poubelles', 'tri', 'dechets', 'ordures', 'recyclage', 'verre', 'conteneur', 'local'],
        4 => ['wifi', 'wi-fi', 'internet', 'reseau', 'box', 'connexion', ' fibre', 'ssid', 'mot de passe', 'qr'],
        5 => ['ski', 'skis', 'casier', 'local a skis', 'chaussures', 'forfait', 'pistes', 'remontees', 'neige', 'luge'],
        6 => ['chauffage', 'radiateur', 'thermostat', 'temperature', 'froid', 'chaud', 'poele', 'bois', 'cheminee', 'clim'],
        7 => ['parking', 'voiture', 'garage', 'stationnement', 'place', 'borne', 'electrique', 'badge', 'portail'],
        8 => ['cuisine', 'cafe', 'nespresso', 'cafetiere', 'four', 'micro-ondes', 'lave-vaisselle', 'frigo', 'raclette', 'fondue'],
        9 => ['piscine', 'spa', 'jacuzzi', 'sauna', 'hammam', 'bain', 'peignoir'],
        10 => ['regles', 'bruit', 'fete', 'animaux', 'chien', 'chat', 'fumer', 'tabac', 'cigarette', 'voisinage', 'calme'],
        11 => ['urgence', 'probleme', 'panne', 'fuite', 'contact', 'telephone', 'conciergerie', 'proprietaire', 'gardien', 'secours'],
        12 => ['nfc', 'puce', 'tag', 'plaque', 'socle', 'scan', 'scanner', 'telephone', 'marche pas', 'defectueux', 'casse'],
        13 => ['facture', 'commande', 'livraison', 'colis', 'suivi', 'delai', 'paiement', 'devis', 'tarif'],
        14 => ['television', 'tv', 'netflix', 'hdmi', 'enceinte', 'bluetooth', 'salon'],
        15 => ['terrasse', 'balcon', 'barbecue', 'plancha', 'jardin', 'transat', 'vue'],
    ];

    public function __construct(
        private WifiCredentialCrypto $wifiCrypto,
    ) {
    }

    /**
     * Calcule et affecte le vecteur d'embedding L2-normalisé (64 dimensions) sur une propriété.
     *
     * @return list<float>
     */
    public function vectorizeProperty(Property $property): array
    {
        $zonesText = [];
        foreach ($property->getZones() as $zone) {
            $zonesText[] = (string) $zone->getName();
        }

        $corpus = implode("\n", array_filter([
            $property->getName(),
            implode(', ', $zonesText),
            $property->getInstructions(),
        ]));

        $vector = $this->computeEmbedding($corpus);
        $property->setInstructionsVector($vector);

        return $vector;
    }

    /**
     * Génère un vecteur flottant L2-normalisé de dimension 64 combinant
     * 16 dimensions thématiques métier (hôtellerie/montagne/NFC) et 48 dimensions de hachage lexical.
     *
     * @return list<float>
     */
    public function computeEmbedding(string $text): array
    {
        $vec = array_fill(0, self::VECTOR_DIM, 0.0);
        $normalized = $this->normalizeText($text);
        if ('' === $normalized) {
            return $vec;
        }

        foreach (self::SEMANTIC_CLUSTERS as $clusterIdx => $keywords) {
            foreach ($keywords as $kw) {
                if (str_contains($normalized, $kw)) {
                    $vec[$clusterIdx] += 2.0;
                }
            }
        }

        $tokens = preg_split('/[^a-z0-9]+/', $normalized, -1, \PREG_SPLIT_NO_EMPTY) ?: [];
        foreach ($tokens as $token) {
            if (\strlen($token) < 2) {
                continue;
            }
            $hash = crc32($token);
            $bucket = 16 + ($hash % (self::VECTOR_DIM - 16));
            $sign = (($hash >> 16) & 1) === 1 ? 1.0 : -1.0;
            $vec[$bucket] += $sign * 1.0;

            // Racine préfixe (4 caractères) pour la tolérance morphologique française
            if (\strlen($token) >= 4) {
                $stemHash = crc32(substr($token, 0, 4));
                $stemBucket = 16 + ($stemHash % (self::VECTOR_DIM - 16));
                $vec[$stemBucket] += 0.6;
            }
        }

        return $this->l2Normalize($vec);
    }

    /**
     * @param list<float> $a
     * @param list<float> $b
     */
    public function cosineSimilarity(array $a, array $b): float
    {
        $len = min(\count($a), \count($b));
        if (0 === $len) {
            return 0.0;
        }

        $dot = 0.0;
        $normA = 0.0;
        $normB = 0.0;
        for ($i = 0; $i < $len; ++$i) {
            $va = (float) $a[$i];
            $vb = (float) $b[$i];
            $dot += $va * $vb;
            $normA += $va * $va;
            $normB += $vb * $vb;
        }

        if ($normA <= 1e-9 || $normB <= 1e-9) {
            return 0.0;
        }

        return max(0.0, min(1.0, $dot / (sqrt($normA) * sqrt($normB))));
    }

    /**
     * Répond à une question voyageur en s'appuyant exclusivement sur le contexte RAG de la propriété.
     *
     * @return array{
     *     answer: string,
     *     confidence: float,
     *     matchedExcerpts: list<string>,
     *     suggestWifiCard: bool
     * }
     */
    public function answerGuestQuestion(Property $property, ?Zone $zone, string $question): array
    {
        $cleanQuestion = trim($question);
        $normQuestion = $this->normalizeText($cleanQuestion);
        $qVector = $this->computeEmbedding($cleanQuestion);

        $suggestWifi = $this->matchesCluster($normQuestion, 4);
        $instructions = trim((string) $property->getInstructions());
        $plainSsid = $this->wifiCrypto->decrypt($property->getWifiSSID());
        $hasWifi = null !== $plainSsid && '' !== $plainSsid && null !== $property->getWifiPassword() && '' !== $property->getWifiPassword();
        $hasPin = null !== $property->getWifiAccessCode() && '' !== $property->getWifiAccessCode();

        // Découpage des instructions en segments sémantiques (lignes ou phrases)
        $rawChunks = preg_split('/(?:\r?\n)+|(?<=[.!?])\s+(?=[A-ZÀ-Ÿ•\-0-9])/u', $instructions, -1, \PREG_SPLIT_NO_EMPTY) ?: [];
        $scoredChunks = [];
        $qTokens = array_values(array_filter(
            preg_split('/[^a-z0-9]+/', $normQuestion, -1, \PREG_SPLIT_NO_EMPTY) ?: [],
            static fn (string $t): bool => \strlen($t) >= 3 && !\in_array($t, ['est', 'sont', 'quel', 'quelle', 'quels', 'quelles', 'comment', 'dans', 'pour', 'avec', 'les', 'des', 'une', 'que', 'qui', 'ou', 'quand', 'avoir', 'faire', 'logement', 'chalet', 'appartement'], true)
        ));

        foreach ($rawChunks as $chunk) {
            $trimmedChunk = trim($chunk, " \t\n\r\0\x0B•-*");
            if ('' === $trimmedChunk) {
                continue;
            }
            $normChunk = $this->normalizeText($trimmedChunk);
            $cVector = $this->computeEmbedding($trimmedChunk);
            $sim = $this->cosineSimilarity($qVector, $cVector);

            // Bonus d'intersection lexicale / racines françaises
            $lexicalHits = 0;
            foreach ($qTokens as $qt) {
                $stem = \strlen($qt) >= 4 ? substr($qt, 0, 4) : $qt;
                if (str_contains($normChunk, $qt)) {
                    $lexicalHits += 2;
                } elseif (str_contains($normChunk, $stem)) {
                    ++$lexicalHits;
                }
            }

            // Bonus si la question et le segment activent le même cluster métier (0..15)
            $clusterBonus = 0.0;
            for ($c = 0; $c < 16; ++$c) {
                if ($qVector[$c] > 0.0 && $cVector[$c] > 0.0) {
                    $clusterBonus += 0.28;
                }
            }

            $totalScore = ($sim * 0.65) + min(0.45, $lexicalHits * 0.14) + min(0.35, $clusterBonus);
            if ($totalScore >= 0.18) {
                $scoredChunks[] = [
                    'text' => $trimmedChunk,
                    'score' => $totalScore,
                ];
            }
        }

        usort($scoredChunks, static fn (array $a, array $b): int => $b['score'] <=> $a['score']);
        $topChunks = \array_slice($scoredChunks, 0, 3);
        $matchedExcerpts = array_map(static fn (array $item): string => $item['text'], $topChunks);

        // Cas 1 : Question portant sur le Wi-Fi
        if ($suggestWifi) {
            $wifiInfo = $hasWifi
                ? \sprintf(
                    'Le Wi-Fi du logement "%s" est configuré (réseau %s). %s',
                    $property->getName(),
                    $this->wifiCrypto->maskSsid($plainSsid),
                    $hasPin
                        ? 'Saisissez le code PIN du logement dans la carte Wi-Fi ci-dessus pour afficher le QR Code et copier la clé.'
                        : 'Cliquez sur "Déverrouiller le Wi-Fi & QR Code" juste au-dessus pour vous connecter instantanément.'
                )
                : 'Les identifiants Wi-Fi ne sont pas encore renseignés sur cette fiche logement.';

            if ([] !== $matchedExcerpts) {
                $wifiInfo .= "\n\nPrécision du guide : ".implode(' — ', $matchedExcerpts);
            }

            return [
                'answer' => $wifiInfo,
                'confidence' => 0.96,
                'matchedExcerpts' => $matchedExcerpts,
                'suggestWifiCard' => true,
            ];
        }

        // Cas 2 : Des segments pertinents ont été trouvés dans les instructions de la propriété
        if ([] !== $matchedExcerpts) {
            $bestScore = (float) $topChunks[0]['score'];
            $confidence = round(min(0.98, max(0.62, $bestScore)), 2);

            $prefix = null !== $zone
                ? \sprintf('D\'après les consignes de "%s" (zone %s) :', $property->getName(), $zone->getName())
                : \sprintf('D\'après les consignes de "%s" :', $property->getName());

            $body = \count($matchedExcerpts) === 1
                ? $matchedExcerpts[0]
                : "• ".implode("\n• ", $matchedExcerpts);

            return [
                'answer' => $prefix."\n".$body,
                'confidence' => $confidence,
                'matchedExcerpts' => $matchedExcerpts,
                'suggestWifiCard' => false,
            ];
        }

        // Cas 3 : Aucune correspondance directe, mais des instructions générales existent
        if ('' !== $instructions) {
            return [
                'answer' => \sprintf(
                    "Je n'ai pas trouvé de mention spécifique à « %s » dans les consignes de %s. Voici le récapitulatif disponible :\n%s",
                    $cleanQuestion,
                    $property->getName(),
                    $instructions
                ),
                'confidence' => 0.45,
                'matchedExcerpts' => array_slice(array_map('trim', explode("\n", $instructions)), 0, 2),
                'suggestWifiCard' => false,
            ];
        }

        return [
            'answer' => \sprintf(
                'Les consignes détaillées pour "%s" n\'ont pas encore été complétées par votre hôte. Vous pouvez consulter le livret complet ou signaler votre question ci-dessous.',
                $property->getName()
            ),
            'confidence' => 0.30,
            'matchedExcerpts' => [],
            'suggestWifiCard' => false,
        ];
    }

    /**
     * Analyse un ticket SAV entrant, détermine la catégorie (`issueType`)
     * et rédige un brouillon de réponse contextualisé (`aiDraft`) avec un score de confiance (`aiConfidence`).
     *
     * @return array{issueType: string, aiDraft: string, aiConfidence: float}
     */
    public function triageSupportTicket(SupportTicket $ticket): array
    {
        $combined = trim($ticket->getSubject().' '.$ticket->getMessage());
        $norm = $this->normalizeText($combined);

        $explicitType = $ticket->getIssueType();
        $detectedType = $this->detectIssueType($norm, $ticket->getNfcTag(), $explicitType);

        $accountName = $ticket->getAccount()?->getName() ?? 'Client';
        $property = $ticket->getProperty() ?? $ticket->getNfcTag()?->getZone()?->getProperty();
        if (null === $property && null !== $ticket->getAccount() && !$ticket->getAccount()->getProperties()->isEmpty()) {
            $property = $ticket->getAccount()->getProperties()->first() ?: null;
        }
        $tag = $ticket->getNfcTag();

        $propertyName = $property?->getName();
        $tagUid = $tag?->getShortUid();
        $zoneName = $tag?->getZone()?->getName();

        switch ($detectedType) {
            case 'nfc_defect':
                $tagContext = null !== $tagUid
                    ? \sprintf('concernant la puce NFC #%s%s', $tagUid, null !== $zoneName ? " (zone « {$zoneName} »)" : '')
                    : 'concernant votre support NFC VisuAlpes';
                $propContext = null !== $propertyName ? " sur le logement « {$propertyName} »" : '';

                $draft = \sprintf(
                    "Bonjour %s,\n\nNous avons bien pris en compte votre signalement %s%s.\n"
                    ."Diagnostic atelier : lorsque la puce NTAG213 ne répond plus au scan iPhone/Android ou présente un défaut physique, nous déclenchons immédiatement un ré-encodage de remplacement.\n"
                    ."Actions effectuées :\n"
                    ."1. Désactivation sécurisée de l'identifiant %s pour éviter tout routage erroné.\n"
                    ."2. Création d'un bon de remplacement SAV prioritaire dans notre atelier de gravure/impression UV (vos paramètres de zone%s et Wi-Fi restent intégralement conservés).\n\n"
                    ."Vous recevrez le numéro de suivi dès l'expédition du nouveau support.\n\nL'équipe Support & Atelier VisuAlpes",
                    $accountName,
                    $tagContext,
                    $propContext,
                    null !== $tagUid ? "#{$tagUid}" : 'concerné',
                    null !== $zoneName ? " « {$zoneName} »" : ''
                );
                $confidence = null !== $tagUid ? 0.95 : 0.89;
                break;

            case 'wifi_issue':
                $plainSsid = null !== $property ? $this->wifiCrypto->decrypt($property->getWifiSSID()) : null;
                $maskedSsid = $this->wifiCrypto->maskSsid($plainSsid);
                $hasPin = null !== $property && null !== $property->getWifiAccessCode() && '' !== $property->getWifiAccessCode();

                $wifiStatusLine = (null !== $maskedSsid)
                    ? \sprintf(
                        'Votre logement « %s » dispose bien d\'un réseau chiffré AES-256 enregistré (%s)%s.',
                        $propertyName,
                        $maskedSsid,
                        $hasPin ? ' protégé par un code PIN voyageur' : ' accessible en déverrouillage direct + QR Code ISO 18004'
                    )
                    : 'Aucun SSID/mot de passe Wi-Fi complet n\'est actuellement détecté sur la fiche du logement.';

                $draft = \sprintf(
                    "Bonjour %s,\n\nMerci pour votre message relatif à l'accès Wi-Fi%s.\n"
                    ."Vérification technique RAG : %s\n\n"
                    ."Pour mettre à jour vos identifiants Wi-Fi ou ajuster le code PIN voyageur :\n"
                    ."• Rendez-vous dans l'onglet « Clients & Zones », cliquez sur « Modifier » en face du logement, puis renseignez le SSID et la nouvelle clé WPA (le QR Code vectoriel sur le portail voyageur /g/%s sera régénéré instantanément sans ré-encoder vos plaques NFC).\n\n"
                    ."Restant à votre disposition,\nL'équipe Support VisuAlpes",
                    $accountName,
                    null !== $propertyName ? " de « {$propertyName} »" : '',
                    $wifiStatusLine,
                    $tagUid ?? 'UID'
                );
                $confidence = null !== $property ? 0.93 : 0.85;
                break;

            case 'guide_update':
                $ragSnippet = '';
                if (null !== $property && null !== $property->getInstructions() && '' !== trim($property->getInstructions())) {
                    $ragResult = $this->answerGuestQuestion($property, $tag?->getZone(), $combined);
                    if ([] !== $ragResult['matchedExcerpts']) {
                        $ragSnippet = "\nExtrait actuel détecté dans vos consignes : « ".implode(' / ', $ragResult['matchedExcerpts'])." ».\n";
                    }
                }

                $draft = \sprintf(
                    "Bonjour %s,\n\nNous avons bien reçu votre demande concernant le livret d'accueil / les consignes voyageurs%s.%s\n"
                    ."Les modifications apportées aux instructions d'arrivée/départ, au lien externe (Airbnb, Notion, StyQR) et aux zones d'emplacement sont synchronisées en temps réel sur vos supports NFC existants ainsi que dans le Concierge Virtuel IA.\n\n"
                    ."Souhaitez-vous que nous appliquions cette mise à jour directement sur la fiche « %s » ?\n\nBien cordialement,\nL'équipe VisuAlpes",
                    $accountName,
                    null !== $propertyName ? " pour « {$propertyName} »" : '',
                    $ragSnippet,
                    $propertyName ?? $accountName
                );
                $confidence = 0.90;
                break;

            case 'billing':
                $draft = \sprintf(
                    "Bonjour %s,\n\nNous avons bien reçu votre demande concernant votre commande / facturation.\n"
                    ."Votre dossier client est rattaché au compte « %s ». Nos équipes vérifient l'état d'avancement de vos lots en atelier ainsi que le numéro de suivi d'expédition associé et reviennent vers vous avec le récapitulatif comptable.\n\n"
                    ."Cordialement,\nLe Service Client VisuAlpes",
                    $accountName,
                    $accountName
                );
                $confidence = 0.87;
                break;

            default:
                $ragContextNote = '';
                if (null !== $property) {
                    $ragAnswer = $this->answerGuestQuestion($property, $tag?->getZone(), $combined);
                    if ([] !== $ragAnswer['matchedExcerpts']) {
                        $ragContextNote = "\nÉléments trouvés dans les consignes du logement « {$property->getName()} » :\n• ".implode("\n• ", $ragAnswer['matchedExcerpts'])."\n";
                    }
                }

                $draft = \sprintf(
                    "Bonjour %s,\n\nMerci d'avoir contacté le support VisuAlpes au sujet de « %s ».\n%s"
                    ."Notre équipe technique a bien enregistré votre demande%s et vous apporte une réponse personnalisée dans les meilleurs délais.\n\n"
                    ."Bien cordialement,\nL'équipe Support VisuAlpes",
                    $accountName,
                    $ticket->getSubject(),
                    $ragContextNote,
                    null !== $propertyName ? " (logement : {$propertyName})" : ''
                );
                $confidence = '' !== $ragContextNote ? 0.88 : 0.78;
                break;
        }

        return [
            'issueType' => $detectedType,
            'aiDraft' => $draft,
            'aiConfidence' => $confidence,
        ];
    }

    private function detectIssueType(string $normalizedText, ?NfcTag $tag, ?string $explicitType): string
    {
        if (null !== $explicitType && '' !== $explicitType && 'other' !== $explicitType && \in_array($explicitType, SupportTicket::ISSUE_TYPES, true)) {
            return $explicitType;
        }

        if ($this->matchesCluster($normalizedText, 12) || str_contains($normalizedText, 'remplac') || str_contains($normalizedText, 'encode')) {
            return 'nfc_defect';
        }

        if ($this->matchesCluster($normalizedText, 4)) {
            return 'wifi_issue';
        }

        if ($this->matchesCluster($normalizedText, 13)) {
            return 'billing';
        }

        if (
            $this->matchesCluster($normalizedText, 0)
            || $this->matchesCluster($normalizedText, 1)
            || $this->matchesCluster($normalizedText, 5)
            || str_contains($normalizedText, 'guide')
            || str_contains($normalizedText, 'consigne')
            || str_contains($normalizedText, 'instruction')
        ) {
            return 'guide_update';
        }

        if (null !== $tag) {
            return 'nfc_defect';
        }

        return 'other';
    }

    private function matchesCluster(string $normalizedText, int $clusterIdx): bool
    {
        $keywords = self::SEMANTIC_CLUSTERS[$clusterIdx] ?? [];
        foreach ($keywords as $kw) {
            if (str_contains($normalizedText, $kw)) {
                return true;
            }
        }

        return false;
    }

    private function normalizeText(string $text): string
    {
        $lower = mb_strtolower($text, 'UTF-8');
        $translit = strtr($lower, [
            'à' => 'a', 'â' => 'a', 'ä' => 'a',
            'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
            'î' => 'i', 'ï' => 'i',
            'ô' => 'o', 'ö' => 'o',
            'ù' => 'u', 'û' => 'u', 'ü' => 'u',
            'ç' => 'c', 'œ' => 'oe',
        ]);

        return trim((string) preg_replace('/\s+/', ' ', $translit));
    }

    /**
     * @param list<float> $vec
     *
     * @return list<float>
     */
    private function l2Normalize(array $vec): array
    {
        $sumSq = 0.0;
        foreach ($vec as $v) {
            $sumSq += $v * $v;
        }
        if ($sumSq <= 1e-9) {
            return $vec;
        }

        $norm = sqrt($sumSq);

        return array_values(array_map(static fn (float $v): float => round($v / $norm, 5), $vec));
    }
}


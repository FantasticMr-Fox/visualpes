<?php

namespace App\Service;

use App\Entity\EmailLog;
use App\Entity\SupportTicket;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;

/**
 * Service central d'envoi d'e-mails transactionnels VisuAlpes (2FA, Mot de passe oublié, SAV, Équipe).
 * Envoie via Symfony Mailer (SMTP / Mailpit) et journalise chaque message dans `EmailLog`.
 */
final readonly class AppMailerService
{
    private const FROM_EMAIL = 'no-reply@visualpes.fr';
    private const FROM_NAME = 'VisuAlpes — Sécurité & Conciergerie';

    public function __construct(
        private MailerInterface $mailer,
        private EntityManagerInterface $entityManager,
    ) {
    }

    public function sendTwoFactorCode(User $user, string $code): EmailLog
    {
        $recipient = (string) $user->getEmail();
        $subject = \sprintf('[VisuAlpes] Votre code de connexion à 2 facteurs : %s', $code);
        $text = \sprintf(
            "Bonjour,\n\nVoici votre code de vérification à 2 facteurs VisuAlpes : %s\nCe code est valable pendant 10 minutes.\n\nSi vous n'êtes pas à l'origine de cette connexion, ignorez cet e-mail.\n\nL'équipe VisuAlpes",
            $code
        );
        $html = $this->renderTemplate(
            'Vérification en 2 étapes (2FA)',
            'Utilisez le code de sécurité ci-dessous pour finaliser votre connexion à votre espace VisuAlpes :',
            $code,
            'Ce code à usage unique expire dans 10 minutes.'
        );

        return $this->dispatch($recipient, $subject, '2fa_code', $html, $text);
    }

    public function sendPasswordReset(User $user, string $code, string $resetUrl): EmailLog
    {
        $recipient = (string) $user->getEmail();
        $subject = '[VisuAlpes] Réinitialisation de votre mot de passe';
        $text = \sprintf(
            "Bonjour,\n\nVous avez demandé la réinitialisation de votre mot de passe VisuAlpes.\nCode de réinitialisation (valable 30 min) : %s\nLien direct : %s\n\nSi vous n'avez pas fait cette demande, aucune action n'est requise.\n\nL'équipe VisuAlpes",
            $code,
            $resetUrl
        );
        $html = $this->renderTemplate(
            'Réinitialisation de mot de passe',
            \sprintf(
                'Saisissez le code ci-dessous sur la page de réinitialisation ou <a href="%s" style="color:#38bdf8;text-decoration:underline;">cliquez sur ce lien direct</a> :',
                htmlspecialchars($resetUrl, \ENT_QUOTES)
            ),
            $code,
            'Ce code de réinitialisation expire dans 30 minutes.'
        );

        return $this->dispatch($recipient, $subject, 'password_reset', $html, $text);
    }

    public function sendPasswordChangedNotice(User $user): EmailLog
    {
        $recipient = (string) $user->getEmail();
        $subject = '[VisuAlpes] Confirmation de modification de votre mot de passe';
        $text = "Bonjour,\n\nVotre mot de passe VisuAlpes vient d'être mis à jour avec succès.\n\nL'équipe VisuAlpes";
        $html = $this->renderTemplate(
            'Mot de passe mis à jour',
            'Votre mot de passe VisuAlpes a bien été modifié. Vous pouvez désormais vous connecter avec vos nouveaux identifiants.',
            null,
            'Si vous n\'êtes pas à l\'origine de cette opération, contactez immédiatement le support VisuAlpes.'
        );

        return $this->dispatch($recipient, $subject, 'password_reset', $html, $text);
    }

    public function sendSupportTicketResolution(SupportTicket $ticket): void
    {
        $account = $ticket->getAccount();
        if (null === $account) {
            return;
        }

        $resolution = trim((string) $ticket->getAiDraft());
        if ('' === $resolution) {
            return;
        }

        $subject = \sprintf('[VisuAlpes SAV #%d] Réponse à votre demande : %s', $ticket->getId(), $ticket->getSubject());
        $html = $this->renderTemplate(
            \sprintf('Ticket SAV #%d — %s', $ticket->getId(), htmlspecialchars((string) $ticket->getSubject(), \ENT_QUOTES)),
            nl2br(htmlspecialchars($resolution, \ENT_QUOTES)),
            null,
            'Vous pouvez retrouver l\'historique de vos demandes dans votre Espace Client VisuAlpes.'
        );

        foreach ($account->getUsers() as $user) {
            $email = $user->getEmail();
            if (null !== $email && '' !== $email) {
                $this->dispatch($email, $subject, 'support_reply', $html, $resolution);
            }
        }
    }

    public function sendTeamInvite(User $member, string $plainPassword): EmailLog
    {
        $recipient = (string) $member->getEmail();
        $accountName = $member->getAccount()?->getName() ?? 'VisuAlpes';
        $subject = \sprintf('[VisuAlpes] Votre accès collaborateur — %s', $accountName);
        $text = \sprintf(
            "Bonjour,\n\nUn accès collaborateur a été créé pour vous sur le compte « %s ».\nIdentifiant : %s\nMot de passe temporaire : %s\n\nConnectez-vous sur http://localhost:3000/login\n\nL'équipe VisuAlpes",
            $accountName,
            $recipient,
            $plainPassword
        );
        $html = $this->renderTemplate(
            \sprintf('Bienvenue sur l\'espace %s', htmlspecialchars($accountName, \ENT_QUOTES)),
            \sprintf(
                'Votre compte collaborateur (<strong>%s</strong>) est actif. Voici votre mot de passe initial :',
                htmlspecialchars($recipient, \ENT_QUOTES)
            ),
            $plainPassword,
            'Pensez à activer la double authentification (2FA) dès votre première connexion.'
        );

        return $this->dispatch($recipient, $subject, 'team_invite', $html, $text);
    }

    public function dispatch(
        string $recipient,
        string $subject,
        string $category,
        string $htmlBody,
        ?string $textBody = null,
    ): EmailLog {
        $log = new EmailLog();
        $log->setRecipient($recipient);
        $log->setSubject($subject);
        $log->setCategory($category);
        $log->setHtmlBody($htmlBody);
        $log->setTextBody($textBody);

        try {
            $email = (new Email())
                ->from(new Address(self::FROM_EMAIL, self::FROM_NAME))
                ->to($recipient)
                ->subject($subject)
                ->text($textBody ?? strip_tags($htmlBody))
                ->html($htmlBody);

            $this->mailer->send($email);
            $log->setStatus('sent');
        } catch (\Throwable) {
            // En environnement local sans démon SMTP actif, l'e-mail reste disponible dans EmailLog
            $log->setStatus('logged');
        }

        $this->entityManager->persist($log);
        $this->entityManager->flush();

        return $log;
    }

    private function renderTemplate(
        string $title,
        string $leadHtml,
        ?string $highlightCode,
        string $footerNote,
    ): string {
        $codeBlock = null !== $highlightCode
            ? \sprintf(
                '<div style="margin:20px 0;padding:16px;border-radius:12px;background:#0a0a0a;border:1px solid #262626;text-align:center;font-family:monospace;font-size:24px;font-weight:700;letter-spacing:6px;color:#34d399;">%s</div>',
                htmlspecialchars($highlightCode, \ENT_QUOTES)
            )
            : '';

        return <<<HTML
<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:24px;background:#0a0a0a;color:#f5f5f5;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#171717;border:1px solid #262626;border-radius:16px;padding:28px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
      <span style="display:inline-block;padding:6px 10px;border-radius:8px;background:#10b981;color:#0a0a0a;font-family:monospace;font-weight:900;font-size:12px;">VA</span>
      <strong style="font-size:16px;color:#ffffff;margin-left:8px;">VisuAlpes</strong>
    </div>
    <h1 style="font-size:18px;margin:0 0 12px 0;color:#ffffff;">{$title}</h1>
    <div style="font-size:14px;line-height:1.6;color:#d4d4d4;">{$leadHtml}</div>
    {$codeBlock}
    <p style="margin:18px 0 0 0;padding-top:14px;border-top:1px solid #262626;font-size:12px;color:#737373;">{$footerNote}</p>
  </div>
</body>
</html>
HTML;
    }
}


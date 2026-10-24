<?php

namespace App\EventListener;

use App\Entity\User;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\Mercure\Authorization;

/**
 * Pose le cookie d'abonnement Mercure (`mercureAuthorization`) lors de la lecture
 * de la collection `/api/orders`, avec un topic restreint au périmètre de l'utilisateur :
 * - ROLE_ADMIN : toutes les commandes (`/api/orders/{id}`)
 * - ROLE_USER  : uniquement les commandes de son Account (`/api/accounts/{accountId}/orders/{id}`)
 */
#[AsEventListener(event: KernelEvents::RESPONSE, priority: 0)]
final readonly class MercureCookieListener
{
    public function __construct(
        private Authorization $authorization,
        private Security $security,
    ) {
    }

    public function __invoke(ResponseEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();
        if ('_api_/orders{._format}_get_collection' !== $request->attributes->get('_route')) {
            return;
        }

        $response = $event->getResponse();
        if (!$response->isSuccessful()) {
            return;
        }

        $user = $this->security->getUser();
        if (!$user instanceof User) {
            return;
        }

        $baseUrl = $request->getSchemeAndHttpHost();

        if ($this->security->isGranted('ROLE_ADMIN')) {
            $topic = \sprintf('%s/api/orders/{id}', $baseUrl);
        } elseif (null !== $user->getAccount()?->getId()) {
            $topic = \sprintf('%s/api/accounts/%d/orders/{id}', $baseUrl, $user->getAccount()->getId());
        } else {
            return;
        }

        $this->authorization->setCookie($request, [$topic]);
        $response->headers->set('X-Mercure-Topic', $topic);
    }
}


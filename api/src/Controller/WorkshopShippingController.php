<?php

namespace App\Controller;

use App\Entity\Order;
use App\Repository\OrderRepository;
use App\Service\BoxtalShippingService;
use App\Service\BrevoNotificationService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Contrôleur d'expédition Atelier VisuAlpes.
 * Déclenche l'affranchissement Boxtal, bascule la commande à "shipped"
 * et notifie le client par Brevo avec son lien de suivi et sa facture Pennylane.
 */
final class WorkshopShippingController extends AbstractController
{
    #[Route('/api/orders/{id}/ship', name: 'api_order_ship', methods: ['POST'])]
    public function shipOrder(
        int $id,
        Request $request,
        OrderRepository $orderRepository,
        BoxtalShippingService $boxtalService,
        BrevoNotificationService $brevoService,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $order = $orderRepository->find($id);
        if (null === $order) {
            return $this->json(['error' => 'Commande introuvable (#'.$id.').'], Response::HTTP_NOT_FOUND);
        }

        $payload = json_decode($request->getContent() ?: '{}', true);
        $carrier = is_array($payload) && !empty($payload['carrier'])
            ? (string) $payload['carrier']
            : ($order->getCarrier() ?? 'colissimo');

        // 1. Génération de l'étiquette et numéro de suivi Boxtal
        $labelResult = $boxtalService->generateLabel($order, $carrier);

        // 2. Mise à jour de l'état de la commande
        $order->setStatus('shipped');
        $entityManager->flush();

        // 3. Notification client Brevo (Email transactionnel de suivi)
        $emailSent = $brevoService->sendOrderShippedEmail($order);

        return $this->json([
            'success' => true,
            'orderId' => $order->getId(),
            'status' => $order->getStatus(),
            'carrier' => $order->getCarrier(),
            'trackingNumber' => $order->getTrackingNumber(),
            'labelUrl' => $order->getLabelUrl(),
            'pennylaneInvoiceId' => $order->getPennylaneInvoiceId(),
            'invoiceUrl' => $order->getInvoiceUrl(),
            'emailSent' => $emailSent,
            'boxtal' => $labelResult,
        ], Response::HTTP_OK);
    }
}


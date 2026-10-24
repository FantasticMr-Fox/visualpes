<?php

namespace App\Doctrine;

use ApiPlatform\Doctrine\Orm\Extension\QueryCollectionExtensionInterface;
use ApiPlatform\Doctrine\Orm\Extension\QueryItemExtensionInterface;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use App\Entity\Account;
use App\Entity\NfcTag;
use App\Entity\Order;
use App\Entity\OrderItem;
use App\Entity\Property;
use App\Entity\StockItem;
use App\Entity\SupportTicket;
use App\Entity\User;
use App\Entity\Zone;
use Doctrine\ORM\QueryBuilder;
use Symfony\Bundle\SecurityBundle\Security;

/**
 * Isolation multi-tenant : un utilisateur non-admin ne voit (lecture, modification,
 * suppression) que les ressources rattachées à son propre Account.
 * Les ressources hors périmètre renvoient donc une 404 et n'apparaissent pas dans les collections.
 * ROLE_ADMIN (staff VisuAlpes) voit tout.
 */
final readonly class CurrentAccountExtension implements QueryCollectionExtensionInterface, QueryItemExtensionInterface
{
    public function __construct(private Security $security)
    {
    }

    public function applyToCollection(QueryBuilder $queryBuilder, QueryNameGeneratorInterface $queryNameGenerator, string $resourceClass, ?Operation $operation = null, array $context = []): void
    {
        $this->restrictToCurrentAccount($queryBuilder, $queryNameGenerator, $resourceClass);
    }

    public function applyToItem(QueryBuilder $queryBuilder, QueryNameGeneratorInterface $queryNameGenerator, string $resourceClass, array $identifiers, ?Operation $operation = null, array $context = []): void
    {
        $this->restrictToCurrentAccount($queryBuilder, $queryNameGenerator, $resourceClass);
    }

    private function restrictToCurrentAccount(QueryBuilder $queryBuilder, QueryNameGeneratorInterface $queryNameGenerator, string $resourceClass): void
    {
        if ($this->security->isGranted('ROLE_ADMIN')) {
            return;
        }

        $alias = $queryBuilder->getRootAliases()[0];
        $user = $this->security->getUser();

        if (!$user instanceof User || null === $user->getAccount()) {
            $queryBuilder->andWhere('1 = 0');

            return;
        }

        $param = $queryNameGenerator->generateParameterName('current_account');

        switch ($resourceClass) {
            case Account::class:
                $queryBuilder->andWhere(\sprintf('%s = :%s', $alias, $param));
                break;

            case Property::class:
            case Order::class:
            case SupportTicket::class:
            case User::class:
                $queryBuilder->andWhere(\sprintf('%s.account = :%s', $alias, $param));
                break;

            case Zone::class:
                $join = $queryNameGenerator->generateJoinAlias('property');
                $queryBuilder
                    ->join(\sprintf('%s.property', $alias), $join)
                    ->andWhere(\sprintf('%s.account = :%s', $join, $param));
                break;

            case OrderItem::class:
                $join = $queryNameGenerator->generateJoinAlias('parentOrder');
                $queryBuilder
                    ->join(\sprintf('%s.parentOrder', $alias), $join)
                    ->andWhere(\sprintf('%s.account = :%s', $join, $param));
                break;

            case NfcTag::class:
            case StockItem::class:
                // Ressource interne atelier : jamais visible par un client.
                $queryBuilder->andWhere('1 = 0');

                return;

            default:
                return;
        }

        $queryBuilder->setParameter($param, $user->getAccount());
    }
}


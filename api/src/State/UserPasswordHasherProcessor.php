<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\User;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Hache le champ non persisté `plainPassword` avant d'enregistrer un User.
 *
 * @implements ProcessorInterface<User, User>
 */
final readonly class UserPasswordHasherProcessor implements ProcessorInterface
{
    /**
     * @param ProcessorInterface<User, User> $persistProcessor
     */
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private ProcessorInterface $persistProcessor,
        private UserPasswordHasherInterface $passwordHasher,
        private Security $security,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        if ($data instanceof User) {
            $currentUser = $this->security->getUser();
            if ($currentUser instanceof User && !$this->security->isGranted('ROLE_ADMIN')) {
                // Un admin de compte ne peut créer/modifier des utilisateurs que pour son propre compte
                if (null !== $currentUser->getAccount()) {
                    $data->setAccount($currentUser->getAccount());
                }

                // Un admin de compte ne peut pas s'auto-attribuer ou attribuer ROLE_ADMIN ou ROLE_ATELIER
                $allowedRoles = ['ROLE_USER', 'ROLE_PROPERTY_ADMIN', 'ROLE_ACCOUNT_ADMIN'];
                $filteredRoles = array_values(array_intersect($data->getRoles(), $allowedRoles));
                if (empty($filteredRoles)) {
                    $filteredRoles = ['ROLE_USER'];
                }
                $data->setRoles($filteredRoles);
            }

            if (null !== $data->getPlainPassword() && '' !== $data->getPlainPassword()) {
                $data->setPassword($this->passwordHasher->hashPassword($data, $data->getPlainPassword()));
                $data->setPlainPassword(null);
            }
        }

        return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
    }
}


import { Locale } from "./types";

export interface TermsContent {
  badge: string;
  title: string;
  subtitle: string;
  sections: {
    num: string;
    title: string;
    paragraphs?: string[];
    bullets?: { title: string; text: string }[];
    codeNote?: string;
  }[];
  linkToPrivacy: string;
  backToLogin: string;
}

export interface PrivacyContent {
  badge: string;
  title: string;
  subtitle: string;
  s1Title: string;
  s1Intro: string;
  s1Company: string;
  s1Address: string;
  s1Dpo: string;
  s2Title: string;
  s2Intro: string;
  s2Card1Title: string;
  s2Card1Text: string;
  s2Card2Title: string;
  s2Card2Text: string;
  s3Title: string;
  s3BannerTitle: string;
  s3BannerP1: string;
  s3BannerP2: string;
  s4Title: string;
  s4Bullets: { title: string; text: string }[];
  s5Title: string;
  s5P1: string;
  s5P2: string;
  s6Title: string;
  s6Intro: string;
  s6Bullets: string[];
  s6Cnil: string;
  linkToTerms: string;
  backToLogin: string;
}

export const termsData: Record<Locale, TermsContent> = {
  fr: {
    badge: "Document contractuel officiel",
    title: "Conditions Générales d'Utilisation",
    subtitle:
      "Plateforme VisuAlpes • Système d'accueil connecté & signalétique atelier • Dernière mise à jour : 26 octobre 2026",
    sections: [
      {
        num: "01",
        title: "Objet et Champ d'Application",
        paragraphs: [
          "Les présentes Conditions Générales d'Utilisation (ci-après les « CGU ») régissent l'accès et l'utilisation de l'ensemble des services numériques édités par VisuAlpes (ci-après « la Plateforme »), comprenant le portail clients pour propriétaires et gestionnaires d'hébergements, les interfaces de consultation pour voyageurs, ainsi que le portail de fabrication et d'administration atelier.",
          "Toute connexion, inscription ou utilisation de la Plateforme implique l'acceptation sans réserve des présentes CGU par l'utilisateur.",
        ],
      },
      {
        num: "02",
        title: "Comptes Utilisateurs et Sécurité des Accès",
        paragraphs: [
          "L'accès aux fonctionnalités de gestion des hébergements, des commandes atelier et du support nécessite un compte utilisateur valide associé à un compte entreprise ou propriétaire.",
        ],
        bullets: [
          {
            title: "Confidentialité des identifiants :",
            text: "L'utilisateur est seul responsable du secret de son mot de passe et de ses jetons d'accès.",
          },
          {
            title: "Authentification à deux facteurs (2FA) :",
            text: "La Plateforme propose un protocole de double authentification (par e-mail sécurisé ou application TOTP). Son activation est vivement recommandée pour protéger vos logements.",
          },
          {
            title: "Accès Atelier réservé :",
            text: "L'espace d'administration atelier (/va-admin) est strictement réservé aux artisans, techniciens et administrateurs habilités. Toute tentative d'intrusion fera l'objet de poursuites judiciaires.",
          },
        ],
      },
      {
        num: "03",
        title: "Supports Physiques Connectés & Puces NFC",
        paragraphs: [
          "Les produits fabriqués par VisuAlpes combinent l'artisanat d'art (bois alpins nobles, métaux usinés) et la micro-électronique de pointe (circuits NFC haute fiabilité).",
          "L'utilisateur s'engage à utiliser les supports dans des conditions normales d'accueil et à ne pas tenter de reprogrammer les puces avec des microprogrammes malveillants ou d'altérer le routage cryptographique des identifiants UID d'atelier.",
        ],
      },
      {
        num: "04",
        title: "Identifiants Wi-Fi et Codes d'Accès Logements",
        paragraphs: [
          "La Plateforme intègre un coffre-fort numérique chiffré (AES-256-GCM) pour le stockage des identifiants Wi-Fi et codes de digicodes ou boîtes à clés.",
          "Le propriétaire ou gestionnaire demeure exclusivement responsable de l'exactitude des informations partagées avec ses locataires et de la mise à jour des codes d'accès lors du départ des occupants.",
        ],
      },
      {
        num: "05",
        title: "Commandes Atelier et Délais de Fabrication",
        paragraphs: [
          "Les commandes de supports passées via l'espace client font l'objet d'un ordonnancement précis en atelier (préparation des matières premières, gravure, encodage des puces NFC, contrôle qualité et conditionnement). Les délais communiqués sont indicatifs et dépendent de la saisonnalité alpine et de l'approvisionnement en essences de bois certifiées.",
        ],
      },
      {
        num: "06",
        title: "Propriété Intellectuelle",
        paragraphs: [
          "Tous les éléments constitutifs de la Plateforme (marques, logo emblème chevron VisuAlpes, architectures logicielles, maquettes, méthodes d'encodage et designs matériels) sont protégés au titre du droit d'auteur et de la propriété industrielle. Toute reproduction ou rétro-ingénierie sans accord écrit préalable est formellement interdite.",
        ],
      },
      {
        num: "07",
        title: "Loi Applicable et Juridiction",
        paragraphs: [
          "Les présentes conditions sont soumises au droit français. Tout litige relatif à leur interprétation ou exécution qui ne pourrait être résolu à l'amiable sera porté devant les tribunaux compétents du ressort de la Cour d'Appel de Chambéry.",
        ],
      },
    ],
    linkToPrivacy: "Consulter notre Politique de Confidentialité (RGPD)",
    backToLogin: "Revenir à la page de connexion",
  },
  en: {
    badge: "Official contractual document",
    title: "General Terms of Service",
    subtitle:
      "VisuAlpes Platform • Connected hospitality system & craft signage • Last updated: October 26, 2026",
    sections: [
      {
        num: "01",
        title: "Subject and Scope",
        paragraphs: [
          "These General Terms of Service (hereinafter the 'TOS') govern access to and use of all digital services published by VisuAlpes (hereinafter 'the Platform'), including the customer portal for property owners and managers, visitor interfaces for guests, as well as the craft workshop manufacturing and administration portal.",
          "Any connection, registration, or use of the Platform implies full and unconditional acceptance of these TOS by the user.",
        ],
      },
      {
        num: "02",
        title: "User Accounts and Access Security",
        paragraphs: [
          "Access to property management features, workshop orders, and support requires a valid user account associated with a business or property owner account.",
        ],
        bullets: [
          {
            title: "Credential confidentiality:",
            text: "The user is solely responsible for maintaining the secrecy of their password and access tokens.",
          },
          {
            title: "Two-Factor Authentication (2FA):",
            text: "The Platform provides a dual-factor authentication protocol (via secure email or TOTP authenticator app). Activating it is strongly recommended to protect your properties.",
          },
          {
            title: "Restricted Atelier Access:",
            text: "The craft administration portal (/va-admin) is strictly reserved for authorized artisans, technicians, and administrators. Any unauthorized access attempt will be subject to legal prosecution.",
          },
        ],
      },
      {
        num: "03",
        title: "Physical Connected Supports & NFC Chips",
        paragraphs: [
          "Products crafted by VisuAlpes combine fine craftsmanship (noble alpine timbers, precision-machined metals) and cutting-edge microelectronics (high-reliability NFC circuits).",
          "The user agrees to use the physical supports under normal hospitality conditions and not attempt to reprogram chips with malicious firmware or alter the cryptographic routing of workshop UID identifiers.",
        ],
      },
      {
        num: "04",
        title: "Wi-Fi Credentials and Accommodation Access Codes",
        paragraphs: [
          "The Platform includes an encrypted digital vault (AES-256-GCM) for storing Wi-Fi credentials and key box or digicode pin codes.",
          "The property owner or manager remains exclusively responsible for the accuracy of information shared with guests and for updating access codes upon guest departure.",
        ],
      },
      {
        num: "05",
        title: "Workshop Orders and Manufacturing Lead Times",
        paragraphs: [
          "Orders for physical signage placed through the client portal are scheduled with precision in our alpine workshop (raw material selection, engraving, NFC chip encoding, quality inspection, and packaging). Lead times provided are indicative and depend on alpine seasonality and the supply of certified timber species.",
        ],
      },
      {
        num: "06",
        title: "Intellectual Property",
        paragraphs: [
          "All components of the Platform (trademarks, chevron emblem logo VisuAlpes, software architecture, mockups, encoding algorithms, and hardware designs) are protected under copyright and industrial property law. Any reproduction or reverse-engineering without prior written consent is strictly prohibited.",
        ],
      },
      {
        num: "07",
        title: "Applicable Law and Jurisdiction",
        paragraphs: [
          "These terms are governed by French law. Any dispute relating to their interpretation or execution that cannot be resolved amicably shall be brought before the competent courts within the jurisdiction of the Chambéry Court of Appeal.",
        ],
      },
    ],
    linkToPrivacy: "View our Privacy Policy (GDPR)",
    backToLogin: "Back to sign in page",
  },
};

export const privacyData: Record<Locale, PrivacyContent> = {
  fr: {
    badge: "Conformité Règlement Général sur la Protection des Données (RGPD)",
    title: "Politique de Confidentialité",
    subtitle:
      "Protection des données de vos hébergements, identifiants chiffrés & respect de la vie privée des voyageurs • Version 2026.1",
    s1Title: "Responsable du Traitement des Données",
    s1Intro:
      "Le responsable du traitement des données à caractère personnel collectées via la Plateforme est :",
    s1Company: "VisuAlpes SAS — Atelier d'Artisanat Technologique Alpin",
    s1Address: "Siège social : 150 Chemin des Taillées, 74400 Chamonix Mont-Blanc, France",
    s1Dpo: "Contact DPO / Protection des Données : dpo@visualpes.fr",
    s2Title: "Données Collectées et Traitées",
    s2Intro:
      "Dans le cadre de l'exploitation des supports connectés et du portail de gestion, VisuAlpes collecte uniquement les données strictement nécessaires :",
    s2Card1Title: "Données de Compte Client",
    s2Card1Text:
      "Nom commercial, adresse email professionnelle, rôles d'équipe, mots de passe hachés par algorithme cryptographique sécurisé (bcrypt/Argon2id), numéros de téléphone de contact pour les commandes atelier.",
    s2Card2Title: "Données Logements & Wi-Fi",
    s2Card2Text:
      "Désignation des chalets et appartements, nom des zones (Entrée, Salon, Ski-Room), consignes d'accueil, et identifiants Wi-Fi chiffrés au repos via le standard militaire AES-256-GCM.",
    s3Title: "Vie Privée des Voyageurs & Balises NFC",
    s3BannerTitle: "Principe de Zéro Collecte Intrusive des Voyageurs",
    s3BannerP1:
      "Lorsqu'un vacancier ou locataire approche son smartphone d'un support NFC VisuAlpes ou scanne le QR code d'accueil, aucune donnée personnelle d'identité (nom, prénom, coordonnées bancaires ou géolocalisation GPS) n'est exigée ni collectée.",
    s3BannerP2:
      "Seul un compteur anonyme de consultation technique est incrémenté pour permettre aux propriétaires de mesurer l'utilisation effective de leurs livrets d'accueil connectés.",
    s4Title: "Finalités et Bases Légales",
    s4Bullets: [
      {
        title: "Exécution contractuelle (Art. 6.1.b RGPD) :",
        text: "Gestion des commandes atelier, fabrication des plaques signalétiques sur-mesure, expédition, encodage des puces et routage des guides.",
      },
      {
        title: "Sécurité du système (Art. 6.1.f RGPD) :",
        text: "Journalisation des connexions et détection des tentatives de piratage ou force brute (2FA, rate limiting).",
      },
      {
        title: "Obligations légales (Art. 6.1.c RGPD) :",
        text: "Conservation des factures d'atelier et bons de commande fournisseurs selon les prescriptions du Code de commerce.",
      },
    ],
    s5Title: "Hébergement et Sécurité des Données",
    s5P1: "L'ensemble de nos infrastructures serveurs, bases de données PostgreSQL et microservices d'encodage sont hébergés sur des centres de données sécurisés situés exclusivement au sein de l'Union Européenne (France et Allemagne).",
    s5P2: "Aucun transfert de données n'est effectué vers des pays tiers hors UE ne disposant pas d'une décision d'adéquation équivalente au RGPD. Vos données ne sont ni vendues, ni louées, ni cédées à des courtiers publicitaires.",
    s6Title: "Vos Droits (Accès, Rectification, Suppression)",
    s6Intro:
      "Conformément à la réglementation européenne, vous disposez d'un droit d'accès, de rectification, de portabilité et d'effacement de vos données personnelles :",
    s6Bullets: [
      "Directement depuis votre espace client (gestion des membres de l'équipe, suppression de logements ou zones).",
      "Par simple demande auprès de notre Délégué à la Protection des Données à l'adresse : privacy@visualpes.fr.",
    ],
    s6Cnil:
      "En cas de désaccord persistant, vous avez le droit d'introduire une réclamation auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL - www.cnil.fr).",
    linkToTerms: "Consulter les Conditions Générales d'Utilisation (CGU)",
    backToLogin: "Revenir à la page de connexion",
  },
  en: {
    badge: "General Data Protection Regulation (GDPR) Compliance",
    title: "Privacy Policy",
    subtitle:
      "Data protection for your properties, encrypted credentials & guest privacy • Version 2026.1",
    s1Title: "Data Controller",
    s1Intro:
      "The data controller responsible for personal data processed through the Platform is:",
    s1Company: "VisuAlpes SAS — Alpine Craft & Technology Workshop",
    s1Address: "Head office: 150 Chemin des Taillées, 74400 Chamonix Mont-Blanc, France",
    s1Dpo: "DPO Contact / Data Protection Officer: dpo@visualpes.fr",
    s2Title: "Data Collected and Processed",
    s2Intro:
      "As part of operating connected signage and the management portal, VisuAlpes collects only strictly necessary data:",
    s2Card1Title: "Client Account Data",
    s2Card1Text:
      "Business name, professional email address, team roles, passwords securely hashed using cryptographic standards (bcrypt/Argon2id), contact phone numbers for workshop orders.",
    s2Card2Title: "Property & Wi-Fi Data",
    s2Card2Text:
      "Chalet and apartment names, designated zones (Entrance, Lounge, Ski-Room), hospitality instructions, and Wi-Fi credentials encrypted at rest using military-grade AES-256-GCM.",
    s3Title: "Traveler Privacy & NFC Tags",
    s3BannerTitle: "Zero Intrusive Collection Principle for Travelers",
    s3BannerP1:
      "When a holidaymaker or guest taps their smartphone on a VisuAlpes NFC plate or scans the hospitality QR code, no personal identity data (name, email, bank details, or GPS location) is required or collected.",
    s3BannerP2:
      "Only an anonymous technical visit counter is incremented to allow property owners to measure guest engagement with their connected welcome guides.",
    s4Title: "Purposes and Legal Grounds",
    s4Bullets: [
      {
        title: "Contractual performance (Art. 6.1.b GDPR):",
        text: "Workshop order fulfillment, custom signage manufacturing, shipping, chip encoding, and digital guide routing.",
      },
      {
        title: "System security (Art. 6.1.f GDPR):",
        text: "Connection logging and prevention of unauthorized access or brute force attacks (2FA, rate limiting).",
      },
      {
        title: "Legal obligations (Art. 6.1.c GDPR):",
        text: "Retention of workshop invoices and supplier purchase orders in compliance with the French Commercial Code.",
      },
    ],
    s5Title: "Data Hosting and Infrastructure Security",
    s5P1: "All our server infrastructure, PostgreSQL databases, and encoding microservices are hosted in secure data centers located exclusively within the European Union (France and Germany).",
    s5P2: "No data transfer is made to third countries outside the EU without an adequacy decision. Your data is never sold, rented, or transferred to advertising brokers.",
    s6Title: "Your Rights (Access, Rectification, Erasure)",
    s6Intro:
      "In accordance with European regulations, you hold the right to access, rectify, port, and delete your personal data:",
    s6Bullets: [
      "Directly from your client portal (team member management, deletion of residences or zones).",
      "By simple written request to our Data Protection Officer at: privacy@visualpes.fr.",
    ],
    s6Cnil:
      "In the event of an unresolved dispute, you have the right to lodge a complaint with the French Data Protection Authority (CNIL - www.cnil.fr).",
    linkToTerms: "View our General Terms of Service (TOS)",
    backToLogin: "Back to sign in page",
  },
};


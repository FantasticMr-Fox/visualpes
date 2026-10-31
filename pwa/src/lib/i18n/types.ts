export type Locale = "fr" | "en";

export interface Translations {
  common: {
    atelierAccess: string;
    clientSpace: string;
    clientPortal: string;
    adminPortal: string;
    back: string;
    backToLogin: string;
    backToPassword: string;
    loading: string;
    confirm: string;
    cancel: string;
    save: string;
    close: string;
    logout: string;
    copyright: string;
    alpsLove: string;
    officialDoc: string;
    rgpdDoc: string;
    language: string;
    french: string;
    english: string;
  };
  login: {
    title: string;
    clientSubtitle: string;
    adminSubtitle: string;
    email: string;
    emailPlaceholder: string;
    adminEmailPlaceholder: string;
    password: string;
    passwordPlaceholder: string;
    rememberMe: string;
    forgotPassword: string;
    showPassword: string;
    hidePassword: string;
    submitClient: string;
    submitAdmin: string;
    submittingClient: string;
    submittingAdmin: string;
    legalPrefix: string;
    terms: string;
    and: string;
    privacy: string;
  };
  twoFactor: {
    titleClient: string;
    titleAdmin: string;
    defaultMessage: string;
    adminMessage: string;
    totpBadge: string;
    emailBadge: string;
    emailBadgeAdmin: string;
    otpLabel: string;
    confirmClient: string;
    confirmAdmin: string;
    verifying: string;
    resendEmail: string;
    resending: string;
  };
  forgotPassword: {
    title: string;
    subtitle: string;
    emailLabel: string;
    sendCodeBtn: string;
    sending: string;
    haveCode: string;
    codeLabel: string;
    newPasswordLabel: string;
    resetBtn: string;
    resetting: string;
  };
  legal: {
    termsTitle: string;
    termsSubtitle: string;
    privacyTitle: string;
    privacySubtitle: string;
  };
}


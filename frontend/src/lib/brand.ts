/**
 * Brand constants — naam/copy ek jagah, taake rebrand ek file ki tabdeeli ho.
 */

export const BRAND = {
  name: "Opal Pay",
  tagline: "Run your business. Simply.",
  supportEmail: "support@opalpay.app",
} as const;

/** "Contact support" jaisi jagahon ke liye — abhi koi help-desk route nahi hai. */
export const SUPPORT_HREF = `mailto:${BRAND.supportEmail}`;

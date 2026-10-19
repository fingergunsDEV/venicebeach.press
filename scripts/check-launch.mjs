import { businessContact } from "../src/business.js";
const contact = businessContact();
// Checks technical prerequisites, not legal compliance or legal applicability.
const issues = [];
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.privacyEmail))
  issues.push(
    "Set a verified public PRIVACY_EMAIL for privacy and accessibility support.",
  );
if (!contact.address?.trim())
  issues.push(
    "Set the valid public BUSINESS_ADDRESS; commercial email requires publisher address configuration.",
  );
for (const name of ["PUBLIC_URL", "BUZZ_URL", "PRESS_URL"]) {
  try {
    const u = new URL(process.env[name]);
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      u.hostname === "localhost"
    )
      throw new Error();
  } catch {
    issues.push(`Set ${name} to its correct public HTTPS origin.`);
  }
}
if ((process.env.ADMIN_PASSWORD || "").length < 16)
  issues.push(
    "Configure a strong ADMIN_PASSWORD securely; use individual authenticated access before expanding staff.",
  );
const mail = ["MAILCHIMP_API_KEY", "MAILCHIMP_LIST_ID", "MAILCHIMP_SERVER"];
if (mail.some((k) => process.env[k]) && !mail.every((k) => process.env[k]))
  issues.push(
    "Mailchimp configuration is partial. Complete it or remove the partial configuration.",
  );
if (
  mail.every((k) => process.env[k]) &&
  process.env.EMAIL_COMPLIANCE_CONFIRMED !== "yes"
)
  issues.push(
    "Verify Mailchimp double opt-in, valid address, sender identity, unsubscribe behavior, and suppression handling before setting EMAIL_COMPLIANCE_CONFIRMED=yes.",
  );
if (issues.length) {
  console.error(
    "Launch prerequisites unresolved:\n" +
      issues.map((x) => "- " + x).join("\n"),
  );
  process.exitCode = 1;
} else
  console.log(
    "Technical launch configuration checks passed. This is not a legal compliance certification. Complete docs/COMPLIANCE.md with counsel and the operator before public launch.",
  );

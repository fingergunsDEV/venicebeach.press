// Public business details supplied by the owner; these are not credentials.
export function businessContact(channel = "buzz") {
  return {
    name: "Holistic Growth Marketing LLC",
    address:
      process.env.BUSINESS_ADDRESS || "215 Market Street, Venice, CA 90291",
    privacyEmail:
      process.env.PRIVACY_EMAIL ||
      `info@venicebeach.${channel === "press" ? "press" : "buzz"}`,
    publisherEmail: "jason@holisticgrowthmarketing.com",
    networkEmail: "info@venicebeach.media",
  };
}

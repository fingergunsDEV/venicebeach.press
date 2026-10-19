import { createHash } from "node:crypto";
import { businessContact } from "./business.js";
export const NOTICE_VERSION = "2026-10-16.2";
export function mountCompliance(
  app,
  { db, page, formPage, guard, esc, channel },
) {
  const details = () => businessContact(channel);
  const contact = () =>
    details().privacyEmail
      ? `Email <a href="mailto:${esc(details().privacyEmail)}">${esc(details().privacyEmail)}</a> or use the <a href="/privacy/request">privacy request form</a>.`
      : 'Use the <a href="/privacy/request">privacy request form</a> to contact the publisher about personal information.';
  const business = () =>
    `<p>These commercial websites, VeniceBeach.buzz and VeniceBeach.press, operate within VeniceBeach.media and are published and operated by Holistic Growth Marketing LLC. Our commercial offerings are custom advertisement placements and promotional campaigns for artists, influencers, and businesses. We do not represent unverified revenue as earned income. The operator is a California single-member LLC.</p>${details().address ? `<p>Business mailing address: ${esc(details().address)}.</p><p>Publisher contact: <a href="mailto:${esc(details().publisherEmail)}">${esc(details().publisherEmail)}</a>. Network inquiries: <a href="mailto:${esc(details().networkEmail)}">${esc(details().networkEmail)}</a>.</p>` : ""}`;
  const legal = (res, title, body, path) =>
    page(
      res,
      title,
      `<section class="prose pagehead"><h1>${title}</h1><p class="meta">Notice version ${NOTICE_VERSION}</p>${body}</section>`,
      { path },
    );
  app.get("/privacy", (req, res) =>
    legal(
      res,
      "Privacy notice",
      `${business()}<p>The parent company also publishes a <a href="https://holisticgrowthmarketing.com/privacy.html">privacy policy for its own website</a>. This notice describes these two sites specifically; it does not assume the parent website uses the same tools.</p><h2>Information collected and purposes</h2><p>We collect names, contact email addresses, business/project details, and messages you submit to answer inquiries, review submissions, provide requested services, and process privacy requests. Newsletter requests store your email, channel preference, request time, and the version of the signup notice. Marketing signup is separate from business inquiries and creator submissions. Do not submit sensitive personal information.</p><p>Content views and outbound link clicks are recorded as event type, channel, content ID, campaign ID, and timestamp. These analytics records do not contain visitor identifiers, email addresses, or IP addresses. IP addresses are used in short-lived, in-memory rate limits for security. Hosting or network providers may process connection data as part of providing their services; the operator must review its hosting configuration before launch.</p><h2>Service providers and third parties</h2><p>Information is stored in our shared application database. Authorized staff access information according to their roles. When enabled, Mailchimp processes newsletter email addresses and confirmation requests. Mailchimp confirmation and email campaigns are subject to its processing practices. External event, ticketing, creator, and social sites operate under their own privacy policies. We do not embed advertising trackers, social widgets, or third-party analytics scripts in this application. Fonts are hosted locally by default. If the publisher enables the optional Google Fonts setting, your browser connects to Google Fonts and Google’s font delivery servers, which receive connection data such as your IP address; no advertising tracker is added by that font setting.</p><h2>Cookies, advertising, and privacy signals</h2><p>The application sets an essential, eight-hour sign-in cookie for publishing staff. Public browsing and forms do not require advertising cookies. The current application does not sell personal information or share it for cross-context behavioral advertising. It does not change that behavior in response to Do Not Track or Global Privacy Control because that sale/sharing is not enabled in either case. This describes the current application; adding advertising technology requires a new review of notices, consent, and applicable opt-out requirements.</p><h2>Retention and security</h2><p>We retain information for the purpose for which it was collected, including responding to requests, operating agreed campaigns, resolving disputes, and meeting applicable legal obligations. Pending newsletter requests and closed inquiries should not be kept indefinitely. Authorized deletion requests are handled after proportionate identity verification; legal retention obligations may limit deletion. The operator must document its actual retention periods, backup expiry, vendor agreements, access reviews, and incident response before launch. No system can guarantee absolute security.</p><h2>Your choices and requests</h2><p>You can request access, correction, deletion, or withdrawal of marketing permission through the privacy form without purchasing a service. Depending on where you live and applicable law, you may have additional rights, including authorized-agent requests and an appeal. We assess requests under applicable law and do not penalize you for exercising applicable privacy rights. We may ask for information needed to verify a request; do not send government IDs through these forms.</p><p>${contact()} The subscription-management link provided after signup can withdraw a local request. Mailchimp emails must include a working unsubscribe link. Withdrawing marketing permission does not stop necessary communications about a service you request.</p><h2>Children and changes</h2><p>These services are intended for a general adult audience, not children under 13. Our submission and marketing forms are limited to adults. Do not submit information about children without a separate, appropriate permission process. Report suspected child submissions through the privacy form. Material changes to these practices will be reflected in a revised, dated notice and any additional notice or consent required by law.</p>`,
      "/privacy",
    ),
  );
  app.get("/terms", (req, res) =>
    legal(
      res,
      "Website & commercial terms",
      `${business()}<h2>Using the websites</h2><p>Use these sites lawfully. Do not submit deceptive, infringing, defamatory, unlawful, or private material, attempt unauthorized access, or interfere with site operation. Event information may change; confirm details, restrictions, accessibility, prices, and availability with the organizer. We do not sell event tickets or operate venues.</p><h2>Editorial work and paid promotion</h2><p>Independent editorial decisions are separate from sales. Paid profiles, advertisements, gifts, affiliate arrangements, and other material relationships must be disclosed clearly at the relevant placement. A sponsorship does not purchase independent praise, a favorable review, or an undisclosed ranking benefit. See our <a href="/disclosures">advertising and editorial policy</a>.</p><h2>Submissions and intellectual property</h2><p>You retain ownership of material you submit. You must have authority to share it and to permit its review. Submission allows us to store, review, and contact you about the material; publication or promotional reuse requires documented permission covering that use. We may decline or request changes. Submissions do not guarantee publication or create a paid service contract. Photos, music, artwork, logos, video, and likenesses require appropriate rights and releases; public availability is not permission to reuse them.</p><p>Report alleged infringement with the page URL, identification of the work, your contact details, and a description of your authority through <a href="/contact">contact</a>. Do not submit sensitive information. This route is not a representation that we have registered a statutory DMCA agent.</p><h2>Commercial inquiries and agreements</h2><p>Submitting an inquiry does not place an order or authorize charges. Package prices are indicative, in US dollars, and subject to a written quote. A separate agreement with Holistic Growth Marketing LLC must identify scope, deliverables, campaign dates, total fees and applicable taxes, payment timing, revisions, approvals, disclosures, cancellation/refund terms, and reporting. Advertisers are responsible for substantiating supplied claims and rights.</p><p>No online checkout, card charging, automatic renewal, or recurring billing is currently provided by these websites. Any recurring campaign must be separately agreed with clear renewal, cancellation, and payment terms. Do not enable subscription checkout until applicable automatic-renewal requirements and cancellation flows have been reviewed and tested.</p><h2>Outcomes, availability, and rights</h2><p>Audience, clicks, inquiries, sales, search placement, or revenue are not guaranteed. Reports distinguish measured activity from estimates and contracted revenue from collected cash. Sample content is labeled and is not evidence of past campaign results. We aim to keep information accurate and accessible; report errors and access barriers through <a href="/accessibility">accessibility support</a>. Nothing in these terms excludes rights or remedies that cannot lawfully be excluded.</p>`,
      "/terms",
    ),
  );
  app.get("/disclosures", (req, res) =>
    legal(
      res,
      "Advertising & editorial policy",
      `${business()}<p>These are revenue-generating commercial publications. We sell production, placement, and distribution services, with agreed deliverables, not guaranteed favorable editorial coverage or sales.</p><h2>Recognizing paid content</h2><p>Paid stories and cards display “Advertisement · Paid content” and identify the advertiser before the story. Paid outbound links are marked as sponsored in the link relationship. Independent editorial stories are identified separately. A paid profile is not an independent review.</p><h2>Other material connections</h2><p>Editors must identify any gifts, free access, employment, ownership, personal connections, affiliate compensation, or other material relationships near the relevant endorsement. There is currently no affiliate-link program implemented in the application. Affiliate links and third-party advertisements must not be added without placement-level disclosure and technical/privacy review.</p><h2>Claims and corrections</h2><p>We do not fabricate audience figures, reviews, testimonials, or campaign performance. Advertisers must supply support for objective claims before publication. Readers can request corrections or report an undisclosed commercial relationship through <a href="/contact">contact</a>. The publisher reviews complaints and records required corrections.</p>`,
      "/disclosures",
    ),
  );
  app.get("/accessibility", (req, res) =>
    legal(
      res,
      "Accessibility support",
      `<p>We aim for WCAG 2.2 AA and test navigation, forms, and responsive layouts. Automated checks do not establish complete accessibility compliance. If you encounter a barrier, use <a href="/contact">contact</a>${details().privacyEmail ? ` or email ${esc(details().privacyEmail)}` : ""} and describe the page and the task you could not complete. Do not include medical or sensitive personal details.</p><p>We will review reports and work to provide an accessible alternative. You may contact us directly by email without using a web form.</p>`,
      "/accessibility",
    ),
  );
  app.get("/privacy/request", (req, res) =>
    formPage(
      res,
      "Your information. Your choices.",
      "Contact the publisher about access, correction, deletion, marketing withdrawal, or other applicable privacy rights. This form is separate from sales and does not subscribe you to email.",
      `<form method="post" action="/privacy/request"><label>Contact email<input type="email" name="email" required maxlength="254"></label><label>Request type<select name="request_type">${["Access", "Correction", "Deletion", "Marketing withdrawal", "Authorized agent", "Appeal", "Other privacy request"].map((x) => `<option>${x}</option>`).join("")}</select></label><label>What would you like us to review? Do not include passwords or identity documents.<textarea name="summary" required maxlength="2000"></textarea></label><div class="trap" aria-hidden="true"><label>Leave blank<input name="website_confirm" tabindex="-1"></label></div><p>We use your contact details to respond and verify the request where needed, under our <a href="/privacy">privacy notice</a>. No marketing consent is requested.</p><button>Send privacy request</button></form>`,
    ),
  );
  app.post("/privacy/request", guard, (req, res) => {
    const b = req.body;
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email || "") ||
      b.email.length > 254 ||
      !b.summary?.trim() ||
      b.summary.length > 2000 ||
      ![
        "Access",
        "Correction",
        "Deletion",
        "Marketing withdrawal",
        "Authorized agent",
        "Appeal",
        "Other privacy request",
      ].includes(b.request_type)
    )
      return res
        .status(400)
        .send("Provide a valid contact email, request type, and description.");
    const result = db
      .prepare(
        "INSERT INTO leads(type,channel,email,name,payload,created_at) VALUES(?,?,?,?,?,?)",
      )
      .run(
        "privacy",
        channel,
        b.email,
        "Privacy requester",
        JSON.stringify({
          request_type: b.request_type,
          summary: b.summary,
          notice_version: NOTICE_VERSION,
        }),
        new Date().toISOString(),
      );
    formPage(
      res,
      "Privacy request recorded.",
      `Reference ${result.lastInsertRowid}. Your request is private to administrators. No identity documents are needed at this stage; a response and any proportionate verification are handled by the publisher.`,
      '<a href="/privacy">Read the privacy notice</a>',
    );
  });
  app.get("/newsletter/manage/:token", (req, res) => {
    res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
    if (
      !/^[a-f0-9]{48}$/.test(req.params.token) ||
      !db
        .prepare("SELECT id FROM subscribers WHERE token=?")
        .get(req.params.token)
    )
      return res.sendStatus(404);
    formPage(
      res,
      "Manage your email request.",
      "Withdraw your subscription request or unsubscribe. This action is free and does not require a login.",
      `<form method="post" action="/newsletter/manage/${req.params.token}"><button>Unsubscribe / withdraw request</button></form>`,
    );
  });
  app.post("/newsletter/manage/:token", guard, async (req, res, next) => {
    res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
    try {
      if (!/^[a-f0-9]{48}$/.test(req.params.token)) return res.sendStatus(404);
      const sub = db
        .prepare("SELECT * FROM subscribers WHERE token=?")
        .get(req.params.token);
      if (!sub) return res.sendStatus(404);
      db.prepare(
        "UPDATE subscribers SET status='unsubscribed',withdrawn_at=? WHERE id=?",
      ).run(new Date().toISOString(), sub.id);
      let synced = sub.status === "pending_configuration";
      if (
        process.env.MAILCHIMP_API_KEY &&
        process.env.MAILCHIMP_LIST_ID &&
        /^us\d+$/.test(process.env.MAILCHIMP_SERVER || "")
      ) {
        const id = createHash("md5")
          .update(sub.email.toLowerCase())
          .digest("hex");
        const r = await fetch(
          `https://${process.env.MAILCHIMP_SERVER}.api.mailchimp.com/3.0/lists/${encodeURIComponent(process.env.MAILCHIMP_LIST_ID)}/members/${id}`,
          {
            method: "PATCH",
            headers: {
              Authorization:
                "Basic " +
                Buffer.from("venice:" + process.env.MAILCHIMP_API_KEY).toString(
                  "base64",
                ),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: "unsubscribed" }),
            signal: AbortSignal.timeout(10000),
          },
        ).catch(() => null);
        synced = !!r && (r.ok || r.status === 404);
      }
      if (!synced) {
        db.prepare(
          "INSERT INTO leads(type,channel,email,name,payload,created_at) VALUES(?,?,?,?,?,?)",
        ).run(
          "privacy",
          channel,
          sub.email,
          "Email suppression follow-up",
          JSON.stringify({
            request_type: "Marketing withdrawal",
            summary:
              "Local suppression recorded. Publisher must verify email-provider unsubscribe immediately.",
          }),
          new Date().toISOString(),
        );
      }
      formPage(
        res,
        "Local email request withdrawn.",
        synced
          ? "Your pending request is withdrawn or the connected provider has accepted your unsubscribe."
          : "Your local request is withdrawn. Provider synchronization could not be confirmed; the publisher has a private follow-up request. You can also use the unsubscribe link in the last provider email.",
        '<a href="/privacy/request">Contact privacy support</a>',
      );
    } catch (e) {
      next(e);
    }
  });
}

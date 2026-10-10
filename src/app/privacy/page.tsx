import type { Metadata } from "next";
import { PageContainer } from "@/components/ui/page-container";

/**
 * Privacy policy — the public URL both app stores require on a listing.
 *
 * Unlike every other page in this app this is a **server component**: it has no
 * state, makes no API calls, and needs to be readable by Google Play's and
 * Apple's automated checkers, which don't run JavaScript. The
 * "all pages are client components" convention exists because pages fetch from
 * the browser via `apiFetch`; this one fetches nothing, so it renders to static
 * HTML instead.
 *
 * Everything asserted below was checked against the code rather than written
 * from a template: the column list matches `scripts/schema.sql`, and neither
 * app has an analytics, advertising or crash-reporting dependency.
 */

/* ── Fill these in before deploying ──────────────────────────────────────────
   Confirm all three. The email in particular must be a mailbox that is
   actually monitored — it is the address data-deletion requests arrive at, and
   both stores expect a reply. */
const OPERATOR = "Renewal Church Cafe";
const CONTACT_EMAIL = "privacy@pugbug.fun";
const EFFECTIVE_DATE = "12 September 2026";
/* ───────────────────────────────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: "Privacy Policy · Church Cafe",
  description:
    "What the Church Cafe app collects, why, how long it is kept, and how to have it deleted.",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-2.5 text-xl font-extrabold tracking-[-0.015em]">
        {title}
      </h2>
      <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <PageContainer className="max-w-3xl">
      <header className="border-b border-line pb-6">
        <p className="mb-1.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {OPERATOR}
        </p>
        <h1 className="text-[32px] font-extrabold leading-tight tracking-[-0.025em] sm:text-[38px]">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          In effect {EFFECTIVE_DATE}
        </p>
      </header>

      <p className="mt-6 text-[15px] leading-relaxed text-muted-foreground">
        This policy covers the Church Cafe website and the Church Cafe mobile
        app for Android and iOS. Both are run by {OPERATOR} to take and prepare
        orders in the cafe. They talk to one server that we operate, and to
        nothing else.
      </p>

      <div className="mt-6 rounded-card bg-ac-soft px-5 py-4">
        <p className="text-[15px] font-semibold leading-relaxed text-ac-dark">
          There is no advertising, no analytics and no tracking in this app. We
          do not sell or share your information, and nothing is sent to a
          third-party service for profiling or measurement.
        </p>
      </div>

      <Section title="What we collect">
        <p>
          <strong className="font-semibold text-foreground">
            When you create an account:
          </strong>
        </p>
        <Bullets
          items={[
            "Your name and email address.",
            "Your password, stored only as a bcrypt hash — we cannot read it, and neither can anyone with access to the database.",
            "A profile photo, only if you choose to upload one.",
            "Which cafe (organisation) you belong to, and your role — customer, staff or administrator.",
          ]}
        />
        <p className="pt-1">
          <strong className="font-semibold text-foreground">
            When an order is placed:
          </strong>
        </p>
        <Bullets
          items={[
            "The items ordered, the options chosen for each (milk, size, and so on), the quantity and the price.",
            "Any note added for the barista, and any note on an individual item.",
            "A customer name, if one is given at the counter so the order can be called out. This is free text and does not have to be your real name.",
            "The order total, its status, and the time it was created.",
            "The account that placed the order, when it was placed by a signed-in user.",
          ]}
        />
        <p className="pt-1">
          We do not collect location, contacts, device identifiers,
          advertising IDs, or anything from your microphone or camera.
        </p>
      </Section>

      <Section title="Why we collect it">
        <Bullets
          items={[
            "To sign you in and keep you signed in.",
            "To prepare orders correctly and call them out for collection.",
            "To show the cafe's own staff how much was sold and when, so they can plan what to make. These figures are read from the order records described above; they are not built from any separate profile of you.",
            "To let an administrator manage the menu and the accounts of the people who work in the cafe.",
          ]}
        />
      </Section>

      <Section title="What is stored on your device">
        <Bullets
          items={[
            "A sign-in token, so you do not have to type your password every time. It expires after seven days. On mobile it is held in the operating system's secure store (the iOS Keychain or the Android Keystore); on the website it is held in your browser's local storage.",
            "A copy of your name, email and role, so the app can draw the screen before it has heard back from the server.",
            "Your appearance choice — colour palette, and light or dark mode. This never leaves the device.",
          ]}
        />
        <p>
          Signing out removes the token and the cached copy of your details.
        </p>
      </Section>

      <Section title="Where it is stored, and who can see it">
        <p>
          Everything is held in a MySQL database on a virtual private server we
          rent in Lithuania, in the European Union. Uploaded photos are stored
          as files on the same server. Traffic between the app and the server is
          encrypted with HTTPS.
        </p>
        <p>
          Inside the cafe, staff and administrator accounts can see orders,
          including any customer name and note attached to them, because that is
          what preparing an order requires. Administrators can additionally see
          the list of accounts — names, email addresses and roles. Other
          customers cannot see your orders. The public order board shows only the
          name or number an order was placed under, never an email address.
        </p>
        <p>
          We use no third-party processor for analytics, advertising, crash
          reporting or customer messaging. The only other parties involved are
          the company hosting the server, and Google Play and the Apple App
          Store, which distribute the app and handle its installation — their own
          policies cover what they collect when you download it.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          Account details are kept until the account is deleted. Order records
          are kept as the cafe&apos;s own record of what it sold. When an account
          is deleted its orders stay, but they are detached from it — the link to
          the person is removed, so what remains is a sale with no customer
          attached.
        </p>
      </Section>

      <Section title="Deleting your account and data">
        <p>
          You can ask us to delete your account and the personal details held
          with it at any time. Email{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=Account%20deletion%20request`}
            className="font-semibold text-ac-dark underline underline-offset-2"
          >
            {CONTACT_EMAIL}
          </a>{" "}
          from the address on the account, or ask a member of cafe staff to pass
          the request on.
        </p>
        <p>
          We will delete your name, email address, password hash and profile
          photo. As described above, past orders are kept as a sales record but
          are no longer connected to you. We aim to complete requests within 30
          days and will confirm by email when it is done.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          Because we operate in the European Union, you can ask us to give you a
          copy of the information we hold about you, correct it if it is wrong,
          delete it, or restrict what we do with it. Your name, email and photo
          can also be changed yourself at any time on the Profile screen. To
          make any other request, email{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-semibold text-ac-dark underline underline-offset-2"
          >
            {CONTACT_EMAIL}
          </a>
          . If you believe we have handled your information badly, you may
          complain to your national data protection authority.
        </p>
      </Section>

      <Section title="Children">
        <p>
          The app is intended for members and visitors of the church using its
          cafe. It is not directed at children under 13, and we do not knowingly
          collect their information. If a child&apos;s account has been created,
          contact us and we will remove it.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          If this policy changes we will update this page and move the date at
          the top. Where a change materially affects what we do with your
          information, we will say so in the app rather than relying on you to
          re-read this page.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          {OPERATOR} —{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-semibold text-ac-dark underline underline-offset-2"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </Section>
    </PageContainer>
  );
}

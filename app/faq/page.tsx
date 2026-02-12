"use client";

import { useState } from "react";

/* ================================================================
   Quick‑nav link data – mirrors the FAQ.md table of contents
   ================================================================ */
const GENERAL_LINKS = [
  { id: "what-is-cadence", label: "What is Cadence?" },
  { id: "who-is-cadence-for", label: "Who is Cadence for?" },
  { id: "where-is-my-data-stored", label: "Where is my data stored?" },
  { id: "is-cadence-hipaa-compliant", label: "HIPAA Compliance" },
  { id: "what-about-privacy", label: "Privacy" },
  { id: "does-cadence-have-access-to-my-google-sheet", label: "Google Sheet Access" },
  { id: "can-i-lose-my-data", label: "Can I lose my data?" },
  { id: "do-i-need-an-account", label: "Do I need an account?" },
  { id: "what-data-does-cadence-collect", label: "What data is collected?" },
  { id: "why-is-cadence-built-this-way", label: "Why built this way?" },
];

const APP_LINKS = [
  { id: "what-are-these-modes", label: "Cadence modes" },
  { id: "where-do-i-start", label: "Getting started" },
  { id: "how-do-i-connect-a-google-sheet", label: "Connect a Google Sheet" },
  { id: "how-do-i-restore-my-stuff", label: "Restore from sheet" },
  { id: "download-csv", label: "Download CSV" },
  { id: "download-pdf", label: "Download PDF" },
];

const TROUBLESHOOTING_LINKS = [
  { id: "my-google-sheet-isnt-syncing", label: "Sheet not syncing" },
  { id: "sync-buttons-error", label: "Sync button errors" },
  { id: "reset-settings", label: "Reset settings" },
  { id: "i-want-to-leave-cadence", label: "Leaving Cadence" },
  { id: "contact-us", label: "Contact us" },
];

/* ================================================================
   Reusable sub-components
   ================================================================ */

/** Section card – white card matching the privacy.html `.section` style */
function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className="scroll-mt-20 bg-app-white rounded-app shadow-app border border-app-border p-5 sm:p-8 mb-4"
    >
      <h2 className="text-xl sm:text-[1.3rem] font-bold text-app-green mb-4 pb-2 border-b-2 border-app-border">
        {title}
      </h2>
      {children}
    </div>
  );
}

/** Sub‑question heading – teal, like privacy.html `.section h3` */
function Q({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h3
      id={id}
      className={`scroll-mt-20 text-base sm:text-[1.05rem] font-semibold text-app-teal mt-6 mb-2 first:mt-3`}
    >
      {children}
    </h3>
  );
}

/** Info callout – teal left border */
function Info({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-3 sm:p-4 my-3 text-sm leading-relaxed bg-app-teal/5 border-l-[3px] border-app-teal">
      {children}
    </div>
  );
}

/** Warning callout – red left border */
function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-3 sm:p-4 my-3 text-sm leading-relaxed bg-app-red/5 border-l-[3px] border-app-red">
      {children}
    </div>
  );
}

/** Green callout */
function GreenCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-3 sm:p-4 my-3 text-sm leading-relaxed bg-app-green/[0.06] border-l-[3px] border-app-green">
      {children}
    </div>
  );
}

/** Sidebar nav link – matches privacy.html `.sidebar a` */
function SidebarLink({ id, label }: { id: string; label: string }) {
  return (
    <a
      href={`#${id}`}
      className="block py-[0.2rem] px-3 text-[0.82rem] text-app-charcoal rounded-md border-l-2 border-transparent leading-snug hover:bg-app-border hover:text-app-green hover:border-l-app-green transition-all"
    >
      {label}
    </a>
  );
}

/* ================================================================
   FAQ Page
   ================================================================ */

export default function FAQPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-app-charcoal">
          Frequently Asked Questions
        </h1>
        <p className="text-app-gray mt-1">
          Everything you need to know about using Cadence.
        </p>
      </div>

      {/* Mobile nav toggle – visible only below lg */}
      <button
        onClick={() => setMobileNavOpen((v) => !v)}
        className="lg:hidden w-full mb-4 bg-app-white border border-app-border rounded-app p-3 text-left text-sm font-semibold text-app-green flex items-center justify-between"
      >
        Navigate this page
        <svg
          className={`w-4 h-4 transition-transform ${mobileNavOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {mobileNavOpen && (
        <nav className="lg:hidden bg-app-white border border-app-border rounded-app p-4 mb-4 space-y-3">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-app-gray mb-1">General</p>
            {GENERAL_LINKS.map((l) => (
              <a key={l.id} href={`#${l.id}`} onClick={() => setMobileNavOpen(false)} className="block py-1 text-sm text-app-charcoal hover:text-app-green transition-colors">{l.label}</a>
            ))}
          </div>
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-app-gray mb-1">App FAQ</p>
            {APP_LINKS.map((l) => (
              <a key={l.id} href={`#${l.id}`} onClick={() => setMobileNavOpen(false)} className="block py-1 text-sm text-app-charcoal hover:text-app-green transition-colors">{l.label}</a>
            ))}
          </div>
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-app-gray mb-1">Troubleshooting</p>
            {TROUBLESHOOTING_LINKS.map((l) => (
              <a key={l.id} href={`#${l.id}`} onClick={() => setMobileNavOpen(false)} className="block py-1 text-sm text-app-charcoal hover:text-app-green transition-colors">{l.label}</a>
            ))}
          </div>
        </nav>
      )}

      {/* Two-column layout: sidebar + content */}
      <div className="flex gap-6">
        {/* ── Left sidebar ── hidden below lg, sticky on desktop */}
        <nav className="hidden lg:block sticky top-20 self-start flex-shrink-0 w-[210px] max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-app-gray mb-3">
            On this page
          </p>

          {/* General */}
          <div className="mb-3">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-app-gray/70 px-3 mb-1">General</p>
            {GENERAL_LINKS.map((l) => (
              <SidebarLink key={l.id} {...l} />
            ))}
          </div>

          {/* App FAQ */}
          <div className="mb-3">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-app-gray/70 px-3 mb-1">App FAQ</p>
            {APP_LINKS.map((l) => (
              <SidebarLink key={l.id} {...l} />
            ))}
          </div>

          {/* Troubleshooting */}
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-app-gray/70 px-3 mb-1">Troubleshooting</p>
            {TROUBLESHOOTING_LINKS.map((l) => (
              <SidebarLink key={l.id} {...l} />
            ))}
          </div>
        </nav>

        {/* ── Main content ── */}
        <div className="flex-1 min-w-0">
          {/* ============================================================
             GENERAL QUESTIONS
             ============================================================ */}
          <Section id="general-questions" title="General Questions">
            <Q id="what-is-cadence">What is Cadence?</Q>
            <p className="mb-3">
              Cadence is a privacy-first personal health logging app designed to help
              individuals better understand patterns in their body over time. Cadence
              does not operate its own backend, database, or servers for storing any
              data.
            </p>

            <Q id="who-is-cadence-for">Who is Cadence for?</Q>
            <p className="mb-3">
              Cadence is for anybody who has ever said &quot;that&apos;s new, I&apos;ve never
              had [insert symptom here]&quot; or &quot;huh. I wonder if these things are
              related somehow&quot;. Cadence helps bring awareness to your bodily cycles,
              how they can potentially relate to each other, and even helps compare
              week-to-week and month-to-month data.
            </p>

            <Q id="where-is-my-data-stored">Where is my data stored?</Q>
            <p className="mb-3">
              Depending on how you use the app, your data is stored either:
            </p>
            <ul className="list-disc pl-5 mb-3 space-y-1 text-[0.95rem]">
              <li><em className="text-app-gray">Locally in your browser</em>, or</li>
              <li><em className="text-app-gray">In your own Google Sheet</em>, which you control</li>
            </ul>
            <Info>
              See the <a href="#what-are-these-modes" className="text-app-teal underline underline-offset-2 hover:text-app-green transition-colors">What are these modes</a> FAQ for more information.
            </Info>
            <p className="mb-1">Cadence has and will never:</p>
            <ul className="list-disc pl-5 mb-3 space-y-1 text-[0.95rem]">
              <li>Store your health data anywhere other than your authorized and linked Google Sheet</li>
              <li>Keep copies of your entries</li>
              <li>Sync your entries outside of your browser or your linked Google Sheet</li>
              <li>Back up your entries elsewhere</li>
            </ul>

            <Q id="is-cadence-hipaa-compliant">Is Cadence HIPAA Compliant?</Q>
            <p className="mb-3">
              Cadence is <strong className="font-semibold text-app-charcoal">not</strong> a
              HIPAA-covered service. HIPAA applies to healthcare providers, health
              plans, and their contracted service providers. Cadence does not act as a
              healthcare provider, does not store your health data on its servers, and
              does not receive or manage protected health information on your behalf.
            </p>
            <p className="mb-3">Your data is stored either:</p>
            <ul className="list-disc pl-5 mb-3 space-y-1 text-[0.95rem]">
              <li>Locally in your own browser, or</li>
              <li>In your personal Google Sheet, which you control</li>
            </ul>
            <p className="mb-3">
              Because Cadence does not collect, transmit, or retain your health data,
              HIPAA compliance does not apply in the traditional sense. That said,
              Cadence is intentionally designed to follow HIPAA-aligned principles,
              including:
            </p>
            <ul className="list-disc pl-5 mb-3 space-y-1 text-[0.95rem]">
              <li>Data minimization</li>
              <li>User-controlled storage</li>
              <li>No secondary use of data</li>
              <li>No advertising or tracking</li>
            </ul>
            <Info>
              If you are required to use a HIPAA-compliant system for diagnosing,
              medical, or clinical purposes, Cadence may not be an appropriate tool
              for you.
            </Info>

            <Q id="what-about-privacy">What about privacy?</Q>
            <p className="mb-3">
              Please see{" "}
              <a
                href="https://thecrimsonelephant.github.io/cadence-privacy/privacy.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-app-teal underline underline-offset-2 hover:text-app-green transition-colors"
              >
                our privacy policy
              </a>{" "}
              to learn more about Cadence&apos;s privacy policy and data usage.
            </p>

            <Q id="does-cadence-have-access-to-my-google-sheet">
              Does Cadence have access to my Google Sheet?
            </Q>
            <p className="mb-3">
              <strong className="font-semibold text-app-charcoal">Yes,</strong> but
              within context. Cadence only accesses your Google Sheet when you
              explicitly click &quot;Sync with Google Sheets&quot; or perform a restore.
            </p>
            <p className="mb-1">When connected:</p>
            <ul className="list-disc pl-5 mb-3 space-y-1 text-[0.95rem]">
              <li>Access happens directly from your browser; authorization is requested each time.</li>
              <li>Data is written <strong className="font-semibold">only</strong> when you click a &quot;Sync with Google Sheets&quot; button.</li>
              <li>You can revoke access at any time from your Google account.</li>
            </ul>
            <Warning>
              <strong className="font-semibold text-app-charcoal">Note:</strong> Removing
              your sheet from Cadence disables syncing, but does not revoke
              authorization in your Google account. If you&apos;d like to completely
              revoke Cadence&apos;s access to your sheet, you can do so from your Google
              Account at{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-app-teal underline underline-offset-2 hover:text-app-green transition-colors"
              >
                myaccount.google.com/permissions
              </a>.
            </Warning>

            <Q id="can-i-lose-my-data">Can I lose my data?</Q>
            <p className="mb-3">
              <strong className="font-semibold text-app-charcoal">Yes.</strong> If
              you choose local-only storage &quot;Anonymous Mode&quot;:
            </p>
            <ul className="list-disc pl-5 mb-3 space-y-1 text-[0.95rem]">
              <li>Clearing your browser data <strong className="font-semibold">will</strong> remove your entries</li>
              <li>If your browser crashes, entries <em className="text-app-gray">may be</em> lost</li>
              <li>Using a different device <strong className="font-semibold">will not</strong> carry data over</li>
            </ul>
            <Info>
              We recommend connecting a Google Sheet if you&apos;d like an easier time
              switching devices or seeing all your data. See the{" "}
              <a href="#how-do-i-connect-a-google-sheet" className="text-app-teal underline underline-offset-2 hover:text-app-green transition-colors">
                How do I connect a Google Sheet
              </a>{" "}
              FAQ.
            </Info>

            <Q id="do-i-need-an-account">Do I need to use an account to use Cadence?</Q>
            <p className="mb-3">
              <strong className="font-semibold text-app-charcoal">No.</strong> You can
              use Cadence without signing in with an account. This is known as
              &quot;Anonymous Mode&quot; in the app. In Anonymous Mode, data is stored only on
              your current device.
            </p>
            <p className="mb-3">
              If you choose to sign in and connect a Google Sheet, you can access your
              data across devices, but you&apos;ll need to reconnect your sheet on each new
              device. If you saved your settings, those will also be retained via the
              Google Sheet and can be restored on your new device.
            </p>
            <Warning>
              <strong className="font-semibold text-app-charcoal">Please Note:</strong> If
              you clear your browser history, switch to a different device or browser,
              or if your preferred browser crashes, <strong className="font-semibold">your
              data may not be retained</strong>. It&apos;s always recommended to download a
              CSV of your data prior to clearing your browser history, switching
              devices, or updating your browser. See the{" "}
              <a href="#can-i-lose-my-data" className="text-app-teal underline underline-offset-2 hover:text-app-green transition-colors">Can I lose my data</a>{" "}
              and{" "}
              <a href="#download-csv" className="text-app-teal underline underline-offset-2 hover:text-app-green transition-colors">Download CSV</a>{" "}
              FAQs for more information.
            </Warning>

            <Q id="what-data-does-cadence-collect">What data does Cadence collect?</Q>
            <p className="mb-3">
              The hosting provider may temporarily process standard web request
              information (such as IP address and browser type) for basic site delivery
              and security. Cadence collects no health data, no tracking data, and no
              behavioral analytics.
            </p>

            <Q id="why-is-cadence-built-this-way">Why is Cadence built this way?</Q>
            <GreenCallout>
              Cadence is designed around a simple idea: <strong className="font-semibold text-app-charcoal">Your data belongs to you.</strong>{" "}
              <em className="text-app-gray">Always.</em>
            </GreenCallout>
          </Section>

          {/* ============================================================
             APP FAQ
             ============================================================ */}
          <Section id="app-faq" title="App FAQ">
            <Q id="what-are-these-modes">What are these modes?</Q>
            <p className="mb-3">Cadence operates in two distinct ways:</p>
            <ol className="list-decimal pl-5 mb-3 space-y-2 text-[0.95rem]">
              <li>
                <strong className="font-semibold text-app-charcoal">Signed In &amp; Synced Mode</strong> —
                This is the mode name if you have a Google Sheet linked to Cadence.
                Each time you click one of the &quot;Sync with Google Sheets&quot; buttons
                around the application, Cadence will push all of your current entries,
                settings, and saved filters into your Google Sheet for safe storage,
                and also pull any data from the sheet to make sure everything is up to
                date. You can forego syncing for 48 hours until you&apos;re prompted by the
                UI to sync.{" "}
                <em className="text-app-gray">
                  This is the recommended way of using Cadence as this secures your
                  data and ensures your data is safely synced outside of your browser
                  regardless of whether you clear your history or switch to a new
                  device.
                </em>
              </li>
              <li>
                <strong className="font-semibold text-app-charcoal">Anonymous Mode</strong> —
                This is the mode name if you&apos;d rather not link a Google Sheet. All of
                your data will be stored in your current device&apos;s browser. There are
                some tradeoffs to be made aware of when using this mode. Please visit{" "}
                <a href="#can-i-lose-my-data" className="text-app-teal underline underline-offset-2 hover:text-app-green transition-colors">
                  Can I lose my data
                </a>{" "}
                FAQ for more information.
              </li>
            </ol>

            <Q id="where-do-i-start">Where do I start?</Q>
            <p className="mb-3">
              When you first visit Cadence, you will be navigated to the landing page.
              Click &quot;Get Started&quot; when you&apos;ve read through what you can do with
              Cadence. You&apos;ll be given 2 options:
            </p>
            <ul className="list-disc pl-5 mb-3 space-y-2 text-[0.95rem]">
              <li>
                <strong className="font-semibold text-app-charcoal">Signed In &amp; Synced Mode</strong> —
                If you want to start off with a Google Sheet so that you don&apos;t have to
                set it up later, click this option. This means that all of your
                entries, settings, and filters will be backed up to that Google Sheet.
              </li>
              <li>
                <strong className="font-semibold text-app-charcoal">Anonymous Mode</strong> —
                If you want to start off without adding a Google Sheet, click this
                option. This means that all of your entries, settings, and filters will
                be kept on the current device you&apos;re on.
              </li>
            </ul>
            <Info>
              Make sure that you are the editor of the Google Sheet you&apos;d like linked.
              That is the account you&apos;ll select in popups to authorize Cadence to read
              to and write from the Google Sheet to save your entries and settings.
            </Info>
            <Info>
              If you are returning to Cadence with a Google Sheet that already has
              entries, see the{" "}
              <a href="#how-do-i-restore-my-stuff" className="text-app-teal underline underline-offset-2 hover:text-app-green transition-colors">
                How do I restore my stuff
              </a>{" "}
              FAQ.
            </Info>
            <Warning>
              <strong className="font-semibold text-app-charcoal">Please Note:</strong> It&apos;s
              recommended to connect a Google Sheet in the case that your browser
              crashes, or if you clear your browsing history often. Not doing so can
              cause data loss. See the{" "}
              <a href="#can-i-lose-my-data" className="text-app-teal underline underline-offset-2 hover:text-app-green transition-colors">
                Can I lose my data
              </a>{" "}
              FAQ for more information.
            </Warning>
            <p className="mb-3">
              After selecting one of the modes, click the &quot;Continue to Settings&quot;
              button to continue.
            </p>

            <Q id="how-do-i-connect-a-google-sheet">How do I connect a Google Sheet?</Q>
            <ol className="list-decimal pl-5 mb-3 space-y-2 text-[0.95rem]">
              <li>Navigate to the Dashboard by clicking the gear icon on the top right of the page.</li>
              <li>
                Locate the &quot;Google Sheets Integration&quot; section. Here, you&apos;ll have a
                space to copy and paste your preferred blank Google Sheet.
              </li>
              <li>Click the &quot;Connect a Google Sheet&quot; button, then &quot;Continue&quot; on the popup.</li>
              <li>
                Scroll to the bottom of the Settings page and click the &quot;Sync with
                Google Sheets&quot; button to complete the first sync.
              </li>
            </ol>
            <Info>
              If you&apos;ve made a mistake after connecting the Google Sheet, click either
              the &quot;Edit&quot; button to edit the URL. If you want to disconnect and try
              again, click the &quot;Disconnect&quot; button.
            </Info>

            <Q id="how-do-i-restore-my-stuff">How do I restore my stuff?</Q>
            <p className="mb-3">
              If you have a Google Sheet with entries and are returning to Cadence or
              switching from one device to another — welcome back! Here are steps to
              restore your data:
            </p>
            <ol className="list-decimal pl-5 mb-3 space-y-2 text-[0.95rem]">
              <li>On the Welcome page, click &quot;Get Started&quot;.</li>
              <li>
                A popup will show and within the first option &quot;Signed In &amp; Synced
                Mode&quot;, you should see the &quot;Already set up?&quot; highlighted section. Click
                &quot;restore your settings and entries here&quot; hyperlink.
              </li>
              <li>
                Add your Google Sheet URL to the textbox and then click &quot;Sign In with
                Google &amp; Restore&quot;.
              </li>
            </ol>
            <Info>
              You will be prompted to authorize with your account. Please select the
              same account that your Google Sheet was created with.
            </Info>
            <p className="mb-3">
              Cadence will automatically begin restoring your entries, settings,
              filters, and even the name of your Google Sheet. When restoration is
              complete, you&apos;ll be routed to the dashboard and ready to make new
              entries.
            </p>

            <Q id="download-csv">I want to download my data as a CSV file</Q>
            <p className="mb-3">If you have entries and would like to download your data:</p>
            <ol className="list-decimal pl-5 mb-3 space-y-2 text-[0.95rem]">
              <li>
                Click the three horizontal line menu on the top left of the
                application. History is the last button under the &quot;Views&quot; section.
              </li>
              <li>
                Locate the blue &quot;Export CSV&quot; button on the upper right of the page,
                which will download all of your data. This will automatically start
                the CSV download to your current device which you can store anywhere.
              </li>
            </ol>
            <Info>
              If you&apos;re not seeing all of your data, please make sure that the
              &quot;Show&quot; filter is set to &quot;All Time&quot;.
            </Info>
            <Info>
              If the &quot;Export CSV&quot; button is unclickable, it means you have yet to
              make any entries, or the time frame you&apos;ve chosen has no data. Try
              expanding your date filters or begin by adding an entry.
            </Info>

            <Q id="download-pdf">I want to download my data as a PDF</Q>
            <p className="mb-3">If you have entries and would like to download your data as a PDF:</p>
            <ol className="list-decimal pl-5 mb-3 space-y-2 text-[0.95rem]">
              <li>
                Click the three horizontal line menu on the top left of the
                application. PDF Export is the first button under the &quot;Reports&quot;
                section.
              </li>
              <li>
                Select what report period you&apos;d like to see in your PDF (click &quot;All
                Time&quot; for all data), and which categories you&apos;d like to export to PDF.
              </li>
              <li>
                Scroll down and then click &quot;Generate PDF&quot;. This will automatically
                start a download from the app to your device with the current date.
              </li>
            </ol>
            <Info>
              If the &quot;Generate PDF&quot; button is unclickable, it means you have yet to
              make any entries.
            </Info>
            <Info>
              If you have generated a PDF but don&apos;t see any data, it may mean that
              the time frame or categories you have selected have no data.
            </Info>
          </Section>

          {/* ============================================================
             TROUBLESHOOTING
             ============================================================ */}
          <Section id="troubleshooting" title="Troubleshooting">
            <Q id="my-google-sheet-isnt-syncing">My Google Sheet isn&apos;t syncing</Q>
            <p className="mb-3">
              If you&apos;re not seeing recent entries show up in your Google Sheet, it
              may be an error in how Cadence is trying to write the information. Try
              the following:
            </p>
            <ol className="list-decimal pl-5 mb-3 space-y-2 text-[0.95rem]">
              <li>Refresh the page and click any &quot;Sync with Google Sheets&quot; button around the app.</li>
              <li>
                Relink the sheet: Navigate to Cadence Settings by clicking the gear
                icon on the top right of the page. Find the &quot;Google Sheets
                Integration&quot; section at the top of the page. Double check that
                Cadence still has your preferred Google Sheet linked. If not, please
                link it, then scroll to the bottom of the page and click the &quot;Sync
                with Google Sheets&quot; button.
              </li>
            </ol>
            <Info>
              If it&apos;s still not working, please{" "}
              <a href="#contact-us" className="text-app-teal underline underline-offset-2 hover:text-app-green transition-colors">
                contact us
              </a>{" "}
              with a screenshot of any errors and details on what happened and
              we&apos;ll do our best to fix it.
            </Info>

            <Q id="sync-buttons-error">I&apos;m clicking the Sync buttons but I&apos;m getting an error</Q>
            <p className="mb-3">
              If you&apos;re clicking the sync buttons but it&apos;s giving you an error, you
              may be attempting to log in with the incorrect Google Account. Please
              make sure that the Google Account you have your Google Sheet set up with
              is the same one you&apos;re using to sign in.
            </p>
            <Info>
              If it&apos;s still not working, please{" "}
              <a href="#contact-us" className="text-app-teal underline underline-offset-2 hover:text-app-green transition-colors">
                contact us
              </a>{" "}
              with a screenshot of the error and details on what happened and
              we&apos;ll do our best to fix it.
            </Info>

            <Q id="reset-settings">I want to reset all of my settings but save my entries</Q>
            <p className="mb-3">
              If you&apos;d like to reset all of your settings, it&apos;s as easy as scrolling
              to the bottom of the Settings page and clicking &quot;Advanced Options&quot;.
            </p>
            <ul className="list-disc pl-5 mb-3 space-y-2 text-[0.95rem]">
              <li>
                <strong className="font-semibold text-app-charcoal">Anonymous Mode</strong> —
                Clicking &quot;Reset App Settings Only&quot; will clear all of your settings,
                saved filters, and app preferences. Your entries will remain safe in
                your browser storage.
              </li>
              <li>
                <strong className="font-semibold text-app-charcoal">Signed in &amp; Synced Mode</strong> —
                Clicking &quot;Reset App Settings Only&quot; deletes the saved settings and
                filters from your Google Sheet. Your current Google Sheet and all data
                will be retained.
              </li>
            </ul>
            <Info>
              If you&apos;d like to leave Cadence entirely, see the{" "}
              <a href="#i-want-to-leave-cadence" className="text-app-teal underline underline-offset-2 hover:text-app-green transition-colors">
                I want to leave Cadence
              </a>{" "}
              FAQ.
            </Info>

            <Q id="i-want-to-leave-cadence">I want to leave Cadence</Q>
            <p className="mb-3">
              While we&apos;re sad to see you leave, we believe all visitors have this
              right and have tried to make it as easy as possible to leave the app.
              Simply navigate to the Cadence Settings page and click &quot;Advanced
              Options&quot; at the very bottom.
            </p>
            <ul className="list-disc pl-5 mb-3 space-y-2 text-[0.95rem]">
              <li>
                <strong className="font-semibold text-app-charcoal">Signed in &amp; Synced Mode</strong> —
                To permanently leave Cadence with a Google Sheet linked, click{" "}
                <strong className="font-semibold">Delete Device and Sheet Metadata</strong>.
                This removes all Cadence metadata from your Google Sheet and disables
                syncing for new entries. Your previously synced entries remain in the
                sheet. You&apos;ll be asked to authorize deletion once more; be sure to
                click through both popups before navigating away.
              </li>
              <li>
                <strong className="font-semibold text-app-charcoal">Anonymous Mode</strong> —
                To permanently leave Cadence without a linked Google Sheet, click{" "}
                <strong className="font-semibold">Delete All Data</strong>. This removes all
                locally saved data (entries, settings, filters) permanently. To save
                your data first, download it as a CSV or PDF.
              </li>
            </ul>
            <Warning>
              <strong className="font-semibold text-app-charcoal">Please Note:</strong> If
              you don&apos;t have a Google Sheet linked, all of your data will be removed
              from the application and your device{" "}
              <strong className="font-semibold">permanently</strong>. If you&apos;d like to download
              and save your entries, see the{" "}
              <a href="#download-csv" className="text-app-teal underline underline-offset-2 hover:text-app-green transition-colors">
                Download CSV
              </a>{" "}
              or{" "}
              <a href="#download-pdf" className="text-app-teal underline underline-offset-2 hover:text-app-green transition-colors">
                Download PDF
              </a>{" "}
              FAQs.
            </Warning>
          </Section>

          {/* ============================================================
             CONTACT
             ============================================================ */}
          <Section id="contact-us" title="Contact Us">
            <Q>Have more questions, or not finding what you&apos;re looking for?</Q>
            <p className="mb-3">
              Contact us from{" "}
              <a
                href="/contact"
                className="text-app-teal underline underline-offset-2 hover:text-app-green transition-colors"
              >
                within the app here
              </a>
              !
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
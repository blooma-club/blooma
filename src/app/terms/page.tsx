export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <section className="space-y-6">
        <header>
          <h1 className="text-3xl font-semibold">Terms &amp; Conditions</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: 10/17/2025</p>
        </header>

        <article className="space-y-12">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
            <p>
              These Terms and Conditions (the “Terms”) govern your access to and use of Blooma’s
              services, including our websites, mobile applications, APIs, and related features
              (collectively, the “Service”). By accessing or using the Service, you agree to be
              bound by these Terms and our policies. If you do not agree, do not use the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">2. Description of Service</h2>
            <p>
              Blooma is a generative AI platform that enables creative storyboard production from
              images or videos. The Service provides tools such as camera angle transformation,
              location changes, and scene composition to support imaginative visual creation. We may
              modify, add, or remove features from time to time to improve functionality and
              reliability.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">3. Accounts and Eligibility</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                You must provide accurate and up-to-date information when creating an account.
              </li>
              <li>
                You are responsible for safeguarding your credentials and all activity under your
                account.
              </li>
              <li>
                Notify us immediately of any unauthorized access or suspected security breach.
              </li>
              <li>
                You must meet the minimum age and any other requirements under applicable law to use
                the Service.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">4. Content Rights</h2>
            <p className="font-semibold">User-Provided Content (&quot;Uploads&quot;):</p>
            <p>
              You retain ownership of images, videos, text, prompts, and any other materials you
              upload. You grant Blooma a non-exclusive, worldwide, royalty-free license to process,
              store, back up, display, transmit, and technically reproduce or transform your Uploads
              solely as necessary to operate and improve the Service. You represent and warrant that
              you have all rights and permissions to grant this license.
            </p>
            <p className="font-semibold">Outputs / Generated Content:</p>
            <p>
              Subject to applicable law and third-party rights, you own the images, videos, and
              storyboards generated from your valid inputs. However, we do not guarantee uniqueness
              or exclusivity. Similar inputs may lead to similar outputs for other users.
            </p>
            <p className="font-semibold">Third-Party Rights:</p>
            <p>
              You are responsible for ensuring that your Uploads and Outputs do not infringe or
              violate any third-party rights, including copyrights, trademarks, rights of publicity,
              privacy rights, trade secrets, or other rights. Upon receiving a credible complaint,
              we may take appropriate actions such as restricting visibility, disabling access,
              removing content, or limiting accounts.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                Upload or generate illegal, harmful, hateful, violent, terrorist, or
                self-harm–promoting content
              </li>
              <li>
                Upload or generate content that includes minors or non-consenting individuals,
                including sexual or exploitative material
              </li>
              <li>
                Infringe third-party rights, including copyrights, trademarks, and rights of
                publicity
              </li>
              <li>
                Create or distribute deceptive content, including deepfakes intended to mislead
              </li>
              <li>
                Collect, process, or generate content that enables identification or tracking of
                sensitive personal or biometric data without lawful basis and consent
              </li>
              <li>
                Reverse engineer, scrape, circumvent security, or interfere with system integrity or
                performance
              </li>
              <li>
                Use the Service or models for unauthorized commercial purposes, reselling, renting,
                or hosting without permission
              </li>
              <li>
                Violate applicable laws, regulations, industry guidelines, or these Terms and
                related policies (e.g., Content Policy, Safety Guidelines, Brand Guidelines)
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">6. Moderation and Enforcement</h2>
            <p>
              We use automated safety systems and may conduct manual review to detect and act on
              policy violations. We may issue warnings, limit visibility, block generation, remove
              content, suspend or terminate accounts, and cooperate with lawful requests from
              authorities as permitted by law.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">7. Data Processing and Privacy</h2>
            <p>
              For details on how we collect, use, store, share, and transfer personal data, please
              refer to our Privacy Policy. We may collect technical logs, usage metadata, and error
              reports to operate and secure the Service. We implement reasonable and appropriate
              security measures to protect data.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">8. Model Improvement and Usage Data</h2>
            <p>
              To improve quality, monitor performance, and advance safety research, we may analyze
              Uploads and usage metadata in anonymized or pseudonymized form. Where required by law
              or where additional consent is needed, we will follow applicable procedures. Where
              settings are available, you may control participation in model training.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">9. Third-Party Services and Materials</h2>
            <p>
              The Service may include or interoperate with third-party models, open-source software,
              stock assets, hosting, payments, or storage services. Their terms and privacy policies
              may apply separately. Blooma is not responsible for third-party services outside our
              reasonable control.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">10. Service Availability and Changes</h2>
            <p>
              We strive for reliability but the Service may be interrupted or delayed. We may
              modify, suspend, or discontinue features without prior notice and may impose access
              limits for maintenance, capacity, or security reasons. You are ultimately responsible
              for backing up important materials.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">11. Fees, Billing, and Refunds</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>Some features are paid. Plans and pricing may change with notice.</li>
              <li>Taxes such as VAT or local taxes may apply.</li>
              <li>Subscriptions may auto-renew unless you cancel.</li>
              <li>
                Refunds follow applicable law and our posted refund policy. We may restrict use in
                cases of suspected fraud or abuse.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">12. Intellectual Property</h2>
            <p>
              The Service and its components (software, models, UI, trademarks, logos, text, images,
              etc.) are owned by Blooma or its licensors. Except as expressly permitted, you may not
              copy, modify, create derivative works, distribute, rent, reverse compile, reverse
              engineer, or attempt to extract source code.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">13. Disclaimer of Warranties</h2>
            <p>
              The Service is provided “as is” and “as available.” We disclaim all warranties,
              express or implied, including merchantability, fitness for a particular purpose,
              non-infringement, and uninterrupted or error-free operation. You are responsible for
              evaluating the originality, non-infringement, and suitability of Outputs for your
              intended uses.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">14. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Blooma will not be liable for indirect,
              incidental, special, consequential, or exemplary damages, including lost profits, data
              loss, reputational harm, business interruption, or system failures. Our aggregate
              liability for any claims shall not exceed the amounts you paid to us in the 12 months
              preceding the event giving rise to the claim. Mandatory consumer protection laws may
              apply and prevail where required.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">15. Indemnification</h2>
            <p>
              You agree to defend, indemnify, and hold harmless Blooma and its officers, employees,
              affiliates, and partners from and against any claims, losses, liabilities, damages,
              costs, and expenses (including reasonable attorneys’ fees) arising out of or related
              to your violation of these Terms, applicable law, or third-party rights.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">16. Suspension and Termination</h2>
            <p>
              We may suspend or terminate accounts without prior notice where we have reasonable
              grounds, including violations of these Terms or law, security risks, or prolonged
              inactivity. You may delete your account at any time through settings or customer
              support. Following termination, we may delete data except where retention is required
              by law or for legitimate business purposes.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">17. Policies, Guidelines, and Procedures</h2>
            <p>
              Our Content Policy, Safety Guidelines, IP complaint procedures (e.g., DMCA), Refund
              Policy, and Privacy Policy form part of these Terms and may be updated from time to
              time.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">18. Governing Law and Dispute Resolution</h2>
            <p>
              These Terms are governed by the laws of the Republic of Korea. The parties will first
              attempt to resolve disputes amicably. Failing that, the Seoul Central District Court
              shall have exclusive jurisdiction as the court of first instance, to the extent
              permitted under applicable law. Mandatory consumer protection rules will prevail where
              applicable.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">19. Changes to Terms</h2>
            <p>
              We may update these Terms. For material changes, we will provide reasonable notice.
              Your continued use of the Service after changes take effect constitutes acceptance of
              the updated Terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">20. Contact</h2>
            <p>For questions about these Terms or the Service, contact us at:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                Email:{' '}
                <a className="text-primary underline" href="mailto:contact@blooma.club">
                  contact@blooma.club
                </a>
              </li>
            </ul>
          </section>
        </article>
      </section>
    </main>
  )
}

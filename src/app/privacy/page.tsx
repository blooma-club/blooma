export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <section className="space-y-6">
        <header>
          <h1 className="text-3xl font-semibold">Privacy Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Effective Date: October 17, 2025</p>
        </header>

        <article className="space-y-12">
          <section className="space-y-4">
            <p>
              Blooma (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting
              your privacy. This Privacy Policy explains how we collect, use, disclose, and
              safeguard your information when you use our AI-powered creative platform.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">1. Information We Collect</h2>
            <h3 className="text-lg font-semibold">1.1 Information You Provide</h3>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Account Information:</strong> When you create an account, we collect your
                name, email address, and password.
              </li>
              <li>
                <strong>Payment Information:</strong> When you subscribe to our services, we collect
                billing information processed securely through third-party payment processors.
              </li>
              <li>
                <strong>Content:</strong> We collect the prompts, images, videos, and other content
                you create, upload, or generate using our services.
              </li>
              <li>
                <strong>Communications:</strong> When you contact us, we collect the information you
                provide in your messages.
              </li>
            </ul>

            <h3 className="text-lg font-semibold">1.2 Information We Collect Automatically</h3>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Usage Data:</strong> We collect information about how you interact with our
                services, including features used, time spent, and actions taken.
              </li>
              <li>
                <strong>Device Information:</strong> We collect information about the device you use
                to access our services, including IP address, browser type, operating system, and
                device identifiers.
              </li>
              <li>
                <strong>Cookies and Similar Technologies:</strong> We use cookies and similar
                tracking technologies to collect information about your browsing activities.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Provide, maintain, and improve our services</li>
              <li>Process your transactions and manage your account</li>
              <li>Train and improve our AI models and algorithms</li>
              <li>Send you service-related communications and updates</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Detect, prevent, and address technical issues and security threats</li>
              <li>Comply with legal obligations and enforce our Terms & Conditions</li>
              <li>Analyze usage patterns and conduct research to enhance user experience</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">3. AI Model Training</h2>
            <p>
              <strong>Important:</strong> We may use your generated content and prompts to train and
              improve our AI models unless you opt out. You can control this setting in your account
              preferences. Content marked as private will not be used for model training.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">4. Information Sharing and Disclosure</h2>
            <p>
              We do not sell your personal information. We may share your information in the
              following circumstances:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Service Providers:</strong> We share information with third-party service
                providers who perform services on our behalf, such as payment processing, data
                analysis, and customer support. The third-party services we use include:
                <ul className="list-disc space-y-2 pl-6">
                  <li>
                    <strong>Clerk:</strong> Authentication and user account management
                  </li>
                  <li>
                    <strong>Cloudflare:</strong> Content delivery network (CDN), security, and DDoS
                    protection
                  </li>
                  <li>
                    <strong>Cloudflare R2:</strong> Cloud object storage for user-generated content
                    and assets
                  </li>
                  <li>
                    <strong>fal.ai:</strong> AI model inference and generation services
                  </li>
                </ul>
              </li>
              <li>
                <strong>Legal Requirements:</strong> We may disclose information if required by law,
                legal process, or governmental request.
              </li>
              <li>
                <strong>Business Transfers:</strong> In connection with a merger, acquisition, or
                sale of assets, your information may be transferred to the acquiring entity.
              </li>
              <li>
                <strong>With Your Consent:</strong> We may share information with third parties when
                you provide explicit consent.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your
              information against unauthorized access, alteration, disclosure, or destruction. These
              measures include:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments and audits</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Secure data storage infrastructure</li>
            </ul>
            <p>
              However, no method of transmission over the internet or electronic storage is 100%
              secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">6. Data Retention</h2>
            <p>
              We retain your information for as long as necessary to provide our services and
              fulfill the purposes outlined in this Privacy Policy. When you delete your account, we
              will delete or anonymize your personal information within 90 days, except where we are
              required to retain it for legal or regulatory purposes.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">7. Your Rights and Choices</h2>
            <p>Depending on your location, you may have the following rights:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Access:</strong> Request access to the personal information we hold about
                you
              </li>
              <li>
                <strong>Correction:</strong> Request correction of inaccurate or incomplete
                information
              </li>
              <li>
                <strong>Deletion:</strong> Request deletion of your personal information
              </li>
              <li>
                <strong>Portability:</strong> Request a copy of your information in a structured,
                machine-readable format
              </li>
              <li>
                <strong>Opt-Out:</strong> Opt out of certain data processing activities, including
                AI model training
              </li>
              <li>
                <strong>Withdraw Consent:</strong> Withdraw your consent at any time where we rely
                on consent to process your information
              </li>
            </ul>
            <p>
              To exercise these rights, please contact us at{' '}
              <a className="text-primary underline" href="mailto:contact@blooma.club">
                contact@blooma.club
              </a>
              .
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">8. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your
              country of residence. We ensure appropriate safeguards are in place to protect your
              information in accordance with this Privacy Policy and applicable data protection
              laws.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">9. Children&apos;s Privacy</h2>
            <p>
              Our services are not intended for individuals under the age of 13. We do not knowingly
              collect personal information from children. If we become aware that we have collected
              information from a child, we will take steps to delete such information promptly.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">10. Cookies and Tracking Technologies</h2>
            <p>We use cookies and similar technologies to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Remember your preferences and settings</li>
              <li>Authenticate your account and maintain security</li>
              <li>Analyze site traffic and usage patterns</li>
              <li>Personalize your experience</li>
            </ul>
            <p>
              You can control cookies through your browser settings. However, disabling cookies may
              affect your ability to use certain features of our services.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">11. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any
              material changes by posting the new Privacy Policy on our website and updating the
              &quot;Effective Date&quot; at the top. Your continued use of our services after such changes
              constitutes your acceptance of the updated Privacy Policy.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">12. Contact Us</h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or our
              privacy practices, please contact us at:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Email:</strong>{' '}
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

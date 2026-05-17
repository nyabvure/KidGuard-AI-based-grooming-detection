import { Shield } from "lucide-react";
import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">KidGuard</h1>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Terms and Conditions</h2>
        <p className="text-sm text-gray-500 mb-8">Last updated: March 26, 2026</p>

        <div className="space-y-8 text-gray-700">
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">1. Program Description</h3>
            <p>
              KidGuard is a child online safety monitoring service. It uses a Chrome browser
              extension to detect potential grooming patterns in chat conversations on Roblox
              and notifies parents via SMS and a web dashboard when risk is detected.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">2. Acceptance of Terms</h3>
            <p>
              By creating a KidGuard account, you agree to these Terms and Conditions and our
              Privacy Policy. If you do not agree, do not use the service.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">3. SMS Messaging</h3>
            <p>
              By registering with your phone number, you consent to receive SMS safety alert
              notifications from KidGuard. Message frequency varies based on detected activity.
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>Message and data rates may apply</li>
              <li>
                To opt out, reply <strong>STOP</strong> to any message or disable alerts in
                your dashboard settings
              </li>
              <li>
                To get help, reply <strong>HELP</strong> or contact{" "}
                <a href="mailto:support@kidguard.app" className="text-blue-600 hover:underline">
                  support@kidguard.app
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">4. Permitted Use</h3>
            <p>KidGuard is intended solely for:</p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>Parents or legal guardians monitoring their minor children's online activity</li>
              <li>Use on devices and accounts that the parent owns or has legal authority over</li>
            </ul>
            <p className="mt-3">
              You may not use KidGuard to monitor individuals without their legal guardian's
              consent or in any manner that violates applicable laws.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">5. Accuracy Disclaimer</h3>
            <p>
              KidGuard uses automated pattern detection which may produce false positives or
              miss certain risks. It is a supplementary tool and does not replace parental
              supervision. We make no guarantee that all harmful content will be detected.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">6. Account Responsibility</h3>
            <p>
              You are responsible for maintaining the confidentiality of your account
              credentials and for all activity that occurs under your account.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">7. Limitation of Liability</h3>
            <p>
              KidGuard is provided "as is". We are not liable for any damages arising from the
              use or inability to use the service, including but not limited to missed alerts
              or false detections.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">8. Changes to Terms</h3>
            <p>
              We reserve the right to update these terms at any time. Continued use of the
              service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">9. Contact</h3>
            <p>
              For support or questions:{" "}
              <a href="mailto:support@kidguard.app" className="text-blue-600 hover:underline">
                support@kidguard.app
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

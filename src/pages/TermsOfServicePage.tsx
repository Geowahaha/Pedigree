import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Terms of Service Page
 * Required for Facebook App approval
 */
const TermsOfServicePage: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0]">
            {/* Header */}
            <header className="border-b border-[#C5A059]/20 py-6 px-4 md:px-8">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <Link to="/" className="text-2xl font-bold text-[#C5A059]">Eibpo</Link>
                    <Link to="/" className="text-sm text-[#B8B8B8] hover:text-[#C5A059] transition-colors">
                        ← Back to Home
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 md:px-8 py-12">
                <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
                <p className="text-[#B8B8B8] mb-8">Last updated: January 18, 2026</p>

                <div className="prose prose-invert prose-lg max-w-none space-y-8">
                    <section>
                        <h2 className="text-2xl font-bold text-[#C5A059] mb-4">1. Acceptance of Terms</h2>
                        <p className="text-[#B8B8B8] leading-relaxed">
                            By accessing or using Eibpo ("the Platform"), you agree to be bound by these
                            Terms of Service. If you do not agree to these terms, please do not use our services.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-[#C5A059] mb-4">2. Description of Service</h2>
                        <p className="text-[#B8B8B8] leading-relaxed">
                            Eibpo is a pet pedigree and breeding management platform that allows users to:
                        </p>
                        <ul className="list-disc list-inside text-[#B8B8B8] space-y-2 mt-4">
                            <li>Register and manage pet profiles</li>
                            <li>Track and verify pedigree information</li>
                            <li>Connect with other breeders</li>
                            <li>Access AI-powered breeding recommendations</li>
                            <li>Share pet photos and information</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-[#C5A059] mb-4">3. User Accounts</h2>
                        <div className="space-y-4 text-[#B8B8B8]">
                            <p>You are responsible for maintaining the security of your account credentials.</p>
                            <p>You must provide accurate and complete information when creating an account.</p>
                            <p>You are responsible for all activities that occur under your account.</p>
                            <p>You must be at least 13 years old to use this service.</p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-[#C5A059] mb-4">4. User Content</h2>
                        <p className="text-[#B8B8B8] leading-relaxed">
                            You retain ownership of content you submit to the Platform. By submitting content,
                            you grant us a worldwide, non-exclusive license to use, display, and distribute
                            your content in connection with our services.
                        </p>
                        <p className="text-[#B8B8B8] leading-relaxed mt-4">
                            You agree not to submit content that:
                        </p>
                        <ul className="list-disc list-inside text-[#B8B8B8] space-y-2 mt-4">
                            <li>Violates any laws or regulations</li>
                            <li>Infringes on intellectual property rights</li>
                            <li>Contains false or misleading information</li>
                            <li>Is harmful, threatening, or harassing</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-[#C5A059] mb-4">5. Pedigree Information</h2>
                        <p className="text-[#B8B8B8] leading-relaxed">
                            Users are responsible for the accuracy of pedigree information they submit.
                            While we provide verification tools, we do not guarantee the accuracy of
                            user-submitted pedigree data. Always verify important pedigree information
                            through official breed registries.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-[#C5A059] mb-4">6. Prohibited Activities</h2>
                        <p className="text-[#B8B8B8] leading-relaxed">You agree not to:</p>
                        <ul className="list-disc list-inside text-[#B8B8B8] space-y-2 mt-4">
                            <li>Use the Platform for any illegal purpose</li>
                            <li>Attempt to gain unauthorized access to our systems</li>
                            <li>Interfere with or disrupt the Platform</li>
                            <li>Submit false pedigree information</li>
                            <li>Harass or abuse other users</li>
                            <li>Use automated systems to access the Platform without permission</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-[#C5A059] mb-4">7. Payments and Subscriptions</h2>
                        <p className="text-[#B8B8B8] leading-relaxed">
                            Some features may require payment or subscription. All payments are processed
                            securely through third-party payment processors. Refund policies will be
                            clearly stated at the time of purchase.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-[#C5A059] mb-4">8. Intellectual Property</h2>
                        <p className="text-[#B8B8B8] leading-relaxed">
                            The Platform, including its design, features, and content created by us,
                            is protected by copyright, trademark, and other intellectual property laws.
                            You may not copy, modify, or distribute our intellectual property without permission.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-[#C5A059] mb-4">9. Disclaimers</h2>
                        <p className="text-[#B8B8B8] leading-relaxed">
                            THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT
                            GUARANTEE THAT THE SERVICE WILL BE UNINTERRUPTED OR ERROR-FREE. AI-POWERED
                            FEATURES ARE FOR INFORMATIONAL PURPOSES ONLY AND SHOULD NOT REPLACE
                            PROFESSIONAL VETERINARY OR BREEDING ADVICE.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-[#C5A059] mb-4">10. Limitation of Liability</h2>
                        <p className="text-[#B8B8B8] leading-relaxed">
                            TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY
                            INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM
                            YOUR USE OF THE PLATFORM.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-[#C5A059] mb-4">11. Termination</h2>
                        <p className="text-[#B8B8B8] leading-relaxed">
                            We reserve the right to suspend or terminate your account at any time for
                            violation of these terms. You may also delete your account at any time
                            through your account settings.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-[#C5A059] mb-4">12. Changes to Terms</h2>
                        <p className="text-[#B8B8B8] leading-relaxed">
                            We may modify these Terms at any time. Continued use of the Platform after
                            changes constitutes acceptance of the new terms. We will notify users of
                            significant changes via email or platform notification.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-[#C5A059] mb-4">13. Governing Law</h2>
                        <p className="text-[#B8B8B8] leading-relaxed">
                            These Terms shall be governed by and construed in accordance with the laws
                            of Thailand, without regard to conflict of law principles.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-[#C5A059] mb-4">14. Contact</h2>
                        <p className="text-[#B8B8B8] leading-relaxed">
                            For questions about these Terms, please contact us at:
                        </p>
                        <p className="text-[#C5A059] mt-2">support@eibpo.com</p>
                    </section>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-[#C5A059]/20 py-8 px-4 md:px-8 mt-12">
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-[#B8B8B8]">© 2026 Eibpo. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link to="/privacy" className="text-sm text-[#B8B8B8] hover:text-[#C5A059] transition-colors">Privacy Policy</Link>
                        <Link to="/terms" className="text-sm text-[#C5A059]">Terms of Service</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default TermsOfServicePage;

import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Privacy Policy Page
 * Required for Facebook App approval
 */
const PrivacyPolicyPage: React.FC = () => {
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
                <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
                <p className="text-[#B8B8B8] mb-8">Last updated: January 18, 2026</p>

                <div className="prose prose-invert prose-lg max-w-none space-y-8">
                    <section>
                        <h2 className="text-2xl font-bold text-[#C5A059] mb-4">1. Introduction</h2>
                        <p className="text-[#B8B8B8] leading-relaxed">
                            Welcome to Eibpo ("we," "our," or "us"). We are committed to protecting your privacy
                            and personal information. This Privacy Policy explains how we collect, use, and protect
                            your data when you use our pet pedigree and breeding management platform.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-[#C5A059] mb-4">2. Information We Collect</h2>
                        <div className="space-y-4 text-[#B8B8B8]">
                            <p><strong className="text-[#F5F5F0]">Account Information:</strong> When you create an account, we collect your name, email address, and profile picture (if provided through social login).</p>
                            <p><strong className="text-[#F5F5F0]">Pet Information:</strong> You may provide information about your pets including names, breeds, photos, pedigree details, and health records.</p>
                            <p><strong className="text-[#F5F5F0]">Social Login Data:</strong> If you sign in using Google, Facebook, or LINE, we receive basic profile information from these services.</p>
                            <p><strong className="text-[#F5F5F0]">Usage Data:</strong> We collect information about how you use our platform, including pages visited and features used.</p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-[#C5A059] mb-4">3. How We Use Your Information</h2>
                        <ul className="list-disc list-inside text-[#B8B8B8] space-y-2">
                            <li>To provide and maintain our pet pedigree services</li>
                            <li>To process breeding registrations and pedigree verifications</li>
                            <li>To facilitate communication between breeders</li>
                            <li>To send notifications about your pet registrations and activities</li>
                            <li>To improve our platform and user experience</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-[#C5A059] mb-4">4. Data Sharing</h2>
                        <p className="text-[#B8B8B8] leading-relaxed">
                            We do not sell your personal information. We may share data with:
                        </p>
                        <ul className="list-disc list-inside text-[#B8B8B8] space-y-2 mt-4">
                            <li>Other users (for public pet profiles you choose to share)</li>
                            <li>Service providers who help us operate our platform</li>
                            <li>Legal authorities when required by law</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-[#C5A059] mb-4">5. Data Security</h2>
                        <p className="text-[#B8B8B8] leading-relaxed">
                            We implement industry-standard security measures to protect your data, including
                            encryption, secure servers, and regular security audits. However, no method of
                            transmission over the Internet is 100% secure.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-[#C5A059] mb-4">6. Your Rights</h2>
                        <p className="text-[#B8B8B8] leading-relaxed">You have the right to:</p>
                        <ul className="list-disc list-inside text-[#B8B8B8] space-y-2 mt-4">
                            <li>Access your personal data</li>
                            <li>Correct inaccurate data</li>
                            <li>Delete your account and data</li>
                            <li>Export your data</li>
                            <li>Withdraw consent at any time</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-[#C5A059] mb-4">7. Cookies</h2>
                        <p className="text-[#B8B8B8] leading-relaxed">
                            We use cookies and similar technologies to remember your preferences,
                            authenticate users, and analyze platform usage. You can manage cookie
                            preferences in your browser settings.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-[#C5A059] mb-4">8. Third-Party Services</h2>
                        <p className="text-[#B8B8B8] leading-relaxed">
                            Our platform integrates with third-party services including:
                        </p>
                        <ul className="list-disc list-inside text-[#B8B8B8] space-y-2 mt-4">
                            <li>Google (authentication)</li>
                            <li>Facebook (authentication)</li>
                            <li>LINE (authentication)</li>
                            <li>Supabase (database and authentication infrastructure)</li>
                        </ul>
                        <p className="text-[#B8B8B8] mt-4">
                            Each of these services has their own privacy policies that govern their use of your data.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-[#C5A059] mb-4">9. Children's Privacy</h2>
                        <p className="text-[#B8B8B8] leading-relaxed">
                            Our services are not intended for children under 13. We do not knowingly
                            collect personal information from children under 13.
                        </p>
                    </section>

                    <section className="bg-[#1A1A1A] border border-[#C5A059]/30 rounded-xl p-6">
                        <h2 className="text-2xl font-bold text-[#C5A059] mb-4">🐾 10. Pet Database & Ownership Notice</h2>
                        <div className="space-y-4 text-[#B8B8B8]">
                            <p className="leading-relaxed">
                                <strong className="text-[#F5F5F0]">Our Good Intentions:</strong> Eibpo is a community-driven platform
                                dedicated to building the most comprehensive and accurate pet pedigree database for breeders and
                                pet enthusiasts. We collect and curate pet information, including photos and pedigree details,
                                with the goal of creating a valuable resource for the breeding community.
                            </p>

                            <p className="leading-relaxed">
                                <strong className="text-[#F5F5F0]">Ownership Verification:</strong> Some pet profiles may be imported
                                from public sources or added by administrators. If you see your pet on our platform and wish to
                                claim ownership, you can:
                            </p>

                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Click the "Claim Owner" button on the pet profile</li>
                                <li>Submit proof of ownership (registration papers, photos, etc.)</li>
                                <li>Contact our admin team at support@eibpo.com</li>
                            </ul>

                            <p className="leading-relaxed">
                                <strong className="text-[#F5F5F0]">Your Rights as Pet Owner:</strong> Verified pet owners have
                                full control to add, edit, or delete their pet's information. We are committed to maintaining
                                an accurate database and respect your ownership rights.
                            </p>

                            <div className="bg-[#C5A059]/10 rounded-lg p-4 mt-4">
                                <p className="text-[#C5A059] font-medium">
                                    🙏 ขอขอบคุณเจ้าของสัตว์เลี้ยงทุกท่าน และขออนุญาตใช้ข้อมูลเพื่อประโยชน์ของชุมชน breeder
                                    หากท่านต้องการแก้ไขหรือลบข้อมูล กรุณาติดต่อเราได้ตลอดเวลา
                                </p>
                                <p className="text-[#B8B8B8] text-sm mt-2">
                                    Thank you to all pet owners. We kindly ask for your permission to use this data
                                    for the benefit of the breeder community. If you wish to modify or remove any
                                    information, please contact us anytime.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-[#C5A059] mb-4">11. Changes to This Policy</h2>
                        <p className="text-[#B8B8B8] leading-relaxed">
                            We may update this Privacy Policy from time to time. We will notify you
                            of any changes by posting the new policy on this page and updating the
                            "Last updated" date.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-[#C5A059] mb-4">12. Contact Us</h2>
                        <p className="text-[#B8B8B8] leading-relaxed">
                            If you have questions about this Privacy Policy, please contact us at:
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
                        <Link to="/privacy" className="text-sm text-[#C5A059]">Privacy Policy</Link>
                        <Link to="/terms" className="text-sm text-[#B8B8B8] hover:text-[#C5A059] transition-colors">Terms of Service</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default PrivacyPolicyPage;

export const translations = {
    en: {
        nav: {
            home: 'Home',
            pedigree: 'Pedigree',
            breeding: 'Breeding',
            marketplace: 'Marketplace',
            signIn: 'Sign In',
            register: 'Register',
            signOut: 'Sign Out'
        },
        hero: {
            headline: "Your Pet's Legacy Starts Here",
            subtext: 'Search pedigrees, register pets, explore products, and discover your perfect companion',
            searchPlaceholder: 'Search for pets, pedigrees, breeds, or products...',
            searchBtn: 'Search Pedigrees',
            registerBtn: 'Register Pet',
            exploreMore: 'EXPLORE MORE',
            refreshHint: 'Suggestions refresh every 30 seconds',
            resultsFound: 'result(s) found',
            badges: {
                action: '✨ Action',
                pet: '🐾 Pet',
                shop: '🛍️ Shop',
                tree: '🌳 Tree'
            }
        },
        auth: {
            welcomeBack: 'Welcome Back',
            createAccount: 'Create Account',
            emailLabel: 'Email',
            passwordLabel: 'Password',
            nameLabel: 'Full Name',
            signInBtn: 'Sign In',
            signUpBtn: 'Create Account',
            loading: 'Loading...',
            orContinueWith: 'Or continue with',
            dontHaveAccount: "Don't have an account?",
            alreadyHaveAccount: 'Already have an account?',
            signUpLink: 'Sign up',
            signInLink: 'Sign in',
            forgotPassword: 'Forgot password?'
        },
        common: {
            viewPedigree: 'View complete pedigree'
        }
    },
    th: {
        nav: {
            home: 'หน้าแรก',
            pedigree: 'ใบเพ็ดดีกรี',
            breeding: 'จับคู่ผสมพันธุ์',
            marketplace: 'ตลาดซื้อขาย',
            signIn: 'เข้าสู่ระบบ',
            register: 'สมัครสมาชิก',
            signOut: 'ออกจากระบบ'
        },
        hero: {
            headline: 'เริ่มต้นตำนานสัตว์เลี้ยงของคุณที่นี่',
            subtext: 'ค้นหาใบเพ็ดดีกรี จดทะเบียนสัตว์เลี้ยง เลือกซื้อสินค้า และค้นหาคู่หูที่สมบูรณ์แบบสำหรับคุณ',
            searchPlaceholder: 'ค้นหาสัตว์เลี้ยง, ใบเพ็ดดีกรี, สายพันธุ์ หรือสินค้า...',
            searchBtn: 'ค้นหาใบเพ็ดดีกรี',
            registerBtn: 'จดทะเบียนสัตว์เลี้ยง',
            exploreMore: 'ดูเพิ่มเติม',
            refreshHint: 'รายการแนะนำจะเปลี่ยนทุกๆ 30 วินาที',
            resultsFound: 'รายการที่พบ',
            badges: {
                action: '✨ แนะนำ',
                pet: '🐾 สัตว์เลี้ยง',
                shop: '🛍️ สินค้า',
                tree: '🌳 เพ็ดดีกรี'
            }
        },
        auth: {
            welcomeBack: 'ยินดีต้อนรับกลับมา',
            createAccount: 'สร้างบัญชีผู้ใช้',
            emailLabel: 'อีเมล',
            passwordLabel: 'รหัสผ่าน',
            nameLabel: 'ชื่อ-นามสกุล',
            signInBtn: 'เข้าสู่ระบบ',
            signUpBtn: 'สมัครสมาชิก',
            loading: 'กำลังโหลด...',
            orContinueWith: 'หรือดำเนินการต่อด้วย',
            dontHaveAccount: 'ยังไม่มีบัญชีใช่ไหม?',
            alreadyHaveAccount: 'มีบัญชีอยู่แล้ว?',
            signUpLink: 'สมัครสมาชิก',
            signInLink: 'เข้าสู่ระบบ',
            forgotPassword: 'ลืมรหัสผ่าน?'
        },
        common: {
            viewPedigree: 'ดูใบเพ็ดดีกรีเต็ม'
        }
    }
};

export type Language = 'en' | 'th';
export type TranslationKey = keyof typeof translations.en;

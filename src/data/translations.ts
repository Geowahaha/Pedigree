/**
 * EIBPO Translations - EN/TH Bilingual Support
 * 
 * Rule: Don't translate English terms Thai breeders already know:
 * - Pedigree, Breeder, Dashboard, Profile, Premium, Pro, Admin
 * - Breed names, technical breeding terms
 * - Pet names and proper nouns
 */

export const translations = {
    en: {
        nav: {
            home: 'Home',
            pedigree: 'Pedigree',
            breeding: 'Breeding',
            marketplace: 'Marketplace',
            signIn: 'Sign In',
            register: 'Register',
            signOut: 'Sign Out',
            dashboard: 'Dashboard',
            myPets: 'My Pets',
            admin: 'Admin Panel',
            notifications: 'Notifications',
            settings: 'Settings',
            all: 'All',
            dogs: 'Dogs',
            cats: 'Cats',
            puppy_available: 'Puppy Available',
            puppy_soon: 'Puppy Soon',
            horses: 'Horses',
            cattle: 'Cattle',
            exotic: 'Exotic'
        },
        hero: {
            headline: "Your Pet's Legacy Starts Here",
            subtext: 'Search pedigrees, register pets, explore products, and discover your perfect companion',
            searchPlaceholder: 'Search for pets, pedigrees, breeds, or products...',
            searchBtn: 'Search Pedigrees',
            registerBtn: 'Register Pet',
            registerPet: 'Register Your Pet',
            registerSubtitle: 'Start verified breeding journey',
            exploreMore: 'EXPLORE MORE',
            refreshHint: 'Suggestions refresh every 30 seconds',
            resultsFound: 'result(s) found',
            badges: {
                action: '✨ Action',
                pet: '🐾 Pet',
                shop: '🛍️ Shop',
                tree: '🌳 Tree'
            },
            trending: 'Trending Now',
            featured: 'Featured Pets',
            newArrivals: 'New Arrivals'
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
            forgotPassword: 'Forgot password?',
            resetPassword: 'Reset Password',
            sendResetLink: 'Send Reset Link'
        },
        common: {
            viewPedigree: 'View complete pedigree',
            viewDetails: 'View Details',
            edit: 'Edit',
            delete: 'Delete',
            save: 'Save',
            cancel: 'Cancel',
            confirm: 'Confirm',
            close: 'Close',
            loading: 'Loading...',
            search: 'Search',
            filter: 'Filter',
            sort: 'Sort',
            noResults: 'No results found',
            loadMore: 'Load More',
            seeAll: 'See All',
            share: 'Share',
            like: 'Like',
            comment: 'Comment',
            addToCollection: 'Add to Collection',
            copied: 'Copied!',
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Info'
        },
        filters: {
            all: 'All',
            video: 'Video',
            image: 'Image',
            recent: 'Recent'
        },
        ownership: {
            claimOwnership: 'Claim Ownership',
            waitingOwner: 'Waiting Owner',
            verified: 'Verified',
            pendingClaim: 'Pending Claim',
            disputed: 'Disputed',
            clickToVerify: 'Click to verify ownership',
            verify: 'Verify',
            viewProfile: 'View profile',
            unknownOwner: 'Unknown Owner',
            location: 'Location'
        },
        pet: {
            name: 'Name',
            breed: 'Breed',
            gender: 'Gender',
            male: 'Male',
            female: 'Female',
            age: 'Age',
            color: 'Color',
            weight: 'Weight',
            height: 'Height',
            birthDate: 'Birth Date',
            location: 'Location',
            owner: 'Owner',
            breeder: 'Breeder',
            sire: 'Sire (Father)',
            dam: 'Dam (Mother)',
            pedigree: 'Pedigree',
            offspring: 'Offspring',
            status: 'Status',
            available: 'Available',
            sold: 'Sold',
            reserved: 'Reserved',
            notForSale: 'Not for Sale',
            verified: 'Verified',
            champion: 'Champion',
            healthTested: 'Health Tested',
            microchipped: 'Microchipped',
            registeredWith: 'Registered with',
            generations: 'Generations',
            viewTree: 'View Family Tree',
            addPet: 'Add New Pet',
            editPet: 'Edit Pet',
            deletePet: 'Delete Pet'
        },
        breeding: {
            title: 'Breeding',
            findMatch: 'Find a Match',
            breedingPair: 'Breeding Pair',
            compatibility: 'Compatibility',
            geneticScore: 'Genetic Score',
            healthRisk: 'Health Risk',
            predictedOffspring: 'Predicted Offspring',
            inbreedingCoefficient: 'Inbreeding Coefficient',
            requestBreeding: 'Request Breeding',
            studService: 'Stud Service',
            broodBitch: 'Brood Bitch',
            plannedLitter: 'Planned Litter',
            expectedDate: 'Expected Date',
            litterSize: 'Litter Size'
        },
        marketplace: {
            title: 'Marketplace',
            forSale: 'For Sale',
            stud: 'Stud Service',
            wanted: 'Wanted',
            price: 'Price',
            currency: 'THB',
            contact: 'Contact',
            sendMessage: 'Send Message',
            makeOffer: 'Make Offer',
            buyNow: 'Buy Now',
            addToCart: 'Add to Cart',
            checkout: 'Checkout',
            shipping: 'Shipping',
            freeShipping: 'Free Shipping',
            delivery: 'Delivery'
        },
        dashboard: {
            title: 'Breeder Dashboard',
            overview: 'Overview',
            myPets: 'My Registered Pets',
            requests: 'Verification Requests',
            settings: 'Settings',
            smartMatch: 'Smart Match',
            addPet: 'Add New Pet',
            totalPets: 'Total Pets',
            pendingVerification: 'Pending Verification',
            verifiedPets: 'Verified Pets',
            recentActivity: 'Recent Activity',
            quickActions: 'Quick Actions'
        },
        pedigreeSection: {
            title: 'Legacy & Offspring',
            tree: 'Pedigree Tree',
            ancestors: 'Ancestors',
            descendants: 'Descendants',
            siblings: 'Siblings',
            halfSiblings: 'Half Siblings',
            generation: 'Generation',
            expand: 'Expand',
            collapse: 'Collapse',
            fullScreen: 'Full Screen',
            download: 'Download PDF',
            print: 'Print'
        },
        chat: {
            title: 'Messages',
            newMessage: 'New Message',
            typeMessage: 'Type a message...',
            send: 'Send',
            online: 'Online',
            offline: 'Offline',
            typing: 'is typing...',
            noMessages: 'No messages yet',
            startConversation: 'Start a conversation'
        },
        notifications: {
            title: 'Notifications',
            markAllRead: 'Mark all as read',
            noNotifications: 'No notifications',
            newPet: 'New pet added',
            verificationApproved: 'Verification approved',
            newMessage: 'New message',
            newComment: 'New comment',
            newLike: 'New like'
        },
        footer: {
            about: 'About',
            contact: 'Contact',
            privacy: 'Privacy Policy',
            terms: 'Terms of Service',
            help: 'Help Center',
            copyright: '© 2026 Eibpo Pedigree. All rights reserved.',
            followUs: 'Follow Us',
            newsletter: 'Subscribe to our newsletter',
            emailPlaceholder: 'Enter your email',
            subscribe: 'Subscribe'
        },
        errors: {
            generic: 'Something went wrong',
            notFound: 'Not found',
            unauthorized: 'Unauthorized',
            forbidden: 'Access denied',
            network: 'Network error. Please try again.',
            validation: 'Please check your input'
        }
    },

    th: {
        nav: {
            home: 'หน้าแรก',
            pedigree: 'Pedigree',  // Keep English - Thai breeders know this
            breeding: 'จับคู่ผสมพันธุ์',
            marketplace: 'ตลาดซื้อขาย',
            signIn: 'เข้าสู่ระบบ',
            register: 'สมัครสมาชิก',
            signOut: 'ออกจากระบบ',
            dashboard: 'Dashboard',  // Keep English
            myPets: 'สัตว์เลี้ยงของฉัน',
            admin: 'Admin Panel',  // Keep English
            notifications: 'การแจ้งเตือน',
            settings: 'ตั้งค่า',
            all: 'ทั้งหมด',
            dogs: 'สุนัข',
            cats: 'แมว',
            puppy_available: 'มีลูกสุนัข',
            puppy_soon: 'เร็วๆ นี้',
            horses: 'ม้า',
            cattle: 'ปศุสัตว์',
            exotic: 'สัตว์แปลก'
        },
        hero: {
            headline: 'เริ่มต้นตำนานสัตว์เลี้ยงของคุณที่นี่',
            subtext: 'ค้นหาใบ Pedigree, จดทะเบียนสัตว์เลี้ยง, เลือกซื้อสินค้า และค้นหาคู่หูที่สมบูรณ์แบบ',
            searchPlaceholder: 'ค้นหาสัตว์เลี้ยง, Pedigree, สายพันธุ์ หรือสินค้า...',
            searchBtn: 'ค้นหา Pedigree',
            registerBtn: 'จดทะเบียนสัตว์เลี้ยง',
            registerPet: 'จดทะเบียนสัตว์เลี้ยง',
            registerSubtitle: 'เริ่มต้นเส้นทาง Breeding ที่ได้รับการรับรอง',
            exploreMore: 'ดูเพิ่มเติม',
            refreshHint: 'รายการแนะนำจะเปลี่ยนทุกๆ 30 วินาที',
            resultsFound: 'รายการที่พบ',
            badges: {
                action: '✨ แนะนำ',
                pet: '🐾 สัตว์เลี้ยง',
                shop: '🛍️ สินค้า',
                tree: '🌳 Pedigree'
            },
            trending: 'กำลังมาแรง',
            featured: 'สัตว์เลี้ยงแนะนำ',
            newArrivals: 'มาใหม่ล่าสุด'
        },
        auth: {
            welcomeBack: 'ยินดีต้อนรับกลับมา',
            createAccount: 'สร้างบัญชีผู้ใช้',
            emailLabel: 'Email',  // Keep English
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
            forgotPassword: 'ลืมรหัสผ่าน?',
            resetPassword: 'รีเซ็ตรหัสผ่าน',
            sendResetLink: 'ส่งลิงก์รีเซ็ต'
        },
        common: {
            viewPedigree: 'ดู Pedigree ฉบับสมบูรณ์',
            viewDetails: 'ดูรายละเอียด',
            edit: 'แก้ไข',
            delete: 'ลบ',
            save: 'บันทึก',
            cancel: 'ยกเลิก',
            confirm: 'ยืนยัน',
            close: 'ปิด',
            loading: 'กำลังโหลด...',
            search: 'ค้นหา',
            filter: 'กรอง',
            sort: 'เรียงลำดับ',
            noResults: 'ไม่พบผลลัพธ์',
            loadMore: 'โหลดเพิ่มเติม',
            seeAll: 'ดูทั้งหมด',
            share: 'แชร์',
            like: 'ถูกใจ',
            comment: 'คอมเมนต์',
            addToCollection: 'เพิ่มใน Collection',
            copied: 'คัดลอกแล้ว!',
            success: 'สำเร็จ',
            error: 'เกิดข้อผิดพลาด',
            warning: 'คำเตือน',
            info: 'ข้อมูล'
        },
        filters: {
            all: 'ทั้งหมด',
            video: 'วิดีโอ',
            image: 'รูปภาพ',
            recent: 'ล่าสุด'
        },
        ownership: {
            claimOwnership: 'รอเจ้าของยืนยัน',
            waitingOwner: 'รอเจ้าของยืนยัน',
            verified: 'ยืนยันแล้ว',
            pendingClaim: 'กำลังตรวจสอบคำขอ',
            disputed: 'มีข้อโต้แย้ง',
            clickToVerify: 'คลิกเพื่อยืนยันความเป็นเจ้าของ',
            verify: 'ยืนยัน',
            viewProfile: 'ดูโปรไฟล์',
            unknownOwner: 'ไม่ทราบเจ้าของ',
            location: 'สถานที่'
        },
        pet: {
            name: 'ชื่อ',
            breed: 'สายพันธุ์',
            gender: 'เพศ',
            male: 'ตัวผู้',
            female: 'ตัวเมีย',
            age: 'อายุ',
            color: 'สี',
            weight: 'น้ำหนัก',
            height: 'ความสูง',
            birthDate: 'วันเกิด',
            location: 'ที่อยู่',
            owner: 'เจ้าของ',
            breeder: 'Breeder',  // Keep English
            sire: 'Sire (พ่อ)',  // Keep English term
            dam: 'Dam (แม่)',  // Keep English term
            pedigree: 'Pedigree',  // Keep English
            offspring: 'ลูกหลาน',
            status: 'สถานะ',
            available: 'พร้อมจำหน่าย',
            sold: 'ขายแล้ว',
            reserved: 'จองแล้ว',
            notForSale: 'ไม่ขาย',
            verified: 'ยืนยันแล้ว',
            champion: 'Champion',  // Keep English
            healthTested: 'ตรวจสุขภาพแล้ว',
            microchipped: 'ฝัง Microchip แล้ว',
            registeredWith: 'จดทะเบียนกับ',
            generations: 'รุ่น',
            viewTree: 'ดู Family Tree',
            addPet: 'เพิ่มสัตว์เลี้ยงใหม่',
            editPet: 'แก้ไขข้อมูลสัตว์เลี้ยง',
            deletePet: 'ลบสัตว์เลี้ยง'
        },
        breeding: {
            title: 'Breeding',  // Keep English
            findMatch: 'หา Match ที่เหมาะสม',
            breedingPair: 'คู่ Breeding',
            compatibility: 'ความเข้ากัน',
            geneticScore: 'คะแนน Genetic',
            healthRisk: 'ความเสี่ยงสุขภาพ',
            predictedOffspring: 'ลูกที่คาดการณ์',
            inbreedingCoefficient: 'ค่า Inbreeding',
            requestBreeding: 'ขอจับคู่ Breeding',
            studService: 'Stud Service',  // Keep English
            broodBitch: 'Brood Bitch',  // Keep English
            plannedLitter: 'Litter ที่วางแผน',
            expectedDate: 'วันที่คาดว่าจะคลอด',
            litterSize: 'จำนวน Litter'
        },
        marketplace: {
            title: 'ตลาดซื้อขาย',
            forSale: 'ขาย',
            stud: 'Stud Service',  // Keep English
            wanted: 'ต้องการซื้อ',
            price: 'ราคา',
            currency: 'บาท',
            contact: 'ติดต่อ',
            sendMessage: 'ส่งข้อความ',
            makeOffer: 'เสนอราคา',
            buyNow: 'ซื้อเลย',
            addToCart: 'เพิ่มลงตะกร้า',
            checkout: 'ชำระเงิน',
            shipping: 'การจัดส่ง',
            freeShipping: 'ส่งฟรี',
            delivery: 'จัดส่ง'
        },
        dashboard: {
            title: 'Breeder Dashboard',  // Keep English
            overview: 'ภาพรวม',
            myPets: 'สัตว์เลี้ยงที่จดทะเบียน',
            requests: 'คำร้องขอ Verification',
            settings: 'ตั้งค่า',
            smartMatch: 'Smart Match',  // Keep English
            addPet: 'เพิ่มสัตว์เลี้ยงใหม่',
            totalPets: 'สัตว์เลี้ยงทั้งหมด',
            pendingVerification: 'รอการ Verify',
            verifiedPets: 'ได้รับการ Verify แล้ว',
            recentActivity: 'กิจกรรมล่าสุด',
            quickActions: 'ทางลัด'
        },
        pedigreeSection: {
            title: 'ทายาท & สายเลือด',
            tree: 'Pedigree Tree',  // Keep English
            ancestors: 'บรรพบุรุษ',
            descendants: 'ทายาท',
            siblings: 'พี่น้อง',
            halfSiblings: 'พี่น้องต่างพ่อ/แม่',
            generation: 'Generation',  // Keep English
            expand: 'ขยาย',
            collapse: 'ย่อ',
            fullScreen: 'เต็มหน้าจอ',
            download: 'ดาวน์โหลด PDF',
            print: 'พิมพ์'
        },
        chat: {
            title: 'ข้อความ',
            newMessage: 'ข้อความใหม่',
            typeMessage: 'พิมพ์ข้อความ...',
            send: 'ส่ง',
            online: 'ออนไลน์',
            offline: 'ออฟไลน์',
            typing: 'กำลังพิมพ์...',
            noMessages: 'ยังไม่มีข้อความ',
            startConversation: 'เริ่มสนทนา'
        },
        notifications: {
            title: 'การแจ้งเตือน',
            markAllRead: 'ทำเครื่องหมายว่าอ่านแล้ว',
            noNotifications: 'ไม่มีการแจ้งเตือน',
            newPet: 'มีสัตว์เลี้ยงใหม่',
            verificationApproved: 'อนุมัติ Verification แล้ว',
            newMessage: 'มีข้อความใหม่',
            newComment: 'มีคอมเมนต์ใหม่',
            newLike: 'มีคนถูกใจ'
        },
        footer: {
            about: 'เกี่ยวกับเรา',
            contact: 'ติดต่อ',
            privacy: 'นโยบายความเป็นส่วนตัว',
            terms: 'เงื่อนไขการใช้งาน',
            help: 'ศูนย์ช่วยเหลือ',
            copyright: '© 2026 Eibpo Pedigree สงวนลิขสิทธิ์',
            followUs: 'ติดตามเรา',
            newsletter: 'สมัครรับข่าวสาร',
            emailPlaceholder: 'กรอก Email ของคุณ',
            subscribe: 'สมัคร'
        },
        errors: {
            generic: 'เกิดข้อผิดพลาด',
            notFound: 'ไม่พบข้อมูล',
            unauthorized: 'กรุณาเข้าสู่ระบบ',
            forbidden: 'ไม่มีสิทธิ์เข้าถึง',
            network: 'เครือข่ายขัดข้อง กรุณาลองใหม่',
            validation: 'กรุณาตรวจสอบข้อมูล'
        }
    }
};

export type Language = 'en' | 'th';
export type TranslationKey = keyof typeof translations.en;

// إعدادات Firebase — مشروع recording-readings
const firebaseConfig = {
    apiKey: "AIzaSyCP6bkrgWn5Nx7BE7sYJmrUm7w06XYlmKA",
    authDomain: "recording-readings.firebaseapp.com",
    projectId: "recording-readings",
    storageBucket: "recording-readings.firebasestorage.app",
    messagingSenderId: "69093256665",
    appId: "1:69093256665:web:2e6409903746c37cd07dc8",
    measurementId: "G-EWZL9TNPPJ"
};

// إعداد Webpushr

// ===================================================
// التهيئة الفورية: SDK الويب لا يعتمد على Cordova؛ تأخير التهيئة حتى
// DOMContentLoaded فيُعرض وضع «غير متصل» ولا يعمل الجلب أو التحديث.
// ===================================================
function initFirebaseCore() {
    if (typeof firebase === 'undefined' || !firebase.initializeApp) {
        console.error('[Firebase] لم يتم تحميل firebase-app قبل auth.js');
        return;
    }
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        window.__firebaseAuth = firebase.auth();
        window.__firebaseDb = firebase.firestore();
    } catch (e) {
        console.error('[Firebase] خطأ تهيئة:', e);
    }
}

// ربط واجهة تسجيل الدخول و onAuthStateChanged — يمكن تأجيله حتى جهوزية DOM
function attachAuthFlows() {
    const auth = window.__firebaseAuth;
    const db = window.__firebaseDb;
    if (!auth || !db) {
        console.error('[Firebase] لم تكتمل تهيئة Auth/Firestore');
        return;
    }

    // مسارات المستخدمين بناءً على الصلاحيات
    const roleRoutes = {
        'lab_manager': 'lab.html',
        'ops_manager': 'ops.html',
        'tech': 'tech.html'
    };

    const loginForm = document.getElementById('loginForm');

    // التحقق من حالة الدخول وصحة الصلاحية للصفحة الحالية
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // الحصول على المسار الحالي
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';
            
            // إذا كان المستخدم في صفحة الدخول، نوجهه لصفحته
            if (loginForm || currentPage === 'index.html') {
                await redirectUser(user.uid, auth, db, roleRoutes);
            } else {
                // فحص أمني: هل الصفحة الحالية تناسب دور المستخدم؟
                try {
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    if (userDoc.exists) {
                        const role = userDoc.data().role;
                        const correctPage = roleRoutes[role];
                        
                        // إذا كان في صفحة خطأ (مثلاً فني في صفحة معمل)
                        if (correctPage && currentPage !== correctPage) {
                            // استثناء: صفحة "خطة تشغيل المرشحة" تتبع للفني ومدير التشغيل
                            if (currentPage === 'Operation_of_units.html' && (role === 'tech' || role === 'ops_manager')) {
                                // مسموح
                            } else {
                                console.warn(`[Security] Unauthorized access to ${currentPage} for role ${role}. Redirecting to ${correctPage}`);
                                window.location.href = correctPage;
                            }
                        }
                    }
                } catch (e) {
                    console.error("Security check failed:", e);
                }
            }
        } else {
            if (!loginForm && window.location.pathname.indexOf('index.html') === -1) {
                const isIndexPage = window.location.href.indexOf('index.html') !== -1
                    || window.location.pathname === '/'
                    || window.location.pathname === '';
                if (!isIndexPage) {
                    window.location.replace('index.html');
                }
            }
        }
    });

    if (loginForm) {
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const errorMessage = document.getElementById('errorMessage');
        const loadingMessage = document.getElementById('loadingMessage');
        const loginBtn = document.getElementById('loginBtn');

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = emailInput.value;
            const password = passwordInput.value;

            errorMessage.style.display = 'none';
            loadingMessage.style.display = 'block';
            loginBtn.disabled = true;

            try {
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                const user = userCredential.user;


                await redirectUser(user.uid, auth, db, roleRoutes);
            } catch (error) {
                console.error("Login error:", error);
                loadingMessage.style.display = 'none';
                errorMessage.style.display = 'block';
                loginBtn.disabled = false;

                switch (error.code) {
                    case 'auth/user-not-found':
                    case 'auth/wrong-password':
                        errorMessage.innerText = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
                        break;
                    case 'auth/invalid-email':
                        errorMessage.innerText = 'صيغة البريد الإلكتروني غير صحيحة';
                        break;
                    default:
                        errorMessage.innerText = 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة لاحقاً.';
                }
            }
        });
    }
}

/** يُستدعى مرة واحدة قبل أي استخدام من app.js (نفس ترتيب الـ scripts في الصفحات) */
initFirebaseCore();

// دالة لمعرفة صلاحية المستخدم وتوجيهه
async function redirectUser(uid, auth, db, roleRoutes) {
    // دعم الاستدعاء القديم (بدون معاملات) للتوافق
    if (!auth) auth = window.__firebaseAuth;
    if (!db) db = window.__firebaseDb;
    if (!roleRoutes) roleRoutes = { 'lab_manager': 'lab.html', 'ops_manager': 'ops.html', 'tech': 'tech.html' };

    try {
        const userDoc = await db.collection('users').doc(uid).get();

        if (userDoc.exists) {
            const role = userDoc.data().role;
            localStorage.setItem('userRole', role || 'tech');
            


            if (roleRoutes[role]) {
                window.location.href = roleRoutes[role];
            } else {
                console.error("Unknown role:", role);
                alert('صلاحية المستخدم غير معروفة.');
                auth.signOut();
            }
        } else {
            console.error("User doc not found!");
            const user = auth.currentUser;
            if (user) {
                let targetRoute = 'tech.html';
                let assignedRole = 'tech';
                if (user.email.includes('lab')) { targetRoute = 'lab.html'; assignedRole = 'lab_manager'; }
                else if (user.email.includes('ops')) { targetRoute = 'ops.html'; assignedRole = 'ops_manager'; }



                if (window.location.href.indexOf(targetRoute) === -1) {
                    window.location.href = targetRoute;
                }
            }
        }
    } catch (error) {
        console.error("Error fetching user role:", error);

        const user = auth.currentUser;
        if (user) {
            let targetRoute = 'tech.html';
            let assignedRole = 'tech';
            if (user.email.includes('lab')) { targetRoute = 'lab.html'; assignedRole = 'lab_manager'; }
            else if (user.email.includes('ops')) { targetRoute = 'ops.html'; assignedRole = 'ops_manager'; }



            if (window.location.href.indexOf(targetRoute) === -1) {
                window.location.href = targetRoute;
            }
        }
    }
}

// دالة تسجيل الخروج
// دالة تسجيل الخروج
function logoutUser() {
    const auth = window.__firebaseAuth || firebase.auth();
    // مسح البيانات المحلية لضمان عدم وجود تضارب في الأدوار
    localStorage.removeItem('userRole');
    
    auth.signOut().then(() => {
        console.log("Logged out successfully");
        // لا داعي لعمل window.location.href هنا لأن onAuthStateChanged سيتكفل بالأمر
    }).catch((error) => {
        console.error("Logout error:", error);
    });
}

// مستمعات المصادقة تحتاج الـ DOM (نموذج الدخول)؛ لا علاقة لها بأي بيئة خارجية
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        attachAuthFlows();
        registerServiceWorker();
        // تأخير للسماح بتحميل firebase-messaging.js أولاً (يُحمّل بعد auth.js في tech.html)
        setTimeout(checkInitialUpdatesForTech, 3500);
    });
} else {
    attachAuthFlows();
    registerServiceWorker();
    checkInitialUpdatesForTech();
}

/**
 * فحص التحديثات الأخيرة عند فتح التطبيق للفني
 */
async function checkInitialUpdatesForTech() {
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'tech') return;

    // انتظار بسيط لضمان تهيئة Firebase و Firestore
    await new Promise(r => setTimeout(r, 3000));
    
    const db = window.__firebaseDb;
    if (!db) return;

    console.log('[Tech] Checking for initial updates...');

    try {
        // 1. فحص تحديث المعمل
        const labDoc = await db.collection('shared_data').doc('lab_latest').get();
        if (labDoc.exists) {
            const data = labDoc.data();
            const lastTs = parseInt(localStorage.getItem('last_lab_update_ts')) || 0;
            const serverTs = data.updatedAt ? data.updatedAt.toMillis() : 0;
            if (serverTs > lastTs) {
                if (typeof showNotificationToast === 'function') {
                    showNotificationToast('تحديث المعمل', 'توجد بيانات جديدة في المعمل لم يتم الاطلاع عليها', 'lab_update', data);
                }
            }
        }

        // 2. فحص تحديث خطة التشغيل
        const opsDoc = await db.collection('shared_data').doc('ops_latest').get();
        if (opsDoc.exists) {
            const data = opsDoc.data();
            const lastTs = parseInt(localStorage.getItem('last_ops_update_ts')) || 0;
            const serverTs = data.updatedAt ? data.updatedAt.toMillis() : 0;
            if (serverTs > lastTs) {
                if (typeof showNotificationToast === 'function') {
                    showNotificationToast('خطة التشغيل', 'توجد تحديثات جديدة في خطة التشغيل', 'ops_plan_update', data);
                }
            }
        }

        // 3. فحص تحديث خطة المرشحة
        const murashahaDoc = await db.collection('shared_data').doc('operation_units_latest').get();
        if (murashahaDoc.exists) {
            const data = murashahaDoc.data();
            const lastTs = parseInt(localStorage.getItem('last_murashaha_update_ts')) || 0;
            const serverTs = data.updatedAt ? data.updatedAt.toMillis() : 0;
            if (serverTs > lastTs) {
                if (typeof showNotificationToast === 'function') {
                    showNotificationToast('خطة المرشحة', 'تم تحديث خطة تشغيل المرشحة مؤخراً', 'murashaha_plan_update', data);
                }
            }
        }
    } catch (e) {
        console.error('[Tech] Error checking initial updates:', e);
    }
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('firebase-messaging-sw.js')
                .then(reg => console.log('[PWA] Service Worker registered', reg))
                .catch(err => console.error('[PWA] Service Worker registration failed', err));
        });
    }
}

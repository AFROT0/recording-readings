const functions = require('firebase-functions');
const admin = require('firebase-admin');


// استخدام ملف المفتاح الذي قدمته
const serviceAccount = require("./recording-readings-firebase-adminsdk-fbsvc-de5cf1b9eb.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

/**
 * وظيفة تراقب مجموعة notifications_queue وتقوم بإرسال الإشعارات
 */
exports.processNotificationsQueue = functions.firestore
    .document('notifications_queue/{docId}')
    .onCreate(async (snapshot, context) => {
        const data = snapshot.data();
        if (!data) return null;

        const { targetRole, title, body, data: notifData } = data;
        const notifType = (notifData && notifData.type) ? notifData.type : '';

        console.log(`[Notification] Processing for role: ${targetRole}, type: ${notifType}, title: ${title}`);

        // =====================================================
        // تحديد الرابط الصحيح بناءً على دور المستقبل ونوع الإشعار
        // =====================================================
        const BASE_URL = 'https://recording-readings.web.app';
        let targetUrl = BASE_URL; // افتراضي

        if (targetRole === 'tech') {
            // إشعارات خطة تشغيل المرشحة → صفحة المرشحة للفني
            if (notifType === 'murashaha_plan_update') {
                targetUrl = `${BASE_URL}/tech_op_units.html`;
            } else {
                // باقي إشعارات الفني (معمل، خطة تشغيل) → صفحة الفني الرئيسية
                targetUrl = `${BASE_URL}/tech.html`;
            }
        } else if (targetRole === 'lab') {
            targetUrl = `${BASE_URL}/lab.html`;
        } else if (targetRole === 'ops') {
            targetUrl = `${BASE_URL}/ops.html`;
        }

        console.log(`[Notification] Target URL: ${targetUrl}`);

        try {
            console.log(`[Notification] Sending FCM notification to role: ${targetRole}`);
            
            // 1. جلب جميع الفنيين (أو المستخدمين المستهدفين حسب الدور)
            const usersSnapshot = await admin.firestore()
                .collection('users')
                .where('role', '==', targetRole)
                .get();

            if (usersSnapshot.empty) {
                console.log(`[Notification] No users found with role: ${targetRole}`);
                return snapshot.ref.update({
                    processed: true,
                    status: 'skipped (no users)',
                    processedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            const tokens = [];
            
            // 2. جمع كل التوكنز الخاصة بهؤلاء المستخدمين
            for (const userDoc of usersSnapshot.docs) {
                const tokensSnapshot = await userDoc.ref.collection('fcm_tokens').get();
                tokensSnapshot.forEach(tokenDoc => {
                    const tokenData = tokenDoc.data();
                    if (tokenData && tokenData.token) {
                        tokens.push(tokenData.token);
                    }
                });
            }

            if (tokens.length === 0) {
                console.log(`[Notification] No FCM tokens found for role: ${targetRole}`);
                return snapshot.ref.update({
                    processed: true,
                    status: 'skipped (no tokens)',
                    processedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            // 3. إرسال الإشعار لجميع التوكنز (Multicast)
            const message = {
                notification: {
                    title: title,
                    body: body
                },
                data: {
                    ...notifData,
                    click_action: 'FLUTTER_NOTIFICATION_CLICK', // لبعض مكتبات الأجهزة
                    target_url: targetUrl
                },
                tokens: tokens
            };

            const response = await admin.messaging().sendEachForMulticast(message);
            console.log(`[Notification] FCM Sent: ${response.successCount} success, ${response.failureCount} failure`);

            // 4. تحديث حالة الطلب في Firestore
            return snapshot.ref.update({
                processed: true,
                status: 'sent',
                successCount: response.successCount,
                failureCount: response.failureCount,
                processedAt: admin.firestore.FieldValue.serverTimestamp()
            });

        } catch (error) {
            console.error('Error in processNotificationsQueue:', error);
            return snapshot.ref.update({
                processed: true,
                status: 'error',
                error: error.message,
                processedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    });

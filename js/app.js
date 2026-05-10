// إعدادات الأقسام - يسمح بتغيير عدد الصفوف (الخلايا)
const sectionConfig = {
    akra: { columns: ['القراءة'], rows: 7, minRows: 1 },
    morashaha: { columns: ['القراءة'], rows: 7, minRows: 1 },
    sludge: { columns: ['القراءة'], rows: 3, minRows: 1 },
    decant: { columns: ['القراءة'], rows: 3, minRows: 1 },
    booster: { columns: ['القراءة'], rows: 7, minRows: 1 },
    anbarChlor: { columns: ['A', 'B'], rows: 8, minRows: 1 }, // عمودين فقط
    kabayenChlor: { columns: ['القراءة'], rows: 5, minRows: 1 },
    shabba: { columns: ['القراءة'], rows: 5, minRows: 1 },
    electricity: { columns: ['القراءة'], rows: 11, minRows: 1 } // قسم غرفة الكهرباء
};

// معلومات الأقسام (العناوين والأيقونات)
const sectionMetadata = {
    akra: { label: 'العكرة', icon: 'fa-tint' },
    morashaha: { label: 'المرشحة', icon: 'fa-filter' },
    sludge: { label: 'Sludge', icon: 'fa-water' },
    decant: { label: 'Decant', icon: 'fa-vial' },
    booster: { label: 'Booster', icon: 'fa-pump-soap' },
    anbarChlor: { label: 'عنبر الكلور', icon: 'fa-flask' },
    kabayenChlor: { label: 'كبائن الكلور', icon: 'fa-prescription-bottle' },
    shabba: { label: 'الشبة', icon: 'fa-fill-drip' },
    electricity: { label: 'غرفة الكهرباء', icon: 'fa-bolt' }
};

let data = {};
let autoSaveTimeouts = {}; // لتخزين مؤقتات الحفظ التلقائي

// تحميل الأقسام المخصصة من localStorage
function loadCustomSections() {
    const customSections = JSON.parse(localStorage.getItem('customSections') || '[]');
    customSections.forEach(section => {
        const sectionId = section.id;
        sectionConfig[sectionId] = {
            columns: section.columns || ['القراءة'],
            rows: section.rows || 1,
            minRows: 1
        };
        sectionMetadata[sectionId] = {
            label: section.label,
            icon: section.icon || 'fa-circle'
        };
    });
}

// حفظ الأقسام المخصصة في localStorage
function saveCustomSections() {
    const customSections = [];
    const defaultSections = ['akra', 'morashaha', 'sludge', 'decant', 'booster', 'anbarChlor', 'kabayenChlor', 'shabba', 'electricity'];

    Object.keys(sectionConfig).forEach(sectionId => {
        // التحقق من أن القسم مخصص (ليس في القائمة الافتراضية)
        if (defaultSections.includes(sectionId)) return;
        if (!sectionMetadata[sectionId]) return;

        customSections.push({
            id: sectionId,
            label: sectionMetadata[sectionId].label,
            icon: sectionMetadata[sectionId].icon,
            columns: sectionConfig[sectionId].columns,
            rows: sectionConfig[sectionId].rows
        });
    });
    localStorage.setItem('customSections', JSON.stringify(customSections));
}

// تحميل أعداد الصفوف المخزنة
function initializeSectionRows() {
    Object.keys(sectionConfig).forEach(section => {
        const storedRows = parseInt(localStorage.getItem(`rows_${section}`), 10);
        if (!Number.isNaN(storedRows) && storedRows > 0) {
            sectionConfig[section].rows = storedRows;
        }
    });
}

function saveRowCount(section) {
    localStorage.setItem(`rows_${section}`, sectionConfig[section].rows);
}

function normalizeSectionData(section) {
    const config = sectionConfig[section];
    if (!data[section]) {
        data[section] = [];
    }
    // تقليم الصفوف الزائدة
    if (data[section].length > config.rows) {
        data[section] = data[section].slice(0, config.rows);
    }
    // إضافة صفوف فارغة لتغطية العدد الحالي
    while (data[section].length < config.rows) {
        data[section].push(new Array(config.columns.length).fill(''));
    }
}

// دالة لتحويل الأرقام العربية إلى إنجليزية
function convertArabicToEnglishNumbers(str) {
    if (!str) return str;
    const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    const englishNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

    let result = str.toString();
    for (let i = 0; i < 10; i++) {
        result = result.replace(new RegExp(arabicNumbers[i], 'g'), englishNumbers[i]);
        result = result.replace(new RegExp(persianNumbers[i], 'g'), englishNumbers[i]);
    }
    return result;
}

// دالة لتحويل الإدخال إلى أرقام إنجليزية فوراً
function convertInputToEnglish(input) {
    const cursorPos = input.selectionStart;
    const oldValue = input.value;
    const newValue = convertArabicToEnglishNumbers(oldValue);

    if (oldValue !== newValue) {
        input.value = newValue;
        input.setSelectionRange(cursorPos, cursorPos);
    }
}

// تهيئة التطبيق
function init() {
    if (window.APP_BOOT_MODE === 'lab') {
        initLabBoot();
        return;
    }
    if (window.APP_BOOT_MODE === 'ops') {
        initOpsBoot();
        return;
    }
    if (window.APP_BOOT_MODE === 'murashaha_op_plan') {
        initMurashahaOpPlanPage();
        return;
    }

    loadCustomSections();
    loadAllData();
    initializeSectionRows();

    // إنشاء HTML للأقسام المخصصة
    const defaultSections = ['akra', 'morashaha', 'sludge', 'decant', 'booster', 'anbarChlor', 'kabayenChlor', 'shabba', 'electricity'];
    const container = document.querySelector('.container');
    Object.keys(sectionConfig).forEach(section => {
        if (!defaultSections.includes(section)) {
            const sectionHTML = createSectionHTML(section);
            container.insertAdjacentHTML('beforeend', sectionHTML);
        }
    });

    // تهيئة جميع الأقسام
    Object.keys(sectionConfig).forEach(section => {
        normalizeSectionData(section);
        createTable(section);
    });

    // إنشاء جدول الأسطوانات الفارغة لعنبر الكلور (بدون thead)
    createAnbarChlorEmptyTable();

    // تحديث القائمة الرئيسية
    updateMainMenu();

    // تحديث قائمة الأقسام المخصصة
    updateCustomSectionsList();

    // تهيئة قسم خطة التشغيل
    initOperatingPlan();

    // تهيئة قسم متوسط التسجيلات
    initAverageRecords();

    // تهيئة قسم المعمل
    initLabSection();
}

/** صفحة lab.html فقط: لا يتم إنشاء بقية أقسام التطبيق */
function initLabBoot() {
    initLabSection();
    if (document.getElementById('labSection')) {
        showSection('labSection');
    }
}

/** صفحة ops.html فقط: خطة التشغيل دون بقية الواجهة */
function initOpsBoot() {
    initOperatingPlan();
    if (document.getElementById('operatingPlan')) {
        showSection('operatingPlan');
    }
}

const MURASHAHA_PLAN_STORAGE_KEY = 'murashaha_op_plan_notes_v1';

function goMurashahaPlanBack() {
    if (window.APP_ROLE === 'tech') {
        window.location.href = 'tech.html';
    } else {
        window.location.href = 'ops.html';
    }
}
window.goMurashahaPlanBack = goMurashahaPlanBack;

/** صفحة خطة_تشغيل_المرشحة.html — ops يحرر، الفني read-only (?ro=1 من رابط الفني) */
function initMurashahaOpPlanPage() {
    const ta = document.getElementById('murashahaPlanBody');
    const saveBtn = document.getElementById('murashahaPlanSaveBtn');
    try {
        if (ta) ta.value = localStorage.getItem(MURASHAHA_PLAN_STORAGE_KEY) || '';
    } catch (e) {
        console.warn('[Murashaha plan] load', e);
    }

    if (window.APP_ROLE === 'tech') {
        if (ta) {
            ta.readOnly = true;
            ta.setAttribute('readonly', 'readonly');
            ta.classList.add('murashaha-plan-readonly');
        }
        if (saveBtn) saveBtn.style.display = 'none';
    } else if (window.APP_ROLE === 'ops_manager') {
        if (saveBtn && ta) {
            saveBtn.addEventListener('click', async () => {
                try {
                    localStorage.setItem(MURASHAHA_PLAN_STORAGE_KEY, ta.value);
                    if (typeof showToast === 'function') showToast('تم حفظ خطة تشغيل المرشحة');

                    
                } catch (err) {
                    console.error(err);
                    if (typeof showToast === 'function') showToast('تعذر الحفظ');
                }
            });
        }
        const lo = document.getElementById('murashahaLogoutBtn');
        if (lo) lo.style.display = 'inline-flex';
    }

    const themeSaved = localStorage.getItem('theme');
    if (themeSaved === 'dark') document.body.classList.add('dark-mode');
}

const LAB_SECTION_STORAGE_KEY = 'lab_pump_doses_data';
let labAutoSaveTimer = null;

// تهيئة قسم المعمل
function initLabSection() {
    const tbody = document.getElementById('labTableBody');
    if (!tbody) return;

    // منع إضافة الصفوف أكثر من مرة عند إعادة التهيئة
    if (tbody.children.length > 0) return;

    const cols = ['4', '3a', '3b', '2', '1'];

    for (let i = 0; i < 4; i++) {
        const tr = document.createElement('tr');
        tr.className = 'pump-row';

        const tdLabel = document.createElement('td');
        // type="text" + inputmode: WebView الأندرويد يعرض أرقامًا عربية لـ type="number" حسب لغة الجهاز
        tdLabel.innerHTML = `<div class="pump-label"><input class="pump-num-input" type="text" inputmode="numeric" autocomplete="off" spellcheck="false" /></div>`;
        tr.appendChild(tdLabel);

        cols.forEach(col => {
            const td = document.createElement('td');
            td.innerHTML = `<input class="dose-input" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" data-dose-col="${col}" />`;
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    }

    bindLabSectionPersistence();
    loadLabData();
    if (window.APP_ROLE === 'lab_manager') {
        void fetchLatestLabFromCloudAndApply();
        setTimeout(() => void fetchLatestLabFromCloudAndApply(), 1500);
    }
}

function collectLabSectionData() {
    const toEn = v => convertArabicToEnglishNumbers(v == null ? '' : String(v));
    const rows = [];
    document.querySelectorAll('#labTableBody tr.pump-row').forEach(tr => {
        const pumpIn = tr.querySelector('.pump-num-input');
        const doses = [];
        tr.querySelectorAll('.dose-input').forEach(inp => doses.push(toEn(inp.value)));
        rows.push({ pump: toEn(pumpIn ? pumpIn.value : ''), doses });
    });
    const chlorine = [];
    document.querySelectorAll('#labSection tr.total-row .chlorine-input').forEach(inp => {
        chlorine.push(toEn(inp.value));
    });
    const la = document.getElementById('labDischargeLabelA');
    const lb = document.getElementById('labDischargeLabelB');
    return {
        v: 2,
        rows,
        chlorine,
        dischargeLabels: [toEn(la ? la.value : ''), toEn(lb ? lb.value : '')]
    };
}

/** حفظ بيانات جدول المعمل محلياً؛ رفع سحابي بـ Firestore .add() لمدير المعمل فقط (الفني: محلي فقط) */
function saveLabData(silent) {
    try {
        const payload = collectLabSectionData();
        localStorage.setItem(LAB_SECTION_STORAGE_KEY, JSON.stringify(payload));
        scheduleLabCloudAddDebounced();

        if (!silent) {
            showToast('تم حفظ بيانات المعمل');
            // إرسال إشعار يدوي للفنيين عند الضغط على الزر
            
        }
    } catch (e) {
        console.error(e);
        if (!silent) showToast('تعذر حفظ بيانات المعمل');
    }
}

function scheduleAutoSaveLab() {
    if (labAutoSaveTimer) clearTimeout(labAutoSaveTimer);
    labAutoSaveTimer = setTimeout(() => saveLabData(true), 450);
}

function bindLabSectionPersistence() {
    const wrap = document.getElementById('labSection');
    if (!wrap || wrap.dataset.labPersistBound === '1') return;
    wrap.dataset.labPersistBound = '1';
    wrap.addEventListener('input', e => {
        const t = e.target;
        if (t.matches('.pump-num-input, .dose-input, .chlorine-input, .lab-discharge-label-input')) {
            scheduleAutoSaveLab();
        }
    });
    wrap.addEventListener('change', e => {
        const t = e.target;
        if (t.matches('.pump-num-input, .dose-input, .chlorine-input, .lab-discharge-label-input')) {
            scheduleAutoSaveLab();
        }
    });
}

function getCloudFirestore() {
    if (typeof firebase === 'undefined' || !firebase.firestore) {
        console.error('[Firestore] Firebase SDK not loaded or firestore not available');
        return null;
    }
    if (!firebase.apps || !firebase.apps.length) {
        console.error('[Firestore] Firebase غير مهيّأ بعد — تأكد أن auth.js يحمّل قبل app.js وأن initFirebaseCore() يعمل');
        return null;
    }
    try {
        if (window.__firebaseDb) return window.__firebaseDb;
        const db = firebase.firestore();
        // Enable debug mode in development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            db.enablePersistence({ synchronizeTabs: true })
                .catch(() => {
                    // Ignore persistence errors in development
                });
        }
        return db;
    } catch (e) {
        console.error('[Firestore] Error initializing:', e);
        return null;
    }
}

function getCloudAuthUid() {
    if (window.__firebaseAuth && window.__firebaseAuth.currentUser) {
        return window.__firebaseAuth.currentUser.uid;
    }
    if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
        return firebase.auth().currentUser.uid;
    }
    return null;
}

/** Firestore لا يقبل الحقل undefined داخل الكائنات */
function stripUndefinedDeep(val) {
    if (val === undefined) return null;
    if (val === null || typeof val !== 'object') return val;
    if (Array.isArray(val)) return val.map(stripUndefinedDeep);
    const out = {};
    Object.keys(val).forEach(k => {
        const v = stripUndefinedDeep(val[k]);
        if (v !== undefined) out[k] = v;
    });
    return out;
}

function logCloudSyncError(context, err) {
    const msg = (err && (err.message || err.code || String(err))) || 'unknown';
    console.error('[Firestore sync]', context, msg, err);

    // Handle specific error types
    if (msg.includes('ERR_BLOCKED_BY_CLIENT') || msg.includes('blocked')) {
        console.warn('[Firestore] Connection blocked by browser extension/ad-blocker. Firestore will work in offline mode.');
        if (typeof showToast === 'function') {
            showToast('تم حظر الاتصال بـ Firestore - يعمل في وضع عدم الاتصال');
        }
    } else if (msg.includes('unavailable') || msg.includes('network')) {
        console.warn('[Firestore] Network error - will retry automatically');
    } else if (msg.includes('permission-denied')) {
        console.error('[Firestore] Permission denied - check Firebase rules');
    }

    const m = String(msg).match(/https:\/\/console\.firebase\.google\.com[^\s)'"]+/);
    if (m) {
        console.error('[Firestore] افتح هذا الرابط من المتصفح (نسخه من وحدة التحكم → Console):', m[0]);
    }
}

/** انتظار استعادة جلسة Firebase بعد تحميل الصفحة (مهم لـ lab / ops) */
async function waitForAuthUid(maxMs) {
    const cap = maxMs == null ? 12000 : maxMs;
    const step = 150;
    let waited = 0;
    while (waited < cap) {
        const uid = getCloudAuthUid();
        if (uid) {
            console.log('[Firestore] Auth UID found:', uid);
            return uid;
        }
        if (window.__firebaseAuth && window.__firebaseAuth.currentUser) {
            console.log('[Firestore] User exists but UID not ready, waiting...');
        } else {
            console.log('[Firestore] No current user, waiting...');
        }
        await new Promise(resolve => setTimeout(resolve, step));
        waited += step;
    }
    console.error('[Firestore] Timeout waiting for auth UID');
    return getCloudAuthUid();
}

/** بيانات الفني تبقى محلياً فقط — لا رفع لـ Firestore */
function shouldUploadManagerDataToCloud() {
    return window.APP_ROLE === 'lab_manager' || window.APP_ROLE === 'ops_manager';
}

const LAB_CLOUD_DEBOUNCE_MS = 2500;
const OPS_CLOUD_DEBOUNCE_MS = 2500;
let labCloudAddTimer = null;
let opsCloudAddTimer = null;

function applyLabDataToForm(dataLab) {
    if (!dataLab) return;

    const rowEls = document.querySelectorAll('#labTableBody tr.pump-row');
    dataLab.rows.forEach((r, i) => {
        const tr = rowEls[i];
        if (!tr) return;
        const pumpIn = tr.querySelector('.pump-num-input');
        if (pumpIn) pumpIn.value = convertArabicToEnglishNumbers(r.pump);
        const doseInputs = tr.querySelectorAll('.dose-input');
        r.doses.forEach((val, j) => {
            if (doseInputs[j]) doseInputs[j].value = convertArabicToEnglishNumbers(val);
        });
    });

    const chInputs = document.querySelectorAll('#labSection tr.total-row .chlorine-input');
    dataLab.chlorine.forEach((val, j) => {
        if (chInputs[j]) chInputs[j].value = convertArabicToEnglishNumbers(val);
    });

    const la = document.getElementById('labDischargeLabelA');
    const lb = document.getElementById('labDischargeLabelB');
    if (la) la.value = convertArabicToEnglishNumbers(dataLab.dischargeLabels[0] || '');
    if (lb) lb.value = convertArabicToEnglishNumbers(dataLab.dischargeLabels[1] || '');
}

async function pushLabPayloadToCloudWithAdd() {
    if (!shouldUploadManagerDataToCloud() || window.APP_ROLE !== 'lab_manager') return;
    const db = getCloudFirestore();
    if (!db) {
        logCloudSyncError('lab: no Firestore', new Error('firebase.firestore غير متاح'));
        return;
    }
    const uid = await waitForAuthUid(12000);
    if (!uid) {
        logCloudSyncError('lab: no auth uid', new Error('المستخدم غير مسجل بعد — انتظر قليلاً ثم احفظ مرة أخرى'));
        if (typeof showToast === 'function') showToast('لم يُستَرد الحساب بعد؛ أعد المحاولة بعد ثوانٍ');
        return;
    }
    const payload = stripUndefinedDeep(collectLabSectionData());
    const userRef = db.collection('users').doc(uid);
    const ts = firebase.firestore.FieldValue.serverTimestamp();

    // Retry logic for network issues
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
        try {
            console.log('[Firestore] Attempting lab data upload, attempt:', retryCount + 1);

            // First, add to uploads collection
            await userRef.collection('manager_lab_uploads').add({
                payload,
                createdAt: ts
            });

            // Then update snapshot
            await userRef.collection('app_sync_snapshots').doc('lab').set({
                payload,
                updatedAt: ts
            }, { merge: true });

            // NEW: Also update shared collection for tech users
            await db.collection('shared_data').doc('lab_latest').set({
                payload,
                updatedAt: ts,
                updatedBy: uid
            }, { merge: true });

            console.log('[Firestore] Lab data uploaded successfully (including shared)');
            if (typeof showToast === 'function') showToast('تم رفع بيانات المعمل بنجاح');

            // إرسال إشعار للفنيين بتحديث البيانات (داخلياً للتطبيق)
            if (typeof notifyLabDataUpdated === 'function') {
                void notifyLabDataUpdated();
            }

            return;

        } catch (e) {
            retryCount++;
            console.error(`[Firestore] Lab upload attempt ${retryCount} failed:`, e);

            // Check if it's a network/auth error that might be resolved by retrying
            if (e.code === 'unavailable' || e.code === 'deadline-exceeded' || e.code === 'permission-denied') {
                if (retryCount < maxRetries) {
                    console.log(`[Firestore] Retrying lab upload in ${retryCount * 1000}ms...`);
                    await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
                    continue;
                }
            }

            // If it's not retryable or we've exhausted retries, fail
            logCloudSyncError('lab push', e);
            if (typeof showToast === 'function') showToast('فشل رفع المعمل للسحابة — راجع Console');
            return;
        }
    }
}

function scheduleLabCloudAddDebounced() {
    if (!shouldUploadManagerDataToCloud() || window.APP_ROLE !== 'lab_manager') return;
    if (labCloudAddTimer) clearTimeout(labCloudAddTimer);
    labCloudAddTimer = setTimeout(() => {
        labCloudAddTimer = null;
        void pushLabPayloadToCloudWithAdd();
    }, LAB_CLOUD_DEBOUNCE_MS);
}

// وظيفة الحفظ اليدوي لخطة التشغيل (تُستدعى من الزر الجديد)
async function saveOpsManual() {
    try {
        // رفع البيانات للسحابة فوراً
        if (typeof pushOpPlanToCloudWithAdd === 'function') {
            await pushOpPlanToCloudWithAdd();
        }

        // إرسال الإشعار اليدوي للفنيين
        

        showToast('تم الحفظ وإرسال الإشعار بنجاح');
    } catch (e) {
        console.error('Error in saveOpsManual:', e);
        showToast('حدث خطأ أثناء الحفظ');
    }
}

async function fetchLatestLabFromCloudAndApply() {
    const db = getCloudFirestore();
    if (!db || !document.getElementById('labTableBody')) return;

    // Check role from window or localStorage
    const userRole = window.APP_ROLE || localStorage.getItem('userRole');
    const isManager = (userRole === 'lab_manager');
    const uid = await waitForAuthUid(8000);

    // Retry logic for fetching
    const maxRetries = 2;
    let retryCount = 0;

    while (retryCount < maxRetries) {
        try {
            console.log('[Firestore] Attempting lab data fetch, role:', userRole);
            let doc;
            if (isManager && uid) {
                // Managers load from their own private snapshot
                doc = await db.collection('users').doc(uid).collection('app_sync_snapshots').doc('lab').get();
            } else {
                // Others (tech or other managers) load from shared data
                doc = await db.collection('shared_data').doc('lab_latest').get();
            }

            if (!doc.exists) {
                console.log('[Firestore] Lab snapshot does not exist');
                return;
            }
            const data = doc.data();
            const rawPayload = data.payload;
            if (!rawPayload) {
                console.log('[Firestore] Lab snapshot has no payload');
                return;
            }
            const dataLab = migrateLabPayload(rawPayload);
            if (!dataLab) {
                console.log('[Firestore] Failed to migrate lab payload');
                return;
            }
            applyLabDataToForm(dataLab);
            localStorage.setItem(LAB_SECTION_STORAGE_KEY, JSON.stringify(rawPayload));

            // Save timestamp to avoid redundant toast from listener
            if (data.updatedAt) {
                localStorage.setItem('last_lab_update_ts', data.updatedAt.toMillis());
            }

            console.log('[Firestore] Lab data fetched and applied successfully');
            return;
        } catch (e) {
            retryCount++;
            console.error(`[Firestore] Lab fetch attempt ${retryCount} failed:`, e);
            if (retryCount < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, retryCount * 500));
                continue;
            }
            return;
        }
    }
}

async function pushOpPlanToCloudWithAdd() {
    if (!shouldUploadManagerDataToCloud() || window.APP_ROLE !== 'ops_manager') return;
    const db = getCloudFirestore();
    if (!db) {
        logCloudSyncError('ops: no Firestore', new Error('firebase.firestore غير متاح'));
        return;
    }
    const uid = await waitForAuthUid(12000);
    if (!uid) {
        logCloudSyncError('ops: no auth uid', new Error('المستخدم غير مسجل بعد'));
        if (typeof showToast === 'function') showToast('لم يُستَرد الحساب بعد؛ أعد المحاولة بعد ثوانٍ');
        return;
    }
    const yearEl = document.getElementById('opYearInput');
    const monthEl = document.getElementById('opMonthSel');
    const userRef = db.collection('users').doc(uid);
    const ts = firebase.firestore.FieldValue.serverTimestamp();
    const opYearlyDataClean = stripUndefinedDeep(JSON.parse(JSON.stringify(opYearlyData)));
    const row = {
        opYearlyData: opYearlyDataClean,
        op_plan_year: yearEl ? String(yearEl.value) : '',
        op_plan_month: monthEl ? String(monthEl.value) : '',
        createdAt: ts
    };

    // Retry logic for network issues
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
        try {
            console.log('[Firestore] Attempting ops plan upload, attempt:', retryCount + 1);

            // First, add to uploads collection
            await userRef.collection('manager_op_plan_uploads').add(row);

            // Then update snapshot
            await userRef.collection('app_sync_snapshots').doc('opsplan').set({
                opYearlyData: opYearlyDataClean,
                op_plan_year: row.op_plan_year,
                op_plan_month: row.op_plan_month,
                updatedAt: ts
            }, { merge: true });

            // NEW: Also update shared collection for tech users
            await db.collection('shared_data').doc('ops_latest').set({
                opYearlyData: opYearlyDataClean,
                op_plan_year: row.op_plan_year,
                op_plan_month: row.op_plan_month,
                updatedAt: ts,
                updatedBy: uid
            }, { merge: true });

            console.log('[Firestore] Ops plan uploaded successfully (including shared)');
            if (typeof showToast === 'function') showToast('تم رفع خطة التشغيل بنجاح');

            // إرسال إشعار للفنيين بتحديث خطة التشغيل (داخلياً للتطبيق)
            if (typeof notifyOpsPlanUpdated === 'function') {
                void notifyOpsPlanUpdated();
            }

            return;

        } catch (e) {
            retryCount++;
            console.error(`[Firestore] Ops upload attempt ${retryCount} failed:`, e);

            // Check if it's a network/auth error that might be resolved by retrying
            if (e.code === 'unavailable' || e.code === 'deadline-exceeded' || e.code === 'permission-denied') {
                if (retryCount < maxRetries) {
                    console.log(`[Firestore] Retrying ops upload in ${retryCount * 1000}ms...`);
                    await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
                    continue;
                }
            }

            // If it's not retryable or we've exhausted retries, fail
            logCloudSyncError('ops push', e);
            if (typeof showToast === 'function') showToast('فشل رفع خطة التشغيل — راجع Console');
            return;
        }
    }
}

function scheduleOpPlanCloudAddDebounced() {
    if (!shouldUploadManagerDataToCloud() || window.APP_ROLE !== 'ops_manager') return;
    if (opsCloudAddTimer) clearTimeout(opsCloudAddTimer);
    opsCloudAddTimer = setTimeout(() => {
        opsCloudAddTimer = null;
        void pushOpPlanToCloudWithAdd();
    }, OPS_CLOUD_DEBOUNCE_MS);
}

async function fetchLatestOpPlanFromCloudAndApply() {
    const db = getCloudFirestore();
    if (!db || !document.getElementById('opTableBody')) return;

    const userRole = window.APP_ROLE || localStorage.getItem('userRole');
    const isManager = (userRole === 'ops_manager');
    const uid = await waitForAuthUid(8000);

    const maxRetries = 2;
    let retryCount = 0;

    while (retryCount < maxRetries) {
        try {
            console.log('[Firestore] Attempting ops plan fetch, role:', userRole);
            let doc;
            if (isManager && uid) {
                doc = await db.collection('users').doc(uid).collection('app_sync_snapshots').doc('opsplan').get();
            } else {
                doc = await db.collection('shared_data').doc('ops_latest').get();
            }

            if (!doc.exists) {
                console.log('[Firestore] Ops snapshot does not exist');
                return;
            }
            const d = doc.data();
            if (d.opYearlyData && typeof d.opYearlyData === 'object') {
                opYearlyData = d.opYearlyData;
                localStorage.setItem('op_plan_yearly_data', JSON.stringify(opYearlyData));
            }
            if (d.op_plan_year != null && document.getElementById('opYearInput')) {
                document.getElementById('opYearInput').value = d.op_plan_year;
                localStorage.setItem('op_plan_year', String(d.op_plan_year));
            }
            if (d.op_plan_month != null && document.getElementById('opMonthSel')) {
                document.getElementById('opMonthSel').value = d.op_plan_month;
                localStorage.setItem('op_plan_month', String(d.op_plan_month));
            }

            if (d.updatedAt) {
                localStorage.setItem('last_ops_update_ts', d.updatedAt.toMillis());
            }

            loadOperatingPlan();
            buildOpTable();
            console.log('[Firestore] Ops plan fetched and applied successfully');
            return;
        } catch (e) {
            retryCount++;
            console.error(`[Firestore] Ops fetch attempt ${retryCount} failed:`, e);
            if (retryCount < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, retryCount * 500));
                continue;
            }
            return;
        }
    }
}

/**
 * جلب أحدث خطة تشغيل للمرشحة من السحابة وتطبيقها (للفنيين والمديرين)
 */
async function fetchLatestMurashahaFromCloudAndApply() {
    const db = getCloudFirestore();
    const userRole = window.APP_ROLE || localStorage.getItem('userRole');
    const isManager = (userRole === 'ops_manager');
    const uid = await waitForAuthUid(8000);

    try {
        console.log('[Firestore] Attempting murashaha plan fetch, role:', userRole);
        let doc;
        if (isManager && uid) {
            doc = await db.collection('users').doc(uid).collection('app_sync_snapshots').doc('operation_units').get();
        } else {
            doc = await db.collection('shared_data').doc('operation_units_latest').get();
        }

        if (doc.exists) {
            const data = doc.data();
            if (data && data.slots && typeof slots !== 'undefined') {
                slots = data.slots;
                if (typeof render === 'function') render();
                if (data.updatedAt) {
                    localStorage.setItem('last_murashaha_update_ts', data.updatedAt.toMillis());
                }
                console.log('[Firestore] Murashaha plan updated successfully');
            }
        }
    } catch (e) {
        console.error('[Firestore] Murashaha fetch failed:', e);
    }
}

function migrateLabPayload(parsed) {
    if (!parsed || !Array.isArray(parsed.rows)) return null;
    const rows = parsed.rows.map(r => {
        let doses = Array.isArray(r.doses) ? [...r.doses] : [];
        if (doses.length === 4) {
            const d3 = doses[1] != null ? String(doses[1]) : '';
            doses = [doses[0], d3, d3, doses[2], doses[3]].map(x => (x == null ? '' : String(x)));
        } else if (doses.length !== 5) {
            while (doses.length < 5) doses.push('');
            doses = doses.slice(0, 5).map(x => (x == null ? '' : String(x)));
        }
        return { pump: r.pump != null ? String(r.pump) : '', doses };
    });
    let chlorine = Array.isArray(parsed.chlorine) ? [...parsed.chlorine].map(x => (x == null ? '' : String(x))) : [];
    if (chlorine.length === 4) {
        const c1 = chlorine[1] || '';
        chlorine = [chlorine[0], c1, c1, chlorine[2], chlorine[3]];
    }
    while (chlorine.length < 5) chlorine.push('');
    if (chlorine.length > 5) chlorine = chlorine.slice(0, 5);
    let dischargeLabels = Array.isArray(parsed.dischargeLabels) ? parsed.dischargeLabels.map(x => (x == null ? '' : String(x))) : ['', ''];
    while (dischargeLabels.length < 2) dischargeLabels.push('');
    dischargeLabels = dischargeLabels.slice(0, 2);
    return { v: 2, rows, chlorine, dischargeLabels };
}

function loadLabData() {
    const raw = localStorage.getItem(LAB_SECTION_STORAGE_KEY);
    if (!raw) return;
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (e) {
        return;
    }
    const dataLab = migrateLabPayload(parsed);
    if (!dataLab) return;
    applyLabDataToForm(dataLab);
}

function resetLabSectionToEmpty() {
    document.querySelectorAll('#labTableBody .pump-num-input, #labTableBody .dose-input').forEach(el => { el.value = ''; });
    document.querySelectorAll('#labSection tr.total-row .chlorine-input').forEach(el => { el.value = ''; });
    const la = document.getElementById('labDischargeLabelA');
    const lb = document.getElementById('labDischargeLabelB');
    if (la) la.value = '';
    if (lb) lb.value = '';
}

// إنشاء الجدول
function createTable(section) {
    const table = document.getElementById(`${section}-table`);
    const config = sectionConfig[section];
    normalizeSectionData(section);

    // إنشاء الهيدر
    let html = '<thead><tr><th style="width: 60px;">#</th>';
    config.columns.forEach(col => {
        html += `<th>${col}</th>`;
    });
    html += '</tr></thead><tbody>';

    // إنشاء الصفوف
    for (let i = 0; i < config.rows; i++) {
        html += `<tr><td class="row-number">${i + 1}</td>`;
        config.columns.forEach((col, colIndex) => {
            // حساب tabindex بحيث تكون عملية التنقل عموديّة أولاً (عمود-أول) في قسم عنبر الكلور
            let tabindex = (i * config.columns.length) + colIndex + 1; // الافتراضي: ترتيب صف-أول (row-major)
            if (section === 'anbarChlor') {
                // عمود-أول (column-major): كل الخلايا في العمود A ثم العمود B
                // هذا يجعل Tab يمر عبر A أولاً حتى نهايته ثم ينتقل إلى B
                tabindex = (colIndex * config.rows) + i + 1;
            }

            // على الأجهزة المحمولة: نضيف enterkeyhint="next" لتشجيع لوحة المفاتيح على إظهار زر Next
            const enterHint = (section === 'anbarChlor') ? ' enterkeyhint="next"' : '';
            html += `<td><input type="text" inputmode="decimal" id="${section}-${i}-${colIndex}" data-section="${section}" data-row="${i}" data-col="${colIndex}" tabindex="${tabindex}"${enterHint} onchange="updateSum('${section}')" oninput=" autoSave('${section}')" onkeydown="handleKeyNav(event)"></td>`;
        });
        html += '</tr>';
    }

    // إضافة صف المجموع لكبائن الكلور
    if (section === 'kabayenChlor') {
        html += `<tr class="sum-row">
            <td class="row-number" style="background-color: #f0f0f0;">المجموع</td>
            <td><span id="${section}-sum" style="font-weight: bold; color: #667eea;">0</span></td>
        </tr>`;
    }

    html += '</tbody>';
    table.innerHTML = html;

    // تحميل البيانات
    loadDataToTable(section);
}

function addCell(section) {
    const config = sectionConfig[section];
    if (!config) return;
    config.rows += 1;
    saveRowCount(section);
    normalizeSectionData(section);
    createTable(section);
    showToast('تمت إضافة خلية جديدة');
}

function removeCell(section) {
    const config = sectionConfig[section];
    if (!config) return;
    const minRows = config.minRows || 1;
    if (config.rows <= minRows) {
        alert('لا يمكن حذف المزيد من الخلايا في هذا القسم');
        return;
    }
    config.rows -= 1;
    saveRowCount(section);
    if (data[section]) {
        data[section] = data[section].slice(0, config.rows);
        localStorage.setItem(`readings_${section}`, JSON.stringify(data[section]));
    }
    createTable(section);
    showToast('تم حذف خلية');
}

// تنقل بين الخلايا في عنبر الكلور - عمودي فقط
function handleKeyNav(e) {
    const target = e.target;
    const section = target.dataset.section;
    if (section !== 'anbarChlor') return;

    const rowIndex = parseInt(target.dataset.row, 10);
    const colIndex = parseInt(target.dataset.col, 10);
    const maxRows = sectionConfig.anbarChlor.rows;

    // منع السلوك الافتراضي لبعض المفاتيح (لا نمنع Tab حتى يلتزم التبويب بترتيب tabindex)
    if (['Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
    }

    // Enter: الانتقال للصف التالي في نفس العمود
    if (e.key === 'Enter') {
        if (rowIndex < maxRows - 1) {
            // الانتقال للصف التالي في نفس العمود
            const nextInput = document.getElementById(`${section}-${rowIndex + 1}-${colIndex}`);
            if (nextInput) nextInput.focus();
        } else {
            // آخر صف في A -> الانتقال لأول صف في B
            if (colIndex === 0) {
                const nextInput = document.getElementById(`${section}-0-1`);
                if (nextInput) nextInput.focus();
            }
            // آخر صف في B -> الانتقال لأول صف في A
            else {
                const nextInput = document.getElementById(`${section}-0-0`);
                if (nextInput) nextInput.focus();
            }
        }
    }
    // ملاحظة: بالنسبة لمفتاح Tab نترك السلوك الافتراضي حتى يعمل زر "التالي" في لوحات مفاتيح الأندرويد ويعتمد على tabindex
    // ArrowDown: للأسفل في نفس العمود
    else if (e.key === 'ArrowDown') {
        if (rowIndex < maxRows - 1) {
            const nextInput = document.getElementById(`${section}-${rowIndex + 1}-${colIndex}`);
            if (nextInput) nextInput.focus();
        }
    }
    // ArrowUp: للأعلى في نفس العمود
    else if (e.key === 'ArrowUp') {
        if (rowIndex > 0) {
            const nextInput = document.getElementById(`${section}-${rowIndex - 1}-${colIndex}`);
            if (nextInput) nextInput.focus();
        }
    }
    // إلغاء حركة الأسهم اليمين واليسار تماماً
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        // لا نفعل شيء - منع الحركة الأفقية
        return;
    }
}

// فتح القسم والتركيز على أول خلية
function openSection(section) {
    showSection(section);
    setTimeout(() => {
        const firstInput = document.querySelector(`#${section}-0-0`);
        if (firstInput) {
            firstInput.focus();
            firstInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
}

// عرض القسم
function showSection(sectionId) {
    const target = document.getElementById(sectionId);
    if (!target) return;
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    target.classList.add('active');
}

// بناء جدول عرض كل البيانات (قراءة فقط) - قيم داخل خلايا منفصلة أفقياً
function buildAllDataTable() {
    const table = document.getElementById('allData-table');
    if (!table) return;

    // الأعمدة تمثل الأقسام (عرض رأسي للقيم)
    const sectionColumns = [
        { key: 'akra', label: 'العكرة' },
        { key: 'morashaha', label: 'المرشحة' },
        { key: 'sludge', label: 'Sludge' },
        { key: 'decant', label: 'Decant' },
        { key: 'booster', label: 'Booster' },
        { key: 'anbarChlor', label: 'A', colIndex: 0 },
        { key: 'anbarChlor', label: 'B', colIndex: 1 },
        { key: 'kabayenChlor', label: 'كبائن الكلور' },
        { key: 'shabba', label: 'الشبة' },
        { key: 'electricity', label: 'غرفة الكهرباء' }
    ];

    // إضافة الأقسام المخصصة
    const defaultSections = ['akra', 'morashaha', 'sludge', 'decant', 'booster', 'anbarChlor', 'kabayenChlor', 'shabba', 'electricity'];
    Object.keys(sectionConfig).forEach(sectionId => {
        if (!defaultSections.includes(sectionId) && sectionMetadata[sectionId]) {
            const metadata = sectionMetadata[sectionId];
            sectionColumns.push({ key: sectionId, label: metadata.label });
        }
    });

    // احسب أكبر عدد صفوف مطلوب
    let maxRows = 0;
    const preparedData = {};
    sectionColumns.forEach(col => {
        if (sectionConfig[col.key]) {
            normalizeSectionData(col.key);
            preparedData[col.key] = data[col.key] || [];
        }
        const config = sectionConfig[col.key];
        if (config) {
            maxRows = Math.max(maxRows, config.rows);
        }
    });

    // رؤوس الأعمدة (ترقيم رأسي)
    let html = '<thead><tr><th style="width:60px">#</th>';
    sectionColumns.forEach(col => {
        html += `<th>${col.label}</th>`;
    });
    html += '</tr></thead><tbody>';

    for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
        html += `<tr><td class="row-number">${rowIndex + 1}</td>`;
        sectionColumns.forEach(col => {
            const rows = preparedData[col.key] || [];
            const colIndex = col.colIndex !== undefined ? col.colIndex : 0;
            const cellVal = (rows[rowIndex] && rows[rowIndex][colIndex]) || '';
            html += `<td>${convertArabicToEnglishNumbers(cellVal) || ''}</td>`;
        });
        html += '</tr>';
    }

    html += '</tbody>';
    table.innerHTML = html;
}

function openAllData() {
    loadAllData();
    initializeSectionRows();
    Object.keys(sectionConfig).forEach(section => normalizeSectionData(section));
    document.body.classList.remove('landscape-sim');
    hideRotateOverlay();
    showSection('allData');
    buildAllDataTable();
}

// فتح وإغلاق عرض كل البيانات
// محاولة القفل عبر Screen Orientation API مع fallback لعرض رسالة تدوير
function tryLockWithScreenAPI() {
    if (screen && screen.orientation && typeof screen.orientation.lock === 'function') {
        screen.orientation.lock('landscape').then(() => {
            // تم القفل بنجاح
            hideRotateOverlay();
        }).catch(e => {
            console.log('فشل تدوير الشاشة بالطريقة الأولى: ' + e);
            // عرض تلميح للمستخدم لتدوير الجهاز يدويًا
            showRotateOverlay();
        });
    } else {
        // لا يوجد دعم للـ API: عرض تلميح للمستخدم لتدوير الجهاز
        showRotateOverlay();
    }
}

// عرض تراكب يطلب تدوير الجهاز يدويا (fallback عندما لا يمكن قفل التدوير)
function showRotateOverlay() {
    let overlay = document.getElementById('rotateOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'rotateOverlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.right = '0';
        overlay.style.bottom = '0';
        overlay.style.background = 'rgba(0,0,0,0.85)';
        overlay.style.color = '#fff';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '9999';
        overlay.style.textAlign = 'center';
        overlay.innerHTML = `<div style="max-width:90%;line-height:1.6">
            <h2 style="margin-bottom:8px">يرجى تدوير الجهاز</h2>
            <p>للحصول على أفضل عرض لعرض جميع البيانات، يرجى تدوير هاتفك إلى الوضع الأفقي (Landscape).</p>
            <button id="rotateOverlayBtn" style="margin-top:12px;padding:10px 16px;border-radius:6px;border:none;background:#667eea;color:#fff;font-size:16px">تم التدوير</button>
        </div>`;
        document.body.appendChild(overlay);
        document.getElementById('rotateOverlayBtn').addEventListener('click', () => {
            hideRotateOverlay();
        });
    } else {
        overlay.style.display = 'flex';
    }
}

function hideRotateOverlay() {
    const overlay = document.getElementById('rotateOverlay');
    if (overlay) overlay.style.display = 'none';
}

// وظيفة مساعدة لتدوير الشاشة
function forceLandscapeOrientation() {
    // محاولة استخدام طرق بديلة لتدوير الشاشة
    if (window.orientation !== undefined) {
        // إضافة مستمع للتوجيه
        window.addEventListener('orientationchange', function () {
            if (window.orientation === 0 || window.orientation === 180) {
                alert('يرجى تدوير الجهاز للوضع الأفقي للحصول على أفضل عرض للبيانات');
            }
        });

        // التحقق من التوجيه الحالي
        if (window.orientation === 0 || window.orientation === 180) {
            alert('يرجى تدوير الجهاز للوضع الأفقي للحصول على أفضل عرض للبيانات');
        }
    }

    // إضافة CSS للتفضيل الأفقي
    document.body.style.setProperty('--app-orientation', 'landscape');
}

function closeAllData() {
    showSection('mainMenu');
    // إزالة نمط العرض الأفقي المحاكى
    try {
        document.body.classList.remove('landscape-sim');
    } catch (_) { }
}

// حفظ البيانات
function saveData(section) {
    const config = sectionConfig[section];
    const sectionData = [];

    for (let i = 0; i < config.rows; i++) {
        const rowData = [];
        for (let j = 0; j < config.columns.length; j++) {
            const input = document.getElementById(`${section}-${i}-${j}`);
            rowData.push(convertArabicToEnglishNumbers(input.value));
        }
        sectionData.push(rowData);
    }

    data[section] = sectionData;
    localStorage.setItem(`readings_${section}`, JSON.stringify(sectionData));

    showToast();
}



// حفظ تلقائي مع تأخير
function autoSave(section) {
    // إلغاء المؤقت السابق إذا كان موجوداً
    if (autoSaveTimeouts[section]) {
        clearTimeout(autoSaveTimeouts[section]);
    }

    // حفظ بعد ثانيتين من آخر كتابة
    autoSaveTimeouts[section] = setTimeout(() => {
        const config = sectionConfig[section];
        const sectionData = [];

        for (let i = 0; i < config.rows; i++) {
            const rowData = [];
            for (let j = 0; j < config.columns.length; j++) {
                const input = document.getElementById(`${section}-${i}-${j}`);
                rowData.push(convertArabicToEnglishNumbers(input.value));
            }
            sectionData.push(rowData);
        }

        data[section] = sectionData;
        localStorage.setItem(`readings_${section}`, JSON.stringify(sectionData));

        // تحديث المجموع إذا كان مطلوباً
        updateSum(section);

        // تم إزالة إرسال الإشعار التلقائي من هنا بطلب المستخدم
        // الحفظ التلقائي يتم في الخلفية بدون إشعار للفنيين

        // رسالة حفظ تلقائي (اختيارية - يمكن إزالتها)
        console.log(`تم الحفظ التلقائي لـ ${section}`);
    }, 2000);
}

// تحميل البيانات
function loadAllData() {
    Object.keys(sectionConfig).forEach(section => {
        const saved = localStorage.getItem(`readings_${section}`);
        if (saved) {
            try {
                const parsedData = JSON.parse(saved);
                // تحويل جميع القيم إلى أرقام إنجليزية
                data[section] = parsedData.map(row =>
                    row.map(value => convertArabicToEnglishNumbers(value))
                );
                // إعادة حفظ البيانات المنظفة
                localStorage.setItem(`readings_${section}`, JSON.stringify(data[section]));
            } catch (e) {
                console.error(`خطأ في تحميل بيانات ${section}:`, e);
                data[section] = [];
            }
        }
    });

    // تنظيف بيانات الأسطوانات الفارغة
    const savedEmpty = localStorage.getItem('readings_anbarChlorEmpty');
    if (savedEmpty) {
        try {
            const parsedEmpty = JSON.parse(savedEmpty);
            const cleanedEmpty = parsedEmpty.map(row =>
                row.map(value => convertArabicToEnglishNumbers(value))
            );
            localStorage.setItem('readings_anbarChlorEmpty', JSON.stringify(cleanedEmpty));
        } catch (e) {
            console.error('خطأ في تحميل بيانات الأسطوانات الفارغة:', e);
        }
    }
}

// تحميل البيانات للجدول
function loadDataToTable(section) {
    if (!data[section]) return;

    const config = sectionConfig[section];
    data[section].forEach((rowData, rowIndex) => {
        rowData.forEach((value, colIndex) => {
            const input = document.getElementById(`${section}-${rowIndex}-${colIndex}`);
            if (input) input.value = convertArabicToEnglishNumbers(value);
        });
    });
}

// التمرير للصف
function scrollToRow(section, rowIndex) {
    const config = sectionConfig[section];
    if (rowIndex === -1) rowIndex = config.rows - 1;

    const input = document.getElementById(`${section}-${rowIndex}-0`);
    if (input) {
        input.focus();
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// الانتقال للخلية الفارغة التالية
function scrollToNextEmpty(section) {
    const config = sectionConfig[section];

    for (let i = 0; i < config.rows; i++) {
        const input = document.getElementById(`${section}-${i}-0`);
        if (input && !input.value) {
            input.focus();
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
    }

    alert('جميع الخلايا ممتلئة!');
}

// تصدير CSV
function exportToCSV(section) {
    const config = sectionConfig[section];
    let csv = '#,' + config.columns.join(',') + '\n';

    if (data[section]) {
        data[section].forEach((row, index) => {
            csv += `${index + 1},${row.join(',')}` + '\n';
        });
    }

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${section}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

// مسح البيانات
function clearData(section) {
    if (confirm('هل أنت متأكد من مسح جميع البيانات؟')) {
        localStorage.removeItem(`readings_${section}`);
        data[section] = null;

        const config = sectionConfig[section];
        for (let i = 0; i < config.rows; i++) {
            for (let j = 0; j < config.columns.length; j++) {
                const input = document.getElementById(`${section}-${i}-${j}`);
                if (input) input.value = '';
            }
        }

        showToast('تم المسح بنجاح');
    }
}

// مسح جميع البيانات لكل الأقسام
function clearAllData() {
    if (!confirm('هل أنت متأكد من مسح جميع البيانات لكل الأقسام؟')) return;
    Object.keys(sectionConfig).forEach(section => {
        localStorage.removeItem(`readings_${section}`);
        data[section] = null;
        const cfg = sectionConfig[section];
        for (let i = 0; i < cfg.rows; i++) {
            for (let j = 0; j < cfg.columns.length; j++) {
                const input = document.getElementById(`${section}-${i}-${j}`);
                if (input) input.value = '';
            }
        }
    });

    localStorage.removeItem(LAB_SECTION_STORAGE_KEY);
    if (document.getElementById('labTableBody')) resetLabSectionToEmpty();

    // إذا كان عرض كل البيانات مفتوحاً، أعد بناء الجدول الفارغ
    const allDataSection = document.getElementById('allData');
    if (allDataSection && allDataSection.classList.contains('active')) {
        buildAllDataTable();
    }

    showToast('تم مسح جميع البيانات');
}

// عرض رسالة النجاح
function showToast(message = 'تم الحفظ بنجاح') {
    const toast = document.getElementById('successToast');
    toast.textContent = '✓ ' + message;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 2000);
}

// تحديث المجموع لكبائن الكلور
function updateSum(section) {
    if (section === 'kabayenChlor') {
        let sum = 0;
        const config = sectionConfig[section];

        for (let i = 0; i < config.rows; i++) {
            const input = document.getElementById(`${section}-${i}-0`);
            if (input && input.value) {
                const englishValue = convertArabicToEnglishNumbers(input.value);
                sum += parseFloat(englishValue) || 0;
            }
        }

        document.getElementById(`${section}-sum`).textContent = sum.toFixed(2);
    }
}

// تشغيل التطبيق مرة واحدة عند اكتمال DOM (أفضل من window.onload مع الصفحات المصغّرة lab / ops)
function startAppOnce() {
    if (window.__APP_INIT_DONE) return;
    window.__APP_INIT_DONE = true;
    init();
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startAppOnce);
} else {
    startAppOnce();
}

// ====== قسم الأسطوانات الفارغة داخل عنبر الكلور ======
function createAnbarChlorEmptyTable() {
    const table = document.getElementById('anbarChlor-empty-table');
    if (!table) return;

    // جدول بدون thead: صفّان A و B، وأربعة أعمدة إدخال (الأول لاسم الصف + 4 إدخالات)
    let html = '<tbody>';
    const rows = ['A', 'B'];
    rows.forEach((rowLabel, rowIndex) => {
        html += '<tr>';
        // عمود اسم الصف
        html += `<td class="row-number">${rowLabel}</td>`;
        // أربعة أعمدة إدخال مع تنقل عمودي (column-major) وتمييز "التالي" للوحة المفاتيح
        for (let colIndex = 0; colIndex < 4; colIndex++) {
            const id = `anbarChlorEmpty-${rowIndex}-${colIndex}`;
            // نستخدم نطاق tabindex أعلى لتجنب التداخل مع جدول عنبر الكلور الأساسي (الذي يستخدم 1..N)
            const tabindex = 100 + (colIndex * 2) + rowIndex + 1; // عمود-أول، يبدأ من 101
            html += `<td><input type="text" inputmode="decimal" enterkeyhint="next" tabindex="${tabindex}" id="${id}" data-row="${rowIndex}" data-col="${colIndex}" oninput=" autoSaveAnbarChlorEmpty()"></td>`;
        }
        html += '</tr>';
    });
    html += '</tbody>';
    table.innerHTML = html;

    loadAnbarChlorEmpty();
}

function loadAnbarChlorEmpty() {
    const saved = localStorage.getItem('readings_anbarChlorEmpty');
    if (!saved) return;
    try {
        const parsed = JSON.parse(saved);
        for (let r = 0; r < 2; r++) {
            for (let c = 0; c < 4; c++) {
                const input = document.getElementById(`anbarChlorEmpty-${r}-${c}`);
                if (input && parsed[r] && parsed[r][c] !== undefined) {
                    input.value = convertArabicToEnglishNumbers(parsed[r][c]);
                }
            }
        }
    } catch (_) { }
}

function autoSaveAnbarChlorEmpty() {
    const sectionData = [];
    for (let r = 0; r < 2; r++) {
        const rowData = [];
        for (let c = 0; c < 4; c++) {
            const input = document.getElementById(`anbarChlorEmpty-${r}-${c}`);
            rowData.push(input ? convertArabicToEnglishNumbers(input.value) : '');
        }
        sectionData.push(rowData);
    }
    localStorage.setItem('readings_anbarChlorEmpty', JSON.stringify(sectionData));

    // تم إلغاء الإشعار التلقائي من هنا بطلب المستخدم
}

function clearAnbarChlorEmpty() {
    if (!confirm('هل أنت متأكد من مسح بيانات الأسطوانات الفارغة؟')) return;
    localStorage.removeItem('readings_anbarChlorEmpty');
    for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 4; c++) {
            const input = document.getElementById(`anbarChlorEmpty-${r}-${c}`);
            if (input) input.value = '';
        }
    }
    showToast('تم مسح الأسطوانات الفارغة');
}

// ============= وظائف الشريط الجانبي =============
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
}

// إغلاق الشريط الجانبي عند النقر خارجه
document.addEventListener('click', function (event) {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');

    if (sidebar && sidebar.classList.contains('open')) {
        if (!sidebar.contains(event.target) && !sidebarToggle.contains(event.target)) {
            sidebar.classList.remove('open');
        }
    }
});

// ============= وظائف جدول الإجازات =============
const daysOfWeek = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

// تهيئة جدول الإجازات
function initVacationTable() {
    const tbody = document.getElementById('vacation-tbody');
    if (!tbody) return;

    let html = '';
    for (let i = 0; i < 7; i++) {
        html += `<tr>
            <td class="day-cell">${daysOfWeek[i]}</td>
            <td><select id="vacation-${i}-name1" data-row="${i}" data-col="0" onchange="updateVacationDropdowns(${i}); autoSaveVacation()"></select></td>
            <td><select id="vacation-${i}-name2" data-row="${i}" data-col="1" onchange="updateVacationDropdowns(${i}); autoSaveVacation()"></select></td>
            <td><select id="vacation-${i}-name3" data-row="${i}" data-col="2" onchange="updateVacationDropdowns(${i}); autoSaveVacation()"></select></td>
        </tr>`;
    }
    tbody.innerHTML = html;

    // تحميل البيانات المحفوظة
    loadVacationSchedule();
}

// تحديث خيارات الـ dropdowns في صف معين
function updateVacationDropdowns(rowIndex) {
    const colleagues = loadColleagues();

    // الحصول على الأسماء المختارة في هذا الصف
    const selectedInRow = [];
    for (let col = 0; col < 3; col++) {
        const select = document.getElementById(`vacation-${rowIndex}-name${col + 1}`);
        if (select && select.value) {
            selectedInRow.push(select.value);
        }
    }

    // تحديث كل dropdown في الصف
    for (let col = 0; col < 3; col++) {
        const select = document.getElementById(`vacation-${rowIndex}-name${col + 1}`);
        if (!select) continue;

        const currentValue = select.value;

        // بناء الخيارات
        let options = '<option value="">-- اختر --</option>';
        colleagues.forEach(colleague => {
            // إظهار الاسم فقط إذا لم يكن محدداً في نفس الصف أو كان هو القيمة الحالية
            if (!selectedInRow.includes(colleague.name) || colleague.name === currentValue) {
                const selected = colleague.name === currentValue ? 'selected' : '';
                options += `<option value="${colleague.name}" ${selected}>${colleague.name}</option>`;
            }
        });

        select.innerHTML = options;
    }
}

// تحديث جميع dropdowns في الجدول
function updateAllVacationDropdowns() {
    for (let i = 0; i < 7; i++) {
        updateVacationDropdowns(i);
    }
}

// تحديث dropdowns في صف معين مع الحفاظ على القيم المحفوظة
function updateVacationDropdownsWithValues(rowIndex, name1Value, name2Value, name3Value) {
    const colleagues = loadColleagues();

    // القيم المختارة في هذا الصف
    const selectedInRow = [];
    if (name1Value) selectedInRow.push(name1Value);
    if (name2Value) selectedInRow.push(name2Value);
    if (name3Value) selectedInRow.push(name3Value);

    // تحديث كل dropdown في الصف
    const values = [name1Value, name2Value, name3Value];

    for (let col = 0; col < 3; col++) {
        const select = document.getElementById(`vacation-${rowIndex}-name${col + 1}`);
        if (!select) continue;

        const currentValue = values[col];

        // بناء الخيارات
        let options = '<option value="">-- اختر --</option>';
        colleagues.forEach(colleague => {
            // إظهار الاسم فقط إذا لم يكن محدداً في نفس الصف أو كان هو القيمة الحالية
            if (!selectedInRow.includes(colleague.name) || colleague.name === currentValue) {
                const selected = colleague.name === currentValue ? 'selected' : '';
                options += `<option value="${colleague.name}" ${selected}>${colleague.name}</option>`;
            }
        });

        select.innerHTML = options;
    }
}

// تحميل جدول الإجازات حسب الوردية
function loadVacationSchedule() {
    const shift = document.getElementById('shiftSelect').value;
    const storageKey = `vacation_schedule_${shift}`;
    const savedData = localStorage.getItem(storageKey);

    console.log(`تحميل بيانات الوردية ${shift}`);

    // تحميل البيانات المحفوظة أولاً
    let dataToLoad = null;
    if (savedData) {
        dataToLoad = JSON.parse(savedData);
        console.log('البيانات المحفوظة:', dataToLoad);
    } else {
        console.log('لا توجد بيانات محفوظة لهذه الوردية');
    }

    // تحديث جميع الـ dropdowns مع الحفاظ على القيم المحفوظة
    for (let i = 0; i < 7; i++) {
        const name1Value = dataToLoad && dataToLoad[i] ? dataToLoad[i].name1 || '' : '';
        const name2Value = dataToLoad && dataToLoad[i] ? dataToLoad[i].name2 || '' : '';
        const name3Value = dataToLoad && dataToLoad[i] ? dataToLoad[i].name3 || '' : '';

        // تحديث الـ dropdowns مع تمرير القيم المحفوظة
        updateVacationDropdownsWithValues(i, name1Value, name2Value, name3Value);
    }
}

// حفظ تلقائي لجدول الإجازات
let vacationAutoSaveTimeout;
function autoSaveVacation() {
    clearTimeout(vacationAutoSaveTimeout);
    vacationAutoSaveTimeout = setTimeout(() => {
        saveVacationSchedule(true); // true = حفظ صامت بدون رسالة
    }, 1000);
}

// حفظ جدول الإجازات
function saveVacationSchedule(silent = false) {
    const shift = document.getElementById('shiftSelect').value;
    const storageKey = `vacation_schedule_${shift}`;
    const data = [];

    for (let i = 0; i < 7; i++) {
        const name1Input = document.getElementById(`vacation-${i}-name1`);
        const name2Input = document.getElementById(`vacation-${i}-name2`);
        const name3Input = document.getElementById(`vacation-${i}-name3`);

        data.push({
            name1: name1Input ? name1Input.value : '',
            name2: name2Input ? name2Input.value : '',
            name3: name3Input ? name3Input.value : ''
        });
    }

    localStorage.setItem(storageKey, JSON.stringify(data));
    console.log(`تم حفظ بيانات الوردية ${shift}:`, data);

    

    if (!silent) {
        showToast('تم حفظ جدول الإجازات بنجاح');
    }
}

// إعادة تعيين جدول الإجازات (إعادة تحميل الأسماء بشكل صحيح)
function resetVacationTable() {
    const shift = document.getElementById('shiftSelect').value;
    const shiftNames = {
        'morning': 'الصباحية',
        'evening': 'المسائية',
        'night': 'الليلية'
    };

    if (!confirm(`هل تريد إعادة تعيين جدول الوردية ${shiftNames[shift]}؟\n\nسيتم:\n✓ مسح البيانات الحالية\n✓ إعادة تحميل قائمة الأسماء من قائمة الزملاء\n✓ إعادة تهيئة القوائم المنسدلة`)) return;

    const storageKey = `vacation_schedule_${shift}`;

    // مسح البيانات المحفوظة للوردية الحالية فقط
    localStorage.removeItem(storageKey);

    // مسح القيم الحالية أولاً
    for (let i = 0; i < 7; i++) {
        const name1Select = document.getElementById(`vacation-${i}-name1`);
        const name2Select = document.getElementById(`vacation-${i}-name2`);
        const name3Select = document.getElementById(`vacation-${i}-name3`);

        if (name1Select) name1Select.value = '';
        if (name2Select) name2Select.value = '';
        if (name3Select) name3Select.value = '';
    }

    // إعادة تحميل الجدول بالكامل مع القوائم المحدثة
    loadVacationSchedule();

    showToast(`تم إعادة تعيين جدول الوردية ${shiftNames[shift]} بنجاح ✓`);
}

// مسح جدول الإجازات (للاستخدام الداخلي)
function clearVacationSchedule() {
    const shift = document.getElementById('shiftSelect').value;
    const storageKey = `vacation_schedule_${shift}`;
    localStorage.removeItem(storageKey);

    for (let i = 0; i < 7; i++) {
        const name1Input = document.getElementById(`vacation-${i}-name1`);
        const name2Input = document.getElementById(`vacation-${i}-name2`);
        const name3Input = document.getElementById(`vacation-${i}-name3`);

        if (name1Input) name1Input.value = '';
        if (name2Input) name2Input.value = '';
        if (name3Input) name3Input.value = '';
    }
}

// مشاركة جدول الإجازات كصورة
async function shareVacationTable() {
    try {
        const shift = document.getElementById('shiftSelect').value;
        const vacationType = document.getElementById('vacationTypeSelect').value;
        const shiftNames = {
            'morning': 'الصباحية',
            'evening': 'المسائية',
            'night': 'الليلية'
        };

        // إنشاء عنصر مؤقت يحتوي على الجدول مع العنوان
        const tempContainer = document.createElement('div');
        tempContainer.style.cssText = `
            position: fixed;
            left: -9999px;
            top: 0;
            background: white;
            padding: 25px;
            direction: rtl;
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
        `;

        // إضافة العنوان
        const header = document.createElement('div');
        header.style.cssText = `
            text-align: center;
            margin-bottom: 20px;
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            border-radius: 12px 12px 0 0;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;

        let vacationTypeText = vacationType ? ` - ${vacationType}` : '';
        header.innerHTML = `
            <h2 style="color: white; margin: 0 0 10px 0; font-size: 28px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">
                📋 جدول الإجازات
            </h2>
            <h3 style="color: #f0f0f0; margin: 0; font-size: 18px; font-weight: 500; background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; display: inline-block;">
                الوردية: ${shiftNames[shift]}${vacationTypeText}
            </h3>
        `;

        // نسخ الجدول
        const tableWrapper = document.querySelector('#vacationSchedule .table-wrapper');
        const tableClone = tableWrapper.cloneNode(true);

        // تطبيق تنسيقات إضافية على النسخة
        tableClone.style.cssText = `
            background: white;
            border-radius: 12px;
            overflow: visible;
            max-height: none;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        `;

        const table = tableClone.querySelector('table');
        table.style.cssText = `
            width: 100%;
            border-collapse: collapse;
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
        `;

        // إزالة صف العناوين (thead)
        const thead = table.querySelector('thead');
        if (thead) {
            thead.remove();
        }

        // تنسيق الخلايا
        const cells = tableClone.querySelectorAll('td, th');
        cells.forEach(cell => {
            cell.style.border = '2px solid #ddd';
            cell.style.padding = '14px 12px';
            cell.style.textAlign = 'center';
            cell.style.verticalAlign = 'middle';

            if (cell.tagName === 'TH') {
                cell.style.background = '#667eea';
                cell.style.color = 'white';
                cell.style.fontSize = '16px';
                cell.style.fontWeight = 'bold';
            } else {
                cell.style.background = '#fafafa';
                cell.style.fontSize = '15px';
            }

            // تنسيق خاص لعمود الأيام
            if (cell.classList.contains('day-cell')) {
                cell.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                cell.style.fontWeight = 'bold';
                cell.style.color = 'white';
                cell.style.fontSize = '16px';
                cell.style.textShadow = '1px 1px 2px rgba(0,0,0,0.2)';
                cell.style.minWidth = '100px';
            }
        });

        // تحويل الـ inputs والـ selects إلى نصوص وتحديد الأعمدة الفارغة
        const rows = table.querySelectorAll('tbody tr');
        const columnHasData = [true, false, false, false]; // عمود الأيام دائماً موجود

        // فحص كل صف لمعرفة الأعمدة التي تحتوي على بيانات
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            cells.forEach((cell, index) => {
                if (index > 0) { // تجاهل عمود الأيام
                    const input = cell.querySelector('input, select');
                    if (input && input.value && input.value.trim() !== '') {
                        columnHasData[index] = true;
                    }
                }
            });
        });

        // تحويل الـ inputs والـ selects إلى نصوص
        const inputs = tableClone.querySelectorAll('input, select');
        inputs.forEach(input => {
            const value = input.value || '';
            const span = document.createElement('span');
            span.textContent = value || '-';
            span.style.cssText = `
                display: block;
                padding: 6px;
                font-size: 15px;
                color: ${value ? '#333' : '#ccc'};
                font-weight: ${value ? '500' : '400'};
                text-align: center;
                line-height: 1.4;
            `;
            input.parentNode.replaceChild(span, input);
        });

        // إخفاء الأعمدة الفارغة وتحسين التنسيق
        rows.forEach((row, rowIndex) => {
            const cells = row.querySelectorAll('td');

            // تلوين الصفوف بالتناوب
            if (rowIndex % 2 === 0) {
                cells.forEach(cell => {
                    if (!cell.classList.contains('day-cell')) {
                        cell.style.background = '#ffffff';
                    }
                });
            }

            cells.forEach((cell, index) => {
                if (index > 0 && !columnHasData[index]) {
                    cell.style.display = 'none';
                } else if (index > 0) {
                    // تحسين تنسيق الخلايا التي تحتوي على بيانات
                    const span = cell.querySelector('span');
                    if (span && span.textContent && span.textContent !== '-') {
                        cell.style.background = '#e8f4f8';
                        cell.style.borderLeft = '3px solid #667eea';
                        span.style.fontWeight = '600';
                        span.style.color = '#2c3e50';
                    }
                }
            });
        });

        // إضافة footer مع التاريخ
        const footer = document.createElement('div');
        footer.style.cssText = `
            text-align: center;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 2px solid #e0e0e0;
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
        `;

        const currentDate = new Date().toLocaleDateString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        footer.innerHTML = `
            <p style="margin: 5px 0; font-size: 13px; color: #666;">
                <i class="fas fa-calendar-alt"></i> تاريخ الإنشاء: ${currentDate}
            </p>
            <p style="margin: 5px 0; font-size: 12px; color: #999;">
                برنامج التشغيل - إدارة الإجازات
            </p>
        `;

        tempContainer.appendChild(header);
        tempContainer.appendChild(tableClone);
        tempContainer.appendChild(footer);
        document.body.appendChild(tempContainer);

        // التقاط الصورة
        const canvas = await html2canvas(tempContainer, {
            backgroundColor: '#ffffff',
            scale: 2,
            logging: false,
            useCORS: true
        });

        // إزالة العنصر المؤقت
        document.body.removeChild(tempContainer);

        // تحويل Canvas إلى Base64
        const base64Image = canvas.toDataURL('image/png');

        // إعداد اسم الملف ونص المشاركة
        let fileNameParts = [`جدول_الإجازات`, shiftNames[shift]];
        if (vacationType) {
            fileNameParts.push(vacationType);
        }
        fileNameParts.push(new Date().toLocaleDateString('ar-EG'));
        const fileName = `${fileNameParts.join('_')}.png`;

        let shareText = `جدول الإجازات - الوردية ${shiftNames[shift]}`;
        if (vacationType) {
            shareText += ` - ${vacationType}`;
        }

        // محاولة استخدام Web Share API
        if (navigator.share && navigator.canShare) {
            try {
                // تحويل Base64 إلى Blob للمتصفحات
                const blob = await fetch(base64Image).then(r => r.blob());
                const file = new File([blob], fileName, { type: 'image/png' });

                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'جدول الإجازات',
                        text: shareText
                    });
                    showToast('تم المشاركة بنجاح');
                } else {
                    downloadImageFromBase64(base64Image, fileName);
                }
            } catch (error) {
                console.error('خطأ في المشاركة:', error);
                downloadImageFromBase64(base64Image, fileName);
            }
        }
        // تحميل الصورة مباشرة إذا لم تكن هناك خيارات مشاركة
        else {
            downloadImageFromBase64(base64Image, fileName);
        }

    } catch (error) {
        console.error('خطأ في إنشاء الصورة:', error);
        showToast('حدث خطأ في إنشاء الصورة');
    }
}

// وظيفة مساعدة لتحميل الصورة من Base64
function downloadImageFromBase64(base64Image, fileName) {
    try {
        const link = document.createElement('a');
        link.href = base64Image;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('تم تحميل الصورة بنجاح');
    } catch (error) {
        console.error('خطأ في تحميل الصورة:', error);
        showToast('حدث خطأ في تحميل الصورة');
    }
}

// ============= وظائف جدولة الإشعارات =============

// طلب صلاحيات الإشعارات والصلاحيات الإضافية
async function requestNotificationPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
}

// عرض الزملاء
function displayColleagues() {
    const colleagues = loadColleagues();
    const listContainer = document.getElementById('colleaguesList');
    if (!listContainer) return;

    let html = '<div class="colleagues-items-container">';

    colleagues.forEach((colleague, index) => {
        html += `
            <div class="colleague-item">
                <div class="colleague-item-content">
                    <span class="colleague-name" id="colleague-name-${index}">${colleague.name}</span>
                    <input type="text" id="colleague-edit-${index}" class="colleague-edit-input" value="${colleague.name}" style="display: none;">
                </div>
                <div class="colleague-item-actions">
                    <button onclick="editColleague(${index})" id="edit-btn-${index}" class="btn btn-edit">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button onclick="saveEditColleague(${index})" id="save-btn-${index}" class="btn btn-save-edit" style="display: none;">
                        <i class="fas fa-save"></i> حفظ
                    </button>
                    <button onclick="cancelEditColleague(${index})" id="cancel-btn-${index}" class="btn btn-cancel-edit" style="display: none;">
                        <i class="fas fa-times"></i> إلغاء
                    </button>
                    <button onclick="deleteColleague(${index})" class="btn btn-delete">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    listContainer.innerHTML = html;
}

// إضافة زميل جديد
function addColleague() {
    const nameInput = document.getElementById('colleagueName');
    const name = nameInput.value.trim();

    if (!name) {
        showToast('الرجاء إدخال اسم الزميل');
        return;
    }

    const colleagues = loadColleagues();

    // التحقق من عدم تكرار الاسم
    if (colleagues.some(c => c.name === name)) {
        showToast('هذا الاسم موجود بالفعل');
        return;
    }

    colleagues.push({
        name: name,
        id: Date.now()
    });

    saveColleagues(colleagues);
    nameInput.value = '';
    displayColleagues();

    // تحديث dropdowns جدول الإجازات
    updateAllVacationDropdowns();

    showToast('تم إضافة الزميل بنجاح');
}

// تعديل زميل
function editColleague(index) {
    const nameSpan = document.getElementById(`colleague-name-${index}`);
    const editInput = document.getElementById(`colleague-edit-${index}`);
    const editBtn = document.getElementById(`edit-btn-${index}`);
    const saveBtn = document.getElementById(`save-btn-${index}`);
    const cancelBtn = document.getElementById(`cancel-btn-${index}`);

    nameSpan.style.display = 'none';
    editInput.style.display = 'block';
    editBtn.style.display = 'none';
    saveBtn.style.display = 'inline-block';
    cancelBtn.style.display = 'inline-block';

    editInput.focus();
}

// حفظ التعديل
function saveEditColleague(index) {
    const editInput = document.getElementById(`colleague-edit-${index}`);
    const newName = editInput.value.trim();

    if (!newName) {
        showToast('الرجاء إدخال اسم صحيح');
        return;
    }

    const colleagues = loadColleagues();
    const oldName = colleagues[index].name;

    // التحقق من عدم تكرار الاسم (باستثناء الاسم الحالي)
    if (colleagues.some((c, i) => c.name === newName && i !== index)) {
        showToast('هذا الاسم موجود بالفعل');
        return;
    }

    colleagues[index].name = newName;
    saveColleagues(colleagues);
    displayColleagues();

    // تحديث جدول الإجازات إذا كان الاسم القديم مستخدماً
    updateVacationNamesAfterEdit(oldName, newName);

    showToast('تم تعديل الاسم بنجاح');
}

// إلغاء التعديل
function cancelEditColleague(index) {
    displayColleagues();
}

// حذف زميل
function deleteColleague(index) {
    const colleagues = loadColleagues();
    const colleagueName = colleagues[index].name;

    if (!confirm(`هل أنت متأكد من حذف "${colleagueName}"؟`)) {
        return;
    }

    colleagues.splice(index, 1);
    saveColleagues(colleagues);
    displayColleagues();

    // إزالة الاسم من جدول الإجازات وتحديث الـ dropdowns
    removeColleagueFromVacationTable(colleagueName);

    showToast('تم حذف الزميل بنجاح');
}

// تحديث أسماء جدول الإجازات بعد تعديل اسم زميل
function updateVacationNamesAfterEdit(oldName, newName) {
    const shift = document.getElementById('shiftSelect').value;
    const storageKey = `vacation_schedule_${shift}`;
    const savedData = localStorage.getItem(storageKey);

    if (savedData) {
        const data = JSON.parse(savedData);
        let updated = false;

        // تحديث الأسماء في البيانات المحفوظة
        for (let i = 0; i < 7; i++) {
            if (data[i]) {
                if (data[i].name1 === oldName) {
                    data[i].name1 = newName;
                    updated = true;
                }
                if (data[i].name2 === oldName) {
                    data[i].name2 = newName;
                    updated = true;
                }
                if (data[i].name3 === oldName) {
                    data[i].name3 = newName;
                    updated = true;
                }
            }
        }

        if (updated) {
            localStorage.setItem(storageKey, JSON.stringify(data));
            loadVacationSchedule();
        }
    }

    // تحديث الـ dropdowns
    updateAllVacationDropdowns();
}

// إزالة زميل من جدول الإجازات
function removeColleagueFromVacationTable(colleagueName) {
    const shift = document.getElementById('shiftSelect').value;
    const storageKey = `vacation_schedule_${shift}`;
    const savedData = localStorage.getItem(storageKey);

    if (savedData) {
        const data = JSON.parse(savedData);
        let updated = false;

        // إزالة الاسم من البيانات المحفوظة
        for (let i = 0; i < 7; i++) {
            if (data[i]) {
                if (data[i].name1 === colleagueName) {
                    data[i].name1 = '';
                    updated = true;
                }
                if (data[i].name2 === colleagueName) {
                    data[i].name2 = '';
                    updated = true;
                }
                if (data[i].name3 === colleagueName) {
                    data[i].name3 = '';
                    updated = true;
                }
            }
        }

        if (updated) {
            localStorage.setItem(storageKey, JSON.stringify(data));
            loadVacationSchedule();
        }
    }

    // تحديث الـ dropdowns
    updateAllVacationDropdowns();
}

// مسح جميع الاختيارات من جدول الإجازات
function clearAllVacationSelections() {
    for (let i = 0; i < 7; i++) {
        const name1Select = document.getElementById(`vacation-${i}-name1`);
        const name2Select = document.getElementById(`vacation-${i}-name2`);
        const name3Select = document.getElementById(`vacation-${i}-name3`);

        if (name1Select) name1Select.value = '';
        if (name2Select) name2Select.value = '';
        if (name3Select) name3Select.value = '';
    }

    // تحديث الـ dropdowns
    updateAllVacationDropdowns();

    // حفظ التغييرات
    saveVacationSchedule(true);
}

// مسح جميع الزملاء
function clearAllColleagues() {
    if (!confirm('هل أنت متأكد من حذف جميع الزملاء؟')) {
        return;
    }

    localStorage.removeItem('colleagues');
    displayColleagues();

    // مسح جميع الاختيارات من جدول الإجازات
    clearAllVacationSelections();

    showToast('تم مسح جميع الزملاء');
}

// تحميل آخر تاريخ جدولة للإشعارات
function loadLastNotificationSchedule() {
    const scheduledInfo = localStorage.getItem('vacation_notifications_scheduled');
    if (scheduledInfo) {
        try {
            const info = JSON.parse(scheduledInfo);
            const startDateInput = document.getElementById('notificationStartDate');
            const timeInput = document.getElementById('notificationTime');

            if (startDateInput && info.startDate) {
                startDateInput.value = info.startDate;
            }

            if (timeInput && info.time) {
                timeInput.value = info.time;
            }
        } catch (error) {
            console.error('خطأ في تحميل معلومات الجدولة:', error);
        }
    }
}

// ============= وظائف إدارة الأقسام =============

// تحديث القائمة الرئيسية
function updateMainMenu() {
    const menuGrid = document.querySelector('#mainMenu .menu-grid');
    if (!menuGrid) return;

    // الحفاظ على زر عرض البيانات
    const allDataBtn = menuGrid.querySelector('.menu-btn.special');

    // مسح الأزرار الحالية (باستثناء زر عرض البيانات)
    menuGrid.innerHTML = '';

    // إضافة الأقسام الافتراضية
    const defaultSections = ['akra', 'morashaha', 'sludge', 'decant', 'booster', 'anbarChlor', 'kabayenChlor', 'shabba', 'electricity'];
    defaultSections.forEach(sectionId => {
        if (sectionConfig[sectionId] && sectionMetadata[sectionId]) {
            const metadata = sectionMetadata[sectionId];
            const btn = document.createElement('button');
            btn.className = 'menu-btn';
            btn.onclick = () => openSection(sectionId);
            btn.innerHTML = `<i class="fas ${metadata.icon}"></i> ${metadata.label}`;
            menuGrid.appendChild(btn);
        }
    });

    // إضافة الأقسام المخصصة
    Object.keys(sectionConfig).forEach(sectionId => {
        if (!defaultSections.includes(sectionId) && sectionMetadata[sectionId]) {
            const metadata = sectionMetadata[sectionId];
            const btn = document.createElement('button');
            btn.className = 'menu-btn';
            btn.onclick = () => openSection(sectionId);
            btn.innerHTML = `<i class="fas ${metadata.icon}"></i> ${metadata.label}`;
            menuGrid.appendChild(btn);
        }
    });

    // إضافة زر عرض البيانات
    if (allDataBtn) {
        menuGrid.appendChild(allDataBtn);
    } else {
        const btn = document.createElement('button');
        btn.className = 'menu-btn special';
        btn.onclick = () => openAllData();
        btn.innerHTML = '<i class="fas fa-chart-bar"></i> عرض البيانات';
        menuGrid.appendChild(btn);
    }
}

// إنشاء HTML للقسم
function createSectionHTML(sectionId) {
    const metadata = sectionMetadata[sectionId];
    const config = sectionConfig[sectionId];
    if (!metadata || !config) return '';

    // إنشاء قائمة cross-nav للأقسام الأخرى
    let crossNavHTML = '<div class="cross-nav">';
    Object.keys(sectionConfig).forEach(otherSection => {
        if (otherSection !== sectionId && sectionMetadata[otherSection]) {
            crossNavHTML += `<button class="cross-nav-btn" onclick="openSection('${otherSection}')">${sectionMetadata[otherSection].label}</button>`;
        }
    });
    crossNavHTML += '</div>';

    return `
        <div id="${sectionId}" class="section">
            <div class="header-controls">
                <button class="back-btn" onclick="showSection('mainMenu')">← رجوع</button>
                <h2 class="section-title">${metadata.label}</h2>
            </div>
            <div class="table-wrapper">
                <table id="${sectionId}-table"></table>
            </div>
            <div class="quick-nav">
                <button class="quick-nav-btn" onclick="scrollToNextEmpty('${sectionId}')">📝 التالي الفارغ</button>
            </div>
            <div class="cell-controls">
                <button class="btn btn-add-cell" onclick="addCell('${sectionId}')">➕ إضافة خلية</button>
                <button class="btn btn-remove-cell" onclick="removeCell('${sectionId}')">➖ حذف خلية</button>
            </div>
            ${crossNavHTML}
            <div class="action-buttons">
                <button class="btn btn-clear" onclick="clearData('${sectionId}')">🗑️ مسح القسم</button>
                <button class="btn btn-edit-section" onclick="editSection('${sectionId}')">✏️ تعديل القسم</button>
                <button class="btn btn-delete-section" onclick="deleteSection('${sectionId}')">🗑️ حذف القسم</button>
            </div>
        </div>
    `;
}

// إضافة قسم جديد
function addSection() {
    const label = prompt('أدخل اسم القسم:');
    if (!label || !label.trim()) return;

    // اختيار أيقونة
    const icon = prompt('أدخل اسم الأيقونة (مثل: fa-circle, fa-star, fa-heart):\nيمكنك البحث عن الأيقونات في https://fontawesome.com/icons', 'fa-circle');

    // إنشاء معرف فريد للقسم
    const sectionId = 'custom_' + Date.now();

    // إضافة القسم إلى الإعدادات
    sectionConfig[sectionId] = {
        columns: ['القراءة'],
        rows: 1,
        minRows: 1
    };
    sectionMetadata[sectionId] = {
        label: label.trim(),
        icon: icon.trim() || 'fa-circle'
    };

    // حفظ الأقسام المخصصة
    saveCustomSections();

    // إنشاء HTML للقسم
    const container = document.querySelector('.container');
    const sectionHTML = createSectionHTML(sectionId);
    container.insertAdjacentHTML('beforeend', sectionHTML);

    // تهيئة القسم
    normalizeSectionData(sectionId);
    createTable(sectionId);

    // تحديث القائمة الرئيسية
    updateMainMenu();

    // تحديث cross-nav في جميع الأقسام
    updateAllCrossNavs();

    // تحديث قائمة الأقسام المخصصة
    updateCustomSectionsList();

    showToast('تم إضافة القسم بنجاح');
}

// تعديل قسم
function editSection(sectionId) {
    const defaultSections = ['akra', 'morashaha', 'sludge', 'decant', 'booster', 'anbarChlor', 'kabayenChlor', 'shabba', 'electricity'];
    if (defaultSections.includes(sectionId)) {
        alert('لا يمكن تعديل الأقسام الافتراضية');
        return;
    }

    const metadata = sectionMetadata[sectionId];
    if (!metadata) return;

    const newLabel = prompt('أدخل الاسم الجديد:', metadata.label);
    if (!newLabel || !newLabel.trim()) return;

    const newIcon = prompt('أدخل اسم الأيقونة الجديدة:', metadata.icon);

    metadata.label = newLabel.trim();
    metadata.icon = newIcon.trim() || 'fa-circle';

    // حفظ التغييرات
    saveCustomSections();

    // تحديث HTML القسم
    const section = document.getElementById(sectionId);
    if (section) {
        const title = section.querySelector('.section-title');
        if (title) title.textContent = metadata.label;
    }

    // تحديث القائمة الرئيسية
    updateMainMenu();

    // تحديث cross-nav في جميع الأقسام
    updateAllCrossNavs();

    // تحديث قائمة الأقسام المخصصة
    updateCustomSectionsList();

    showToast('تم تعديل القسم بنجاح');
}

// حذف قسم
function deleteSection(sectionId) {
    const defaultSections = ['akra', 'morashaha', 'sludge', 'decant', 'booster', 'anbarChlor', 'kabayenChlor', 'shabba', 'electricity'];
    if (defaultSections.includes(sectionId)) {
        alert('لا يمكن حذف الأقسام الافتراضية');
        return;
    }

    const metadata = sectionMetadata[sectionId];
    if (!metadata) return;

    if (!confirm(`هل أنت متأكد من حذف قسم "${metadata.label}"؟\nسيتم حذف جميع البيانات المرتبطة بهذا القسم.`)) {
        return;
    }

    // حذف البيانات
    localStorage.removeItem(`readings_${sectionId}`);
    localStorage.removeItem(`rows_${sectionId}`);
    delete data[sectionId];
    delete sectionConfig[sectionId];
    delete sectionMetadata[sectionId];

    // حفظ التغييرات
    saveCustomSections();

    // حذف HTML القسم
    const section = document.getElementById(sectionId);
    if (section) section.remove();

    // تحديث القائمة الرئيسية
    updateMainMenu();

    // تحديث cross-nav في جميع الأقسام
    updateAllCrossNavs();

    // تحديث قائمة الأقسام المخصصة
    updateCustomSectionsList();

    // إذا كان القسم مفتوحاً، العودة للقائمة الرئيسية
    if (document.getElementById(sectionId) && document.getElementById(sectionId).classList.contains('active')) {
        showSection('mainMenu');
    }

    showToast('تم حذف القسم بنجاح');
}

// تحديث cross-nav في جميع الأقسام
function updateAllCrossNavs() {
    Object.keys(sectionConfig).forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (!section) return;

        const crossNav = section.querySelector('.cross-nav');
        if (!crossNav) return;

        crossNav.innerHTML = '';
        Object.keys(sectionConfig).forEach(otherSection => {
            if (otherSection !== sectionId && sectionMetadata[otherSection]) {
                const btn = document.createElement('button');
                btn.className = 'cross-nav-btn';
                btn.onclick = () => openSection(otherSection);
                btn.textContent = sectionMetadata[otherSection].label;
                crossNav.appendChild(btn);
            }
        });
    });
}

// تحديث قائمة الأقسام المخصصة
function updateCustomSectionsList() {
    const listContainer = document.getElementById('customSectionsList');
    if (!listContainer) return;

    const defaultSections = ['akra', 'morashaha', 'sludge', 'decant', 'booster', 'anbarChlor', 'kabayenChlor', 'shabba', 'electricity'];
    const customSections = Object.keys(sectionConfig).filter(sectionId =>
        !defaultSections.includes(sectionId) && sectionMetadata[sectionId]
    );

    if (customSections.length === 0) {
        listContainer.innerHTML = '<p class="sections-empty-message">لا توجد أقسام مخصصة</p>';
        return;
    }

    let html = '<div class="sections-items-container">';
    customSections.forEach(sectionId => {
        const metadata = sectionMetadata[sectionId];
        html += `
            <div class="section-item">
                <div class="section-item-content">
                    <i class="fas ${metadata.icon}"></i>
                    <span class="section-item-name">${metadata.label}</span>
                </div>
                <div class="section-item-actions">
                    <button class="btn btn-edit-section" onclick="editSection('${sectionId}')">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button class="btn btn-delete-section" onclick="deleteSection('${sectionId}')">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    listContainer.innerHTML = html;
}

// ============= وظائف إظهار/إخفاء جدولة الإشعارات =============

// إظهار/إخفاء نموذج جدولة الإشعارات
function toggleNotificationScheduler() {
    const scheduler = document.getElementById('notificationScheduler');
    const toggleIcon = document.getElementById('notificationToggleIcon');
    const toggleText = document.getElementById('notificationToggleText');

    if (!scheduler || !toggleIcon || !toggleText) return;

    const isHidden = !scheduler.classList.contains('show');

    if (isHidden) {
        scheduler.style.display = 'block';
        // استخدام setTimeout لإضافة class بعد عرض العنصر
        setTimeout(() => {
            scheduler.classList.add('show');
        }, 10);
        toggleIcon.classList.remove('fa-bell');
        toggleIcon.classList.add('fa-bell-slash');
        toggleText.textContent = 'إخفاء جدولة الإشعارات';
    } else {
        scheduler.classList.remove('show');
        // الانتظار حتى انتهاء الانتقال ثم إخفاء العنصر
        setTimeout(() => {
            scheduler.style.display = 'none';
        }, 300);
        toggleIcon.classList.remove('fa-bell-slash');
        toggleIcon.classList.add('fa-bell');
        toggleText.textContent = 'إظهار جدولة الإشعارات';
    }
}

// تهيئة جدول الإجازات عند تحميل الصفحة (لا تُنفَّذ في الصفحات المصغّرة lab / ops)
document.addEventListener('DOMContentLoaded', function () {
    if (window.APP_BOOT_MODE === 'lab' || window.APP_BOOT_MODE === 'ops' || window.APP_BOOT_MODE === 'murashaha_op_plan') return;
    initVacationTable();
    displayColleagues();
    loadLastNotificationSchedule();
});

// =========================================
// Average Records (Pump Database) Logic
// =========================================
const AVG_MAX_PUMPS = 7;
let avgDb = {
    morashaha: [],
    akra: []
};
let avgNextId = {
    morashaha: 1,
    akra: 1
};
let avgEditingId = {
    morashaha: null,
    akra: null
};

// بيانات افتراضية للطلمبات المرشحة
const avgDefaultDataMorashaha = [
    { id: 1, pumps: [2, 3, 4, 5], flow: 2760, pressure: null },
    { id: 2, pumps: [2, 3, 5], flow: 2180, pressure: null },
    { id: 3, pumps: [2, 5], flow: 1660, pressure: null },
    { id: 4, pumps: [2, 5, 6], flow: 2300, pressure: null },
    { id: 5, pumps: [1, 5, 6], flow: 2310, pressure: null },
    { id: 6, pumps: [4, 6], flow: 1630, pressure: null },
    { id: 7, pumps: [4, 5, 6], flow: 2400, pressure: null },
    { id: 8, pumps: [1, 4, 5, 6], flow: 3040, pressure: null },
    { id: 9, pumps: [1, 5], flow: 1596, pressure: null },
    { id: 10, pumps: [1, 4, 5], flow: 2190, pressure: null },
    { id: 11, pumps: [1, 3, 4, 5], flow: 2600, pressure: null },
    { id: 12, pumps: [3, 4, 5], flow: 2270, pressure: null },
];

function initAverageRecords() {
    loadAvgData();
    switchAvgTab('morashaha');
}

function loadAvgData() {
    try {
        const dMorashaha = localStorage.getItem('avg_db_morashaha');
        if (dMorashaha) {
            const parsed = JSON.parse(dMorashaha);
            avgDb.morashaha = parsed.db || [];
            avgNextId.morashaha = parsed.nextId || 1;
        } else {
            avgDb.morashaha = JSON.parse(JSON.stringify(avgDefaultDataMorashaha));
            avgNextId.morashaha = 13;
        }

        const dAkra = localStorage.getItem('avg_db_akra');
        if (dAkra) {
            const parsed = JSON.parse(dAkra);
            avgDb.akra = parsed.db || [];
            avgNextId.akra = parsed.nextId || 1;
        }
    } catch (e) { }
}

function saveAvgData(type) {
    localStorage.setItem(`avg_db_${type}`, JSON.stringify({
        db: avgDb[type],
        nextId: avgNextId[type]
    }));
}

function switchAvgTab(tab) {
    document.getElementById('avg-content-morashaha').style.display = tab === 'morashaha' ? 'block' : 'none';
    document.getElementById('avg-content-akra').style.display = tab === 'akra' ? 'block' : 'none';

    document.getElementById('btn-avg-morashaha').style.backgroundColor = tab === 'morashaha' ? '#667eea' : 'transparent';
    document.getElementById('btn-avg-morashaha').style.color = tab === 'morashaha' ? 'white' : 'var(--text-color)';
    document.getElementById('btn-avg-morashaha').style.border = tab === 'morashaha' ? 'none' : '1px solid #667eea';

    document.getElementById('btn-avg-akra').style.backgroundColor = tab === 'akra' ? '#667eea' : 'transparent';
    document.getElementById('btn-avg-akra').style.color = tab === 'akra' ? 'white' : 'var(--text-color)';
    document.getElementById('btn-avg-akra').style.border = tab === 'akra' ? 'none' : '1px solid #667eea';

    renderAvgTable(tab);
}

function getPumpsHtml(pumps) {
    return '<div class="pumps-cell">' +
        [...pumps].sort((a, b) => a - b).map(n => `<span class="pnum">${n}</span>`).join('') +
        '</div>';
}

function renderAvgTable(type) {
    const tbody = document.getElementById(`tbl-body-${type}`);
    if (!tbody) return;

    const data = avgDb[type];

    if (!data || !data.length) {
        tbody.innerHTML = `<tr><td colspan="${type === 'morashaha' ? 4 : 3}" style="text-align:center;padding:2rem;color:var(--text-color);font-size:14px">لا توجد سجلات</td></tr>`;
        renderAvgStats(type);
        return;
    }

    tbody.innerHTML = data.map(row => {
        const editing = avgEditingId[type] === row.id;
        const flowValue = row.flow != null ? convertArabicToEnglishNumbers(row.flow) : '';
        const flowCell = editing
            ? `<input class="cell-input" id="ef-${type}-${row.id}" type="number" value="${flowValue}" placeholder="—">`
            : (row.flow != null ? `<span class="val">${row.flow.toLocaleString('en-US')}</span>` : '<span style="color:var(--text-color)">—</span>');

        let pressCell = '';
        if (type === 'morashaha') {
            const pressValue = row.pressure != null ? convertArabicToEnglishNumbers(row.pressure) : '';
            pressCell = editing
                ? `<td><input class="cell-input" id="ep-${type}-${row.id}" type="number" step="0.1" value="${pressValue}" placeholder="—"></td>`
                : `<td>${row.pressure != null ? `<span class="val">${row.pressure}</span>` : '<span style="color:var(--text-color)">—</span>'}</td>`;
        }

        const actionCell = editing
            ? `<button class="btn btn-save" onclick="saveAvgEdit('${type}', ${row.id})">حفظ</button>`
            : `<div class="avg-actions-div">
               <button class="btn" style="background:#17a2b8;color:white" onclick="startAvgEdit('${type}', ${row.id})">تعديل</button>
               <button class="btn btn-clear" onclick="delAvgRow('${type}', ${row.id})">حذف</button>
             </div>`;

        return `<tr>
          <td>${getPumpsHtml(row.pumps)}</td>
          <td>${flowCell}</td>
          ${pressCell}
          <td>${actionCell}</td>
        </tr>`;
    }).join('');

    renderAvgStats(type);
}

function renderAvgStats(type) {
    const data = avgDb[type];
    const flows = data.filter(r => r.flow != null).map(r => r.flow);
    const maxFlow = flows.length ? Math.max(...flows).toLocaleString('en-US') : '—';
    const minFlow = flows.length ? Math.min(...flows).toLocaleString('en-US') : '—';

    let statsHtml = `
        <div class="stat-card"><div class="stat-lbl">عدد السجلات</div><div class="stat-val">${data.length}</div></div>
        <div class="stat-card"><div class="stat-lbl">أعلى تصرف</div><div class="stat-val">${maxFlow}</div></div>
        <div class="stat-card"><div class="stat-lbl">أدنى تصرف</div><div class="stat-val">${minFlow}</div></div>
    `;

    if (type === 'morashaha') {
        const pressures = data.filter(r => r.pressure != null).map(r => r.pressure);
        const avgPressure = pressures.length ? (pressures.reduce((a, b) => a + b, 0) / pressures.length).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
        statsHtml += `<div class="stat-card"><div class="stat-lbl">متوسط الضغط</div><div class="stat-val">${avgPressure}</div></div>`;
    }

    document.getElementById(`stats-${type}`).innerHTML = statsHtml;
}

function startAvgEdit(type, id) { avgEditingId[type] = id; renderAvgTable(type); }

function saveAvgEdit(type, id) {
    const row = avgDb[type].find(r => r.id === id);
    const fv = document.getElementById(`ef-${type}-${id}`)?.value;
    row.flow = fv !== '' && fv != null ? parseFloat(fv) : null;

    if (type === 'morashaha') {
        const pv = document.getElementById(`ep-${type}-${id}`)?.value;
        row.pressure = pv !== '' && pv != null ? parseFloat(pv) : null;
    }

    avgEditingId[type] = null;
    saveAvgData(type);
    renderAvgTable(type);
    showToast('تم حفظ التعديل');
}

function delAvgRow(type, id) {
    if (!confirm('حذف هذا السجل؟')) return;
    avgDb[type] = avgDb[type].filter(r => r.id !== id);
    saveAvgData(type);
    renderAvgTable(type);
    showToast('تم الحذف');
}

function buildAvgCheckboxes(type) {
    const c = document.getElementById(`pump-checks-${type}`);
    const max = type === 'akra' ? 6 : AVG_MAX_PUMPS;
    c.innerHTML = Array.from({ length: max }, (_, i) => i + 1).map(n =>
        `<div class="pump-cb">
         <input type="checkbox" id="pc-${type}-${n}" value="${n}" onchange="updateAvgLabel('${type}', ${n})">
         <label class="pchk-label" id="pl-${type}-${n}" for="pc-${type}-${n}">${n}</label>
       </div>`
    ).join('');
}

function updateAvgLabel(type, n) {
    const chk = document.getElementById(`pc-${type}-${n}`);
    const lbl = document.getElementById(`pl-${type}-${n}`);
    if (chk.checked) {
        lbl.classList.add('checked');
    } else {
        lbl.classList.remove('checked');
    }
}

function toggleAddAvg(type) {
    const panel = document.getElementById(`add-panel-${type}`);
    const isHidden = panel.style.display === 'none';
    panel.style.display = isHidden ? 'block' : 'none';

    if (isHidden) {
        buildAvgCheckboxes(type);
        document.getElementById(`add-flow-${type}`).value = '';
        if (type === 'morashaha') {
            document.getElementById(`add-pressure-${type}`).value = '';
        }

        // توجيه المستخدم لأسفل مكان التسجيل
        setTimeout(() => {
            panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
}

function addAvgRow(type) {
    const pumps = [];
    for (let i = 1; i <= AVG_MAX_PUMPS; i++) {
        if (document.getElementById(`pc-${type}-${i}`)?.checked) pumps.push(i);
    }
    if (!pumps.length) {
        alert('اختر طلمبة واحدة على الأقل');
        return;
    }

    const fv = document.getElementById(`add-flow-${type}`).value;
    let pv = null;
    if (type === 'morashaha') {
        pv = document.getElementById(`add-pressure-${type}`).value;
    }

    avgDb[type].push({
        id: avgNextId[type]++,
        pumps,
        flow: fv !== '' ? parseFloat(fv) : null,
        pressure: pv !== '' && pv !== null ? parseFloat(pv) : null
    });

    toggleAddAvg(type);
    saveAvgData(type);
    renderAvgTable(type);
    showToast('تم إضافة السجل');
}

// =========================================
// Operating Plan Logic
// =========================================
const defaultOpPlanData = [
    {
        cat: "طلمبات المياه العكرة",
        units: [
            { num: 1, weeks: [false, false, true, true], note: "" },
            { num: 2, weeks: [false, false, false, false], note: "" },
            { num: 3, weeks: [true, true, true, true], note: "" },
            { num: 4, weeks: [true, true, true, true], note: "" },
            { num: 5, weeks: [true, true, false, false], note: "" },
            { num: 6, weeks: [true, true, true, true], note: "" },
        ]
    },
    {
        cat: "طلمبات المياه المرشحة",
        units: [
            { num: 1, weeks: [true, true, true, true], note: "" },
            { num: 2, weeks: [false, false, false, false], note: "" },
            { num: 3, weeks: [true, true, true, true], note: "" },
            { num: 4, weeks: [true, true, true, true], note: "" },
            { num: 5, weeks: [false, false, false, false], note: "" },
            { num: 6, weeks: [false, false, false, false], note: "" },
            { num: 7, weeks: [true, true, true, true], note: "" },
        ]
    },
    {
        cat: "طلمبات الغسيل",
        units: [
            { num: 1, weeks: [true, true, true, true], note: "" },
            { num: 2, weeks: [false, false, false, false], note: "" },
        ]
    },
    {
        cat: "البلور",
        units: [
            { num: 1, weeks: [true, true, true, true], note: "" },
            { num: 2, weeks: [false, false, false, false], note: "" },
        ]
    },
    {
        cat: "طلمبات البوستر",
        units: [
            { num: 1, weeks: [false, false, false, false], note: "" },
            { num: 2, weeks: [true, true, true, true], note: "" },
            { num: 3, weeks: [true, true, true, true], note: "" },
        ]
    },
    {
        cat: "طلمبات حقن الشبة",
        units: [
            { num: 1, weeks: [false, false, false, false], note: "" },
            { num: 2, weeks: [true, true, true, true], note: "" },
            { num: 3, weeks: [true, true, true, false], note: "" },
            { num: 4, weeks: [true, true, true, true], note: "" },
            { num: 5, weeks: [false, false, true, true], note: "" },
            { num: 6, weeks: [true, true, true, true], note: "" },
        ]
    },
    {
        cat: "طلمبات تدوير وناقل الشبة المذابة",
        units: [
            { num: 1, weeks: [false, false, false, false], note: "" },
            { num: 2, weeks: [true, true, true, true], note: "" },
            { num: 3, weeks: [true, false, true, false], note: "" },
        ]
    },
];

let opPlanData = [];
let opYearlyData = {};

function initOperatingPlan() {
    loadOperatingPlan();
    buildOpTable();
    if (window.APP_ROLE === 'ops_manager') {
        void fetchLatestOpPlanFromCloudAndApply();
        setTimeout(() => void fetchLatestOpPlanFromCloudAndApply(), 1500);
    }
}

function loadOperatingPlan() {
    try {
        const savedYear = localStorage.getItem('op_plan_year');
        if (savedYear) document.getElementById('opYearInput').value = savedYear;
        else localStorage.setItem('op_plan_year', document.getElementById('opYearInput').value);

        const savedMonth = localStorage.getItem('op_plan_month');
        if (savedMonth) document.getElementById('opMonthSel').value = savedMonth;
        else localStorage.setItem('op_plan_month', document.getElementById('opMonthSel').value);

        const savedData = localStorage.getItem('op_plan_yearly_data');
        if (savedData) {
            opYearlyData = JSON.parse(savedData);
        } else {
            // Migration from old version (if they had 'op_plan_data' saved)
            const oldData = localStorage.getItem('op_plan_data');
            if (oldData) {
                const currentMonth = document.getElementById('opMonthSel').value;
                opYearlyData[currentMonth] = JSON.parse(oldData);
                localStorage.setItem('op_plan_yearly_data', JSON.stringify(opYearlyData));
                localStorage.removeItem('op_plan_data'); // Cleanup
            }
        }

        const currentMonth = document.getElementById('opMonthSel').value;
        opPlanData = opYearlyData[currentMonth] ? JSON.parse(JSON.stringify(opYearlyData[currentMonth])) : JSON.parse(JSON.stringify(defaultOpPlanData));

    } catch (e) {
        opPlanData = JSON.parse(JSON.stringify(defaultOpPlanData));
    }
}

function saveOperatingPlan() {
    const currentMonth = document.getElementById('opMonthSel').value;
    opYearlyData[currentMonth] = JSON.parse(JSON.stringify(opPlanData));
    localStorage.setItem('op_plan_yearly_data', JSON.stringify(opYearlyData));
    scheduleOpPlanCloudAddDebounced();
}

function handleOpMonthChange() {
    const sel = document.getElementById('opMonthSel');
    const newMonth = sel.value;
    const oldMonth = localStorage.getItem('op_plan_month');
    if (oldMonth && oldMonth !== newMonth) {
        opYearlyData[oldMonth] = JSON.parse(JSON.stringify(opPlanData));
        localStorage.setItem('op_plan_yearly_data', JSON.stringify(opYearlyData));
        scheduleOpPlanCloudAddDebounced();
    }
    localStorage.setItem('op_plan_month', newMonth);

    opPlanData = opYearlyData[newMonth] ? JSON.parse(JSON.stringify(opYearlyData[newMonth])) : JSON.parse(JSON.stringify(defaultOpPlanData));
    buildOpTable();
}

function handleOpYearChange() {
    const newYear = document.getElementById('opYearInput').value;
    const oldYear = localStorage.getItem('op_plan_year') || newYear;

    if (newYear === oldYear) return;

    if (confirm("تنبيه: تغيير السنة سيؤدي إلى مسح جميع بيانات خطة التشغيل المخزنة في أشهر السنة الحالية. هل أنت متأكد من المتابعة؟")) {
        // User agreed
        localStorage.setItem('op_plan_year', newYear);
        opYearlyData = {}; // Clear all months
        localStorage.setItem('op_plan_yearly_data', JSON.stringify(opYearlyData));

        // Reload current month data as empty
        opPlanData = JSON.parse(JSON.stringify(defaultOpPlanData));
        buildOpTable();
        scheduleOpPlanCloudAddDebounced();
        showToast('تم مسح بيانات السنة القديمة وبدء سنة جديدة');
    } else {
        // Revert the year input
        document.getElementById('opYearInput').value = oldYear;
    }
}

function buildOpTable() {
    const tbody = document.getElementById("opTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    opPlanData.forEach((cat, ci) => {
        cat.units.forEach((unit, ui) => {
            const tr = document.createElement("tr");
            if (ui === 0 && ci > 0) {
                tr.classList.add("category-divider");
            }
            if (ui === 0) {
                const catTd = document.createElement("td");
                catTd.className = "cat-cell";
                catTd.rowSpan = cat.units.length;
                catTd.textContent = cat.cat;
                tr.appendChild(catTd);
            }
            const numTd = document.createElement("td");
            numTd.className = "num-cell";
            numTd.textContent = unit.num;
            tr.appendChild(numTd);
            unit.weeks.forEach((checked, wi) => {
                const td = document.createElement("td");
                const cb = document.createElement("input");
                cb.type = "checkbox";
                cb.checked = checked;
                cb.dataset.cat = ci;
                cb.dataset.unit = ui;
                cb.dataset.week = wi;
                // Only add event listener if user is not tech
                if (window.APP_ROLE !== 'tech') {
                    cb.addEventListener("change", e => {
                        opPlanData[e.target.dataset.cat].units[e.target.dataset.unit].weeks[e.target.dataset.week] = e.target.checked;
                        saveOperatingPlan();
                    });
                } else {
                    // For tech users, prevent any changes
                    cb.addEventListener("click", e => {
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    });
                    cb.addEventListener("change", e => {
                        e.preventDefault();
                        e.target.checked = !e.target.checked; // Revert the change
                        return false;
                    });
                }
                td.appendChild(cb);
                tr.appendChild(td);
            });
            const noteTd = document.createElement("td");
            noteTd.className = "col-notes";
            const noteInput = document.createElement("input");
            noteInput.type = "text";
            noteInput.className = "notes-input";
            noteInput.value = unit.note;
            noteInput.placeholder = "ملاحظة...";
            noteInput.dataset.cat = ci;
            noteInput.dataset.unit = ui;
            // Only add event listener if user is not tech
            if (window.APP_ROLE !== 'tech') {
                noteInput.addEventListener("input", e => {
                    opPlanData[e.target.dataset.cat].units[e.target.dataset.unit].note = e.target.value;
                    saveOperatingPlan();
                });
            }
            noteTd.appendChild(noteInput);
            tr.appendChild(noteTd);
            tbody.appendChild(tr);
        });
    });
}

function clearOpPlan() {
    if (!confirm("هل تريد مسح جميع التحديدات؟")) return;
    document.querySelectorAll('#opTableBody input[type=checkbox]').forEach(cb => {
        cb.checked = false;
        opPlanData[cb.dataset.cat].units[cb.dataset.unit].weeks[cb.dataset.week] = false;
    });
    saveOperatingPlan();
    showToast('تم مسح جميع التحديدات');
}

function checkAllOpPlan() {
    document.querySelectorAll('#opTableBody input[type=checkbox]').forEach(cb => {
        cb.checked = true;
        opPlanData[cb.dataset.cat].units[cb.dataset.unit].weeks[cb.dataset.week] = true;
    });
    saveOperatingPlan();
    showToast('تم تحديد الكل');
}
// Role-based UI configuration
document.addEventListener('DOMContentLoaded', () => {
    if (window.APP_BOOT_MODE === 'murashaha_op_plan') return;
    if (window.APP_ROLE === 'lab_manager') {
        setTimeout(() => {
            if (typeof showSection === 'function') showSection('labSection');
            const sidebarBtn = document.getElementById('sidebarToggle');
            if (sidebarBtn) sidebarBtn.style.display = 'none';
            const labBackBtn = document.querySelector('#labSection .back-btn');
            if (labBackBtn) {
                labBackBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> تسجيل الخروج';
                labBackBtn.onclick = () => { if (typeof logoutUser === 'function') logoutUser(); };
            }
        }, 200);
    } else if (window.APP_ROLE === 'ops_manager') {
        setTimeout(() => {
            if (typeof showSection === 'function') showSection('operatingPlan');
            const sidebarBtn = document.getElementById('sidebarToggle');
            if (sidebarBtn) sidebarBtn.style.display = 'none';
            const opsBackBtn = document.querySelector('#operatingPlan .back-btn');
            if (opsBackBtn) {
                opsBackBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> تسجيل الخروج';
                opsBackBtn.onclick = () => { if (typeof logoutUser === 'function') logoutUser(); };
            }
        }, 200);
    } else if (window.APP_ROLE === 'tech') {
        setTimeout(() => {
            const menuHeader = document.querySelector('#mainMenu .action-buttons');
            if (menuHeader) {
                // Refresh button for tech users was removed as it's no longer needed (realtime sync is active)
            }

            // Make lab read only
            const labInputs = document.querySelectorAll('#labSection input, #labSection select');
            labInputs.forEach(input => input.disabled = true);
            const labButtons = document.querySelectorAll('#labSection .btn-save, #labSection .btn-clear, #labSection .btn-add-cell, #labSection .btn-remove-cell');
            labButtons.forEach(btn => btn.style.display = 'none');

            // Make ops read only
            const opsInputs = document.querySelectorAll('#operatingPlan input[type="checkbox"], #operatingPlan select, #operatingPlan input[type="number"], #operatingPlan input[type="text"]');
            opsInputs.forEach(input => {
                input.disabled = true;
                // Add extra protection for checkboxes
                if (input.type === 'checkbox') {
                    input.style.pointerEvents = 'none';
                    input.style.cursor = 'not-allowed';
                    input.style.opacity = '0.6';
                }
            });
            // Hide only functional buttons, keep navigation links
            const opsButtons = document.querySelectorAll('#operatingPlan .btn-save:not(.op-subpage-link), #operatingPlan .btn-clear, .op-toolbar button');
            opsButtons.forEach(btn => btn.style.display = 'none');
        }, 200);
    }
});

// Functions for tech role to fetch manager data
let techLabListener = null;
let techOpsListener = null;

function startTechRealtimeSync() {
    if (window.APP_ROLE !== 'tech') return;
    const db = getCloudFirestore();
    if (!db) return;

    console.log('[Sync] بدء المزامنة اللحظية للفني (المعمل وخطة التشغيل)...');

    // 1. مزامنة المعمل
    if (techLabListener) techLabListener();
    techLabListener = db.collection('shared_data').doc('lab_latest')
        .onSnapshot((doc) => {
            if (doc.exists && doc.data().payload) {
                console.log('[Sync] تحديث لحظي لبيانات المعمل');
                applyLabDataToTech(doc.data().payload);
            }
        }, (err) => console.error('[Sync] خطأ مزامنة المعمل:', err));

    // 2. مزامنة خطة التشغيل
    if (techOpsListener) techOpsListener();
    techOpsListener = db.collection('shared_data').doc('ops_latest')
        .onSnapshot((doc) => {
            if (doc.exists && doc.data().opYearlyData) {
                console.log('[Sync] تحديث لحظي لخطة التشغيل');
                applyOpsDataToTech(doc.data());
            }
        }, (err) => console.error('[Sync] خطأ مزامنة خطة التشغيل:', err));
}

async function fetchLatestLabForTech() {
    if (window.APP_ROLE !== 'tech') return;
    const db = getCloudFirestore();
    if (!db) return;

    // Try to get lab data from shared collection
    try {
        const uid = await waitForAuthUid(5000);
        if (uid) {
            // First try shared collection
            const sharedDoc = await db.collection('shared_data').doc('lab_latest').get();
            if (sharedDoc.exists && sharedDoc.data().payload) {
                console.log('[Firestore] Tech: Found lab data in shared collection');
                applyLabDataToTech(sharedDoc.data().payload);
                return;
            }

            // Fallback to user's own data
            const doc = await db.collection('users').doc(uid).collection('app_sync_snapshots').doc('lab').get();
            if (doc.exists && doc.data().payload) {
                console.log('[Firestore] Tech: Found lab data in user collection');
                applyLabDataToTech(doc.data().payload);
                return;
            }
        }

        console.log('[Firestore] Tech: No lab data found');
    } catch (error) {
        console.log('[Firestore] Tech: Error fetching lab data:', error.message);
    }
}

async function fetchLatestOpsForTech() {
    if (window.APP_ROLE !== 'tech') return;
    const db = getCloudFirestore();
    if (!db) return;

    // Try to get ops data from shared collection
    try {
        const uid = await waitForAuthUid(5000);
        if (uid) {
            // First try shared collection
            const sharedDoc = await db.collection('shared_data').doc('ops_latest').get();
            if (sharedDoc.exists && sharedDoc.data().opYearlyData) {
                applyOpsDataToTech(sharedDoc.data());
                return;
            }

            // Fallback to user's own data
            const doc = await db.collection('users').doc(uid).collection('app_sync_snapshots').doc('opsplan').get();
            if (doc.exists && doc.data().opYearlyData) {
                applyOpsDataToTech(doc.data());
                return;
            }
        }

        console.log('[Firestore] Tech: No ops data found');
    } catch (error) {
        console.log('[Firestore] Tech: Error fetching ops data:', error.message);
    }
}

function applyLabDataToTech(payload) {
    try {
        const dataLab = migrateLabPayload(payload);
        if (!dataLab) return;

        // Apply lab data to tech's lab section (read-only)
        applyLabDataToForm(dataLab);
        console.log('[Firestore] Tech: Lab data applied successfully');
    } catch (error) {
        console.error('[Firestore] Tech: Error applying lab data:', error);
    }
}

function applyOpsDataToTech(data) {
    try {
        // Apply ops data to tech's ops section (read-only)
        if (data.opYearlyData && typeof data.opYearlyData === 'object') {
            opYearlyData = data.opYearlyData;
            localStorage.setItem('op_plan_yearly_data', JSON.stringify(opYearlyData));
        }
        if (data.op_plan_year != null && document.getElementById('opYearInput')) {
            document.getElementById('opYearInput').value = data.op_plan_year;
            localStorage.setItem('op_plan_year', String(data.op_plan_year));
        }
        if (data.op_plan_month != null && document.getElementById('opMonthSel')) {
            document.getElementById('opMonthSel').value = data.op_plan_month;
            localStorage.setItem('op_plan_month', String(data.op_plan_month));
        }

        // Load and build ops table
        if (typeof loadOperatingPlan === 'function') {
            loadOperatingPlan();
        }
        if (typeof buildOpTable === 'function') {
            buildOpTable();
        }

    } catch (error) {
        console.error('[Firestore] Tech: Error applying ops data:', error);
    }
}

// Manual refresh function for tech users
function refreshTechData() {
    if (window.APP_ROLE !== 'tech') return;

    if (typeof showToast === 'function') {
        showToast('جاري تحديث جميع البيانات...');
    }

    // Fetch all data for tech user
    fetchLatestLabForTech();  // Lab data
    fetchLatestOpsForTech();  // Ops plan data
}

// Network connectivity check function
function updateSyncIndicator(online) {
    const indicators = document.querySelectorAll('.sync-indicator');
    indicators.forEach(el => {
        if (online) {
            el.classList.remove('sync-offline');
            el.classList.add('sync-online');
            el.querySelector('.sync-text').textContent = 'متصل (مزامنة لحظية)';
        } else {
            el.classList.remove('sync-online');
            el.classList.add('sync-offline');
            el.querySelector('.sync-text').textContent = 'غير متصل (حفظ محلي)';
        }
    });
}

async function checkFirebaseConnectivity() {
    try {
        const db = getCloudFirestore();
        if (!db) {
            updateSyncIndicator(false);
            return false;
        }

        // Try to read a simple document to test connectivity
        await db.collection('_health_check').doc('connectivity').get();
        updateSyncIndicator(true);
        return true;
    } catch (error) {
        // Check if it's a blocking error
        const errorMsg = error.message || '';
        if (errorMsg.includes('ERR_BLOCKED_BY_CLIENT') || errorMsg.includes('blocked')) {
            console.warn('[Firestore] Connection blocked by browser extension');
            updateSyncIndicator(true);
            return true;
        }
        if (error.code === 'permission-denied' || error.code === 'not-found') {
            updateSyncIndicator(true);
            return true;
        }
        updateSyncIndicator(false);
        console.log('[Firestore] Connectivity check failed:', error.message);
        return false;
    }
}

// Enhanced initialization with connectivity check
document.addEventListener('DOMContentLoaded', async () => {
    // Check Firebase connectivity after a short delay
    setTimeout(async () => {
        const isConnected = await checkFirebaseConnectivity();
        if (isConnected) {
            console.log('[Firestore] Connection established');

            // For lab/ops managers, fetch latest data after authentication
            if (window.APP_ROLE === 'lab_manager') {
                setTimeout(() => fetchLatestLabFromCloudAndApply(), 1000);
            } else if (window.APP_ROLE === 'ops_manager') {
                setTimeout(() => fetchLatestOpPlanFromCloudAndApply(), 1000);
            } else if (window.APP_ROLE === 'tech') {
                console.log('[Firestore] Tech user detected - starting realtime sync...');
                startTechRealtimeSync();

                // Also try periodic refresh (silent - no console messages) as backup
                setInterval(() => {
                    if (document.visibilityState === 'visible') {
                        fetchLatestLabForTech();
                        fetchLatestOpsForTech();
                    }
                }, 30000); // Every 30 seconds
            }
        } else {
            console.warn('[Firestore] Connection failed - working in offline mode');
            if (typeof showToast === 'function') {
                showToast('يعمل التطبيق في وضع عدم الاتصال - سيتم حفظ البيانات محلياً');
            }
        }
    }, 2000);
});

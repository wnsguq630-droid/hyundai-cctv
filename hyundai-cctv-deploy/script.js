(() => {
  'use strict';
  const form = document.getElementById('consultation-form');
  if (!form || form.dataset.firebaseSubmitBound === 'true') return;
  form.dataset.firebaseSubmitBound = 'true';
  const button = document.getElementById('consultation-submit');
  const statusBox = document.getElementById('form-status');
  const originalLabel = button.textContent;
  const storageKey = 'hyundai_cctv_last_consultation_at';
  const places = ['매장', '사무실', '공장', '창고', '주택', '기타'];
  const counts = ['2대', '4대', '6대', '8대 이상', '잘 모르겠어요'];
  let submitting = false;
  let lastSubmittedAt = 0;
  let firebasePromise;
  try { lastSubmittedAt = Number(localStorage.getItem(storageKey)) || 0; } catch { /* Storage may be unavailable. */ }

  const showStatus = (message, type = 'info') => {
    statusBox.hidden = false;
    statusBox.textContent = message;
    statusBox.className = `form-status show ${type === 'fatal' ? 'error' : type}`;
    if (type === 'success' || type === 'fatal') {
      try { statusBox.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); } catch { /* optional */ }
    }
  };
  const clearFieldErrors = () => {
    form.querySelectorAll('.field-error').forEach(el => { el.hidden = true; el.textContent = ''; });
    form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  };
  const markField = (field, message) => {
    const holder = document.getElementById(`${field.id === 'privacy-agreed' ? 'privacy' : field.id === 'area' ? 'area' : field.id}-error`);
    field.setAttribute('aria-invalid', 'true');
    if (holder) { holder.textContent = message; holder.hidden = false; }
  };
  form.addEventListener('input', (event) => {
    const el = event.target;
    if (!el || !el.removeAttribute) return;
    el.removeAttribute('aria-invalid');
    const holder = document.getElementById(`${el.id === 'privacy-agreed' ? 'privacy' : el.id}-error`);
    if (holder) { holder.hidden = true; holder.textContent = ''; }
  });
  // Korean phone numbers: mobile 01x, Seoul 02, other regional 0[3-6]x, internet phone 070. Length 9-11 digits stays within the Firestore rule ^0[0-9]{8,10}$.
  const phonePattern = /^(01[016789][0-9]{7,8}|02[0-9]{7,8}|0[3-6][1-5][0-9]{7,8}|070[0-9]{8})$/;
  // Load on demand so a CDN failure is caught and the customer can retry.
  const getFirebase = () => {
    if (!firebasePromise) {
      firebasePromise = Promise.all([
        import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js')
      ]).then(([appSDK, firestoreSDK]) => {
        const config = {
          apiKey: 'AIzaSyB07_zG3sMTzeBHzfrG_TaEkmawRxdiRPI',
          authDomain: 'hyundai-cctv-24280.firebaseapp.com',
          projectId: 'hyundai-cctv-24280',
          storageBucket: 'hyundai-cctv-24280.firebasestorage.app',
          messagingSenderId: '326842548906',
          appId: '1:326842548906:web:74c3acb4d6d17de1fd06d3'
        };
        const app = appSDK.getApps().find(existing =>
          existing.options.projectId === config.projectId && existing.options.appId === config.appId
        ) || appSDK.initializeApp(config, 'hyundai-cctv-consultations');
        return { ...firestoreSDK, db: firestoreSDK.getFirestore(app) };
      }).catch((error) => { firebasePromise = undefined; throw error; });
    }
    return firebasePromise;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitting) return;
    statusBox.className = 'form-status';
    statusBox.hidden = true;
    const fields = form.elements;
    const payload = {
      name: fields.name.value.trim() || '미입력',
      phone: fields.phone.value.replace(/[\s().-]/g, '').replace(/^\+82/, '0'),
      placeType: fields.place_type.value,
      location: fields.region.value.trim(),
      cameraCount: fields.camera_count.value.trim() || '잘 모르겠어요',
      message: [
        document.getElementById('selected-case')?.textContent.trim(),
        Array.from(form.querySelectorAll('input[name="bundle"]:checked')).map(input => input.parentElement.textContent.trim()).join(', ')
      ].filter(Boolean).join(' / '),
      privacyAgreed: fields.privacy_agreed.checked,
      status: '신규'
    };
    clearFieldErrors();
    const reject = (field, message) => {
      showStatus(message, 'error');
      const detail = field.closest('details');
      if (detail) detail.open = true;
      markField(field, message);
      field.focus();
    };
    if (payload.name.length > 30) return reject(fields.name, '성함은 30자 이내로 입력해 주세요.');
    if (!phonePattern.test(payload.phone)) return reject(fields.phone, '연락처를 올바르게 입력해 주세요. 휴대폰은 010-0000-0000 형식, 유선은 지역번호를 포함해 주세요.');
    if (!payload.location || payload.location.length > 100) return reject(fields.region, '설치 지역을 1~100자로 입력해 주세요.');
    if (!places.includes(payload.placeType)) return reject(fields.place_type, '설치 장소를 선택해 주세요.');
    if (!payload.cameraCount.trim() || payload.cameraCount.length > 30 || (fields.camera_count.tagName === 'SELECT' && !counts.includes(payload.cameraCount))) return reject(fields.camera_count, '희망 카메라 수를 선택해 주세요.');
    if (payload.message.length > 1000) { showStatus('선택한 내용이 너무 깁니다. 페이지를 새로고침한 뒤 다시 신청하거나 1522-1606으로 연락해 주세요.', 'error'); return; }
    if (!fields.privacy_agreed.checked) return reject(fields.privacy_agreed, '개인정보 수집 및 이용에 동의해 주세요.');
    if (fields.website.value.trim()) { showStatus('정상적인 방법으로 다시 신청해 주세요.', 'error'); return; }
    const remaining = 60000 - (Date.now() - lastSubmittedAt);
    if (remaining > 0) { showStatus(`이미 접수되었습니다. 추가 신청은 약 ${Math.ceil(remaining / 1000)}초 후 가능합니다.`, 'info'); return; }
    if (navigator.onLine === false) { showStatus('인터넷 연결을 확인한 뒤 다시 신청해 주세요.', 'error'); return; }

    submitting = true;
    button.disabled = true;
    button.textContent = '신청 중...';
    form.setAttribute('aria-busy', 'true');
    showStatus('상담 신청을 접수하고 있습니다. 잠시 기다려 주세요.');
    try {
      const { db, collection, addDoc, serverTimestamp } = await getFirebase();
      await addDoc(collection(db, 'consultations'), { ...payload, createdAt: serverTimestamp() });
      try { if (typeof window.fbq === 'function') window.fbq('track', 'Lead'); } catch {}
      // Do not turn a confirmed write into an error when storage is blocked.
      lastSubmittedAt = Date.now();
      try { localStorage.setItem(storageKey, String(lastSubmittedAt)); } catch { /* Best-effort cooldown. */ }
      form.reset();
      showStatus('상담 신청이 접수되었습니다. 담당자가 확인 후 연락드려 설치 구성과 비용을 안내합니다. 급하신 경우 1522-1606으로 전화해 주세요.', 'success');
      statusBox.focus({ preventScroll: true });
    } catch (error) {
      // Do not log customer names, phone numbers, or the submitted payload.
      console.error('상담 접수 실패:', error?.code || error?.name || 'unknown');
      showStatus('접수를 완료하지 못했습니다. 입력 내용은 유지됩니다. 잠시 후 다시 시도하거나 1522-1606으로 연락해 주세요.', 'fatal');
    } finally {
      submitting = false;
      button.disabled = false;
      button.textContent = originalLabel;
      form.removeAttribute('aria-busy');
    }
  });
})();

// Meta Pixel events: Contact (tel / KakaoTalk click) and FormStart (first interaction). No personal data is sent.
(() => {
  'use strict';
  const track = (kind, name, params) => { try { if (typeof window.fbq === 'function') window.fbq(kind, name, params); } catch { /* tracking must never break the page */ } };
  document.addEventListener('click', (event) => {
    const link = event.target.closest && event.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    if (href.startsWith('tel:')) track('track', 'Contact', { content_name: 'tel' });
    else if (href.includes('pf.kakao.com')) track('track', 'Contact', { content_name: 'kakao' });
  });
  const form = document.getElementById('consultation-form');
  if (form) {
    let started = false;
    form.addEventListener('focusin', () => { if (started) return; started = true; track('trackCustom', 'FormStart'); });
  }
})();

(() => {
  'use strict';

  // Supabase Dashboard의 Connect 또는 Settings > API Keys에서 확인한 값을 넣으세요.
  // 브라우저에는 Publishable Key(권장) 또는 기존 anon public key만 사용합니다.
  const SUPABASE_URL = 'https://hjvnqkpvzeiszitxkzbi.supabase.co';
  const SUPABASE_PUBLIC_KEY = 'sb_publishable_Ljek2NbI7M8qL0mauw_IeQ_xeMB3CCt';

  const MIN_SUBMIT_INTERVAL_MS = 60 * 1000;
  const MIN_FORM_FILL_TIME_MS = 2500;
  const LAST_SUBMIT_KEY = 'hyundai_cctv_last_consultation_at';
  const formOpenedAt = Date.now();
  const form = document.getElementById('consultation-form');
  if (!form) return;

  const submitButton = document.getElementById('consultation-submit');
  const statusBox = document.getElementById('form-status');
  let isSubmitting = false;

  const showStatus = (message, type = 'info') => {
    statusBox.textContent = message;
    statusBox.className = `form-status show ${type}`;
  };

  const normalizePhone = (value) => value.trim().replace(/[.\s()]/g, '-').replace(/-+/g, '-');
  const isValidPhone = (value) => /^(?:0\d{1,2})-?\d{3,4}-?\d{4}$/.test(value.replace(/\s/g, ''));
  const isConfigured = () => /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(SUPABASE_URL)
    && !SUPABASE_PUBLIC_KEY.startsWith('YOUR_')
    && SUPABASE_PUBLIC_KEY.length > 20;

  // Turnstile 도입 시 위젯이 만드는 토큰을 이 함수에서 읽습니다.
  // 토큰 검증은 반드시 Supabase Edge Function 또는 Vercel Function에서 수행하세요.
  const getTurnstileToken = () => {
    const tokenInput = form.querySelector('[name="cf-turnstile-response"]');
    return tokenInput ? tokenInput.value : '';
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    statusBox.className = 'form-status';

    const name = form.elements.name.value.trim();
    const phone = normalizePhone(form.elements.phone.value);
    const privacyAgreed = form.elements.privacy_agreed.checked;
    const honeypot = form.elements.website.value.trim();

    if (!name) {
      showStatus('성함을 입력해 주세요.', 'error');
      form.elements.name.focus();
      return;
    }
    if (!phone || !isValidPhone(phone)) {
      showStatus('연락처를 올바른 형식으로 입력해 주세요. 예: 010-1234-5678', 'error');
      form.elements.phone.focus();
      return;
    }
    if (!privacyAgreed) {
      showStatus('개인정보 수집 및 이용 동의가 필요합니다.', 'error');
      form.elements.privacy_agreed.focus();
      return;
    }
    if (honeypot || Date.now() - formOpenedAt < MIN_FORM_FILL_TIME_MS) {
      showStatus('정상적인 방법으로 다시 신청해 주세요.', 'error');
      return;
    }

    const lastSubmittedAt = Number(localStorage.getItem(LAST_SUBMIT_KEY) || 0);
    const remainingMs = MIN_SUBMIT_INTERVAL_MS - (Date.now() - lastSubmittedAt);
    if (remainingMs > 0) {
      showStatus(`잠시 후 다시 신청해 주세요. 약 ${Math.ceil(remainingMs / 1000)}초 남았습니다.`, 'error');
      return;
    }
    if (!isConfigured()) {
      showStatus('상담 접수 설정이 아직 완료되지 않았습니다. 관리자에게 문의해 주세요.', 'error');
      return;
    }

    const payload = {
      name,
      phone,
      region: form.elements.region.value.trim() || null,
      place_type: form.elements.place_type.value || null,
      camera_count: form.elements.camera_count.value.trim() || null,
      message: form.elements.message.value.trim() || null,
      privacy_agreed: true
    };

    // 향후 Edge Function으로 전환할 때 전송할 Turnstile 토큰입니다.
    const turnstileToken = getTurnstileToken();
    void turnstileToken;

    isSubmitting = true;
    submitButton.disabled = true;
    submitButton.textContent = '상담 신청 중...';
    showStatus('상담 신청을 접수하고 있습니다.', 'info');

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/consultations`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_PUBLIC_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const detail = await response.text();
        console.error('Supabase insert failed:', response.status, detail);
        throw new Error('Supabase insert failed');
      }

      localStorage.setItem(LAST_SUBMIT_KEY, String(Date.now()));
      form.reset();
      showStatus('상담 신청이 완료되었습니다. 확인 후 빠르게 연락드리겠습니다.', 'success');
    } catch (error) {
      console.error(error);
      showStatus('상담 신청 중 오류가 발생했습니다. 잠시 후 다시 시도하거나 1522-1606으로 연락해 주세요.', 'error');
    } finally {
      isSubmitting = false;
      submitButton.disabled = false;
      submitButton.textContent = '무료 견적 신청하기';
    }
  });
})();

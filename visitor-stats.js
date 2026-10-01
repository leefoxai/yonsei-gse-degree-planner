(() => {
  'use strict';

  const API_URL = 'https://wfbyuqkkcareqkcqkkcp.supabase.co/functions/v1/gse-visitor-stats';
  const PUBLISHABLE_KEY = 'sb_publishable_Xh2uC6mgZP-5_ytpn6ZdnQ_3ZUXa8Zl';
  const STORAGE_KEY = 'gse-degree-planner-visitor-v1';
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  let visitorId;

  function getVisitorId() {
    if (visitorId !== undefined) return visitorId;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      visitorId = UUID.test(saved || '') ? saved : crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, visitorId);
    } catch {
      // Read-only statistics when storage is unavailable: avoid counting every reload.
      visitorId = null;
    }
    return visitorId;
  }

  let refreshing = false;
  let lastSuccess = false;

  function isProductionPage() {
    return location.hostname === 'leefoxai.github.io' &&
      /^\/yonsei-gse-degree-planner(?:\/|$)/.test(location.pathname);
  }

  function ensureStyles() {
    if (document.getElementById('visitorStatsStyles')) return;
    const style = document.createElement('style');
    style.id = 'visitorStatsStyles';
    style.textContent = `
      .visitor-stats{display:flex;justify-content:center;align-items:center;gap:10px;flex-wrap:wrap;margin:10px 0 18px;color:#667085;font-size:12px;line-height:1.4;font-variant-numeric:tabular-nums}
      .visitor-stats b{color:#344054;font-weight:700}
      .visitor-stats button{font:inherit;color:inherit;background:transparent;border:1px solid #d0d5dd;border-radius:4px;padding:2px 6px;cursor:pointer}
      .visitor-stats-sep{color:#98a2b3}
      @media(max-width:640px){.visitor-stats{margin:8px 0 84px;font-size:11px}}
      @media print{.visitor-stats{display:none!important}}
    `;
    document.head.appendChild(style);
  }

  function ensureCounter() {
    let wrap = document.getElementById('visitorStats');
    if (wrap) return wrap;
    ensureStyles();
    wrap = document.createElement('div');
    wrap.id = 'visitorStats';
    wrap.className = 'visitor-stats no-print';
    wrap.setAttribute('aria-label', '방문자 통계');
    wrap.setAttribute('title', '2026-10-01부터 브라우저별 집계 · Today는 한국 시간 기준');
    wrap.innerHTML = '<span>Total <b id="visitorTotal">—</b></span><span class="visitor-stats-sep" aria-hidden="true">·</span><span>Today <b id="visitorDaily">—</b></span><span id="visitorStatsStatus" role="status" aria-live="polite">통계 확인 중…</span><button id="visitorStatsRetry" type="button" hidden>다시 시도</button>';
    const footer = document.querySelector('.footer');
    if (footer) footer.insertAdjacentElement('afterend', wrap);
    else (document.querySelector('.app') || document.body).appendChild(wrap);
    document.getElementById('visitorStatsRetry').addEventListener('click', refreshStats);
    return wrap;
  }

  function validCount(value) {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
  }

  // The server deduplicates this browser ID across retries and reloads.
  async function refreshStats() {
    if (!isProductionPage() || refreshing) return;
    refreshing = true;
    const status = document.getElementById('visitorStatsStatus');
    const retry = document.getElementById('visitorStatsRetry');
    retry.disabled = true;
    status.textContent = '통계 확인 중…';
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: PUBLISHABLE_KEY },
        body: JSON.stringify({ visitor_id: getVisitorId() }),
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`visitor stats HTTP ${response.status}`);
      const data = await response.json();
      // Do not silently mix page views with unique visitors or turn null into 0.
      const total = data?.total?.uv;
      const daily = data?.today?.uv;
      if (!validCount(total) || !validCount(daily)) throw new Error('visitor stats invalid response');
      document.getElementById('visitorTotal').textContent = total.toLocaleString('ko-KR');
      document.getElementById('visitorDaily').textContent = daily.toLocaleString('ko-KR');
      lastSuccess = true;
      status.textContent = '';
      retry.hidden = true;
    } catch (error) {
      status.textContent = lastSuccess ? '통계 갱신 실패 · 마지막 조회값' : '통계 조회 불가';
      retry.hidden = false;
      console.warn('[visitor-stats] 통계를 불러오지 못했습니다.', error);
    } finally {
      window.clearTimeout(timeout);
      retry.disabled = false;
      refreshing = false;
    }
  }

  function init() {
    if (!isProductionPage()) return;
    ensureCounter();
    window.setTimeout(refreshStats, 1600);
    window.setTimeout(() => { if (!lastSuccess) refreshStats(); }, 12000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();

// Canlı test koşucusu — otorder.com + whatsapp.otorder.com PROD'a karşı somut
// senaryolar (docs/test-plan.md alt kümesi). Güvenli: çoğu okuma/validasyon/negatif
// + eldeki fixture token'lar. PASS/FAIL sayar, docs/test-results.md yazar.
import { readFileSync, writeFileSync } from 'node:fs';

const OT = 'https://otorder.com';
const WA = 'https://whatsapp.otorder.com';
const rd = (p) => { try { return readFileSync(p, 'utf8').trim(); } catch { return ''; } };
const WA_TOKEN = rd('/tmp/wa-token.txt');
const OT_TOKEN = rd('/tmp/ot-token.txt');
const OT_PASS = rd('/tmp/ot-pass.txt');

let pass = 0, fail = 0;
const rows = [];
let curArea = '';
const area = (a) => { curArea = a; };

async function http(method, url, { token, key, body, headers } = {}) {
  const h = { 'Content-Type': 'application/json', ...(headers || {}) };
  if (token) h.Authorization = `Bearer ${token}`;
  if (key) h['X-API-Key'] = key;
  const res = await fetch(url, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

// check: title + async fn that returns [okBool, detailStr]
async function t(title, fn) {
  const id = 'LT-' + String(pass + fail + 1).padStart(3, '0');
  try {
    const [ok, detail] = await fn();
    if (ok) { pass++; rows.push([id, curArea, 'PASS', title, detail || '']); }
    else { fail++; rows.push([id, curArea, 'FAIL', title, detail || '']); }
  } catch (e) {
    fail++; rows.push([id, curArea, 'FAIL', title, 'exception: ' + String(e.message).slice(0, 80)]);
  }
}

// ============================ OtOrder Platform ============================
area('OtOrder Platform & Fiyat');
await t('Plan listesi 3 paket döner', async () => {
  const r = await http('GET', `${OT}/api/platform/billing/plans`);
  const n = r.data?.plans?.length ?? 0;
  return [r.status === 200 && n >= 3, `status ${r.status}, ${n} plan`];
});
await t('Başlangıç fiyatı 990 TL', async () => {
  const r = await http('GET', `${OT}/api/platform/billing/plans`);
  const p = r.data?.plans?.find((x) => x.key === 'STARTER');
  return [p?.monthlyPrice === 990, `monthlyPrice ${p?.monthlyPrice}`];
});
await t('Pro fiyatı 1990 TL', async () => {
  const r = await http('GET', `${OT}/api/platform/billing/plans`);
  const p = r.data?.plans?.find((x) => x.key === 'PRO');
  return [p?.monthlyPrice === 1990, `monthlyPrice ${p?.monthlyPrice}`];
});
await t('Kurumsal fiyatı 3990 + brandedApp+customLanding', async () => {
  const r = await http('GET', `${OT}/api/platform/billing/plans`);
  const p = r.data?.plans?.find((x) => x.key === 'ENTERPRISE');
  return [p?.monthlyPrice === 3990 && p?.features?.brandedApp && p?.features?.customLanding, `${p?.monthlyPrice}, branded=${p?.features?.brandedApp}`];
});
await t('Pro whatsappLink+marketplace açık, STARTER kapalı', async () => {
  const r = await http('GET', `${OT}/api/platform/billing/plans`);
  const pro = r.data?.plans?.find((x) => x.key === 'PRO');
  const st = r.data?.plans?.find((x) => x.key === 'STARTER');
  return [pro?.features?.whatsappLink && pro?.features?.marketplace && !st?.features?.whatsappLink, `pro.wa=${pro?.features?.whatsappLink} st.wa=${st?.features?.whatsappLink}`];
});

area('OtOrder Subdomain Kontrol');
await t('Geçerli boş subdomain müsait', async () => {
  const r = await http('GET', `${OT}/api/platform/signup/check-subdomain?subdomain=bosyeni${Date.now()}`);
  return [r.data?.available === true, `available ${r.data?.available}`];
});
await t('Ayrılmış subdomain (api) reddedilir', async () => {
  const r = await http('GET', `${OT}/api/platform/signup/check-subdomain?subdomain=api`);
  return [r.data?.available === false, `available ${r.data?.available}`];
});
await t('Ayrılmış subdomain (www) reddedilir', async () => {
  const r = await http('GET', `${OT}/api/platform/signup/check-subdomain?subdomain=www`);
  return [r.data?.available === false, `available ${r.data?.available}`];
});
await t('Alınmış subdomain (testwa) müsait değil', async () => {
  const r = await http('GET', `${OT}/api/platform/signup/check-subdomain?subdomain=testwa`);
  return [r.data?.available === false, `available ${r.data?.available}`];
});
await t('Kısa/geçersiz subdomain (ab) reddedilir', async () => {
  const r = await http('GET', `${OT}/api/platform/signup/check-subdomain?subdomain=ab`);
  return [r.data?.available === false, `available ${r.data?.available}`];
});
await t('Geçersiz karakterli subdomain reddedilir', async () => {
  const r = await http('GET', `${OT}/api/platform/signup/check-subdomain?subdomain=abc_def!`);
  return [r.data?.available === false, `available ${r.data?.available}`];
});

area('OtOrder Signup Validasyon');
await t('Eksik alanlarla signup 400', async () => {
  const r = await http('POST', `${OT}/api/platform/signup`, { body: { email: 'x@y.com' } });
  return [r.status === 400, `status ${r.status}`];
});
await t('Kısa şifre ile signup 400', async () => {
  const r = await http('POST', `${OT}/api/platform/signup`, { body: { name: 'A', email: `a${Date.now()}@b.com`, password: '123', restaurantName: 'R', subdomain: `x${Date.now()}` } });
  return [r.status === 400, `status ${r.status}`];
});
await t('Geçersiz email ile signup 400', async () => {
  const r = await http('POST', `${OT}/api/platform/signup`, { body: { name: 'A', email: 'gecersiz', password: 'gizli123', restaurantName: 'R', subdomain: `x${Date.now()}` } });
  return [r.status === 400, `status ${r.status}`];
});
await t('Alınmış subdomain ile signup 409', async () => {
  const r = await http('POST', `${OT}/api/platform/signup`, { body: { name: 'A', email: `a${Date.now()}@b.com`, password: 'gizli123', restaurantName: 'R', subdomain: 'testwa' } });
  return [r.status === 409, `status ${r.status}`];
});
await t('Ayrılmış subdomain ile signup 400', async () => {
  const r = await http('POST', `${OT}/api/platform/signup`, { body: { name: 'A', email: `a${Date.now()}@b.com`, password: 'gizli123', restaurantName: 'R', subdomain: 'admin' } });
  return [r.status === 400, `status ${r.status}`];
});

area('OtOrder Kimlik & Yetki');
await t('Yanlış şifre ile login 401', async () => {
  const r = await http('POST', `${OT}/api/auth/login`, { body: { email: 'test+ot@haberbenim.com', password: 'yanlissifre' } });
  return [r.status === 401, `status ${r.status}`];
});
await t('Kayıtsız email ile login 401', async () => {
  const r = await http('POST', `${OT}/api/auth/login`, { body: { email: 'yok@yok.com', password: 'x' } });
  return [r.status === 401, `status ${r.status}`];
});
await t('Token olmadan /me 401', async () => {
  const r = await http('GET', `${OT}/api/auth/me`);
  return [r.status === 401, `status ${r.status}`];
});
await t('Geçersiz token ile /me 401', async () => {
  const r = await http('GET', `${OT}/api/auth/me`, { token: 'bozuk.token.xxx' });
  return [r.status === 401, `status ${r.status}`];
});
await t('Süper-admin login yetkisiz email 403', async () => {
  const r = await http('POST', `${OT}/api/platform/admin/login`, { body: { email: 'rastgele@x.com', password: 'x' } });
  return [r.status === 403, `status ${r.status}`];
});
if (OT_TOKEN) {
  await t('Geçerli owner token ile /me 200', async () => {
    const r = await http('GET', `${OT}/api/auth/me`, { token: OT_TOKEN });
    return [r.status === 200 && !!r.data?.user, `status ${r.status}`];
  });
  await t('Owner token super-admin endpoint 403', async () => {
    const r = await http('GET', `${OT}/api/platform/admin/tenants`, { token: OT_TOKEN });
    return [r.status === 403, `status ${r.status}`];
  });
}

area('OtOrder Onboarding & Billing (owner)');
if (OT_TOKEN) {
  await t('Onboarding durumu owner ile 200', async () => {
    const r = await http('GET', `${OT}/api/platform/onboarding/status`, { token: OT_TOKEN });
    return [r.status === 200, `status ${r.status}, step ${r.data?.onboardingStep}`];
  });
  await t('Onboarding auth olmadan 401', async () => {
    const r = await http('GET', `${OT}/api/platform/onboarding/status`);
    return [r.status === 401, `status ${r.status}`];
  });
  await t('Abonelik durumu owner ile 200', async () => {
    const r = await http('GET', `${OT}/api/platform/billing/subscription`, { token: OT_TOKEN });
    return [r.status === 200, `status ${r.status}`];
  });
}

// ============================ whatres ============================
area('whatres Kimlik & Plan');
await t('whatres plan Gümüş 1000 TL', async () => {
  const r = await http('GET', `${WA}/api/billing/plans`);
  const p = (r.data?.data?.plans || r.data?.plans || []).find((x) => x.key === 'SILVER');
  return [p?.monthlyPrice === 1000 && p?.currency === 'TRY', `${p?.monthlyPrice} ${p?.currency}`];
});
await t('whatres register eksik alan 400', async () => {
  const r = await http('POST', `${WA}/api/auth/register`, { body: { email: 'x@y.com' } });
  return [r.status === 400, `status ${r.status}`];
});
await t('whatres register consent olmadan 400', async () => {
  const r = await http('POST', `${WA}/api/auth/register`, { body: { email: `a${Date.now()}@b.com`, password: 'gizli1234', name: 'Ad Soyad', phone: '05550000000', tenantName: 'R' } });
  return [r.status === 400, `status ${r.status}`];
});
await t('whatres register kısa şifre 400', async () => {
  const r = await http('POST', `${WA}/api/auth/register`, { body: { email: `a${Date.now()}@b.com`, password: '123', name: 'Ad Soyad', phone: '05550000000', tenantName: 'R', consents: { terms: true, kvkk: true, explicitConsent: true, dpa: true } } });
  return [r.status === 400, `status ${r.status}`];
});
await t('whatres login yanlış şifre 401', async () => {
  const r = await http('POST', `${WA}/api/auth/login`, { body: { email: 'test+wa@haberbenim.com', password: 'yanlis' } });
  return [r.status === 401, `status ${r.status}`];
});
await t('whatres health 200', async () => {
  const r = await http('GET', `${WA}/api/health`);
  return [r.status === 200, `status ${r.status}`];
});

area('whatres OtOrder-Bağla (negatif + auth)');
await t('connect-otorder auth olmadan 401', async () => {
  const r = await http('POST', `${WA}/api/integrations/pos/connect-otorder`, { body: {} });
  return [r.status === 401, `status ${r.status}`];
});
if (WA_TOKEN) {
  await t('connect-otorder eksik alan 400', async () => {
    const r = await http('POST', `${WA}/api/integrations/pos/connect-otorder`, { token: WA_TOKEN, body: { subdomain: 'testwa' } });
    return [r.status === 400, `status ${r.status}`];
  });
  await t('connect-otorder yanlış OtOrder şifresi 401', async () => {
    const r = await http('POST', `${WA}/api/integrations/pos/connect-otorder`, { token: WA_TOKEN, body: { subdomain: 'testwa', email: 'test+ot@haberbenim.com', password: 'kesinlikleyanlis' } });
    return [r.status === 401, `status ${r.status}, ${r.data?.error?.message || ''}`.slice(0, 60)];
  });
  await t('connect-otorder olmayan subdomain 502/401', async () => {
    const r = await http('POST', `${WA}/api/integrations/pos/connect-otorder`, { token: WA_TOKEN, body: { subdomain: 'olmayanrestoran999', email: 'a@b.com', password: 'x' } });
    return [[502, 401, 404].includes(r.status), `status ${r.status}`];
  });
  await t('POS entegrasyon durumu bağlı', async () => {
    const r = await http('GET', `${WA}/api/integrations/pos`, { token: WA_TOKEN });
    return [r.status === 200 && r.data?.data?.isConfigured === true, `configured ${r.data?.data?.isConfigured}`];
  });
}

area('OtOrder External API (partner key)');
if (OT_TOKEN) {
  // partner key testwa'dan alınamıyorsa atla — menü erişimini owner ile dolaylı doğrula
  await t('External menu API-Key olmadan 401', async () => {
    const r = await http('GET', `https://testwa.otorder.com/api/external/menu`);
    return [r.status === 401, `status ${r.status}`];
  });
  await t('Geçersiz API-Key ile external menu 401', async () => {
    const r = await http('GET', `https://testwa.otorder.com/api/external/menu`, { key: 'gecersizkey123' });
    return [r.status === 401, `status ${r.status}`];
  });
}

// ============================ Rapor ============================
const total = pass + fail;
const pct = total ? Math.round((pass / total) * 100) : 0;
let md = `# Canlı Test Sonuçları — otorder.com + whatsapp.otorder.com\n\n`;
md += `> Otomatik koşum (scripts/live-test-runner.mjs). Prod'a karşı gerçek istekler.\n`;
md += `> **${pass}/${total} PASS (%${pct})**, ${fail} FAIL.\n\n`;
md += `| ID | Alan | Sonuç | Senaryo | Detay |\n|---|---|---|---|---|\n`;
for (const [id, a, res, title, detail] of rows) {
  const mark = res === 'PASS' ? '✅' : '❌';
  md += `| ${id} | ${a} | ${mark} ${res} | ${title} | ${detail} |\n`;
}
writeFileSync('docs/test-results.md', md);
console.log(`\n=== SONUÇ: ${pass}/${total} PASS (%${pct}), ${fail} FAIL ===`);
if (fail) { console.log('FAIL olanlar:'); rows.filter((r) => r[2] === 'FAIL').forEach((r) => console.log(`  ${r[0]} ${r[3]} — ${r[4]}`)); }
console.log('rapor: docs/test-results.md');

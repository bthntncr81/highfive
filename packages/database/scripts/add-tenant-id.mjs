// Faz 1 codemod: her tenant-owned modele `tenantId` + `tenant` relation + @@index ekler.
// Platform-global modeller (EXCLUDE) elle işlenir. Çıktıda Tenant modeline
// yapıştırılacak back-relation listesi basılır. Idempotent: tenantId varsa atlar.
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('../prisma/schema.prisma', import.meta.url).pathname;
// Elle işlenecekler: platform kimliği + oturum/aktivite (nullable tenantId alacak)
const EXCLUDE = new Set(['User', 'Session', 'ActivityLog']);

const src = readFileSync(FILE, 'utf8');
const lines = src.split('\n');
const out = [];
const backRelations = [];

const plural = (m) => {
  const lc = m[0].toLowerCase() + m.slice(1);
  if (lc.endsWith('y')) return lc.slice(0, -1) + 'ies';
  if (lc.endsWith('s')) return lc + 'es';
  return lc + 's';
};

let model = null;       // içinde bulunduğumuz model adı
let injected = false;   // bu modele tenantId eklendi mi
let hasTenant = false;  // modelde zaten tenantId var mı (idempotency)

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const m = line.match(/^model (\w+) \{/);
  if (m) {
    model = m[1];
    injected = false;
    // ileriye bak: modelde tenantId zaten var mı
    hasTenant = false;
    for (let j = i + 1; j < lines.length && !lines[j].startsWith('}'); j++) {
      if (/^\s*tenantId\s/.test(lines[j])) { hasTenant = true; break; }
    }
    out.push(line);
    continue;
  }

  if (model && !EXCLUDE.has(model) && !hasTenant && !injected && /@id\s/.test(line)) {
    out.push(line);
    out.push('  tenantId String');
    out.push('  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)');
    injected = true;
    backRelations.push(`  ${plural(model).padEnd(28)} ${model}[]`);
    continue;
  }

  if (model && line.startsWith('}')) {
    if (injected) out.push('  @@index([tenantId])');
    out.push(line);
    model = null;
    continue;
  }

  out.push(line);
}

writeFileSync(FILE, out.join('\n'));
console.log(`✓ ${backRelations.length} modele tenantId eklendi`);
console.log('\n--- Tenant modeline yapıştırılacak back-relations ---');
console.log(backRelations.join('\n'));

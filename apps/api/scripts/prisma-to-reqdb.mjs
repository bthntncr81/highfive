// Faz 2 AST codemod (ts-morph) — İKİ GEÇİŞ (bayat sembol tablosu tuzağına karşı):
//   --phase=strip  : `const prisma = (server as any).prisma ...` binding'lerini siler, kaydeder
//   --phase=rename : TAZE parse ile çözümlenemeyen `prisma` identifikatörlerini
//                    `request.db` yapar (helper'ların prisma PARAMETRELERİ çözümlü
//                    kaldığı için DOKUNULMAZ), kaydeder; request scope'ta olmayan
//                    noktaları elle-bakılacak diye raporlar.
import { Project, SyntaxKind } from 'ts-morph';

const phase = (process.argv.find((a) => a.startsWith('--phase=')) || '').split('=')[1];
if (!['strip', 'rename'].includes(phase)) {
  console.error('kullanım: node prisma-to-reqdb.mjs --phase=strip|rename');
  process.exit(1);
}

const project = new Project({ tsConfigFilePath: 'apps/api/tsconfig.app.json' });
const routeFiles = project.getSourceFiles('apps/api/src/routes/*.ts');

if (phase === 'strip') {
  let removed = 0;
  for (const sf of routeFiles) {
    // binding fonksiyon İÇİNDE — üst düzeyde değil; tüm derinliklerde ara
    const stmts = sf
      .getDescendantsOfKind(SyntaxKind.VariableStatement)
      .filter((s) => /const prisma = \(server as any\)\.prisma/.test(s.getText()));
    for (const stmt of stmts.reverse()) {
      stmt.remove();
      removed++;
    }
  }
  project.saveSync();
  console.log(`✓ strip: ${removed} binding satırı silindi`);
} else {
  let total = 0;
  const needsManual = [];
  for (const sf of routeFiles) {
    // sondan başa değiştir (pozisyon kaymalarına karşı)
    const ids = sf
      .getDescendantsOfKind(SyntaxKind.Identifier)
      .filter((id) => id.getText() === 'prisma')
      .reverse();
    let n = 0;
    for (const id of ids) {
      if (id.getDefinitionNodes().length > 0) continue; // param/import/yerel → koru
      const parent = id.getParent();
      if (parent?.getKind() === SyntaxKind.PropertyAccessExpression && parent.getLastChild() === id) continue;
      const fn = id.getFirstAncestor((a) =>
        [SyntaxKind.ArrowFunction, SyntaxKind.FunctionDeclaration, SyntaxKind.FunctionExpression].includes(a.getKind()),
      );
      const header = fn ? fn.getText().slice(0, Math.max(0, fn.getText().indexOf(')')) + 1) : '';
      if (!/\brequest\b/.test(header)) needsManual.push(`${sf.getBaseName()}:${id.getStartLineNumber()}`);
      id.replaceWithText('request.db');
      n++;
    }
    if (n) console.log(`  ${sf.getBaseName()}: ${n} dönüşüm`);
    total += n;
  }
  project.saveSync();
  console.log(`\n✓ rename: toplam ${total} adet prisma → request.db`);
  if (needsManual.length) {
    console.log(`\n⚠ request scope'ta YOK — elle bakılacak ${needsManual.length} nokta:`);
    console.log([...new Set(needsManual)].join('\n'));
  }
}

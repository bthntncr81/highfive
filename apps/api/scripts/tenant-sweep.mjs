// Faz 2 süpürme (ts-morph): iki mekanik dönüşüm, tüm route dosyalarında.
//  A. Paramsız handler + `request` kullanımı → ilk parametreye `request: FastifyRequest`
//     ekle (yalnız 0 parametreli arrow'larda; FastifyRequest zaten import'lu).
//  B. X.findUnique({ where: { <alan>: ... } }) burada <alan> artık-unique-değil
//     (key/code/name/phone/email/referralCode) → findFirst (tenant-scoped filtre
//     zaten dbFor tarafından eklenir; sonuç semantiği korunur).
import { Project, SyntaxKind, Node } from 'ts-morph';

const NON_UNIQUE = new Set(['key', 'code', 'name', 'phone', 'email', 'referralCode']);
const HANDLER_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch']);

const project = new Project({ tsConfigFilePath: 'apps/api/tsconfig.app.json' });
const files = project.getSourceFiles(['**/src/routes/*.ts','**/src/lib/*.ts']);

let addedParams = 0;
let toFindFirst = 0;

for (const sf of files) {
  // --- B: findUnique → findFirst (artık-unique-olmayan tek where alanı) ---
  for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const expr = call.getExpression();
    if (!Node.isPropertyAccessExpression(expr)) continue;
    if (expr.getName() !== 'findUnique') continue;
    const arg = call.getArguments()[0];
    if (!arg || !Node.isObjectLiteralExpression(arg)) continue;
    const whereProp = arg.getProperty('where');
    if (!whereProp || !Node.isPropertyAssignment(whereProp)) continue;
    const whereVal = whereProp.getInitializer();
    if (!whereVal || !Node.isObjectLiteralExpression(whereVal)) continue;
    const keys = whereVal.getProperties().filter((p) => Node.isPropertyAssignment(p) || Node.isShorthandPropertyAssignment(p));
    if (keys.length === 1) {
      const name = keys[0].getName?.() ?? '';
      if (NON_UNIQUE.has(name)) {
        expr.getNameNode().replaceWithText('findFirst');
        toFindFirst++;
      }
    }
  }

  // --- A: paramsız handler'a request ekle ---
  for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const expr = call.getExpression();
    if (!Node.isPropertyAccessExpression(expr)) continue;
    if (!HANDLER_METHODS.has(expr.getName())) continue;
    // son argüman handler (arrow) mı?
    const args = call.getArguments();
    const handler = args[args.length - 1];
    if (!handler || !Node.isArrowFunction(handler)) continue;
    if (handler.getParameters().length !== 0) continue;
    // gövdede `request` kullanılıyor mu (tanımsız identifier)?
    const usesRequest = handler
      .getDescendantsOfKind(SyntaxKind.Identifier)
      .some((id) => id.getText() === 'request' && id.getDefinitionNodes().length === 0);
    if (!usesRequest) continue;
    handler.insertParameter(0, { name: 'request', type: 'FastifyRequest' });
    addedParams++;
  }
}

project.saveSync();
console.log(`✓ A: ${addedParams} handler'a request eklendi`);
console.log(`✓ B: ${toFindFirst} findUnique → findFirst`);

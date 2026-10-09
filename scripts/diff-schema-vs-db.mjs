// Diff prisma/schema.prisma models against live Neon columns.
// Run via: npx netlify dev:exec -- node scripts/diff-schema-vs-db.mjs
// Never logs the connection string.
import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

// Minimal schema.prisma parser: extract model name + field names (scalars only,
// skip relation fields that have no DB column of their own and skip @@ lines).
function parseModels(schemaText) {
  const models = {};
  const modelRegex = /model\s+(\w+)\s*{([^}]*)}/g;
  let m;
  while ((m = modelRegex.exec(schemaText))) {
    const name = m[1];
    const body = m[2];
    const fields = [];
    for (const rawLine of body.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('//') || line.startsWith('@@')) continue;
      const fieldMatch = line.match(/^(\w+)\s+([\w\[\]?]+)/);
      if (!fieldMatch) continue;
      const [, fieldName, fieldType] = fieldMatch;
      // Skip pure relation fields: type is a Model name (capitalized, no []
      // scalar list of String/Int/etc) AND the line has a `fields:` relation
      // attribute, OR the type is a list of a model (e.g. BusinessProfile[]).
      const isRelationList = /^[A-Z]\w*\[\]$/.test(fieldType) && !['Json'].includes(fieldType.replace('[]', '').replace('?', ''));
      const hasRelationAttr = /@relation/.test(line);
      const scalarTypes = ['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json'];
      const baseType = fieldType.replace('[]', '').replace('?', '');
      const isScalarOrScalarList = scalarTypes.includes(baseType);
      if (hasRelationAttr && !isScalarOrScalarList) continue; // relation field referencing another model's object, e.g. `owner User? @relation(...)`
      if (isRelationList && !isScalarOrScalarList) continue; // e.g. businesses BusinessProfile[]
      fields.push(fieldName);
    }
    models[name] = fields;
  }
  return models;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not set in this environment');
    process.exit(1);
  }

  const schemaText = fs.readFileSync('prisma/schema.prisma', 'utf8');
  const models = parseModels(schemaText);

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: true } });
  await client.connect();

  try {
    let anyMissing = false;
    for (const [modelName, fields] of Object.entries(models)) {
      const res = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
        [modelName]
      );
      if (res.rows.length === 0) {
        console.log(`\n[${modelName}] TABLE NOT FOUND in database!`);
        anyMissing = true;
        continue;
      }
      const dbColumns = new Set(res.rows.map((r) => r.column_name));
      const missing = fields.filter((f) => !dbColumns.has(f));
      if (missing.length > 0) {
        console.log(`\n[${modelName}] MISSING columns: ${missing.join(', ')}`);
        anyMissing = true;
      } else {
        console.log(`[${modelName}] OK (${fields.length} fields checked)`);
      }
    }
    if (!anyMissing) {
      console.log('\nAll schema.prisma fields exist as columns in production DB.');
    }
  } finally {
    await client.end();
  }
}

main();

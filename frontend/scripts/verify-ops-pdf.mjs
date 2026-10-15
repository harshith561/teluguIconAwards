import fs from 'fs';
import zlib from 'zlib';

const file = process.argv[2];
const buf = fs.readFileSync(file);
const raw = buf.toString('latin1');

let text = [];
const re = /stream\r?\n/g;
let m;
while ((m = re.exec(raw)) !== null) {
  const start = m.index + m[0].length;
  const end = raw.indexOf('endstream', start);
  if (end < 0) continue;
  try {
    const out = zlib.inflateSync(buf.subarray(start, end)).toString('latin1');
    for (const t of out.matchAll(/\(([^)]{1,200})\)\s*Tj/g)) text.push(t[1]);
  } catch { /* not a flate stream */ }
}
const all = text.join(' | ');

console.log('file          :', file);
console.log('size          :', Math.round(buf.length / 1024), 'KB');
console.log('pages         :', (raw.match(/\/Type\s*\/Page[^s]/g) || []).length);
console.log('text runs     :', text.length);
console.log('');

const sections = [
  'OPERATIONS RUNBOOK', '1. Project Overview', '2. Environment Variables', '3. API Reference',
  '4. Measured Capacity', '5. Scaling to 10k', '6. Load Balancer Setup', '7. Production Deployment',
  '8. Pre-Launch Checklist',
];
console.log('SECTIONS');
for (const s of sections) console.log('  ' + (all.includes(s) ? 'OK     ' : 'MISSING') + ' ' + s);

console.log('\nKEY FACTS THAT MUST BE PRESENT');
const facts = [
  '4052 req/s', '3520 req/s', '1193 votes/s', '822 votes/s', '10653', '218 ms',
  'innodb_buffer_pool_size', 'TRUST_PROXY', 'MSG91_TEMPLATE_ID', 'JWT_SECRET',
  'DB_POOL_SIZE', 'max_connections', 'least_conn', 'X-Forwarded-For', 'mysqldump',
  'systemctl', 'uq_votes_category_phone', 'dev_otp', 'admin@teluguiconawards.com',
  '100,000', '50,000', '30,000', '10,000', '3307',
];
let missing = 0;
for (const f of facts) {
  const ok = all.includes(f);
  if (!ok) missing += 1;
  console.log('  ' + (ok ? 'OK     ' : 'MISSING') + ' ' + f);
}
console.log('\nmissing facts: ' + missing);
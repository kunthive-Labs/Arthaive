const fs = require('fs');
const path = require('path');
const { USD_TO_INR, LAST_UPDATED } = require('../config/currency');

// Read all CSV files from funding_data directory
function getAllCSVFiles() {
  const fundingDataDir = path.join(__dirname, '../funding_data');
  const weekFolders = fs.readdirSync(fundingDataDir);
  const allDeals = [];

  weekFolders.forEach((folder) => {
    const folderPath = path.join(fundingDataDir, folder);
    const stats = fs.statSync(folderPath);

    if (stats.isDirectory()) {
      const csvPath = path.join(folderPath, 'data.csv');

      if (fs.existsSync(csvPath)) {
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const deals = parseCSV(csvContent, folder);
        allDeals.push(...deals);
      }
    }
  });

  return allDeals;
}

// Parse CSV content
function parseCSV(content, weekFolder) {
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/^\uFEFF/, '')); // Remove BOM
  const deals = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    if (values.length >= headers.length) {
      const deal = {};
      headers.forEach((header, index) => {
        deal[header] = values[index] ? values[index].trim() : '';
      });

      // Transform to app format
      const transformed = transformDeal(deal, `${weekFolder}-${i}`, weekFolder);
      if (transformed) {
        deals.push(transformed);
      }
    }
  }

  return deals;
}

// Parse a single CSV line into fields, RFC-4180 style.
// Handles: quoted fields, commas inside quotes, and escaped double-quotes
// ("" -> a literal "). A quote only opens a quoted field at the start of a
// field; quotes appearing mid-unquoted-field are treated as literal text.
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          // Escaped double-quote ("") -> literal "
          current += '"';
          i += 2;
          continue;
        }
        // Closing quote
        inQuotes = false;
        i += 1;
        continue;
      }
      current += char;
      i += 1;
      continue;
    }

    // Not currently inside quotes
    if (char === '"' && current === '') {
      // Opening quote only at the start of a field
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ',') {
      values.push(current);
      current = '';
      i += 1;
      continue;
    }
    current += char;
    i += 1;
  }

  values.push(current);

  return values;
}

// Transform deal to match app structure
function transformDeal(deal, id, weekFolder) {
  // Extract company name from URL or use as is
  let companyName = deal.Company || '';

  // Skip if company is missing
  if (!companyName || companyName.trim() === '') {
    return null;
  }

  // If company is a URL, extract domain name
  if (companyName.startsWith('http')) {
    try {
      const url = new URL(companyName);
      companyName = url.hostname.replace('www.', '').split('.')[0];
      companyName = companyName.charAt(0).toUpperCase() + companyName.slice(1);
    } catch (e) {
      return null;
    }
  }

  // Parse amount - strip $ and commas
  let amountStr = (deal['Amount ($M)'] || deal.Amount || '0').toString();
  amountStr = amountStr.replace(/[$,]/g, '').trim();
  let amount = parseFloat(amountStr);

  // Handle NaN from parseFloat
  if (isNaN(amount) || amountStr === '') {
    amount = 0;
  }

  const stage = deal.Series || deal.Stage || 'Not Disclosed';
  const sector = deal.Sector || 'General';
  const location = deal.HQ || deal.Location || 'India';
  const date = formatDate(deal.Date);
  const sourceUrl = deal.Source || deal.Company || '';

  // Parse investors from optional semicolon-separated Investors column (lead listed first).
  // Older CSVs omit this column and fall back to 'Not Disclosed' (unchanged behaviour).
  const investorRaw = (deal.Investors || deal.Investor || '').trim();
  const investors = investorRaw
    ? investorRaw.split(';').map((s) => s.trim()).filter(Boolean)
    : ['Not Disclosed'];
  const leadInvestor = investors[0] || 'Not Disclosed';

  // Skip if amount is 0 or missing AND series is not provided
  if (amount === 0 && stage === 'Not Disclosed') {
    return null;
  }

  // Convert USD millions to INR lakhs (1 Cr = 100 lakhs, 1 Cr = 10M INR)
  // Exchange rate configured in config/currency.js
  // Current rate: 1 USD = ₹${USD_TO_INR} (as of ${LAST_UPDATED})
  const amountInLakhs = amount * USD_TO_INR * 10; // $M to INR lakhs
  const amountInCrores = amount * USD_TO_INR / 10; // $M to INR crores

  return {
    id,
    company: companyName,
    amount: amountInLakhs, // Store in lakhs (divide by 100 to get crores)
    stage,
    sectors: [sector],
    investors,
    leadInvestor,
    date,
    location,
    description: `${companyName} raised ${amount > 0 ? '₹' + amountInCrores.toFixed(1) + ' Cr' : 'funding'} in ${stage} ${stage !== 'Not Disclosed' ? 'round' : ''}.`,
    sourceUrl,
    weekFolder
  };
}

// Format date to YYYY-MM-DD
function formatDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];

  try {
    // Handle DD/MM/YYYY format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  } catch (e) {
    console.error('Error parsing date:', dateStr);
  }

  return new Date().toISOString().split('T')[0];
}

// Generate TypeScript file
function generateTypeScriptFile(deals) {
  const sortedDeals = deals.sort((a, b) => new Date(b.date) - new Date(a.date));

  const content = `// Auto-generated from CSV files in funding_data/
// Last updated: ${new Date().toISOString()}
// Total deals: ${sortedDeals.length}
// Currency conversion: 1 USD = ₹${USD_TO_INR} INR (as of ${LAST_UPDATED})
// To update exchange rate: Edit config/currency.js and run 'npm run generate-data'

export interface FundingDeal {
  id: string;
  company: string;
  amount: number;
  stage: string;
  sectors: string[];
  investors: string[];
  leadInvestor: string;
  date: string;
  location: string;
  description: string;
  sourceUrl: string;
  weekFolder: string;
}

export const fundingData: FundingDeal[] = ${JSON.stringify(sortedDeals, null, 2)};
`;

  const outputPath = path.join(__dirname, '../data/funding-data.ts');
  fs.writeFileSync(outputPath, content, 'utf-8');
  console.log(`✅ Generated funding-data.ts with ${sortedDeals.length} deals`);
}

// Inline self-test for parseCSVLine. Run with: node scripts/generate-funding-data.js --test
// Kept inline (no separate test harness in this repo) and gated behind a flag so it
// never runs during the normal prebuild generation path.
function runParserTests() {
  const cases = [
    { in: 'a,b,c', out: ['a', 'b', 'c'] },
    { in: '', out: [''] },
    { in: 'a,,c', out: ['a', '', 'c'] },
    // Quoted field containing a comma
    { in: 'a,"b,c",d', out: ['a', 'b,c', 'd'] },
    // Escaped double-quote inside a quoted field ("" -> ")
    { in: 'a,"she said ""hi""",d', out: ['a', 'she said "hi"', 'd'] },
    // Quoted field that is entirely a quoted string
    { in: '"hello"', out: ['hello'] },
    // Comma inside quotes only; trailing empty field
    { in: '"x,y",', out: ['x,y', ''] },
    // Quote that is NOT at the start of a field is treated as literal text
    { in: 'a,b"c,d', out: ['a', 'b"c', 'd'] },
    // Investors-style semicolon list inside a quoted field with commas
    { in: 'Acme,"100","Seq, Accel; Lightspeed"', out: ['Acme', '100', 'Seq, Accel; Lightspeed'] },
  ];

  let failures = 0;
  cases.forEach(({ in: input, out: expected }, idx) => {
    const actual = parseCSVLine(input);
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (!ok) {
      failures += 1;
      console.error(`✗ case ${idx}: parseCSVLine(${JSON.stringify(input)})`);
      console.error(`    expected ${JSON.stringify(expected)}`);
      console.error(`    got      ${JSON.stringify(actual)}`);
    }
  });

  if (failures > 0) {
    console.error(`❌ parseCSVLine: ${failures}/${cases.length} cases failed`);
    process.exit(1);
  }
  console.log(`✅ parseCSVLine: all ${cases.length} cases passed`);
}

if (process.argv.includes('--test')) {
  runParserTests();
  return;
}

// Main execution
try {
  console.log('📊 Reading CSV files from funding_data/...');
  const deals = getAllCSVFiles();
  console.log(`📈 Parsed ${deals.length} deals`);

  console.log('💾 Generating TypeScript file...');
  generateTypeScriptFile(deals);

  console.log('✨ Done!');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

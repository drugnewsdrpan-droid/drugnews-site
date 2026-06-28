#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const repo = process.cwd();

const articles = [
  {
    dir: 'content/published/tirzepatide-autoimmune-immunometabolism-en/images',
    palette: { accent: '#0f8f9a', warm: '#e1782a', navy: '#102d3a', pale: '#eef9f8' },
    cards: [
      {
        file: 'cover-en.svg',
        eyebrow: 'DRUGNEWS BIOTECH BUSINESS ANALYSIS',
        title: 'Tirzepatide Moves Into Immunometabolism',
        subtitle: 'Lilly is testing whether GLP-1/GIP therapy can add value beyond weight loss.',
        points: ['Zepbound + Taltz', 'Omvoh + metabolic control', 'Autoimmune market expansion'],
        footer: 'Investor lens: portfolio synergy, not a simple indication add-on'
      },
      {
        file: 'figure-01-en.svg',
        eyebrow: 'FIGURE 1',
        title: 'The Autoimmune Question',
        subtitle: 'Can metabolic treatment improve inflammatory-disease outcomes?',
        points: ['Obesity often worsens immune inflammation', 'Psoriasis and PsA are natural first tests', 'IBD could be the next portfolio bridge'],
        footer: 'The thesis is immunometabolism, not just weight reduction'
      },
      {
        file: 'figure-02-en.svg',
        eyebrow: 'FIGURE 2',
        title: 'Combination Trial Logic',
        subtitle: 'Lilly can compare immune control with and without tirzepatide.',
        points: ['Taltz as immune backbone', 'Zepbound as metabolic modifier', 'Endpoints: skin, joints, weight, inflammation'],
        footer: 'A positive result would support a new value story'
      },
      {
        file: 'figure-03-en.svg',
        eyebrow: 'FIGURE 3',
        title: 'Immunometabolism Loop',
        subtitle: 'Metabolism and inflammation can reinforce each other.',
        points: ['Adipose tissue inflammation', 'Immune activation', 'Harder disease control'],
        footer: 'This is why the biology matters to investors'
      },
      {
        file: 'figure-04-en.svg',
        eyebrow: 'FIGURE 4',
        title: 'Why It Matters Commercially',
        subtitle: 'The same asset can be positioned across several chronic-care markets.',
        points: ['Lifecycle expansion', 'Better payer narrative', 'Portfolio-level selling power'],
        footer: 'The upside depends on clinical proof, not slogans'
      }
    ]
  },
  {
    dir: 'content/published/ai-zasocitinib-sotyktu-en/images',
    palette: { accent: '#246b93', warm: '#d66f35', navy: '#101f32', pale: '#f3f8fb' },
    cards: [
      {
        file: 'cover-en.svg',
        eyebrow: 'DRUGNEWS BIOTECH BUSINESS ANALYSIS',
        title: 'AI-Designed Drug Enters a Real Clinical Exam',
        subtitle: 'Takeda zasocitinib beat Sotyktu head-to-head in psoriasis.',
        points: ['Oral TYK2 race', 'PASI 100 as a higher bar', 'AI design meets commercial reality'],
        footer: 'Investor lens: efficacy is only the first hurdle'
      },
      {
        file: 'figure-01-en.svg',
        eyebrow: 'FIGURE 1',
        title: 'The Psoriasis Bar Keeps Rising',
        subtitle: 'PASI 75 is no longer enough to define leadership.',
        points: ['PASI 75: historical baseline', 'PASI 90: strong clearance', 'PASI 100: clean-skin ambition'],
        footer: 'The market rewards visible, durable improvement'
      },
      {
        file: 'figure-02-en.svg',
        eyebrow: 'FIGURE 2',
        title: 'AI Design Is Useful Only If It Survives the Clinic',
        subtitle: 'The key is turning computation into a differentiated molecule.',
        points: ['Physics-based modeling', 'Selectivity and potency', 'Human efficacy and safety'],
        footer: 'AI is a method; clinical value is the product'
      },
      {
        file: 'figure-03-en.svg',
        eyebrow: 'FIGURE 3',
        title: 'TYK2 as the Narrow Gate',
        subtitle: 'The commercial promise is immune modulation without broad JAK baggage.',
        points: ['Targeted cytokine signaling', 'Oral convenience', 'Safety perception still matters'],
        footer: 'A cleaner mechanism can reshape payer and physician confidence'
      },
      {
        file: 'figure-04-en.svg',
        eyebrow: 'FIGURE 4',
        title: 'The Commercial Exam',
        subtitle: 'Oral convenience must compete with biologic-level performance.',
        points: ['Efficacy depth', 'Durability', 'Access and pricing'],
        footer: 'The winner needs a complete value proposition'
      }
    ]
  }
];

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function textLines(lines, x, y, size, fill, weight = 700, gap = 38) {
  return lines.map((line, index) => (
    `<text x="${x}" y="${y + index * gap}" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(line)}</text>`
  )).join('\n');
}

function wrapText(text, maxLength, maxLines = 2) {
  if (text.length <= maxLength) return [text];
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

function wrapTitle(title) {
  return wrapText(title, 36, 2);
}

function render(card, palette) {
  const titleLines = wrapTitle(card.title);
  const subtitleLines = wrapText(card.subtitle, 55, 2);
  const subtitleY = titleLines.length > 1 ? 276 : 230;
  const footerLines = wrapText(card.footer, 44, 2);
  const titleBlock = textLines(titleLines, 92, 162, 42, palette.navy, 800, 52);
  const subtitleBlock = textLines(subtitleLines, 92, subtitleY, 24, '#60707b', 600, 32);
  const footerBlock = textLines(footerLines, 118, footerLines.length > 1 ? 568 : 578, footerLines.length > 1 ? 17 : 19, palette.navy, 800, 24);
  const pointBlock = card.points.map((point, index) => {
    const y = 343 + index * 76;
    return `
      <g>
        <circle cx="118" cy="${y - 10}" r="20" fill="${index === 1 ? palette.warm : palette.accent}" opacity="0.95"/>
        <path d="M108 ${y - 12} L116 ${y - 3} L130 ${y - 20}" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="156" y="${y}" font-size="25" font-weight="700" fill="${palette.navy}">${esc(point)}</text>
      </g>`;
  }).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" role="img" aria-label="${esc(card.title)}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="${palette.pale}"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#0e2d3a" flood-opacity="0.14"/>
    </filter>
  </defs>
  <rect width="1200" height="675" rx="34" fill="url(#bg)"/>
  <path d="M30 545 C220 470, 350 625, 560 540 S890 430, 1168 500" fill="none" stroke="${palette.accent}" stroke-width="6" opacity="0.18"/>
  <path d="M740 70 C860 110, 910 80, 1020 122 S1140 135, 1190 86" fill="none" stroke="${palette.warm}" stroke-width="7" opacity="0.18"/>
  <circle cx="925" cy="350" r="178" fill="#ffffff" stroke="${palette.accent}" stroke-width="3" opacity="0.88"/>
  <circle cx="925" cy="350" r="116" fill="none" stroke="${palette.accent}" stroke-width="22" stroke-dasharray="150 58" opacity="0.32"/>
  <circle cx="925" cy="350" r="64" fill="${palette.pale}" stroke="${palette.accent}" stroke-width="5"/>
  <g opacity="0.95">
    <circle cx="832" cy="262" r="22" fill="${palette.accent}"/>
    <circle cx="999" cy="262" r="22" fill="${palette.warm}"/>
    <circle cx="1031" cy="424" r="22" fill="${palette.accent}"/>
    <circle cx="820" cy="430" r="22" fill="${palette.warm}"/>
    <path d="M852 272 L905 328 L980 274 M981 276 L1020 402 M1010 424 L846 428 M833 408 L895 356" fill="none" stroke="${palette.navy}" stroke-width="8" stroke-linecap="round" opacity="0.88"/>
  </g>
  <g filter="url(#shadow)">
    <rect x="62" y="60" width="630" height="548" rx="30" fill="#ffffff" opacity="0.96"/>
  </g>
  <text x="92" y="112" font-size="18" font-weight="800" letter-spacing="3" fill="${palette.warm}">${esc(card.eyebrow)}</text>
  ${titleBlock}
  ${subtitleBlock}
  ${pointBlock}
  <rect x="92" y="548" width="560" height="${footerLines.length > 1 ? 62 : 46}" rx="${footerLines.length > 1 ? 24 : 23}" fill="${palette.pale}" stroke="${palette.accent}" stroke-width="2"/>
  ${footerBlock}
  <text x="982" y="602" font-size="22" font-weight="800" fill="${palette.navy}" opacity="0.72">Drugnews</text>
</svg>
`;
}

for (const article of articles) {
  const dir = path.join(repo, article.dir);
  fs.mkdirSync(dir, { recursive: true });
  for (const card of article.cards) {
    fs.writeFileSync(path.join(dir, card.file), render(card, article.palette));
  }
  console.log(`Generated ${article.cards.length} English SVG assets in ${article.dir}`);
}

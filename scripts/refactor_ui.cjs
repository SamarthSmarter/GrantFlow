const fs = require('fs');
const path = require('path');

function refactorFile(filePath) {
  const fullPath = path.resolve(__dirname, filePath);
  if (!fs.existsSync(fullPath)) return;
  let content = fs.readFileSync(fullPath, 'utf8');

  // Replace emerald with amber (for main accents)
  content = content.replace(/bg-emerald/g, 'bg-amber');
  content = content.replace(/text-emerald/g, 'text-amber');
  content = content.replace(/border-emerald/g, 'border-amber');
  content = content.replace(/shadow-emerald/g, 'shadow-amber');
  
  // Replace teal with zinc (for secondary/neutral elements)
  content = content.replace(/bg-teal/g, 'bg-zinc');
  content = content.replace(/text-teal/g, 'text-zinc');
  content = content.replace(/border-teal/g, 'border-zinc');
  content = content.replace(/shadow-teal/g, 'shadow-zinc');

  // Any remaining emerald variables mapping to zinc/amber equivalents
  content = content.replace(/brand-emerald/g, 'brand-primary');
  content = content.replace(/brand-teal/g, 'brand-secondary');

  fs.writeFileSync(fullPath, content);
  console.log(`Refactored ${filePath}`);
}

refactorFile('../src/App.tsx');
refactorFile('../src/App.css');
refactorFile('../src/hooks/useGrantFlow.tsx');
refactorFile('../src/services/contract.ts');

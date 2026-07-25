const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

const replacements = [
  // Primary Buttons
  { regex: /bg-\[#34d399\] text-\[#04140d\] font-semibold hover:bg-\[#10b981\]/g, replace: 'bg-primary text-primary-foreground font-semibold hover:bg-primary/90' },
  { regex: /bg-\[#10b981\] text-black font-semibold hover:bg-\[#0ea271\] hover:text-black focus-visible:text-black active:text-black/g, replace: 'bg-primary text-primary-foreground font-semibold hover:bg-primary/90' },
  { regex: /bg-\[#10b981\] text-black hover:bg-\[#0ea271\]/g, replace: 'bg-primary text-primary-foreground hover:bg-primary/90' },
  { regex: /bg-\[#10b981\] hover:bg-\[#10b981\]\/90 text-black/g, replace: 'bg-primary hover:bg-primary/90 text-primary-foreground' },
  
  // Specific auth inputs & backgrounds
  { regex: /bg-\[#141414\]/g, replace: 'bg-card' },
  { regex: /bg-\[#0c0c0c\]/g, replace: 'bg-background' },
  { regex: /border-\[#1f1f1f\]/g, replace: 'border-border' },
  { regex: /border-\[#262626\]/g, replace: 'border-input' },
  { regex: /border-\[#2a2a2a\]/g, replace: 'border-border' },
  { regex: /text-\[#8A8F98\]/g, replace: 'text-muted-foreground' },
  { regex: /text-\[#5C5F66\]/g, replace: 'text-muted-foreground' },
  { regex: /text-\[#e8e8e8\]/g, replace: 'text-foreground' },
  { regex: /text-white/g, replace: 'text-foreground' },
  
  // Links / Text
  { regex: /text-\[#10b981\] hover:text-\[#0ea271\]/g, replace: 'text-primary hover:text-primary/80' },
  { regex: /text-\[#34d399\] hover:text-\[#10b981\]/g, replace: 'text-primary hover:text-primary/80' },
  { regex: /text-\[#10b981\] hover:underline/g, replace: 'text-primary hover:underline' },
  { regex: /text-\[#10b981\]/g, replace: 'text-primary' },
  
  // Focus rings & borders
  { regex: /focus:border-\[#10b981\]/g, replace: 'focus:border-primary' },
  { regex: /focus:ring-\[#10b981\]\/20/g, replace: 'focus:ring-primary/20' },
  { regex: /accent-\[#10b981\]/g, replace: 'accent-primary' },
  { regex: /hover:border-\[#10b981\]\/40/g, replace: 'hover:border-primary/40' },
  
  // Command palette
  { regex: /group-data-\[selected=true\]:text-\[#10b981\]/g, replace: 'group-data-[selected=true]:text-primary' },
];

let changedFiles = 0;

walk('c:/Users/vikas/OneDrive/Desktop/SaasBackend/pulsiv_fe/src', (filePath) => {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  // Ignore specific files that are actually meant to use green for health
  if (filePath.includes('SecurityCenterPage.tsx')) return; // health states
  if (filePath.includes('ProjectUsagePage.tsx')) return;
  if (filePath.includes('css-variables.ts') || filePath.includes('theme-tokens.ts')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  for (let { regex, replace } of replacements) {
    content = content.replace(regex, replace);
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    changedFiles++;
    console.log(`Updated ${filePath}`);
  }
});

console.log(`Done. Updated ${changedFiles} files.`);

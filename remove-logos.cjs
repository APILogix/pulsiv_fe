/* eslint-disable */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/modules/auth/pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove import
  content = content.replace(/import \{ PulsivLogo \} from '@\/shared\/components\/PulsivLogo';\n/g, '');

  // Remove logo div block
  const blockToRemove = `      <div className="text-center lg:text-left space-y-4">
        <div className="flex justify-center lg:hidden mb-2">
          <PulsivLogo size={40} />
        </div>`;
  const blockReplacement = `      <div className="text-center space-y-4">`;
  content = content.replace(blockToRemove, blockReplacement);

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
}

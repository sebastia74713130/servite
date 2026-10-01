const fs = require('fs');
const file = 'apps/web/src/components/SiatSettingsForm.tsx';
let content = fs.readFileSync(file, 'utf8');

const startStr = `<div className="flex flex-col md:flex-row gap-3 pt-3 mt-3 border-t border-[#E5E7EB]">`;
const startIndex = content.indexOf(startStr);

if (startIndex !== -1) {
  const endStr = `          </div>\n        </div>`;
  const endIndex = content.indexOf(endStr, startIndex);
  if (endIndex !== -1) {
    // Only remove the buttons block, keeping the closing </div> for the parent
    const toRemove = content.substring(startIndex, endIndex + `          </div>`.length);
    content = content.replace(toRemove, '');
    fs.writeFileSync(file, content);
    console.log("Removed buttons successfully.");
  } else {
    console.log("Could not find end string.");
  }
} else {
  console.log("Could not find start string.");
}

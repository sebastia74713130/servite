const fs = require('fs');
const file = 'apps/web/src/components/SiatSettingsForm.tsx';
let content = fs.readFileSync(file, 'utf8');

// The buttons container is usually a div with flex or grid inside the connection status box
// Let's find the exact string to replace
const startStr = `<div className="mt-6 pt-6 border-t border-[#E5E7EB] grid grid-cols-1 md:grid-cols-3 gap-4">`;
const startIndex = content.indexOf(startStr);

if (startIndex !== -1) {
  // Find the end of the div (which contains the 3 buttons)
  // We'll just use a regex to remove from startStr to the end of the div
  // The buttons block ends right before </div>\n          </div>\n\n          <div className="flex justify-end pt-6">
  const endStr = `            </button>\n          </div>`;
  const endIndex = content.indexOf(endStr, startIndex);
  if (endIndex !== -1) {
    const toRemove = content.substring(startIndex, endIndex + endStr.length);
    content = content.replace(toRemove, '');
    fs.writeFileSync(file, content);
    console.log("Removed buttons successfully.");
  } else {
    console.log("Could not find end string.");
  }
} else {
  console.log("Could not find start string.");
}

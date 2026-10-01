const fs = require('fs');
const file = 'apps/web/src/components/Sidebar.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('<nav className="flex-1 px-4 space-y-2 mt-4">', '<nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto pb-4 custom-scrollbar">');

// Remove trailing </div> if any weirdness, but just adding overflow-y-auto to the nav should be enough.
// Wait, the sidebar itself is h-screen, flex flex-col. So flex-1 makes the nav take up available space, and overflow-y-auto will make it scrollable inside that space.
// Let's also add a CSS snippet for custom-scrollbar so it looks nice, or we can just leave it to default. Let's just use overflow-y-auto.

fs.writeFileSync(file, content);
console.log("Sidebar patched.");

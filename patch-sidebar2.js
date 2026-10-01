const fs = require('fs');
const file = 'apps/web/src/components/Sidebar.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldHeader = `<div className="p-6">
        <h1 className="text-2xl font-bold">
          Servido<span className="text-[#E76F51]">.</span>
        </h1>
      </div>`;

const newHeader = `<div className="p-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Servido<span className="text-[#E76F51]">.</span>
        </h1>
        <button onClick={() => setIsOpen?.(false)} className="lg:hidden text-white/70 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>`;

content = content.replace(oldHeader, newHeader);
fs.writeFileSync(file, content);
console.log("Header patched.");

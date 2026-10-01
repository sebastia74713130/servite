const fs = require('fs');
const file = 'apps/web/src/app/(dashboard)/inventory/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// The file currently has an unclosed `<>` fragment for the conditional.
// We need to close it right before the main container div closes.
// The main container ends with:
//     </div>
//   );
// }

content = content.replace(
  /    <\/div>\n  \);\n\}/,
  `        </>\n      )}\n    </div>\n  );\n}`
);

fs.writeFileSync(file, content);

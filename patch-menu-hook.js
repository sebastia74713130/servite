const fs = require('fs');
const file = 'apps/web/src/app/(dashboard)/menu/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Quitar la declaración de abajo
content = content.replace("  const [copying, setCopying] = useState(false);\n  \n  const handleCopyMenu", "  const handleCopyMenu");

// Ponerla arriba
content = content.replace(
  "  const [showScanModal, setShowScanModal] = useState(false);",
  "  const [showScanModal, setShowScanModal] = useState(false);\n  const [copying, setCopying] = useState(false);"
);

fs.writeFileSync(file, content);

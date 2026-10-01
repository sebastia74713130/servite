const fs = require('fs');
let content = fs.readFileSync('apps/web/src/app/(dashboard)/settings/page.tsx', 'utf8');

// Remove AlertCircle from React import
content = content.replace(
  "import { AlertCircle, useState, useEffect } from 'react';",
  "import { useState, useEffect } from 'react';"
);

// Add AlertCircle to lucide-react import
content = content.replace(
  "import {",
  "import { AlertCircle,"
);

fs.writeFileSync('apps/web/src/app/(dashboard)/settings/page.tsx', content);

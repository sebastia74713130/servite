const fs = require('fs');
let content = fs.readFileSync('apps/web/src/app/(dashboard)/settings/page.tsx', 'utf8');

content = content.replace(
  "import { AlertCircle, useState, useEffect } from 'react';",
  "import { useState, useEffect } from 'react';"
);

fs.writeFileSync('apps/web/src/app/(dashboard)/settings/page.tsx', content);

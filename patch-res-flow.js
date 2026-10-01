const fs = require('fs');
const file = 'apps/web/src/app/r/[restaurantSlug]/ReservationFlow.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "export default function ReservationFlow({ restaurant, branchId }: { restaurant: any; branchId: string }) {",
  "export default function ReservationFlow({ restaurant, branches }: { restaurant: any; branches: any[] }) {"
);

content = content.replace(
  "const [selectedTime, setSelectedTime] = useState<string | null>(null);",
  "const [selectedTime, setSelectedTime] = useState<string | null>(null);\n  const [selectedBranchId, setSelectedBranchId] = useState<string>(branches.length === 1 ? branches[0].id : \"\");"
);

// We need to pass selectedBranchId to the supabase insert.
// Search for branchId
content = content.replace(
  "branch_id: branchId,",
  "branch_id: selectedBranchId,"
);

fs.writeFileSync(file, content);

const fs = require('fs');
const file = 'apps/web/src/app/r/[restaurantSlug]/ReservationFlow.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/branchId/g, "selectedBranchId");
// But wait, the prop name is `branches`. I should not replace `branchId` globally if it messes up something else.
// I already replaced the prop from `branchId: string` to `branches: any[]`.
// So replacing `branchId` with `selectedBranchId` should be fine.

// Let's just do it manually
content = content.replace("!selectedDate || !branchId", "!selectedDate || !selectedBranchId");
content = content.replace("eq('branch_id', branchId)", "eq('branch_id', selectedBranchId)");
content = content.replace("[selectedDate, branchId]", "[selectedDate, selectedBranchId]");

fs.writeFileSync(file, content);

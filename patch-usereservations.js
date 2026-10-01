const fs = require('fs');
const file = 'apps/web/src/hooks/useReservations.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "export function useReservations(restaurantId?: string, dateFilter?: string) {",
  "export function useReservations(restaurantId?: string, branchId?: string, dateFilter?: string) {"
);

content = content.replace(
  "if (dateFilter) {",
  "if (branchId) {\n      query = query.eq('branch_id', branchId);\n    }\n\n    if (dateFilter) {"
);

content = content.replace(
  "  }, [restaurantId, dateFilter]);",
  "  }, [restaurantId, branchId, dateFilter]);"
);

content = content.replace(
  "  }, [restaurantId, fetchReservations]);",
  "  }, [restaurantId, fetchReservations]);"
);

fs.writeFileSync(file, content);

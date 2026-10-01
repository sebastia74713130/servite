const fs = require('fs');
const file = 'apps/web/src/hooks/useRestaurantSession.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("const [billingCycle, setBillingCycle] = useState<any>(null);", "const [billingCycle, setBillingCycle] = useState<any>(null);\n  const [isMainBranch, setIsMainBranch] = useState<boolean>(true);");

content = content.replace("if (userRest.billingCycle) setBillingCycle(userRest.billingCycle);", "if (userRest.billingCycle) setBillingCycle(userRest.billingCycle);\n        setIsMainBranch(userRest.isMainBranch ?? true);");

content = content.replace("return { restaurant, branch, role, billingCycle, loading };", "return { restaurant, branch, role, billingCycle, loading, isMainBranch };");

fs.writeFileSync(file, content);

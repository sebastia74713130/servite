const fs = require('fs');

const kitchenFile = 'apps/web/src/app/(dashboard)/kitchen/page.tsx';
let kitchen = fs.readFileSync(kitchenFile, 'utf8');
kitchen = kitchen.replace('const { restaurant, loading: sessionLoading } = useRestaurantSession();', 'const { restaurant, branch, loading: sessionLoading } = useRestaurantSession();');
kitchen = kitchen.replace('useOrders(restaurant?.id);', 'useOrders(restaurant?.id, branch?.id);');
fs.writeFileSync(kitchenFile, kitchen);

const ordersFile = 'apps/web/src/app/(dashboard)/orders/page.tsx';
let orders = fs.readFileSync(ordersFile, 'utf8');
orders = orders.replace('const { restaurant, loading: sessionLoading } = useRestaurantSession();', 'const { restaurant, branch, loading: sessionLoading } = useRestaurantSession();');
orders = orders.replace('useOrders(restaurant?.id);', 'useOrders(restaurant?.id, branch?.id);');
fs.writeFileSync(ordersFile, orders);

const accountsFile = 'apps/web/src/app/(dashboard)/accounts/page.tsx';
let accounts = fs.readFileSync(accountsFile, 'utf8');
accounts = accounts.replace('const { restaurant, loading: sessionLoading } = useRestaurantSession();', 'const { restaurant, branch, loading: sessionLoading } = useRestaurantSession();');
accounts = accounts.replace('useOrders(restaurant?.id, { onlyUnpaid: true });', 'useOrders(restaurant?.id, branch?.id, { onlyUnpaid: true });');
fs.writeFileSync(accountsFile, accounts);

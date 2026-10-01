const fs = require('fs');
const file = 'apps/web/src/app/m/[restaurantSlug]/[tableCode]/PublicMenuClient.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add status logic inside the component
const statusLogic = `
  // Determine if restaurant is currently open based on operating_hours
  const [restaurantStatus, setRestaurantStatus] = useState<'open' | 'closed' | 'closing_soon'>('open');
  const [closingMessage, setClosingMessage] = useState('');

  useEffect(() => {
    if (!restaurant?.operating_hours) return;

    const checkStatus = () => {
      // Get current time in Bolivia (UTC-4)
      const now = new Date();
      const boliviaTime = new Date(now.toLocaleString("en-US", {timeZone: "America/La_Paz"}));
      
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = days[boliviaTime.getDay()];
      const schedule = restaurant.operating_hours[currentDay];

      if (!schedule || !schedule.isOpen) {
        setRestaurantStatus('closed');
        setClosingMessage('El restaurante se encuentra cerrado el día de hoy.');
        return;
      }

      const [openHour, openMin] = schedule.open.split(':').map(Number);
      const [closeHour, closeMin] = schedule.close.split(':').map(Number);
      
      const currentMins = boliviaTime.getHours() * 60 + boliviaTime.getMinutes();
      const openMins = openHour * 60 + openMin;
      let closeMins = closeHour * 60 + closeMin;
      
      // Handle cases where close time is after midnight (e.g. 02:00 AM)
      if (closeMins <= openMins) {
        closeMins += 24 * 60;
      }

      if (currentMins < openMins || currentMins >= closeMins) {
        setRestaurantStatus('closed');
        setClosingMessage(\`El restaurante está cerrado. Nuestro horario hoy es de \${schedule.open} a \${schedule.close}.\`);
      } else if (closeMins - currentMins <= 30) {
        setRestaurantStatus('closing_soon');
        setClosingMessage(\`¡Apresúrate! El restaurante cierra en \${closeMins - currentMins} minutos (\${schedule.close}).\`);
      } else {
        setRestaurantStatus('open');
        setClosingMessage('');
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 60000); // check every minute
    return () => clearInterval(interval);
  }, [restaurant?.operating_hours]);
`;

// Insert the logic
content = content.replace('const [searchQuery, setSearchQuery] = useState(\'\');', 'const [searchQuery, setSearchQuery] = useState(\'\');\n' + statusLogic);

// 2. Add the UI banner for closing soon / closed
const uiBanner = `
        {/* Status Banner */}
        {restaurantStatus !== 'open' && (
          <div className={\`px-4 py-2 text-center text-sm font-medium sticky top-20 z-40 \${restaurantStatus === 'closed' ? 'bg-red-500 text-white' : 'bg-yellow-400 text-yellow-900'}\`}>
            {closingMessage}
          </div>
        )}
`;

// Insert UI banner after category nav
content = content.replace('</div>\n      </div>\n\n      <main', '</div>\n      </div>\n' + uiBanner + '\n      <main');

// 3. Disable the floating cart button if closed
content = content.replace('if (totalItems === 0) return null;', 'if (totalItems === 0) return null;\n    if (restaurantStatus === "closed") return null;');

// 4. Disable add to cart buttons if closed
content = content.replace(/<button([^>]*onClick=\{\(\) => handleAddToCart\(product\)\}[^>]*)>/g, '<button$1 disabled={restaurantStatus === "closed"} style={{ opacity: restaurantStatus === "closed" ? 0.5 : 1 }}>');
content = content.replace(/<button([^>]*onClick=\{handleConfirmSelection\}[^>]*)>/g, '<button$1 disabled={restaurantStatus === "closed"}>');

fs.writeFileSync(file, content);

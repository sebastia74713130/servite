const fs = require('fs');
const file = 'apps/web/src/app/(dashboard)/settings/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("const [city, setCity] = useState('');", "const [city, setCity] = useState('');\n  const [googleMapsUrl, setGoogleMapsUrl] = useState('');\n  const [operatingHours, setOperatingHours] = useState({ monday: { isOpen: true, open: '09:00', close: '22:00' }, tuesday: { isOpen: true, open: '09:00', close: '22:00' }, wednesday: { isOpen: true, open: '09:00', close: '22:00' }, thursday: { isOpen: true, open: '09:00', close: '22:00' }, friday: { isOpen: true, open: '09:00', close: '23:00' }, saturday: { isOpen: true, open: '09:00', close: '23:00' }, sunday: { isOpen: true, open: '09:00', close: '16:00' } });");

// And update the effect that loads the data
const useEffectStr = `setCity(data.city || '');`;
content = content.replace(useEffectStr, `setCity(data.city || '');\n          setGoogleMapsUrl(data.google_maps_url || '');\n          if (data.operating_hours) setOperatingHours(data.operating_hours);`);

// And the updates object
content = content.replace(`city,
      address,`, `city,
      address,
      google_maps_url: googleMapsUrl,
      operating_hours: operatingHours,`);

fs.writeFileSync(file, content);

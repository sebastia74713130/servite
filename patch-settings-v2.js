const fs = require('fs');
const file = 'apps/web/src/app/(dashboard)/settings/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update initial states
if (!content.includes('const [googleMapsUrl, setGoogleMapsUrl] = useState(initialData?.google_maps_url || "")')) {
  content = content.replace('const [city, setCity] = useState(initialData?.city || "")', 
    'const [city, setCity] = useState(initialData?.city || "")\n  const [googleMapsUrl, setGoogleMapsUrl] = useState(initialData?.google_maps_url || "")\n  const [operatingHours, setOperatingHours] = useState(initialData?.operating_hours || { monday: { isOpen: true, open: "09:00", close: "22:00" }, tuesday: { isOpen: true, open: "09:00", close: "22:00" }, wednesday: { isOpen: true, open: "09:00", close: "22:00" }, thursday: { isOpen: true, open: "09:00", close: "22:00" }, friday: { isOpen: true, open: "09:00", close: "23:00" }, saturday: { isOpen: true, open: "09:00", close: "23:00" }, sunday: { isOpen: true, open: "09:00", close: "16:00" } })');
}

// 2. Add to updates
content = content.replace('city,\n      address,', 'city,\n      address,\n      google_maps_url: googleMapsUrl,\n      operating_hours: operatingHours,');

// 3. Add to dependencies of useEffect
content = content.replace('setCity(initialData.city || "")', 'setCity(initialData.city || "")\n      setGoogleMapsUrl(initialData.google_maps_url || "")\n      if(initialData.operating_hours) setOperatingHours(initialData.operating_hours)');

// 4. Add googleMapsUrl input under address
const oldAddress = `<div>
              <label className="text-sm font-medium text-[#1F2933] mb-1.5 flex items-center gap-2">
                <MapPin size={14} className="text-[#6B7280]" />
                Dirección
              </label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors"
                placeholder="Calle, carrera, número..."
              />
            </div>`;

const newAddress = `<div>
              <label className="text-sm font-medium text-[#1F2933] mb-1.5 flex items-center gap-2">
                <MapPin size={14} className="text-[#6B7280]" />
                Dirección
              </label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors mb-4"
                placeholder="Calle, carrera, número..."
              />
              <label className="text-sm font-medium text-[#1F2933] mb-1.5 flex items-center gap-2">
                <MapPin size={14} className="text-[#6B7280]" />
                Link de Google Maps
              </label>
              <input
                type="url"
                value={googleMapsUrl}
                onChange={e => setGoogleMapsUrl(e.target.value)}
                className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors"
                placeholder="https://maps.app.goo.gl/..."
              />
            </div>`;

content = content.replace(oldAddress, newAddress);

// 5. Replace state toggle with schedule component
const scheduleCode = `
          {/* Schedule */}
          <div>
            <h3 className="text-sm font-medium text-[#1F2933] mb-4">Horarios de Atención</h3>
            <div className="space-y-4">
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                const daysEs = { monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo' };
                const schedule = operatingHours[day];
                return (
                  <div key={day} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-3 w-1/3">
                      <button
                        type="button"
                        onClick={() => setOperatingHours({...operatingHours, [day]: {...schedule, isOpen: !schedule.isOpen}})}
                        className={\`w-12 h-6 rounded-full transition-colors relative \${schedule.isOpen ? 'bg-[#00D084]' : 'bg-gray-300'}\`}
                      >
                        <div className={\`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform \${schedule.isOpen ? 'left-7' : 'left-1'}\`} />
                      </button>
                      <span className="font-medium text-sm text-gray-700">{daysEs[day]}</span>
                    </div>
                    {schedule.isOpen ? (
                      <div className="flex items-center gap-2 w-2/3 justify-end">
                        <input
                          type="time"
                          value={schedule.open}
                          onChange={(e) => setOperatingHours({...operatingHours, [day]: {...schedule, open: e.target.value}})}
                          className="border border-gray-200 rounded-md px-2 py-1 text-sm bg-white"
                        />
                        <span className="text-gray-400 text-sm">a</span>
                        <input
                          type="time"
                          value={schedule.close}
                          onChange={(e) => setOperatingHours({...operatingHours, [day]: {...schedule, close: e.target.value}})}
                          className="border border-gray-200 rounded-md px-2 py-1 text-sm bg-white"
                        />
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 w-2/3 text-right pr-4">Cerrado</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
`;

const oldStateCode = `<div className="flex items-center justify-between pt-6 border-t border-[#E5E7EB]">
            <div>
              <h3 className="text-[#1F2933] font-bold">Estado del restaurante</h3>
              <p className="text-sm text-[#6B7280] mt-1">Controla si los clientes pueden realizar pedidos</p>
              
              <div className="mt-4 flex items-center gap-2">
                <span className={\`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium \${
                  isActive 
                    ? 'bg-[#00D084]/10 text-[#00D084]' 
                    : 'bg-gray-100 text-gray-600'
                }\`}>
                  <div className={\`w-1.5 h-1.5 rounded-full \${isActive ? 'bg-[#00D084]' : 'bg-gray-400'}\`} />
                  {isActive ? 'Abierto — Recibiendo pedidos' : 'Cerrado — No recibe pedidos'}
                </span>
              </div>
            </div>
            
            <button
              onClick={() => setIsActive(!isActive)}
              className={\`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none \${
                isActive ? 'bg-[#00D084]' : 'bg-gray-300'
              }\`}
            >
              <span
                className={\`inline-block h-6 w-6 transform rounded-full bg-white transition-transform \${
                  isActive ? 'translate-x-7' : 'translate-x-1'
                }\`}
              />
            </button>
          </div>`;

content = content.replace(oldStateCode, scheduleCode);

fs.writeFileSync(file, content);

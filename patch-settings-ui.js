const fs = require('fs');
const file = 'apps/web/src/app/(dashboard)/settings/page.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

const newContent = `          {/* address */}
          <div>
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
              Enlace de Google Maps
            </label>
            <input
              type="url"
              value={googleMapsUrl}
              onChange={e => setGoogleMapsUrl(e.target.value)}
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors"
              placeholder="https://maps.app.goo.gl/..."
            />
          </div>

          {/* Schedule */}
          <div className="border-t border-[#E5E7EB] pt-6 mt-6">
            <h3 className="font-medium text-[#1F2933] mb-4">Horarios de Atención</h3>
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
          </div>`;

lines.splice(401, 50, newContent);
fs.writeFileSync(file, lines.join('\n'));

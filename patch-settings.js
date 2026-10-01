const fs = require('fs');
const file = 'apps/web/src/app/(dashboard)/settings/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Phone validation
const phoneValidation = `
    const phoneClean = phone.replace(/\\s/g, '');
    const phoneRegex = /^\\+591[67432]\\d{7}$/;
    if (phone && !phoneRegex.test(phoneClean)) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
      alert("Por favor ingresa un número de teléfono válido de Bolivia (ej. +591 71234567)");
      return;
    }
`;
content = content.replace('const updates = {', phoneValidation + '\n    const updates = {');

// 2. Placeholder update for phone
content = content.replace('placeholder="+57 300 123 4567"', 'placeholder="+591 71234567"\n                onBlur={() => {\n                  if (phone && !phone.startsWith("+591")) setPhone("+591 " + phone);\n                }}');

// 3. Select city
const oldCityInput = `<input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors"
                placeholder="Bogotá, Medellín..."
              />`;

const newCityInput = `<select
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] bg-white focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors"
              >
                <option value="">Selecciona un departamento</option>
                <option value="Santa Cruz">Santa Cruz</option>
                <option value="La Paz">La Paz</option>
                <option value="Cochabamba">Cochabamba</option>
                <option value="Oruro">Oruro</option>
                <option value="Potosí">Potosí</option>
                <option value="Chuquisaca">Chuquisaca</option>
                <option value="Tarija">Tarija</option>
                <option value="Beni">Beni</option>
                <option value="Pando">Pando</option>
              </select>`;

content = content.replace(oldCityInput, newCityInput);

fs.writeFileSync(file, content);

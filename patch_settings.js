const fs = require('fs');
const file = 'apps/web/src/app/(dashboard)/settings/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. In `useEffect`, load branch details if branch is present
content = content.replace(
  "setPhone(restaurant.phone || '');",
  "setPhone(branch?.phone || restaurant.phone || '');"
);
content = content.replace(
  "setAddress(restaurant.address || '');",
  "setAddress(branch?.address || restaurant.address || '');"
);
content = content.replace(
  "setCity(restaurant.city || '');",
  "setCity(branch?.city || restaurant.city || '');"
);
// Also load googleMapsUrl and operatingHours from branch
content = content.replace(
  "setCity(branch?.city || restaurant.city || '');",
  `setCity(branch?.city || restaurant.city || '');
      setGoogleMapsUrl(branch?.google_maps_url || '');
      if (branch?.operating_hours) {
        setOperatingHours(branch.operating_hours);
      }`
);

// 2. In `handleSave`, split the update to `restaurants` and `branches`
content = content.replace(
  /await supabase\s*\.from\('restaurants'\)\s*\.update\(\{\s*name: name\.trim\(\),\s*description: description\.trim\(\) \|\| null,\s*phone: phone\.trim\(\) \|\| null,\s*address: address\.trim\(\) \|\| null,\s*city: city\.trim\(\) \|\| null,\s*is_active: isActive,\s*brand_color: brandColor,\s*logo_url: finalLogoUrl,\s*cover_url: finalCoverUrl,\s*\}\)\s*\.eq\('id', restaurant\.id\);/m,
  `if (isMainBranch) {
      await supabase
        .from('restaurants')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          is_active: isActive,
          brand_color: brandColor,
          logo_url: finalLogoUrl,
          cover_url: finalCoverUrl,
        })
        .eq('id', restaurant.id);
    }

    if (branch) {
      await supabase
        .from('branches')
        .update({
          phone: phone.trim() || null,
          address: address.trim() || null,
          city: city.trim() || null,
          google_maps_url: googleMapsUrl.trim() || null,
          operating_hours: operatingHours
        })
        .eq('id', branch.id);
    }`
);

// 3. Update `handleAddStation` to include `branch_id: branch.id`
content = content.replace(
  "restaurant_id: restaurant.id,\n      name: newStationName.trim(),",
  "restaurant_id: restaurant.id,\n      branch_id: branch?.id,\n      name: newStationName.trim(),"
);

// 4. Mover Nombre y Descripción a Identidad Visual
const nameDescBlock = `          {/* restaurant name */}
          <div>
            <label className="text-sm font-medium text-[#1F2933] mb-1.5 flex items-center gap-2">
              <Store size={14} className="text-[#6B7280]" />
              Nombre del restaurante
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={!isMainBranch}
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors disabled:bg-gray-100"
              placeholder="Nombre de tu restaurante"
            />
          </div>

          {/* description */}
          <div>
            <label className="text-sm font-medium text-[#1F2933] mb-1.5 flex items-center gap-2">
              <FileText size={14} className="text-[#6B7280]" />
              Descripción
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={!isMainBranch}
              rows={3}
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors resize-none disabled:bg-gray-100"
              placeholder="Describe tu restaurante..."
            />
          </div>`;

content = content.replace(
  /\{\/\* restaurant name \*\/\}.*?placeholder="Describe tu restaurante\.\.\."\s*\/>\s*<\/div>/s,
  ""
);

content = content.replace(
  `<h2 className="text-lg font-bold text-[#1F2933] flex items-center gap-2 mb-4">
            <Palette size={20} className="text-[#E76F51]" />
            Identidad Visual
          </h2>`,
  `<h2 className="text-lg font-bold text-[#1F2933] flex items-center gap-2 mb-4">
            <Palette size={20} className="text-[#E76F51]" />
            Identidad Visual {isMainBranch ? '' : '(Solo editable desde sucursal principal)'}
          </h2>
${nameDescBlock}`
);

// Modify Identidad Visual inputs to be disabled if not main branch
content = content.replace(
  `id="logo-upload"\n                  />`,
  `id="logo-upload"\n                    disabled={!isMainBranch}\n                  />`
);
content = content.replace(
  `id="cover-upload"\n                  />`,
  `id="cover-upload"\n                    disabled={!isMainBranch}\n                  />`
);
content = content.replace(
  /type="color"\n\s*value=\{brandColor\}/g,
  `type="color"\n                  disabled={!isMainBranch}\n                  value={brandColor}`
);
content = content.replace(
  /type="text"\n\s*value=\{brandColor\}/g,
  `type="text"\n                  disabled={!isMainBranch}\n                  value={brandColor}`
);

// Rename "Información General" to "Información de la Sucursal"
content = content.replace(
  "Información General",
  "Información de la Sucursal"
);

fs.writeFileSync(file, content);

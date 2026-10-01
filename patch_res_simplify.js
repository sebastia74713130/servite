const fs = require('fs');
let content = fs.readFileSync('apps/web/src/app/(dashboard)/reservations/page.tsx', 'utf8');

// 1. Modify the statusTabs array
content = content.replace(
  /const statusTabs = \[\n\s*\{ label: 'Todas', value: 'Todas' \},\n\s*\{ label: 'Pendientes', value: 'pending' \},\n\s*\{ label: 'Confirmadas', value: 'confirmed' \},\n\s*\{ label: 'Sentados', value: 'seated' \},\n\s*\{ label: 'Completadas', value: 'completed' \},\n\s*\{ label: 'Canceladas', value: 'cancelled' \}\n\s*\];/,
  `const statusTabs = [
    { label: 'Todas', value: 'Todas' },
    { label: 'Pendientes', value: 'pending' },
    { label: 'Confirmadas', value: 'confirmed' },
    { label: 'Canceladas', value: 'cancelled' }
  ];`
);

// 2. Remove the action buttons for 'seated' and 'completed' inside the ReservationCard component
// The 'confirmed' block originally had 'Sentar' and 'Cancelar'
content = content.replace(
  /\{reservation\.status === 'confirmed' && \(\n\s*<>\n\s*<button\n\s*onClick=\{\(\) => onStatusChange\(reservation\.id, 'seated'\)\}\n\s*className="px-3 py-1\.5 text-sm font-medium border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"\n\s*>\n\s*Sentar\n\s*<\/button>\n\s*<button\n\s*onClick=\{\(\) => onStatusChange\(reservation\.id, 'cancelled'\)\}\n\s*className="px-3 py-1\.5 text-sm font-medium border border-red-600 text-red-600 hover:bg-red-50 rounded-xl transition-colors"\n\s*>\n\s*Cancelar\n\s*<\/button>\n\s*<\/>\n\s*\)\}/,
  `{reservation.status === 'confirmed' && (
            <button
              onClick={() => onStatusChange(reservation.id, 'cancelled')}
              className="px-3 py-1.5 text-sm font-medium border border-red-600 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              Cancelar
            </button>
          )}`
);

// 3. Remove the block for 'seated' status buttons
content = content.replace(
  /\{reservation\.status === 'seated' && \(\n\s*<button\n\s*onClick=\{\(\) => onStatusChange\(reservation\.id, 'completed'\)\}\n\s*className="px-3 py-1\.5 text-sm font-medium border border-green-600 text-green-600 hover:bg-green-50 rounded-xl transition-colors"\n\s*>\n\s*Completar\n\s*<\/button>\n\s*\)\}/,
  ``
);

fs.writeFileSync('apps/web/src/app/(dashboard)/reservations/page.tsx', content);

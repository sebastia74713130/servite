const fs = require('fs');
const file = 'apps/web/src/app/r/[restaurantSlug]/ReservationFlow.tsx';
let content = fs.readFileSync(file, 'utf8');

const newUI = `      {step === 1 && (
        <div className="space-y-10">
          
          {branches && branches.length > 1 && (
            <section>
              <h2 className="text-xl font-bold mb-4">¿En qué sucursal?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {branches.map(branch => (
                  <button
                    key={branch.id}
                    onClick={() => setSelectedBranchId(branch.id)}
                    className={\`p-4 rounded-2xl border text-left transition-colors \${selectedBranchId === branch.id ? 'bg-[#E76F51] border-[#E76F51] text-white' : 'bg-[#1A1A1A] border-[#2A2A2A] text-[#888888] hover:border-[#444]'}\`}
                  >
                    <span className="font-bold">{branch.name}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Party Size */}`;

content = content.replace("      {step === 1 && (\n        <div className=\"space-y-10\">\n          \n          {/* Party Size */}", newUI);

// Also we need to check if branch is selected before allowing to go to step 2
const oldContinue = `onClick={() => setStep(2)}\n            disabled={!selectedDate || !selectedTime}`;
const newContinue = `onClick={() => setStep(2)}\n            disabled={!selectedDate || !selectedTime || !selectedBranchId}`;

content = content.replace(oldContinue, newContinue);

fs.writeFileSync(file, content);

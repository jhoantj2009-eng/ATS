const fs = require('fs');

const appTsx = fs.readFileSync('src/App.tsx', 'utf8');

let modifiedAppTsx = appTsx.replace(
  'import { AppSheetGuideModal } from "./components/AppSheetGuideModal";',
  'import { AppSheetGuideModal } from "./components/AppSheetGuideModal";\nimport { AccessGuard } from "./components/AccessGuard";\nimport { SettingsModal } from "./components/SettingsModal";'
);

modifiedAppTsx = modifiedAppTsx.replace(
  'import {  FileDown,  Printer,  Sparkles,  Users,  Building,  HelpCircle,  Eye,  Edit3,  ShieldCheck,  CheckCircle2,  AlertCircle,  Smartphone,  Share2,} from "lucide-react";',
  'import {  FileDown,  Printer,  Sparkles,  Users,  Building,  HelpCircle,  Eye,  Edit3,  ShieldCheck,  CheckCircle2,  AlertCircle,  Smartphone,  Share2,  Settings,} from "lucide-react";'
);

modifiedAppTsx = modifiedAppTsx.replace(
  'const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);',
  'const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);\n  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);'
);

modifiedAppTsx = modifiedAppTsx.replace(
  '  return (\n    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col antialiased">',
  '  return (\n    <AccessGuard>\n    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col antialiased">'
);

modifiedAppTsx = modifiedAppTsx.replace(
  '        isOpen={isGuideModalOpen}\n        onClose={() => setIsGuideModalOpen(false)}\n      />\n    </div>\n  );\n}',
  '        isOpen={isGuideModalOpen}\n        onClose={() => setIsGuideModalOpen(false)}\n      />\n\n      {/* SETTINGS MODAL */}\n      <SettingsModal\n        isOpen={isSettingsModalOpen}\n        onClose={() => setIsSettingsModalOpen(false)}\n        onSavePassword={(newPass) => {\n          localStorage.setItem("ats_app_password", newPass);\n          showToast("Código de acceso actualizado exitosamente");\n          setIsSettingsModalOpen(false);\n        }}\n      />\n    </div>\n    </AccessGuard>\n  );\n}'
);

modifiedAppTsx = modifiedAppTsx.replace(
  '            <button\n              type="button"\n              onClick={() => setIsGuideModalOpen(true)}',
  '            <button\n              type="button"\n              onClick={() => setIsSettingsModalOpen(true)}\n              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 sm:px-3 py-2 rounded-xl transition-colors"\n              title="Cambiar Contraseña / Código de Acceso"\n            >\n              <Settings className="w-4 h-4 text-slate-600" />\n              <span className="hidden md:inline">Contraseña</span>\n            </button>\n\n            <button\n              type="button"\n              onClick={() => setIsGuideModalOpen(true)}'
);

fs.writeFileSync('src/App.tsx', modifiedAppTsx);
console.log('App.tsx patched');

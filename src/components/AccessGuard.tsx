import React, { useState, useEffect, createContext, useContext } from "react";
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User,
} from "firebase/auth";
import { auth } from "../firebase";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  ArrowLeft,
  KeyRound,
  Loader2,
} from "lucide-react";
import { PWAInstallButton, PWAInstallModal } from "./PWAInstallButton";

interface AuthContextType {
  currentUser: User | null;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  signOutUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AccessGuardProps {
  children: React.ReactNode;
}

export const AccessGuard: React.FC<AccessGuardProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password reset states
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [resetErrorMessage, setResetErrorMessage] = useState<string | null>(null);
  const [isPWAModalOpen, setIsPWAModalOpen] = useState(false);

  // Escuchar cambios de estado en Firebase Authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const mapAuthError = (code?: string): string => {
    switch (code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
        return "Correo electrónico o contraseña incorrectos. Verifique sus credenciales.";
      case "auth/user-not-found":
        return "No existe ningún usuario registrado con este correo electrónico.";
      case "auth/invalid-email":
        return "El formato del correo electrónico ingresado no es válido.";
      case "auth/user-disabled":
        return "Esta cuenta ha sido deshabilitada. Comuníquese con el Administrador SST.";
      case "auth/too-many-requests":
        return "Demasiados intentos de acceso fallidos. Por seguridad, intente de nuevo en unos minutos.";
      case "auth/network-request-failed":
        return "Error de conexión a internet. Verifique su red y vuelva a intentar.";
      default:
        return "No fue posible iniciar sesión. Verifique los datos ingresados.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage("Por favor ingrese su correo electrónico.");
      return;
    }
    if (!password) {
      setErrorMessage("Por favor ingrese su contraseña.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, cleanEmail, password);
      setErrorMessage(null);
    } catch (err: any) {
      console.error("Error de inicio de sesión con Firebase:", err);
      setErrorMessage(mapAuthError(err?.code));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErrorMessage(null);
    setResetSuccessMessage(null);

    const cleanEmail = resetEmail.trim();
    if (!cleanEmail) {
      setResetErrorMessage("Por favor ingrese el correo para restablecer la contraseña.");
      return;
    }

    setIsSubmittingReset(true);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setResetSuccessMessage(
        `Se ha enviado un correo a ${cleanEmail} con las instrucciones para restablecer su contraseña.`
      );
    } catch (err: any) {
      console.error("Error enviando correo de recuperación:", err);
      setResetErrorMessage(mapAuthError(err?.code));
    } finally {
      setIsSubmittingReset(false);
    }
  };

  const signOutUser = async () => {
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
  };

  // Pantalla de carga mientras se verifica la sesión en Firebase
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-white">
          <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
          <p className="text-sm font-bold tracking-wide text-slate-300">
            Verificando credenciales de acceso...
          </p>
        </div>
      </div>
    );
  }

  // Si el usuario está autenticado en Firebase, mostrar la aplicación
  if (currentUser) {
    return (
      <AuthContext.Provider value={{ currentUser, signOutUser }}>
        {children}
      </AuthContext.Provider>
    );
  }

  // Pantalla de inicio de sesión con Firebase Authentication
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 antialiased selection:bg-amber-400 selection:text-slate-950">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        
        {/* ENCABEZADO INSTITUCIONAL DCM SST */}
        <div className="bg-slate-900 p-6 sm:p-7 flex flex-col items-center text-white border-b-4 border-amber-400 relative">
          <div className="w-16 h-16 bg-slate-800 border-2 border-amber-400/80 rounded-2xl flex items-center justify-center mb-3 shadow-inner">
            <ShieldCheck className="w-9 h-9 text-amber-400" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white text-center">
            Acceso Restringido
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 text-center font-medium leading-snug">
            Sistema de Gestión ATS con Firma Digital · Formato F-SST-045
          </p>
          <span className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-slate-800 text-amber-400 border border-slate-700">
            <Lock className="w-3 h-3" />
            <span>Firebase Authentication</span>
          </span>
        </div>

        {/* MODO: RESTABLECER CONTRASEÑA */}
        {isResetMode ? (
          <form onSubmit={handlePasswordReset} className="p-6 sm:p-8 space-y-5">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Recuperación de Contraseña
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Ingrese su correo electrónico registrado para recibir el enlace de restablecimiento.
              </p>
            </div>

            {resetSuccessMessage && (
              <div className="p-3.5 bg-emerald-50 border-2 border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>{resetSuccessMessage}</span>
              </div>
            )}

            {resetErrorMessage && (
              <div className="p-3.5 bg-red-50 border-2 border-red-300 rounded-xl text-xs font-bold text-red-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{resetErrorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5 uppercase">
                Correo Electrónico <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  autoComplete="email"
                  autoFocus
                  className="w-full pl-11 pr-4 min-h-[48px] h-12 rounded-xl border-2 border-slate-300 bg-white text-base text-slate-900 font-medium focus:border-slate-900 focus:outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmittingReset}
              className="w-full min-h-[48px] h-12 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-extrabold text-base rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmittingReset ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                  <span>Enviando enlace...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-5 h-5 text-amber-400" />
                  <span>Enviar Enlace de Recuperación</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsResetMode(false);
                setResetErrorMessage(null);
                setResetSuccessMessage(null);
              }}
              className="w-full flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 py-2 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al inicio de sesión</span>
            </button>
          </form>
        ) : (
          /* MODO: INICIO DE SESIÓN CON CORREO Y CONTRASEÑA */
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
            {errorMessage && (
              <div className="p-3.5 bg-red-50 border-2 border-red-300 rounded-xl text-xs sm:text-sm font-bold text-red-800 flex items-start gap-2.5 animate-in fade-in duration-150">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* CAMPO: CORREO ELECTRÓNICO */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5 uppercase">
                Correo Electrónico <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="usuario@empresa.com"
                  autoComplete="email"
                  autoFocus
                  className="w-full pl-11 pr-4 min-h-[48px] h-12 rounded-xl border-2 border-slate-300 bg-white text-base text-slate-900 font-semibold focus:border-slate-900 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* CAMPO: CONTRASEÑA */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs sm:text-sm font-bold text-slate-800 uppercase">
                  Contraseña <span className="text-red-600">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsResetMode(true);
                    setResetEmail(email);
                  }}
                  className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline cursor-pointer"
                >
                  ¿Olvidó su contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Ingrese su contraseña..."
                  autoComplete="current-password"
                  className="w-full pl-11 pr-12 min-h-[48px] h-12 rounded-xl border-2 border-slate-300 bg-white text-base text-slate-900 font-semibold focus:border-slate-900 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
                  title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* BOTÓN DE ENTRADA PRINCIPAL */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[48px] h-12 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-extrabold text-base rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <LogIn className="w-5 h-5 text-amber-400" />
                </>
              )}
            </button>
          </form>
        )}

        {/* PIE DE PÁGINA INFORMATIVO E INSTALACIÓN PWA */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 text-center space-y-3">
          <PWAInstallButton
            variant="login-footer"
            onOpenGuide={() => setIsPWAModalOpen(true)}
          />
          <p className="text-[11px] text-slate-500 font-medium">
            Acceso seguro autenticado mediante Firebase Authentication. Solo personal autorizado con cuenta previamente registrada.
          </p>
        </div>
      </div>

      <PWAInstallModal
        isOpen={isPWAModalOpen}
        onClose={() => setIsPWAModalOpen(false)}
      />
    </div>
  );
};

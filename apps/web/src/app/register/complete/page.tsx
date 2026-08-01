"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  setupNewRestaurant, 
  updateBranding, 
  createInitialMenu, 
  completeOnboarding 
} from "../actions";
import { getUserRestaurant } from "@/app/actions";
import { CheckCircle2, ChevronRight, Image as ImageIcon, Loader2, Store, UtensilsCrossed, Sparkles } from "lucide-react";
import { compressImage } from "@/lib/imageUtils";
import { ImageCropperModal } from "@/components/ImageCropperModal";
import { MenuScanner } from "@/app/(dashboard)/menu/MenuScanModal";

export default function RegisterCompletePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [user, setUser] = useState<any>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  
  // Form States
  const [restaurantId, setRestaurantId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  
  // Branding
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>("");
  
  const [rawLogoSrc, setRawLogoSrc] = useState<string | null>(null);
  const [rawCoverSrc, setRawCoverSrc] = useState<string | null>(null);
  const [showLogoCropper, setShowLogoCropper] = useState(false);
  const [showCoverCropper, setShowCoverCropper] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#E76F51");
  

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkState() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUser(data.user);

      // Check if user already has a restaurant (maybe they abandoned the wizard)
      const userRest = await getUserRestaurant(data.user.id);
      if (userRest && userRest.restaurant) {
        if (userRest.restaurant.onboarding_completed) {
          router.push("/");
          return;
        } else {
          // Has restaurant, but onboarding not finished. Jump to Step 2.
          setRestaurantId(userRest.restaurant.id);
          setBranchId(userRest.branch?.id || "");
          setRestaurantName(userRest.restaurant.name);
          setStep(2);
        }
      }
      setLoadingInitial(false);
    }
    checkState();
  }, [router]);

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantName.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await setupNewRestaurant(user.id, user.email || "", restaurantName);
      if (res.error) {
        setError(res.error);
        return;
      }
      setRestaurantId(res.restaurantId!);
      setBranchId(res.branchId!);
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Error al crear restaurante");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (type === 'logo') {
          setRawLogoSrc(reader.result as string);
          setShowLogoCropper(true);
        } else {
          setRawCoverSrc(reader.result as string);
          setShowCoverCropper(true);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      let logoUrl = "";
      let coverUrl = "";

      if (logoFile) {
        const ext = logoFile.name.split('.').pop();
        const path = `logos/${restaurantId}-${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('products').upload(path, logoFile);
        if (!error) {
          logoUrl = supabase.storage.from('products').getPublicUrl(path).data.publicUrl;
        }
      }

      if (coverFile) {
        const ext = coverFile.name.split('.').pop();
        const path = `covers/${restaurantId}-${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('products').upload(path, coverFile);
        if (!error) {
          coverUrl = supabase.storage.from('products').getPublicUrl(path).data.publicUrl;
        }
      }

      const res = await updateBranding(restaurantId, logoUrl, coverUrl, primaryColor);
      if (res.error) {
        setError(res.error);
        return;
      }
      setStep(3);
    } catch (err: any) {
      setError(err.message || "Error al guardar diseño");
    } finally {
      setLoading(false);
    }
  };

  const handleSkipStep2 = () => {
    setStep(3);
  };


  const handleStep4 = async () => {
    setLoading(true);
    try {
      const res = await completeOnboarding(restaurantId);
      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Error al finalizar");
      setLoading(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <Loader2 className="w-8 h-8 text-[#E76F51] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        
        {/* Progress Bar */}
        <div className="mb-8 relative">
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-gray-200">
            <div style={{ width: `${(step / 4) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[#E76F51] transition-all duration-500"></div>
          </div>
          <div className="flex justify-between text-xs font-semibold text-gray-500 px-1">
            <span className={step >= 1 ? "text-[#E76F51]" : ""}>Básico</span>
            <span className={step >= 2 ? "text-[#E76F51]" : ""}>Diseño</span>
            <span className={step >= 3 ? "text-[#E76F51]" : ""}>Menú</span>
            <span className={step >= 4 ? "text-[#E76F51]" : ""}>Listo</span>
          </div>
        </div>

        {showLogoCropper && rawLogoSrc && (
          <ImageCropperModal
            imageSrc={rawLogoSrc}
            aspect={1}
            recommendedSize="400x400 px"
            onCancel={() => {
              setShowLogoCropper(false);
              setRawLogoSrc(null);
            }}
            onCropComplete={async (croppedBlob) => {
              const file = new File([croppedBlob], 'logo_cropped.png', { type: 'image/png' });
              const compressed = await compressImage(file, 400, 0.8);
              setLogoFile(compressed);
              setLogoPreview(URL.createObjectURL(compressed));
              setShowLogoCropper(false);
              setRawLogoSrc(null);
            }}
          />
        )}

        {showCoverCropper && rawCoverSrc && (
          <ImageCropperModal
            imageSrc={rawCoverSrc}
            aspect={3}
            recommendedSize="1200x400 px"
            onCancel={() => {
              setShowCoverCropper(false);
              setRawCoverSrc(null);
            }}
            onCropComplete={async (croppedBlob) => {
              const file = new File([croppedBlob], 'cover_cropped.jpg', { type: 'image/jpeg' });
              const compressed = await compressImage(file, 1200, 0.8);
              setCoverFile(compressed);
              setCoverPreview(URL.createObjectURL(compressed));
              setShowCoverCropper(false);
              setRawCoverSrc(null);
            }}
          />
        )}

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 md:p-12">
          
          {/* STEP 1 */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-[#FDF0EC] text-[#E76F51] rounded-2xl flex items-center justify-center">
                  <Store size={32} />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-center text-[#1F2933] mb-2">
                Bienvenido a Servido<span className="text-[#E76F51]">.</span>
              </h1>
              <p className="text-center text-gray-500 mb-8">¿Cómo se llama tu restaurante?</p>
              
              <form onSubmit={handleStep1} className="space-y-6">
                <div>
                  <input
                    type="text"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E76F51] focus:border-transparent text-lg font-medium"
                    placeholder="Ej: La Pizzería"
                    required
                  />
                </div>
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !restaurantName.trim()}
                  className="w-full flex items-center justify-center space-x-2 bg-[#E76F51] text-white font-bold py-4 px-4 rounded-xl hover:bg-[#d65e40] transition-colors disabled:opacity-50"
                >
                  <span>{loading ? "Creando..." : "Siguiente"}</span>
                  {!loading && <ChevronRight size={20} />}
                </button>
              </form>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-bold text-center text-[#1F2933] mb-2">Personaliza tu Marca</h2>
              <p className="text-center text-gray-500 mb-8">Sube tu logo e imágenes (Opcional)</p>
              
              <form onSubmit={handleStep2} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Logo Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Logo</label>
                    <label className="cursor-pointer flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl hover:bg-gray-50 transition-colors overflow-hidden relative">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400">
                          <ImageIcon size={24} className="mb-2" />
                          <span className="text-sm">Subir logo</span>
                        </div>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'logo')} />
                    </label>
                  </div>

                  {/* Cover Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Portada del Menú</label>
                    <label className="cursor-pointer flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl hover:bg-gray-50 transition-colors overflow-hidden relative">
                      {coverPreview ? (
                        <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400">
                          <ImageIcon size={24} className="mb-2" />
                          <span className="text-sm">Subir portada</span>
                        </div>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'cover')} />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Color Principal</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-12 h-12 rounded-xl cursor-pointer border-0 p-0"
                    />
                    <span className="text-gray-500 font-medium">{primaryColor}</span>
                  </div>
                </div>

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                
                <div className="flex space-x-4 pt-4">
                  <button type="button" onClick={() => setStep(1)} className="bg-gray-100 text-gray-700 font-bold py-4 px-6 rounded-xl hover:bg-gray-200 transition-colors">
                    Atrás
                  </button>
                  <button type="button" onClick={handleSkipStep2} className="flex-1 bg-gray-100 text-gray-700 font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors">
                    Omitir
                  </button>
                  <button type="submit" disabled={loading} className="flex-1 bg-[#E76F51] text-white font-bold py-4 rounded-xl hover:bg-[#d65e40] transition-colors disabled:opacity-50">
                    {loading ? "Guardando..." : "Continuar"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <MenuScanner
                restaurantId={restaurantId}
                branchId={branchId}
                onSaved={() => setStep(4)}
                onSkip={() => setStep(4)}
              />
              <div className="mt-4 flex justify-center">
                <button type="button" onClick={() => setStep(2)} className="text-gray-500 hover:text-gray-700 font-medium text-sm transition-colors">
                  Volver al paso anterior
                </button>
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={48} />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-[#1F2933] mb-4">¡Todo listo!</h2>
              <p className="text-gray-500 mb-8 text-lg">
                Tu restaurante <strong>{restaurantName}</strong> ha sido configurado. Ahora podrás acceder a tu Panel de Control.
              </p>
              
              <div className="flex space-x-4">
                <button
                  onClick={() => setStep(3)}
                  className="bg-gray-100 text-gray-700 font-bold py-4 px-8 rounded-xl hover:bg-gray-200 transition-colors text-lg"
                >
                  Volver atrás
                </button>
                <button
                  onClick={handleStep4}
                  disabled={loading}
                  className="flex-1 bg-[#E76F51] text-white font-bold py-4 px-4 rounded-xl hover:bg-[#d65e40] transition-colors text-lg"
                >
                  {loading ? "Redirigiendo..." : "Ir al Dashboard"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

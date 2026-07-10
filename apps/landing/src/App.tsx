import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes, useLocation, Navigate } from "react-router-dom";

import { Cart, CartButton } from "./components/Cart";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Footer } from "./components/Footer";
import { Navbar } from "./components/Navbar";
import { CartProvider } from "./lib/cartStore";
import { ContentProvider, useContent } from "./lib/contentStore";
import { useTheme } from "./hooks/useTheme";
import { ComingSoon } from "./pages/ComingSoon";
import { StaffHub } from "./pages/StaffHub";
import { CUSTOM_CHROME, CUSTOM_LANDINGS } from "./custom";
import { SmasheAdmin } from "./custom/SmasheAdmin";
import { LoyaltyProvider } from "./lib/loyaltyStore";
import { useSettings } from "./hooks/useSettings";

import { Admin } from "./pages/Admin";
import { Contact } from "./pages/Contact";
import { Home } from "./pages/Home";
import { Menu } from "./pages/Menu";
import Builder from "./pages/Builder";
import { NotFound } from "./pages/NotFound";
import { Order } from "./pages/Order";
import { Payment } from "./pages/Payment";
import { QRCodes } from "./pages/QRCodes";
import { About } from "./pages/About";
import { Privacy } from "./pages/Privacy";
import { DeliveryTerms } from "./pages/DeliveryTerms";
import { DistanceSales } from "./pages/DistanceSales";
import { TermsOfUse } from "./pages/TermsOfUse";
import { SafeMenu } from "./pages/SafeMenu";
import { TableScan } from "./pages/TableScan";
import AppRedirect from "./pages/AppRedirect";
import { Blog } from "./pages/Blog";
import { BlogPost } from "./pages/BlogPost";
import BuilderSelect from "./pages/BuilderSelect";
import Game from "./pages/Game";

// Sayfa bazında SEO meta: canonical + title/description — TENANT içeriğinden türetilir.
// Route → Türkçe etiket; başlık "{Etiket} | {Marka}" olarak kurulur. Canonical = mevcut origin.
const ROUTE_LABELS: Record<string, string> = {
  "/menu": "Menü",
  "/contact": "İletişim",
  "/app": "Mobil Uygulama",
  "/oyun": "Oyun",
  "/build/pizza": "Kendi Pizzanı Tasarla",
  "/build/sandwich": "Kendi Sandviçini Tasarla",
};

const MetaUpdater = () => {
  const location = useLocation();
  const { content } = useContent();
  const theme = useTheme();

  useEffect(() => {
    const path = location.pathname;
    // Özel landing kendi title/description'ını yönetir — kökte ezme.
    const customRoot =
      path === "/" && theme?.published && theme?.customLanding && CUSTOM_LANDINGS[theme.customLanding];
    const brand = content.site?.name || "Online Sipariş";
    const origin =
      typeof window !== "undefined" ? window.location.origin : `https://${content.site?.domain || ""}`;
    const canonical = origin + (path === "/" ? "/" : path.replace(/\/+$/, ""));

    // canonical — her route kendi URL'sini gösterir (tenant origin'i)
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", canonical);
    document.querySelector('meta[property="og:url"]')?.setAttribute("content", canonical);

    // blog/about/build kendi başlığını ayrıca yönetir — onlara dokunma
    if (customRoot || path.startsWith("/blog") || path === "/about" || path === "/build") return;

    const label = ROUTE_LABELS[path];
    const title = path === "/" ? content.seo?.title || brand : `${label || brand} | ${brand}`;
    const description = content.seo?.description || content.site?.description || "";

    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", description);
  }, [location.pathname, content, theme]);

  return null;
};

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

// Page transition wrapper
const PageTransition = ({ children }: { children: React.ReactNode }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
};

// Tema (yayın durumu) yüklenene kadar kısa bir splash — published site'da placeholder flaşını önler.
const SiteSplash = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
    <div className="h-10 w-10 rounded-full border-4 border-white/20 border-t-white animate-spin" />
  </div>
);

// Kök geçidi: yayınlanmışsa özel landing (varsa) ya da Home; değilse "site hazırlanıyor".
const RootGate = () => {
  const theme = useTheme();
  if (theme === null) return <SiteSplash />;
  if (!theme.published) return <ComingSoon />;
  const Custom = theme.customLanding ? CUSTOM_LANDINGS[theme.customLanding] : undefined;
  if (Custom) return <Custom />;
  return (
    <PageTransition>
      <Home />
    </PageTransition>
  );
};

// Premium/tanıtım sayfaları (blog/oyun/tasarla/hakkımızda) — yayınlanmamışsa VEYA özel-kod
// landing varsa /menu'ye yönlendirir (özel landing tenant'ında generic sayfalar geçerli değil).
const Premium = ({ children }: { children: React.ReactNode }) => {
  const theme = useTheme();
  if (theme === null) return <SiteSplash />;
  return theme.published && !theme.customLanding ? <>{children}</> : <Navigate to="/menu" replace />;
};

// Animated routes component
// Restoran askıda (deneme bitti / ödeme yok) — tam sayfa kilit ekranı.
// api.ts 402 TENANT_SUSPENDED yakalayınca 'tenant-suspended' event'i atar.
const SuspendedScreen = () => {
  const theme = useTheme();
  return (
    <main className="grid min-h-screen place-items-center bg-[#0f172a] px-6 text-center">
      <div>
        <div className="text-5xl">🍽️</div>
        <h1 className="mt-6 text-2xl font-bold text-white md:text-3xl">
          {theme?.name || "Bu restoran"} şu an sipariş alamıyor
        </h1>
        <p className="mx-auto mt-3 max-w-md text-white/60">
          Kısa bir süre için hizmet veremiyoruz. Lütfen daha sonra tekrar dene.
        </p>
        <p className="mt-8 text-xs text-white/30">
          İşletme sahibi misiniz? <a href="/panel" className="underline hover:text-white/60">İşletme paneli</a>
        </p>
      </div>
    </main>
  );
};

const AnimatedRoutes = () => {
  const location = useLocation();
  const theme = useTheme();
  const [suspended, setSuspended] = useState(false);
  useEffect(() => {
    const on = () => setSuspended(true);
    window.addEventListener("tenant-suspended", on);
    return () => window.removeEventListener("tenant-suspended", on);
  }, []);
  const isAdmin = location.pathname === "/admin";
  const isStaffHub = location.pathname === "/panel" || location.pathname === "/isletme";
  // Özel landing'in kendi içerik editörü (ör. /smashe-admin) — tam sayfa.
  const isCustomAdmin = location.pathname === "/smashe-admin";
  // Yayınlanmamış tenant'ın kök "site hazırlanıyor" sayfası tam ekran — navbar/footer gizli.
  const isComingSoon = location.pathname === "/" && theme !== null && !theme.published;
  // Tenant'a özel App-seviyesi chrome (CUSTOM_CHROME): standart Navbar/Footer
  // yerine markalı Nav/Footer HER sayfada render edilir.
  const chrome =
    theme !== null && theme.published === true && theme.customLanding
      ? CUSTOM_CHROME[theme.customLanding]
      : undefined;
  // Özel kodlanmış premium landing kendi nav/footer'ını taşır — paylaşılan chrome gizli.
  // CUSTOM_CHROME'a kayıtlı tenant'larda landing kendi chrome'unu taşımaz;
  // kökte de App-seviyesi Nav/Footer görünür (çift nav oluşmaz).
  const isCustomRoot =
    location.pathname === "/" &&
    theme !== null &&
    theme.published === true &&
    !!theme.customLanding &&
    !!CUSTOM_LANDINGS[theme.customLanding] &&
    !CUSTOM_CHROME[theme.customLanding];
  const hideChrome = isAdmin || isComingSoon || isStaffHub || isCustomRoot || isCustomAdmin;
  const { services, isWithinOrderHours } = useSettings();

  // Askıdaki restoran: personel giriş yolları hariç her şey kilit ekranı.
  if (suspended && !isStaffHub) return <SuspendedScreen />;

  return (
    <>
      <ScrollToTop />
      <MetaUpdater />

      {/* Show navbar and footer only on non-admin / non-placeholder pages */}
      {!hideChrome && (chrome ? <chrome.Nav /> : <Navbar />)}

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<RootGate />} />
          <Route
            path="/menu"
            element={
              <PageTransition>
                <Menu />
              </PageTransition>
            }
          />
<Route
            path="/contact"
            element={
              <PageTransition>
                <Contact />
              </PageTransition>
            }
          />
          <Route
            path="/order"
            element={
              <PageTransition>
                <Order />
              </PageTransition>
            }
          />
          {/* Pizza & Sandwich Builder — seçim + kendi ürün tasarımı (premium/yayınlanmış) */}
          <Route path="/build" element={<Premium><PageTransition><BuilderSelect /></PageTransition></Premium>} />
          <Route path="/build/:type" element={<Premium><PageTransition><Builder /></PageTransition></Premium>} />
          {/* Mobile app indirme — device-aware redirect (premium/yayınlanmış) */}
          <Route path="/app" element={<Premium><PageTransition><AppRedirect /></PageTransition></Premium>} />
          {/* Blog — SEO + lokal kaçamak rehberleri (premium/yayınlanmış) */}
          <Route path="/blog" element={<Premium><PageTransition><Blog /></PageTransition></Premium>} />
          <Route path="/blog/:slug" element={<Premium><PageTransition><BlogPost /></PageTransition></Premium>} />
          {/* Pizza Şefi mini-oyunu — global liderlik (premium/yayınlanmış) */}
          <Route path="/oyun" element={<Premium><PageTransition><Game /></PageTransition></Premium>} />
          {/* QR scan route - fetches table info and redirects to menu */}
          <Route path="/table/:tableId" element={<TableScan />} />
          {/* Payment page */}
          <Route path="/payment" element={<Payment />} />
          <Route path="/about" element={<Premium><PageTransition><About /></PageTransition></Premium>} />
          <Route path="/privacy" element={<PageTransition><Privacy /></PageTransition>} />
          <Route path="/delivery-terms" element={<PageTransition><DeliveryTerms /></PageTransition>} />
          <Route path="/distance-sales" element={<PageTransition><DistanceSales /></PageTransition>} />
          <Route path="/terms-of-use" element={<PageTransition><TermsOfUse /></PageTransition>} />
          <Route path="/terms" element={<PageTransition><TermsOfUse /></PageTransition>} />
          <Route path="/safemenu" element={<SafeMenu />} />
          {/* İşletme paneli — personeli POS/Mutfak/Yönetim'e tek tuşla götürür */}
          <Route path="/panel" element={<StaffHub />} />
          <Route path="/isletme" element={<StaffHub />} />
          {/* Smashé özel landing editörü — yalnız bu özel tasarım aktifken */}
          <Route
            path="/smashe-admin"
            element={theme?.customLanding === "smashe" ? <SmasheAdmin /> : <NotFound />}
          />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/qr" element={<QRCodes />} />
          <Route
            path="*"
            element={
              <PageTransition>
                <NotFound />
              </PageTransition>
            }
          />
        </Routes>
      </AnimatePresence>

      {!hideChrome && (chrome ? <chrome.Footer /> : <Footer />)}
      {!isAdmin && services.cartEnabled && isWithinOrderHours && <CartButton />}
      {!isAdmin && services.cartEnabled && isWithinOrderHours && <Cart />}
    </>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <ContentProvider>
        <LoyaltyProvider>
          <CartProvider>
            <BrowserRouter>
              <AnimatedRoutes />
            </BrowserRouter>
          </CartProvider>
        </LoyaltyProvider>
      </ContentProvider>
    </ErrorBoundary>
  );
}

export default App;

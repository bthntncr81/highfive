import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation, Navigate } from "react-router-dom";

import { Cart, CartButton } from "./components/Cart";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Footer } from "./components/Footer";
import { Navbar } from "./components/Navbar";
import { CartProvider } from "./lib/cartStore";
import { ContentProvider, useContent } from "./lib/contentStore";
import { useTheme } from "./hooks/useTheme";
import { ComingSoon } from "./pages/ComingSoon";
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

  useEffect(() => {
    const path = location.pathname;
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
    if (path.startsWith("/blog") || path === "/about" || path === "/build") return;

    const label = ROUTE_LABELS[path];
    const title = path === "/" ? content.seo?.title || brand : `${label || brand} | ${brand}`;
    const description = content.seo?.description || content.site?.description || "";

    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", description);
  }, [location.pathname, content]);

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

// Kök geçidi: yayınlanmışsa gerçek landing (Home), değilse "site hazırlanıyor".
const RootGate = () => {
  const theme = useTheme();
  if (theme === null) return <SiteSplash />;
  return theme.published ? (
    <PageTransition>
      <Home />
    </PageTransition>
  ) : (
    <ComingSoon />
  );
};

// Premium/tanıtım sayfaları (blog/oyun/tasarla/hakkımızda) — yayınlanmamışsa /menu'ye yönlendirir.
const Premium = ({ children }: { children: React.ReactNode }) => {
  const theme = useTheme();
  if (theme === null) return <SiteSplash />;
  return theme.published ? <>{children}</> : <Navigate to="/menu" replace />;
};

// Animated routes component
const AnimatedRoutes = () => {
  const location = useLocation();
  const theme = useTheme();
  const isAdmin = location.pathname === "/admin";
  // Yayınlanmamış tenant'ın kök "site hazırlanıyor" sayfası tam ekran — navbar/footer gizli.
  const isComingSoon = location.pathname === "/" && theme !== null && !theme.published;
  const hideChrome = isAdmin || isComingSoon;
  const { services, isWithinOrderHours } = useSettings();

  return (
    <>
      <ScrollToTop />
      <MetaUpdater />

      {/* Show navbar and footer only on non-admin / non-placeholder pages */}
      {!hideChrome && <Navbar />}

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

      {!hideChrome && <Footer />}
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

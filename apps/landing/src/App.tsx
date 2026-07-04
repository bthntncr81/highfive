import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";

import { Cart, CartButton } from "./components/Cart";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Footer } from "./components/Footer";
import { Navbar } from "./components/Navbar";
import { CartProvider } from "./lib/cartStore";
import { ContentProvider } from "./lib/contentStore";
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

// Sayfa bazında SEO meta: canonical + title/description.
// Prerender (build-time) statik HTML zaten her route için doğru meta'yı basıyor;
// bu updater SPA içi gezinmede (ve JS-render eden botlarda) tutarlılığı korur.
const ROUTE_META: Record<string, { title: string; description: string }> = {
  "/": {
    title: "High Five Pizza & Makarna | Akçakoca Taş Fırın Pizza",
    description:
      "Akçakoca’da taş fırın İtalyan pizza, el yapımı makarna ve premium sandviç. Kendi pizzanı tasarla, sadakat puanı kazan, online sipariş ver. Her gün 11:00–02:00.",
  },
  "/menu": {
    title: "Menü – Pizza, Makarna, Sandviç | High Five Akçakoca",
    description:
      "High Five Akçakoca menüsü: taş fırın pizzalar, el yapımı makarnalar, ciabatta & schiacciata sandviçler, içecekler ve tatlılar. Online sipariş ve paket servis.",
  },
  "/contact": {
    title: "İletişim & Adres | High Five Akçakoca",
    description:
      "High Five Akçakoca adres, telefon ve çalışma saatleri (her gün 11:00–02:00). WhatsApp veya telefonla hızlı sipariş, 18 dakikada kapında.",
  },
  "/app": {
    title: "Mobil Uygulama | High Five Akçakoca",
    description:
      "High Five Akçakoca uygulamasını indir: tek dokunuşla sipariş, sadakat puanları ve sana özel kampanyalar. iOS ve Android.",
  },
  "/oyun": {
    title: "Pizza Şefi Oyunu | High Five Akçakoca",
    description:
      "High Five Pizza Şefi mini oyununu oyna, doğru siparişleri yetiştir ve global liderlik tablosunda yerini al!",
  },
  "/build/pizza": {
    title: "Kendi Pizzanı Tasarla | High Five Akçakoca",
    description:
      "Hamurdan malzemeye kendi pizzanı 5 adımda tasarla, canlı önizle ve sipariş ver. High Five Akçakoca taş fırın pizza.",
  },
  "/build/sandwich": {
    title: "Kendi Sandviçini Tasarla | High Five Akçakoca",
    description:
      "Ekmek, içerik ve soslarını seçerek kendi özel sandviçini tasarla ve sipariş ver. High Five Akçakoca.",
  },
};

const MetaUpdater = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    const canonical =
      "https://highfivepps.com" + (path === "/" ? "/" : path.replace(/\/+$/, ""));

    // canonical — her route kendi URL'sini gösterir
    let link = document.querySelector(
      'link[rel="canonical"]'
    ) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", canonical);
    document
      .querySelector('meta[property="og:url"]')
      ?.setAttribute("content", canonical);

    // bilinen statik route'lar için title/description
    // (blog/about/build kendi başlığını ayrıca yönetir)
    const m = ROUTE_META[path];
    if (m) {
      document.title = m.title;
      document
        .querySelector('meta[name="description"]')
        ?.setAttribute("content", m.description);
      document
        .querySelector('meta[property="og:title"]')
        ?.setAttribute("content", m.title);
      document
        .querySelector('meta[property="og:description"]')
        ?.setAttribute("content", m.description);
    }
  }, [location.pathname]);

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

// Animated routes component
const AnimatedRoutes = () => {
  const location = useLocation();
  const isAdmin = location.pathname === "/admin";
  const { services, isWithinOrderHours } = useSettings();

  return (
    <>
      <ScrollToTop />
      <MetaUpdater />

      {/* Show navbar and footer only on non-admin pages */}
      {!isAdmin && <Navbar />}

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <PageTransition>
                <Home />
              </PageTransition>
            }
          />
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
          {/* Pizza & Sandwich Builder — seçim + kendi ürün tasarımı */}
          <Route path="/build" element={<PageTransition><BuilderSelect /></PageTransition>} />
          <Route path="/build/:type" element={<PageTransition><Builder /></PageTransition>} />
          {/* Mobile app indirme — device-aware redirect */}
          <Route path="/app" element={<PageTransition><AppRedirect /></PageTransition>} />
          {/* Blog — SEO + lokal kaçamak rehberleri */}
          <Route path="/blog" element={<PageTransition><Blog /></PageTransition>} />
          <Route path="/blog/:slug" element={<PageTransition><BlogPost /></PageTransition>} />
          {/* Pizza Şefi mini-oyunu — global liderlik */}
          <Route path="/oyun" element={<PageTransition><Game /></PageTransition>} />
          {/* QR scan route - fetches table info and redirects to menu */}
          <Route path="/table/:tableId" element={<TableScan />} />
          {/* Payment page */}
          <Route path="/payment" element={<Payment />} />
          <Route path="/about" element={<PageTransition><About /></PageTransition>} />
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

      {!isAdmin && <Footer />}
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

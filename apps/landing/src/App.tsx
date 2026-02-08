import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";

import { Cart, CartButton } from "./components/Cart";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Footer } from "./components/Footer";
import { Navbar } from "./components/Navbar";
import { CartProvider } from "./lib/cartStore";
import { ContentProvider, useContent } from "./lib/contentStore";
import { LoyaltyProvider } from "./lib/loyaltyStore";

import { About } from "./pages/About";
import { Admin } from "./pages/Admin";
import { Contact } from "./pages/Contact";
import { Home } from "./pages/Home";
import { Menu } from "./pages/Menu";
import { NotFound } from "./pages/NotFound";
import { Order } from "./pages/Order";
import { Payment } from "./pages/Payment";
import { QRCodes } from "./pages/QRCodes";
import { TableScan } from "./pages/TableScan";

// SEO meta updater component
const MetaUpdater = () => {
  const { content } = useContent();
  const location = useLocation();

  useEffect(() => {
    // Update document title
    document.title = content.seo.title;

    // Update meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", content.seo.description);
    }

    // Update OG tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute("content", content.seo.title);
    }

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
      ogDesc.setAttribute("content", content.seo.description);
    }

    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) {
      ogImage.setAttribute("content", content.seo.ogImage);
    }
  }, [content.seo, location.pathname]);

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
            path="/about"
            element={
              <PageTransition>
                <About />
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
          {/* QR scan route - fetches table info and redirects to menu */}
          <Route path="/table/:tableId" element={<TableScan />} />
          {/* Payment page */}
          <Route path="/payment" element={<Payment />} />
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
      {!isAdmin && <CartButton />}
      {!isAdmin && <Cart />}
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

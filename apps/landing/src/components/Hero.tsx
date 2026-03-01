import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useContent } from "../lib/contentStore";
import {
  PastaAnimation,
  PizzaAnimation,
  SandwichAnimation,
} from "./FoodAnimations";

export const Hero = () => {
  const { content } = useContent();

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-background">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />

        {/* Geometric shapes */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

        {/* Bottom wave */}
        <svg
          className="absolute bottom-0 left-0 w-full h-32 text-surface"
          viewBox="0 0 1440 200"
          preserveAspectRatio="none"
        >
          <path
            fill="currentColor"
            d="M0,100 C360,200 720,0 1080,100 C1260,150 1380,50 1440,80 L1440,200 L0,200 Z"
          />
        </svg>
      </div>

      <div className="container-diner relative z-10">
        <div
          className="grid lg:grid-cols-2 gap-12 items-center"
          style={{ marginBottom: "20px" }}
        >
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-left"
          >
            {/* Logo */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-block mb-6 w-100"
              style={{ margin: "0" }}
            >
              <img
                src="/logo.svg"
                alt={content.site.logoText}
                className="h-32 md:h-44 w-auto"
                style={{ height: "20rem", margin: "auto" }}
              />
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-heading font-bold text-5xl md:text-6xl lg:text-7xl text-foreground leading-tight mb-4"
            >
              <span className="text-primary">
                {content.hero.headline.split(" ")[0]}
              </span>
              <br />
              <span className="relative inline-block">
                {content.hero.headline.split(" ").slice(1).join(" ")}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 1, duration: 0.8 }}
                  className="absolute -bottom-1 left-0 w-full h-1 bg-accent rounded-full origin-left"
                />
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="font-body text-xl md:text-2xl text-foreground-muted mb-8 max-w-xl mx-auto lg:mx-0"
            >
              {content.hero.subheadline}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Link to="/menu" className="btn-primary text-lg group">
                Menüyü İncele
                <motion.span
                  className="inline-block"
                  initial={{ x: 0 }}
                  whileHover={{ x: 5 }}
                >
                  →
                </motion.span>
              </Link>
              <a
                href={`https://wa.me/${
                  content.whatsapp.phone
                }?text=${encodeURIComponent(content.whatsapp.defaultMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-whatsapp text-lg"
              >
                WhatsApp Sipariş
              </a>
            </motion.div>

            {/* Social Proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-10 flex flex-wrap items-center gap-4 justify-center lg:justify-start"
            >
              {/* Google Rating */}
              <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl shadow-card">
                <div className="flex text-amber-400 text-base">
                  {"★".repeat(5)}
                </div>
                <span className="font-display font-bold text-foreground">4.9</span>
                <span className="text-sm text-foreground-muted">
                  Google
                </span>
              </div>

              {/* Happy Customers */}
              <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl shadow-card">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <span className="font-display font-bold text-primary text-lg">
                    10K+
                  </span>
                  <span className="text-sm text-foreground-muted ml-1">
                    Mutlu Müşteri
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Food Animations */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative h-[400px] md:h-[500px] lg:h-[600px]"
          >
            {/* Main pizza */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 md:w-80 lg:w-96">
              <PizzaAnimation />
            </div>

            {/* Pasta - top right */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute top-0 right-0 md:right-10 w-32 md:w-40"
            >
              <PastaAnimation />
            </motion.div>

            {/* Sandwich - bottom left */}
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{
                repeat: Infinity,
                duration: 5,
                ease: "easeInOut",
                delay: 1,
              }}
              className="absolute bottom-10 left-0 md:left-5 w-36 md:w-44"
            >
              <SandwichAnimation />
            </motion.div>

            {/* Price tag */}
            <motion.div
              animate={{ rotate: [-3, 3, -3] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="absolute top-20 right-5 bg-primary text-white font-display font-bold text-sm px-4 py-2 rounded-full shadow-lg"
            >
              ₺49'dan başlayan
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

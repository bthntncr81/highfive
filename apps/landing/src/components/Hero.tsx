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
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Checkered corner */}
        <div className="absolute top-0 right-0 w-96 h-96 checkered opacity-30 transform rotate-12 translate-x-32 -translate-y-32" />

        {/* Floating decorative elements */}
        <motion.div
          animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
          className="absolute top-20 left-10 text-6xl opacity-20"
        >
          🍕
        </motion.div>
        <motion.div
          animate={{ y: [0, 15, 0], rotate: [0, -5, 0] }}
          transition={{
            repeat: Infinity,
            duration: 5,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute top-40 right-20 text-5xl opacity-20"
        >
          🍝
        </motion.div>
        <motion.div
          animate={{ y: [0, -15, 0], rotate: [0, 10, 0] }}
          transition={{
            repeat: Infinity,
            duration: 7,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute bottom-32 left-20 text-5xl opacity-20"
        >
          🥪
        </motion.div>

        {/* Red swoosh decoration */}
        <svg
          className="absolute bottom-0 left-0 w-full h-48 text-diner-red/10"
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
                src="/logo.png"
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
              className="font-heading text-5xl md:text-6xl lg:text-7xl text-diner-chocolate leading-tight mb-4"
            >
              <span className="text-diner-red">
                {content.hero.headline.split(" ")[0]}
              </span>
              <br />
              <span className="relative inline-block">
                {content.hero.headline.split(" ").slice(1).join(" ")}
                <motion.svg
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 1, duration: 0.8 }}
                  className="absolute -bottom-2 left-0 w-full h-4 text-diner-mustard"
                  viewBox="0 0 200 20"
                >
                  <motion.path
                    d="M0,10 Q50,0 100,10 T200,10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </motion.svg>
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="font-body text-xl md:text-2xl text-diner-chocolate-light mb-8 max-w-xl mx-auto lg:mx-0"
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
              <Link to="/menu" className="btn-primary text-xl group">
                <motion.span
                  animate={{ rotate: [0, 20, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  🍕
                </motion.span>
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
                className="btn-whatsapp text-xl"
              >
                <span>📱</span>
                WhatsApp Sipariş
              </a>
            </motion.div>

            {/* Social Proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-10 flex flex-wrap items-center gap-6 justify-center lg:justify-start"
            >
              {/* Google Rating */}
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-diner shadow-diner">
                <div className="flex text-diner-mustard text-lg">
                  {"★".repeat(5)}
                </div>
                <span className="font-display text-diner-chocolate">4.9</span>
                <span className="text-sm text-diner-chocolate-light">
                  Google
                </span>
              </div>

              {/* Happy Customers */}
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-diner shadow-diner">
                <span className="text-2xl">😋</span>
                <div>
                  <span className="font-display text-diner-red text-lg">
                    10K+
                  </span>
                  <span className="text-sm text-diner-chocolate-light ml-1">
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

            {/* Decorative price tags */}
            <motion.div
              animate={{ rotate: [-5, 5, -5] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="absolute top-20 right-5 bg-diner-mustard text-diner-chocolate font-display text-lg px-3 py-1 rounded-stamp shadow-stamp transform -rotate-12"
            >
              ₺49'dan başlayan
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

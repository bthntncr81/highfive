import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useContent } from "../lib/contentStore";
import { orderApi, type MenuItem as APIMenuItem } from "../lib/api";

export const Hero = () => {
  const { content } = useContent();
  const [apiItems, setApiItems] = useState<APIMenuItem[]>([]);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await orderApi.getMenu();
        if (response.success && response.data?.items) {
          const withImages = response.data.items.filter(
            (item) => item.image && item.image.startsWith("/uploads/")
          );
          setApiItems(withImages.slice(0, 3));
        }
      } catch {
        // Silent fail - cards won't show
      }
    };
    fetchItems();
  }, []);

  const heroCards = apiItems.length > 0
    ? apiItems.map((item) => ({
        name: item.name,
        price: Number(item.price),
        image: item.image || "",
        desc: item.description || "",
      }))
    : content.menu.items.slice(0, 3).map((item) => ({
        name: item.name,
        price: item.price,
        image: item.image,
        desc: item.desc,
      }));

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-background">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="absolute top-20 right-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container-diner relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center py-8">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="mb-6"
            >
              <img
                src="/logo.svg"
                alt={content.site.logoText}
                className="h-40 md:h-52 w-auto mx-auto lg:mx-0"
              />
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="font-heading font-bold text-4xl md:text-5xl lg:text-6xl text-foreground leading-tight mb-4"
            >
              <span className="text-primary">
                {content.hero.headline.split(" ")[0]}
              </span>{" "}
              <span>{content.hero.headline.split(" ").slice(1).join(" ")}</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="font-body text-lg md:text-xl text-foreground-muted mb-8 max-w-xl mx-auto lg:mx-0"
            >
              {content.hero.subheadline}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Link to="/menu" className="btn-primary text-lg">
                Menüyü İncele
                <span className="ml-1">→</span>
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
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mt-10 flex flex-wrap items-center gap-4 justify-center lg:justify-start"
            >
              <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl shadow-card">
                <div className="flex text-amber-400 text-base">
                  {"★".repeat(5)}
                </div>
                <span className="font-display font-bold text-foreground">
                  4.9
                </span>
                <span className="text-sm text-foreground-muted">Google</span>
              </div>
              <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl shadow-card">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <span className="font-display font-bold text-primary text-lg">
                  10K+
                </span>
                <span className="text-sm text-foreground-muted">
                  Mutlu Müşteri
                </span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right side - Modern food preview cards */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative hidden lg:block"
          >
            <div className="relative h-[500px]">
              {/* Card 1 - Main featured */}
              {heroCards[0] && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="absolute top-0 left-8 w-72"
                >
                  <div className="bg-white rounded-2xl overflow-hidden shadow-lg">
                    <div className="aspect-[4/3] bg-surface overflow-hidden">
                      <img
                        src={heroCards[0].image}
                        alt={heroCards[0].name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-display font-bold text-foreground">
                          {heroCards[0].name}
                        </h3>
                        <span className="font-display font-bold text-primary">
                          ₺{heroCards[0].price}
                        </span>
                      </div>
                      <p className="text-sm text-foreground-muted mt-1 line-clamp-1">
                        {heroCards[0].desc}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Card 2 - Offset right */}
              {heroCards[1] && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65, duration: 0.5 }}
                  className="absolute top-44 right-0 w-64"
                >
                  <div className="bg-white rounded-2xl overflow-hidden shadow-lg">
                    <div className="aspect-[4/3] bg-surface overflow-hidden">
                      <img
                        src={heroCards[1].image}
                        alt={heroCards[1].name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-display font-bold text-foreground text-sm">
                          {heroCards[1].name}
                        </h3>
                        <span className="font-display font-bold text-primary text-sm">
                          ₺{heroCards[1].price}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Card 3 - Bottom left */}
              {heroCards[2] && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  className="absolute bottom-0 left-0 w-60"
                >
                  <div className="bg-white rounded-2xl overflow-hidden shadow-lg">
                    <div className="aspect-[4/3] bg-surface overflow-hidden">
                      <img
                        src={heroCards[2].image}
                        alt={heroCards[2].name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-display font-bold text-foreground text-sm">
                          {heroCards[2].name}
                        </h3>
                        <span className="font-display font-bold text-primary text-sm">
                          ₺{heroCards[2].price}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Decorative accent dots */}
              <div className="absolute top-32 right-32 w-3 h-3 rounded-full bg-primary/30" />
              <div className="absolute bottom-20 right-20 w-2 h-2 rounded-full bg-accent/40" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

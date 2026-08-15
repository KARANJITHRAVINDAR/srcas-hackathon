import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Quote, Sparkles, CheckCircle2 } from "lucide-react";

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  image: string;
  quote: string;
  tag?: string;
  location?: string;
}

export const defaultTestimonials: Testimonial[] = [
  {
    id: "1",
    name: "Sarah Chen",
    role: "CEO of DataFlow",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&auto=format&fit=crop",
    quote:
      "SolaceUI transformed our design workflow. What used to take weeks now takes days.",
    tag: "Workflow Speed",
    location: "San Francisco, USA",
  },
  {
    id: "2",
    name: "Marcus Rodriguez",
    role: "Product Lead",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&auto=format&fit=crop",
    quote:
      "The best investment we've made for our frontend architecture in years.",
    tag: "Architecture",
    location: "Austin, USA",
  },
  {
    id: "3",
    name: "Olivia Koe",
    role: "Design Director",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop",
    quote:
      "Simply beautiful components that are easy to customize and integrate.",
    tag: "Design System",
    location: "London, UK",
  },
  {
    id: "4",
    name: "David Kim",
    role: "Founder & CTO",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=256&auto=format&fit=crop",
    quote:
      "Our development velocity has doubled since adopting SolaceUI.",
    tag: "Productivity",
    location: "Seattle, USA",
  },
  {
    id: "5",
    name: "Amara Okonkwo",
    role: "CTO, Global Infra",
    image:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=256&auto=format&fit=crop",
    quote:
      "Accessibility and performance out of the box. Truly impressive work.",
    tag: "Accessibility",
    location: "Nairobi, Kenya",
  },
  {
    id: "6",
    name: "James Mitchell",
    role: "Frontend Dev Lead",
    image:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=256&auto=format&fit=crop",
    quote:
      "The documentation is clear and the components just work. Love it.",
    tag: "Developer Exp",
    location: "Toronto, Canada",
  },
  {
    id: "7",
    name: "Elena Rodriguez",
    role: "Product Manager",
    image:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=256&auto=format&fit=crop",
    quote:
      "It looks premium and feels premium. Our users noticed the difference immediately.",
    tag: "User Delight",
    location: "Madrid, Spain",
  },
  {
    id: "8",
    name: "Michael Chang",
    role: "Tech Lead",
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=256&auto=format&fit=crop",
    quote:
      "Clean abstractions and great TypeScript support. A joy to work with.",
    tag: "TypeScript",
    location: "Singapore",
  },
  {
    id: "9",
    name: "Sofia Weber",
    role: "Lead UI Designer",
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=256&auto=format&fit=crop",
    quote:
      "Finally a library that respects design constraints while offering flexibility.",
    tag: "Flexibility",
    location: "Berlin, Germany",
  },
];

export interface Testimonial2Props {
  title?: string;
  subtitle?: string;
  badge?: string;
  items?: Testimonial[];
  className?: string;
}

export default function Testimonial2({
  title = "Trusted By The Best People",
  subtitle = "Discover what industry leaders and community pioneers say about our platform.",
  badge = "Community Feedback",
  items = defaultTestimonials,
  className = "",
}: Testimonial2Props) {
  const [selected, setSelected] = useState<Testimonial | null>(null);

  // Split testimonials into 3 rows for visual variance
  const row1 = items.slice(0, 3);
  const row2 = items.slice(3, 6);
  const row3 = items.slice(6, 9);

  return (
    <div
      className={`relative w-full py-20 overflow-hidden [--color-primary:#003AF9] bg-white dark:bg-slate-950 text-neutral-900 dark:text-white transition-colors ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 text-center mb-12 relative z-10">
        {badge && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 mb-4 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{badge}</span>
          </div>
        )}
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-3 text-base md:text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
            {subtitle}
          </p>
        )}
      </div>

      {/* Main Container acting as the viewport for background and fades */}
      <div className="relative w-full">
        {/* Shaded Background - Matches the height of this container exactly */}
        <div className="absolute inset-0 z-0 opacity-10 bg-[repeating-linear-gradient(315deg,currentColor_0,currentColor_1px,transparent_0,transparent_50%)] bg-[length:10px_10px] border-y border-black/20 dark:border-white/20 pointer-events-none" />

        {/* Fades - Match the height of this container exactly */}
        <div className="absolute left-0 top-0 bottom-0 w-32 md:w-48 bg-gradient-to-r from-white dark:from-slate-950 to-transparent z-20 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 md:w-48 bg-gradient-to-l from-white dark:from-slate-950 to-transparent z-20 pointer-events-none" />

        {/* Content Rows */}
        <div className="relative z-10 flex flex-col gap-6 md:gap-8 py-10 items-center justify-center overflow-hidden">
          {[row1, row2, row3].map((row, rowIndex) => (
            <motion.div
              key={rowIndex}
              className="flex items-center gap-6 min-w-max"
              animate={{
                x: rowIndex % 2 === 0 ? ["0%", "-25%"] : ["-25%", "0%"],
              }}
              transition={{
                duration: 35 + rowIndex * 5,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              {[...row, ...row, ...row, ...row].map((testimonial, i) => (
                <Capsule
                  key={`${testimonial.id}-${rowIndex}-${i}`}
                  testimonial={testimonial}
                  onClick={() => setSelected(testimonial)}
                />
              ))}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="fixed inset-0 bg-neutral-900/70 dark:bg-black/80 backdrop-blur-md z-[9999]"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{
                opacity: 0,
                scale: 0.95,
                y: 10,
                transition: { duration: 0.15 },
              }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 text-neutral-900 dark:text-white p-8 md:p-12 rounded-3xl border-2 border-blue-600 dark:border-blue-500 shadow-2xl z-[10000] overflow-hidden"
            >
              {/* Decorative Accent Background Glow */}
              <div className="absolute -right-16 -top-16 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

              <button
                onClick={() => setSelected(null)}
                aria-label="Close dialog"
                className="absolute top-4 right-4 p-2.5 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col items-center text-center relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6 shadow-sm">
                  <Quote className="w-6 h-6 fill-current opacity-80" />
                </div>

                <p className="text-xl md:text-2xl font-semibold leading-relaxed mb-8 text-neutral-800 dark:text-neutral-100">
                  &ldquo;{selected.quote}&rdquo;
                </p>

                {selected.tag && (
                  <div className="mb-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{selected.tag}</span>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-blue-600 dark:border-blue-400 shadow-md">
                    <img
                      src={selected.image}
                      alt={selected.name}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div className="text-left">
                    <h4 className="font-bold text-base md:text-lg text-neutral-900 dark:text-white">
                      {selected.name}
                    </h4>
                    <p className="text-xs md:text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                      {selected.role}
                      {selected.location ? ` • ${selected.location}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Capsule({
  testimonial,
  onClick,
}: {
  testimonial: Testimonial;
  onClick: () => void;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="group flex items-center gap-3.5 p-2 pr-7 rounded-full bg-white dark:bg-slate-900 border border-neutral-200 hover:border-blue-600 hover:border-dashed dark:hover:border-blue-400 dark:border-slate-800 cursor-pointer transition-all shadow-sm hover:shadow-md"
    >
      <div className="relative w-12 h-12 rounded-full overflow-hidden border border-neutral-300 group-hover:border-blue-600 dark:group-hover:border-blue-400 dark:border-neutral-700 transition-colors shadow-xs">
        <img
          src={testimonial.image}
          alt={testimonial.name}
          className="w-full h-full object-cover object-top"
        />
      </div>
      <div className="flex flex-col items-start leading-tight">
        <span className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {testimonial.name}
        </span>
        <span className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1">
          {testimonial.role}
        </span>
      </div>
    </motion.div>
  );
}

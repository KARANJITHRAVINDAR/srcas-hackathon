import React from 'react'
import MarqueeAlongSvgPath from "./marquee-along-svg-path"

const path =
  "M1 209.434C58.5872 255.935 387.926 325.938 482.583 209.434C600.905 63.8051 525.516 -43.2211 427.332 19.9613C329.149 83.1436 352.902 242.723 515.041 267.302C644.752 286.966 943.56 181.94 995 156.5"

export default function MarqueeSdgDemo() {
  return (
    <div className="w-full h-[600px] bg-slate-50 flex items-center justify-center overflow-hidden border-t border-b border-slate-200">
      <div className="absolute z-10 pointer-events-none w-full text-center mb-[200px]">
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 800, color: 'var(--navy)' }}>Driving Global Goals</h2>
        <p style={{ color: 'var(--slate)', fontSize: 16 }}>Aligned with UN Sustainable Development Goals</p>
      </div>
      <MarqueeAlongSvgPath
        path={path}
        viewBox="0 0 996 330"
        baseVelocity={6}
        slowdownOnHover={true}
        draggable={true}
        repeat={3}
        dragSensitivity={0.1}
        className="w-full h-full scale-100"
        responsive
        grabCursor
      >
        {sdgImages.map((img, i) => (
          <div
            key={i}
            className="w-24 h-24 sm:w-28 sm:h-28 hover:scale-125 duration-300 ease-in-out rounded-2xl overflow-hidden shadow-lg border-4 border-white"
          >
            <img
              src={img.src}
              alt={`SDG Goal ${i}`}
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        ))}
      </MarqueeAlongSvgPath>
    </div>
  )
}

const sdgImages = [
  { src: "https://images.unsplash.com/photo-1542810634-71277d95dcbb?q=80&w=300&auto=format&fit=crop" }, // Water / Clean
  { src: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?q=80&w=300&auto=format&fit=crop" }, // Food / Hunger
  { src: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?q=80&w=300&auto=format&fit=crop" }, // Health / Cross
  { src: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=300&auto=format&fit=crop" }, // Education
  { src: "https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=300&auto=format&fit=crop" }, // Gender / Equality
  { src: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?q=80&w=300&auto=format&fit=crop" }, // Energy / Windmills
  { src: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=300&auto=format&fit=crop" }, // Environment
  { src: "https://images.unsplash.com/photo-1518398046578-8cca57782e17?q=80&w=300&auto=format&fit=crop" }, // Peace / Partnership
]

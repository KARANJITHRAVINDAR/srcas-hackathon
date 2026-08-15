"use client"

import React, {
  type ComponentPropsWithoutRef,
  useEffect,
  useMemo,
  useState,
} from "react"
import { AnimatePresence, motion, type MotionProps } from "framer-motion"
import { cn } from "../../lib/utils"

export function AnimatedListItem({ children }: { children: React.ReactNode }) {
  const animations: MotionProps = {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1, originY: 0 },
    exit: { scale: 0, opacity: 0 },
    transition: { type: "spring", stiffness: 350, damping: 40 },
  }

  return (
    <motion.div {...animations} layout className="mx-auto w-full">
      {children}
    </motion.div>
  )
}

export interface AnimatedListProps extends ComponentPropsWithoutRef<"div"> {
  children: React.ReactNode
  delay?: number
}

export const AnimatedList = React.memo(
  ({ children, className, delay = 1000, ...props }: AnimatedListProps) => {
    const [index, setIndex] = useState(0)
    const childrenArray = useMemo(
      () => React.Children.toArray(children),
      [children]
    )

    useEffect(() => {
      if (index < childrenArray.length - 1) {
        const timeout = setTimeout(() => {
          setIndex((prevIndex) => (prevIndex + 1) % childrenArray.length)
        }, delay)

        return () => clearTimeout(timeout)
      }
    }, [index, delay, childrenArray.length])

    const itemsToShow = useMemo(() => {
      const result = childrenArray.slice(0, index + 1).reverse()
      return result
    }, [index, childrenArray])

    return (
      <div
        className={cn(`flex flex-col items-center gap-4`, className)}
        {...props}
      >
        <AnimatePresence>
          {itemsToShow.map((item) => (
            <AnimatedListItem key={(item as React.ReactElement).key}>
              {item}
            </AnimatedListItem>
          ))}
        </AnimatePresence>
      </div>
    )
  }
)
AnimatedList.displayName = "AnimatedList"

interface Item {
  avatar: string
  title: string
  subtitle: string
}

let Messages = [
  {
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150&auto=format&fit=crop',
    title: '1. Project Publishing',
    subtitle: 'Registered NGOs submit compliance certificates and milestones.',
  },
  {
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop',
    title: '2. Smart Escrow Funding',
    subtitle: 'Corporate funders lock the project budget into secure milestones.',
  },
  {
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
    title: '3. Real-Time Proof Submission',
    subtitle: 'NGO teams upload invoices, receipts, and geo-tagged media directly.',
  },
  {
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop',
    title: '4. AI & Auditor Verification',
    subtitle: 'AI parses invoices, fraud models check risk, auditors approve releases.',
  },
  {
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150&auto=format&fit=crop',
    title: '5. Instant Release & Progression',
    subtitle: 'Escrow releases funds and automatically unlocks the advance for the next phase.',
  },
]

Messages = Array.from({ length: 2 }, () => Messages).flat()

const Notification = ({ avatar, title, subtitle }: Item) => {
  return (
    <div
      className={cn(
        'relative mx-auto min-h-fit w-full max-w-[600px] cursor-pointer overflow-hidden rounded-2xl p-6',
        'transition-all duration-200 ease-in-out hover:scale-105',
        'bg-white border border-gray-200 shadow-sm',
      )}>
      <div className='flex items-center'>
        <span className='flex-shrink-0 relative'>
          <img
            src={avatar}
            width={60}
            height={60}
            alt='Profile'
            className='rounded-full object-cover'
            style={{ width: 60, height: 60 }}
          />
        </span>
        <div className='ps-6'>
          <h5 className='text-lg font-bold text-gray-900 mb-2' style={{ fontFamily: 'var(--font-heading)' }}>
            {title}
          </h5>
          <p className='text-sm font-medium text-gray-600 line-clamp-2'>
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function AnimatedListDemo() {
  return (
    <div
      className={cn(
        'relative h-[600px] flex items-center w-full flex-col overflow-hidden p-4'
      )}>
      <AnimatedList delay={2500}>
        {Messages.map((item, idx) => (
          <Notification {...item} key={idx} />
        ))}
      </AnimatedList>
      <div className='pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-white to-transparent'></div>
      <div className='pointer-events-none absolute inset-x-0 top-0 h-1/6 bg-gradient-to-b from-white to-transparent'></div>
    </div>
  )
}

"use client";
import { cn } from "@/lib/utils";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconMenu2, IconX } from "@tabler/icons-react";

export interface Links {
  label: string;
  href?: string;
  icon: React.JSX.Element | React.ReactNode;
  onClick?: () => void;
  badge?: string | number;
  active?: boolean;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar();
  return (
    <>
      <motion.div
        className={cn(
          "h-full px-4 py-4 hidden md:flex md:flex-col bg-[#0b0b0e] border-r border-white/10 w-[280px] shrink-0 text-white z-40 transition-colors",
          className
        )}
        animate={{
          width: animate ? (open ? "280px" : "68px") : "280px",
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        {...props}
      >
        {children}
      </motion.div>
    </>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <>
      <div
        className={cn(
          "h-14 px-4 flex flex-row md:hidden items-center justify-between bg-[#0b0b0e] border-b border-white/10 w-full z-40"
        )}
        {...props}
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#9be5ff]">
            Karlos Art
          </span>
        </div>
        <div className="flex justify-end z-20">
          <button
            type="button"
            aria-label="Abrir menu"
            className="p-1 text-neutral-300 hover:text-white cursor-pointer"
            onClick={() => setOpen(!open)}
          >
            <IconMenu2 className="w-5 h-5 text-neutral-200" />
          </button>
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{
                duration: 0.25,
                ease: "easeInOut",
              }}
              className={cn(
                "fixed h-full w-full inset-0 bg-[#070707]/98 backdrop-blur-2xl p-6 z-[100] flex flex-col justify-between border-r border-white/10",
                className
              )}
            >
              <div
                className="absolute right-6 top-6 z-50 text-neutral-300 hover:text-white cursor-pointer p-1"
                onClick={() => setOpen(!open)}
              >
                <IconX className="w-6 h-6" />
              </div>
              <div className="flex flex-col flex-1 overflow-y-auto">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}) => {
  const { open, animate, setOpen } = useSidebar();

  const handleClick = (e: React.MouseEvent) => {
    if (link.onClick) {
      e.preventDefault();
      link.onClick();
      // Em mobile fecha a barra ao clicar
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        setOpen(false);
      }
    }
  };

  const content = (
    <>
      <div className={cn("shrink-0 transition-transform duration-200 group-hover/sidebar:scale-110", link.active ? "text-[#9be5ff]" : "text-neutral-400 group-hover/sidebar:text-white")}>
        {link.icon}
      </div>

      <motion.div
        animate={{
          display: animate ? (open ? "flex" : "none") : "flex",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="flex-1 items-center justify-between overflow-hidden whitespace-nowrap"
      >
        <span
          className={cn(
            "text-xs tracking-wider uppercase font-semibold transition duration-150 inline-block truncate",
            link.active ? "text-[#9be5ff] font-bold" : "text-neutral-300 group-hover/sidebar:text-white"
          )}
        >
          {link.label}
        </span>
        {link.badge !== undefined && (
          <span className="ml-2 px-1.5 py-0.5 text-[9px] font-mono rounded bg-white/10 text-neutral-200">
            {link.badge}
          </span>
        )}
      </motion.div>
    </>
  );

  const containerClasses = cn(
    "flex items-center justify-start gap-3 group/sidebar py-2.5 px-2.5 rounded-sm transition-all duration-150 cursor-pointer border border-transparent",
    link.active
      ? "bg-white/[0.07] border-white/15 text-[#9be5ff] shadow-[0_0_15px_rgba(155,229,255,0.08)]"
      : "hover:bg-white/[0.04] text-neutral-300 hover:text-white",
    className
  );

  if (link.href && !link.onClick) {
    return (
      <a
        href={link.href}
        className={containerClasses}
        {...props}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(containerClasses, "w-full text-left")}
      {...props}
    >
      {content}
    </button>
  );
};

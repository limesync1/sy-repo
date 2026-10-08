import { useEffect, useState } from "react";
import { Toaster as Sonner, toast } from "sonner";
import { useLocation } from "react-router-dom";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const { pathname } = useLocation();
  const driving = pathname.startsWith("/medarbejder/rute/");
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.classList.contains("dark"));
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    sync();
    return () => observer.disconnect();
  }, []);

  return (
    <Sonner
      theme={dark ? "dark" : "light"}
      className="toaster group"
      duration={2500}
      position="bottom-right"
      visibleToasts={driving ? 1 : 3}
      closeButton={driving}
      toastOptions={{
        classNames: {
          // Mere kompakt: mindre padding, smallere tekst, lavere min-højde
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-md group-[.toaster]:rounded-lg group-[.toaster]:py-2 group-[.toaster]:px-3 group-[.toaster]:text-xs group-[.toaster]:min-h-0",
          title: "group-[.toast]:text-xs group-[.toast]:font-medium",
          description: "group-[.toast]:text-xs group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:text-xs group-[.toast]:h-9 group-[.toast]:px-2 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring",
          cancelButton: "group-[.toast]:bg-secondary group-[.toast]:text-secondary-foreground group-[.toast]:text-xs group-[.toast]:h-9 group-[.toast]:px-2 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring",
          closeButton: "group-[.toast]:bg-popover group-[.toast]:text-popover-foreground group-[.toast]:border-border hover:!bg-secondary focus-visible:ring-2 focus-visible:ring-ring",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };

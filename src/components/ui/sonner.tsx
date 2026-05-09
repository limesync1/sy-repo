import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      duration={2500}
      toastOptions={{
        classNames: {
          // Mere kompakt: mindre padding, smallere tekst, lavere min-højde
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-md group-[.toaster]:rounded-lg group-[.toaster]:py-2 group-[.toaster]:px-3 group-[.toaster]:text-xs group-[.toaster]:min-h-0",
          title: "group-[.toast]:text-xs group-[.toast]:font-medium",
          description: "group-[.toast]:text-[11px] group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:text-[11px] group-[.toast]:h-6 group-[.toast]:px-2",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:text-[11px] group-[.toast]:h-6 group-[.toast]:px-2",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };

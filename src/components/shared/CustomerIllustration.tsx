import type { ImgHTMLAttributes } from "react";
import customers from "@/assets/customer-icons/kunder.svg";
import privateCustomer from "@/assets/customer-icons/privat-kunde.svg";
import businessCustomer from "@/assets/customer-icons/virksomhed.svg";
import { cn } from "@/lib/utils";

const CUSTOMER_ILLUSTRATIONS = {
  customers,
  private: privateCustomer,
  business: businessCustomer,
} as const;

export type CustomerIllustrationName = keyof typeof CUSTOMER_ILLUSTRATIONS;

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  name: CustomerIllustrationName;
};

export const CustomerIllustration = ({ name, className, alt = "", ...props }: Props) => (
  <img
    src={CUSTOMER_ILLUSTRATIONS[name]}
    alt={alt}
    aria-hidden={alt ? undefined : true}
    draggable={false}
    className={cn("inline-block shrink-0 select-none object-contain", className)}
    {...props}
  />
);

export default CustomerIllustration;
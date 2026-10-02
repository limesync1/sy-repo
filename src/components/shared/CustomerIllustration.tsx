import type { ImgHTMLAttributes } from "react";
import customersAsset from "@/assets/content-icons/kunder-i-alt.svg.asset.json";
import privateCustomerAsset from "@/assets/content-icons/privatkunder.svg.asset.json";
import businessCustomerAsset from "@/assets/content-icons/erhvervskunder.svg.asset.json";
import { cn } from "@/lib/utils";

const CUSTOMER_ILLUSTRATIONS = {
  customers: customersAsset.url,
  private: privateCustomerAsset.url,
  business: businessCustomerAsset.url,
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
    className={cn("inline-block max-h-full max-w-full shrink-0 select-none object-contain", className)}
    {...props}
  />
);

export default CustomerIllustration;
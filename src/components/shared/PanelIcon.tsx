import type { ComponentType, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

import appointmentsAsset from "@/assets/content-icons/bestillinger.svg.asset.json";
import shareProfileAsset from "@/assets/illustrations/business/del-din-profil.svg";
import settingsAsset from "@/assets/illustrations/business/indstillinger.svg";
import customersAsset from "@/assets/content-icons/kunder-i-alt.svg.asset.json";
import appointmentStartedAsset from "@/assets/panel-icons/marker-aftale-startet.svg.asset.json";
import appointmentCompletedAsset from "@/assets/panel-icons/marker-aftale-udfoert.svg.asset.json";
import employeesAsset from "@/assets/illustrations/business/medarbejdere-team.svg";
import revenueAsset from "@/assets/content-icons/omsaetning.svg.asset.json";
import privateCustomerAsset from "@/assets/content-icons/privatkunder.svg.asset.json";
import accountingAsset from "@/assets/content-icons/regnskabsprogram.svg.asset.json";
import routeAsset from "@/assets/panel-icons/rute.svg.asset.json";
import routeStopsAsset from "@/assets/panel-icons/stops-paa-rute.svg.asset.json";
import addOrderAsset from "@/assets/panel-icons/tilfoej-bestilling.svg.asset.json";
import addCustomerAsset from "@/assets/panel-icons/tilfoej-kunde.svg.asset.json";
import addEmployeeAsset from "@/assets/panel-icons/tilfoej-medarbejder.svg.asset.json";
import addPrivateCustomerAsset from "@/assets/panel-icons/tilfoej-privat-kunde.svg.asset.json";
import addRouteAsset from "@/assets/panel-icons/tilfoej-rute.svg.asset.json";
import addServiceAsset from "@/assets/illustrations/business/tilfoej-service.svg";
import addRouteStopAsset from "@/assets/panel-icons/tilfoej-stop-paa-rute.svg.asset.json";
import addBusinessAsset from "@/assets/panel-icons/tilfoej-virksomhed.svg.asset.json";
import businessAsset from "@/assets/panel-icons/virksomhed.svg.asset.json";
import routeMapAsset from "@/assets/panel-icons/vis-rute-kortvisning.svg.asset.json";
import routeListAsset from "@/assets/panel-icons/vis-rute-listevisning.svg.asset.json";
import routeOverviewAsset from "@/assets/panel-icons/vis-rute-som-kort.svg.asset.json";

export const PANEL_ICON_ASSETS = {
  appointments: appointmentsAsset.url,
  shareProfile: shareProfileAsset,
  settings: settingsAsset,
  customers: customersAsset.url,
  appointmentStarted: appointmentStartedAsset.url,
  appointmentCompleted: appointmentCompletedAsset.url,
  employees: employeesAsset,
  revenue: revenueAsset.url,
  privateCustomer: privateCustomerAsset.url,
  accounting: accountingAsset.url,
  route: routeAsset.url,
  routeStops: routeStopsAsset.url,
  addOrder: addOrderAsset.url,
  addCustomer: addCustomerAsset.url,
  addEmployee: addEmployeeAsset.url,
  addPrivateCustomer: addPrivateCustomerAsset.url,
  addRoute: addRouteAsset.url,
  addService: addServiceAsset,
  addRouteStop: addRouteStopAsset.url,
  addBusiness: addBusinessAsset.url,
  business: businessAsset.url,
  routeMap: routeMapAsset.url,
  routeList: routeListAsset.url,
  routeOverview: routeOverviewAsset.url,
} as const;

export type PanelIconName = keyof typeof PANEL_ICON_ASSETS;

type PanelIconProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  name: PanelIconName;
};

export const PanelIcon = ({ name, className, alt = "", ...props }: PanelIconProps) => (
  <img
    src={PANEL_ICON_ASSETS[name]}
    alt={alt}
    draggable={false}
    className={cn("inline-block max-h-full max-w-full shrink-0 select-none object-contain", className)}
    {...props}
  />
);

/** Adapter til steder, der forventer en ikon-komponent i stedet for et element. */
export const createPanelIcon = (name: PanelIconName): ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }> => {
  const Icon = ({ className }: { className?: string }) => <PanelIcon name={name} className={className} aria-hidden="true" />;
  Icon.displayName = `PanelIcon(${name})`;
  return Icon;
};

export const PanelIcons = {
  Appointments: createPanelIcon("appointments"),
  ShareProfile: createPanelIcon("shareProfile"),
  Settings: createPanelIcon("settings"),
  Customers: createPanelIcon("customers"),
  AppointmentStarted: createPanelIcon("appointmentStarted"),
  AppointmentCompleted: createPanelIcon("appointmentCompleted"),
  Employees: createPanelIcon("employees"),
  Revenue: createPanelIcon("revenue"),
  Accounting: createPanelIcon("accounting"),
  Route: createPanelIcon("route"),
  RouteStops: createPanelIcon("routeStops"),
  Business: createPanelIcon("business"),
  AddOrder: createPanelIcon("addOrder"),
  AddCustomer: createPanelIcon("addCustomer"),
  AddPrivateCustomer: createPanelIcon("addPrivateCustomer"),
  AddEmployee: createPanelIcon("addEmployee"),
  AddRoute: createPanelIcon("addRoute"),
  AddRouteStop: createPanelIcon("addRouteStop"),
  AddService: createPanelIcon("addService"),
  AddBusiness: createPanelIcon("addBusiness"),
  RouteMap: createPanelIcon("routeMap"),
  RouteList: createPanelIcon("routeList"),
  RouteOverview: createPanelIcon("routeOverview"),
} as const;

export default PanelIcon;
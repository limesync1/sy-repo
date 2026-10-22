import type { ComponentType, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

import appointmentsAsset from "@/assets/content-icons/bestillinger.svg.asset.json";
import appointmentViewAsset from "@/assets/content-icons/visning-af-aftale.svg.asset.json";
import guideAsset from "@/assets/content-icons/guide-kom-godt-i-gang.svg.asset.json";
import shareProfileAsset from "@/assets/content-icons/del-din-profil.svg.asset.json";
import settingsAsset from "@/assets/content-icons/indstillinger.svg.asset.json";
import customersAsset from "@/assets/content-icons/kunder-i-alt.svg.asset.json";
import appointmentStartedAsset from "@/assets/panel-icons/marker-aftale-startet.svg.asset.json";
import appointmentCompletedAsset from "@/assets/panel-icons/marker-aftale-udfoert.svg.asset.json";
import employeesAsset from "@/assets/content-icons/medarbejdere.svg.asset.json";
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
import addServiceAsset from "@/assets/content-icons/tilfoej-service.svg.asset.json";
import addRouteStopAsset from "@/assets/panel-icons/tilfoej-stop-paa-rute.svg.asset.json";
import addBusinessAsset from "@/assets/panel-icons/tilfoej-virksomhed.svg.asset.json";
import businessAsset from "@/assets/panel-icons/virksomhed.svg.asset.json";
import optimizeDayAsset from "@/assets/content-icons/optimer-dagen.svg.asset.json";
import optimizeRouteAsset from "@/assets/content-icons/optimer-rute.svg.asset.json";
import editProfileAsset from "@/assets/content-icons/rediger-profil.svg.asset.json";
import routeMapAsset from "@/assets/panel-icons/vis-rute-kortvisning.svg.asset.json";
import routeListAsset from "@/assets/panel-icons/vis-rute-listevisning.svg.asset.json";
import routeOverviewAsset from "@/assets/panel-icons/vis-rute-som-kort.svg.asset.json";
import dayOverviewAsset from "@/assets/content-icons/vis-hele-dagen.svg.asset.json";
import shortcutsAsset from "@/assets/content-icons/tastaturgenveje.svg.asset.json";
import sickLeaveAsset from "@/assets/content-icons/meld-medarbejder-syg.svg.asset.json";
import forbindRegnskabAsset from "@/assets/content-icons/forbind-regnskabsprogram.svg.asset.json";

export const PANEL_ICON_ASSETS = {
  dayOverview: dayOverviewAsset.url,
  shortcuts: shortcutsAsset.url,
  sickLeave: sickLeaveAsset.url,
  connectAccounting: forbindRegnskabAsset.url,
  appointments: appointmentsAsset.url,
  appointmentView: appointmentViewAsset.url,
  guide: guideAsset.url,
  shareProfile: shareProfileAsset.url,
  editProfile: editProfileAsset.url,
  optimizeDay: optimizeDayAsset.url,
  optimizeRoute: optimizeRouteAsset.url,
  settings: settingsAsset.url,
  customers: customersAsset.url,
  appointmentStarted: appointmentStartedAsset.url,
  appointmentCompleted: appointmentCompletedAsset.url,
  employees: employeesAsset.url,
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
  addService: addServiceAsset.url,
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
  AppointmentView: createPanelIcon("appointmentView"),
  ShareProfile: createPanelIcon("shareProfile"),
  EditProfile: createPanelIcon("editProfile"),
  OptimizeDay: createPanelIcon("optimizeDay"),
  OptimizeRoute: createPanelIcon("optimizeRoute"),
  Settings: createPanelIcon("settings"),
  Customers: createPanelIcon("customers"),
  AppointmentStarted: createPanelIcon("appointmentStarted"),
  AppointmentCompleted: createPanelIcon("appointmentCompleted"),
  Employees: createPanelIcon("employees"),
  Revenue: createPanelIcon("revenue"),
  Accounting: createPanelIcon("accounting"),
  ConnectAccounting: createPanelIcon("connectAccounting"),
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
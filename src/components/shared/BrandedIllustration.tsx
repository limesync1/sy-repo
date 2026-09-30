import type { ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

import searchService from "@/assets/illustrations/home/soeg-efter-service.svg.asset.json";
import compareProviders from "@/assets/illustrations/home/sammenlign-udbydere.svg.asset.json";
import bookOrQuote from "@/assets/illustrations/home/book-eller-hent-tilbud.svg.asset.json";
import localEasy from "@/assets/illustrations/home/lokalt-skal-vaere-let.svg.asset.json";
import fairBusinesses from "@/assets/illustrations/home/fair-for-virksomhederne.svg.asset.json";
import humanHelp from "@/assets/illustrations/home/menneske-naar-du-har-brug-for-det.svg.asset.json";
import localCustomers from "@/assets/illustrations/home/flere-kunder-i-dit-omraade.svg.asset.json";
import routePlanning from "@/assets/illustrations/home/ruteplanlaegning-inkluderet.svg.asset.json";
import priceCalculator from "@/assets/illustrations/home/indbygget-prisberegner.svg.asset.json";

import shareProfile from "@/assets/illustrations/business/del-din-profil.svg.asset.json";
import addService from "@/assets/illustrations/business/tilfoej-service.svg.asset.json";
import team from "@/assets/illustrations/business/medarbejdere-team.svg.asset.json";
import settings from "@/assets/illustrations/business/indstillinger.svg.asset.json";
import servicesTotal from "@/assets/illustrations/business/services-i-alt.svg.asset.json";
import activeServices from "@/assets/illustrations/business/aktive-services.svg.asset.json";
import orders from "@/assets/illustrations/business/bestillinger.svg.asset.json";
import calendarWeek from "@/assets/illustrations/business/kalender-uge.svg.asset.json";
import calendarMonth from "@/assets/illustrations/business/kalender-maaned.svg.asset.json";
import averageOrder from "@/assets/illustrations/business/snit-pr-aftale.svg.asset.json";
import activeEmployee from "@/assets/illustrations/business/aktiv-medarbejder.svg.asset.json";
import pendingLogin from "@/assets/illustrations/business/afventer-foerste-login.svg.asset.json";
import payroll from "@/assets/illustrations/business/provision-loen.svg.asset.json";
import revenue from "@/assets/illustrations/business/samlet-omsaetning.svg.asset.json";
import reviewCount from "@/assets/illustrations/business/antal-anmeldelser.svg.asset.json";
import reviewAverage from "@/assets/illustrations/business/gennemsnit-stjerne.svg.asset.json";
import verifiedReviews from "@/assets/illustrations/business/verificerede-anmeldelser.svg.asset.json";

import routeReady from "@/assets/illustrations/employee/rute-klar-til-start.svg.asset.json";
import routeDone from "@/assets/illustrations/employee/udfoert-rute.svg.asset.json";
import chooseRouteMode from "@/assets/illustrations/employee/hvordan-vil-du-koere-ruten.svg.asset.json";
import checklist from "@/assets/illustrations/employee/tjekliste.svg.asset.json";
import drivingGuide from "@/assets/illustrations/employee/koerselsguide.svg.asset.json";
import startAppointment from "@/assets/illustrations/employee/start-aftale.svg.asset.json";
import driveGoogleMaps from "@/assets/illustrations/employee/koer-dertil-google-maps.svg.asset.json";
import earnings from "@/assets/illustrations/employee/min-indtjening.svg.asset.json";
import dailyActivity from "@/assets/illustrations/employee/daglig-aktivitet.svg.asset.json";
import employeeRoutes from "@/assets/illustrations/employee/ruter.svg.asset.json";
import employeeAppointments from "@/assets/illustrations/employee/aftaler.svg.asset.json";
import workdays from "@/assets/illustrations/employee/arbejdsdage.svg.asset.json";
import worktime from "@/assets/illustrations/employee/arbejdstid.svg.asset.json";
import dailyActivityTable from "@/assets/illustrations/employee/daglig-aktivitet-tabel.svg.asset.json";

export const BRANDED_ILLUSTRATIONS = {
  searchService: searchService.url,
  compareProviders: compareProviders.url,
  bookOrQuote: bookOrQuote.url,
  localEasy: localEasy.url,
  fairBusinesses: fairBusinesses.url,
  humanHelp: humanHelp.url,
  localCustomers: localCustomers.url,
  routePlanning: routePlanning.url,
  priceCalculator: priceCalculator.url,
  shareProfile: shareProfile.url,
  addService: addService.url,
  team: team.url,
  settings: settings.url,
  servicesTotal: servicesTotal.url,
  activeServices: activeServices.url,
  orders: orders.url,
  calendarWeek: calendarWeek.url,
  calendarMonth: calendarMonth.url,
  averageOrder: averageOrder.url,
  activeEmployee: activeEmployee.url,
  pendingLogin: pendingLogin.url,
  payroll: payroll.url,
  revenue: revenue.url,
  reviewCount: reviewCount.url,
  reviewAverage: reviewAverage.url,
  verifiedReviews: verifiedReviews.url,
  routeReady: routeReady.url,
  routeDone: routeDone.url,
  chooseRouteMode: chooseRouteMode.url,
  checklist: checklist.url,
  drivingGuide: drivingGuide.url,
  startAppointment: startAppointment.url,
  driveGoogleMaps: driveGoogleMaps.url,
  earnings: earnings.url,
  dailyActivity: dailyActivity.url,
  employeeRoutes: employeeRoutes.url,
  employeeAppointments: employeeAppointments.url,
  workdays: workdays.url,
  worktime: worktime.url,
  dailyActivityTable: dailyActivityTable.url,
} as const;

export type BrandedIllustrationName = keyof typeof BRANDED_ILLUSTRATIONS;

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  name: BrandedIllustrationName;
};

export const BrandedIllustration = ({ name, className, alt = "", ...props }: Props) => (
  <img
    src={BRANDED_ILLUSTRATIONS[name]}
    alt={alt}
    aria-hidden={alt ? undefined : true}
    draggable={false}
    className={cn("inline-block shrink-0 select-none object-contain", className)}
    {...props}
  />
);

export default BrandedIllustration;
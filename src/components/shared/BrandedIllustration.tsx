import type { ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

import searchService from "@/assets/illustrations/home/soeg-efter-service.svg";
import compareProviders from "@/assets/illustrations/home/sammenlign-udbydere.svg";
import bookOrQuote from "@/assets/illustrations/home/book-eller-hent-tilbud.svg";
import localEasy from "@/assets/illustrations/home/lokalt-skal-vaere-let.svg";
import fairBusinesses from "@/assets/illustrations/home/fair-for-virksomhederne.svg";
import humanHelp from "@/assets/illustrations/home/menneske-naar-du-har-brug-for-det.svg";
import localCustomers from "@/assets/illustrations/home/flere-kunder-i-dit-omraade.svg";
import routePlanning from "@/assets/illustrations/home/ruteplanlaegning-inkluderet.svg";
import priceCalculator from "@/assets/illustrations/home/indbygget-prisberegner.svg";

import shareProfile from "@/assets/illustrations/business/del-din-profil.svg";
import addService from "@/assets/illustrations/business/tilfoej-service.svg";
import team from "@/assets/illustrations/business/medarbejdere-team.svg";
import settings from "@/assets/illustrations/business/indstillinger.svg";
import servicesTotal from "@/assets/illustrations/business/services-i-alt.svg";
import activeServices from "@/assets/illustrations/business/aktive-services.svg";
import orders from "@/assets/illustrations/business/bestillinger.svg";
import calendarWeek from "@/assets/illustrations/business/kalender-uge.svg";
import calendarMonth from "@/assets/illustrations/business/kalender-maaned.svg";
import averageOrder from "@/assets/illustrations/business/snit-pr-aftale.svg";
import activeEmployee from "@/assets/illustrations/business/aktiv-medarbejder.svg";
import pendingLogin from "@/assets/illustrations/business/afventer-foerste-login.svg";
import payroll from "@/assets/illustrations/business/provision-loen.svg";
import revenue from "@/assets/illustrations/business/samlet-omsaetning.svg";
import reviewCount from "@/assets/illustrations/business/antal-anmeldelser.svg";
import reviewAverage from "@/assets/illustrations/business/gennemsnit-stjerne.svg";
import verifiedReviews from "@/assets/illustrations/business/verificerede-anmeldelser.svg";

import routeReady from "@/assets/illustrations/employee/rute-klar-til-start.svg";
import routeDone from "@/assets/illustrations/employee/udfoert-rute.svg";
import chooseRouteMode from "@/assets/illustrations/employee/hvordan-vil-du-koere-ruten.svg";
import checklist from "@/assets/illustrations/employee/tjekliste.svg";
import drivingGuide from "@/assets/illustrations/employee/koerselsguide.svg";
import startAppointment from "@/assets/illustrations/employee/start-aftale.svg";
import driveGoogleMaps from "@/assets/illustrations/employee/koer-dertil-google-maps.svg";
import earnings from "@/assets/illustrations/employee/min-indtjening.svg";
import dailyActivity from "@/assets/illustrations/employee/daglig-aktivitet.svg";
import employeeRoutes from "@/assets/illustrations/employee/ruter.svg";
import employeeAppointments from "@/assets/illustrations/employee/aftaler.svg";
import workdays from "@/assets/illustrations/employee/arbejdsdage.svg";
import worktime from "@/assets/illustrations/employee/arbejdstid.svg";
import dailyActivityTable from "@/assets/illustrations/employee/daglig-aktivitet-tabel.svg";

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
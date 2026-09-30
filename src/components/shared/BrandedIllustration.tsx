import type { ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

import searchServiceAsset from "@/assets/section-icons/forside/soeg-efter-en-service.svg.asset.json";
import compareProvidersAsset from "@/assets/section-icons/forside/sammenlign-udbydere.svg.asset.json";
import bookOrQuoteAsset from "@/assets/section-icons/forside/book-eller-hent-tilbud.svg.asset.json";
import localEasyAsset from "@/assets/section-icons/forside/lokalt-er-let.svg.asset.json";
import fairBusinessesAsset from "@/assets/section-icons/forside/fair-for-virksomhederne.svg.asset.json";
import humanHelpAsset from "@/assets/section-icons/forside/et-menneske-naar-du-har-brug-for-det.svg.asset.json";
import localCustomersAsset from "@/assets/section-icons/forside/flere-kunder-i-dit-omraade.svg.asset.json";
import routePlanningAsset from "@/assets/section-icons/forside/ruteplanlaegning-inkluderet.svg.asset.json";
import priceCalculatorAsset from "@/assets/section-icons/forside/indbygget-prisberegner.svg.asset.json";

import systemRoutePlannerAsset from "@/assets/section-icons/systemet/ruteplanlaegger.svg.asset.json";
import systemEmployeeAppAsset from "@/assets/section-icons/systemet/medarbejder-app.svg.asset.json";
import systemBookingAsset from "@/assets/section-icons/systemet/booking-og-tilbud.svg.asset.json";
import systemAccountingAsset from "@/assets/section-icons/systemet/fakturering-og-regnskab.svg.asset.json";
import systemPeopleAsset from "@/assets/section-icons/systemet/kunder-og-medarbejdere.svg.asset.json";
import systemIndustriesAsset from "@/assets/section-icons/systemet/brancher.svg.asset.json";

import signupAccountingAsset from "@/assets/section-icons/opret-virksomhed/regnskabsintegration.svg.asset.json";
import signupLeadsAsset from "@/assets/section-icons/opret-virksomhed/leads.svg.asset.json";
import signupLivechatAsset from "@/assets/section-icons/opret-virksomhed/livechat.svg.asset.json";
import freePrivateAsset from "@/assets/section-icons/opret-virksomhed/gratis-for-private.svg.asset.json";
import checkedBusinessesAsset from "@/assets/section-icons/opret-virksomhed/tjekkede-virksomheder.svg.asset.json";
import realReviewsAsset from "@/assets/section-icons/opret-virksomhed/anmeldelser-fra-rigtige-opgaver.svg.asset.json";
import compareQuicklyAsset from "@/assets/section-icons/opret-virksomhed/sammenlign-paa-sekunder.svg.asset.json";

import unassignedAppointmentsAsset from "@/assets/section-icons/virksomhed-ruter/aftaler-uden-rute.svg.asset.json";
import economicIntegrationAsset from "@/assets/section-icons/virksomhed-regnskab/e-conomic-integration.svg.asset.json";
import dineroIntegrationAsset from "@/assets/section-icons/virksomhed-regnskab/dinero-integration.svg.asset.json";
import helpFindProviderAsset from "@/assets/section-icons/hjaelp/find-en-serviceudbyder.svg.asset.json";
import helpQuotesAsset from "@/assets/section-icons/hjaelp/indhent-3-tilbud.svg.asset.json";
import helpBecomeProviderAsset from "@/assets/section-icons/hjaelp/bliv-udbyder.svg.asset.json";
import helpGuidesAsset from "@/assets/section-icons/hjaelp/guides-og-priser.svg.asset.json";

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
  searchService: searchServiceAsset.url,
  compareProviders: compareProvidersAsset.url,
  bookOrQuote: bookOrQuoteAsset.url,
  localEasy: localEasyAsset.url,
  fairBusinesses: fairBusinessesAsset.url,
  humanHelp: humanHelpAsset.url,
  localCustomers: localCustomersAsset.url,
  routePlanning: routePlanningAsset.url,
  priceCalculator: priceCalculatorAsset.url,
  systemRoutePlanner: systemRoutePlannerAsset.url,
  systemEmployeeApp: systemEmployeeAppAsset.url,
  systemBooking: systemBookingAsset.url,
  systemAccounting: systemAccountingAsset.url,
  systemPeople: systemPeopleAsset.url,
  systemIndustries: systemIndustriesAsset.url,
  signupAccounting: signupAccountingAsset.url,
  signupLeads: signupLeadsAsset.url,
  signupLivechat: signupLivechatAsset.url,
  freePrivate: freePrivateAsset.url,
  checkedBusinesses: checkedBusinessesAsset.url,
  realReviews: realReviewsAsset.url,
  compareQuickly: compareQuicklyAsset.url,
  unassignedAppointments: unassignedAppointmentsAsset.url,
  economicIntegration: economicIntegrationAsset.url,
  dineroIntegration: dineroIntegrationAsset.url,
  helpFindProvider: helpFindProviderAsset.url,
  helpQuotes: helpQuotesAsset.url,
  helpBecomeProvider: helpBecomeProviderAsset.url,
  helpGuides: helpGuidesAsset.url,
  shareProfile: shareProfile,
  addService: addService,
  team: team,
  settings: settings,
  servicesTotal: servicesTotal,
  activeServices: activeServices,
  orders: orders,
  calendarWeek: calendarWeek,
  calendarMonth: calendarMonth,
  averageOrder: averageOrder,
  activeEmployee: activeEmployee,
  pendingLogin: pendingLogin,
  payroll: payroll,
  revenue: revenue,
  reviewCount: reviewCount,
  reviewAverage: reviewAverage,
  verifiedReviews: verifiedReviews,
  routeReady: routeReady,
  routeDone: routeDone,
  chooseRouteMode: chooseRouteMode,
  checklist: checklist,
  drivingGuide: drivingGuide,
  startAppointment: startAppointment,
  driveGoogleMaps: driveGoogleMaps,
  earnings: earnings,
  dailyActivity: dailyActivity,
  employeeRoutes: employeeRoutes,
  employeeAppointments: employeeAppointments,
  workdays: workdays,
  worktime: worktime,
  dailyActivityTable: dailyActivityTable,
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
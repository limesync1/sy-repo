import { forwardRef, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import searchServiceNew from "@/assets/content-icons/soeg-efter-service.svg.asset.json";
import compareProvidersNew from "@/assets/content-icons/sammenlign-udbydere.svg.asset.json";
import bookOrQuoteNew from "@/assets/content-icons/book-eller-hent-tilbud.svg.asset.json";
import localEasyNew from "@/assets/content-icons/lokalt-skal-vaere-let.svg.asset.json";
import fairBusinessesNew from "@/assets/content-icons/fair-for-virksomhederne.svg.asset.json";
import humanHelpNew from "@/assets/content-icons/et-menneske-naar-du-har-brug-for-det.svg.asset.json";
import localCustomersNew from "@/assets/content-icons/flere-kunder-i-dit-omraade.svg.asset.json";
import routePlanningNew from "@/assets/content-icons/ruteplanlaegning-inkluderet.svg.asset.json";
import priceCalculatorNew from "@/assets/content-icons/indbygget-prisberegner.svg.asset.json";
import routePlannerNew from "@/assets/content-icons/ruteplanlaegger.svg.asset.json";
import employeeAppNew from "@/assets/content-icons/medarbejder-app.svg.asset.json";
import bookingsNew from "@/assets/content-icons/bestillinger.svg.asset.json";
import accountingNew from "@/assets/content-icons/fakturering-og-regnskab.svg.asset.json";
import employeesNew from "@/assets/content-icons/medarbejdere.svg.asset.json";
import industriesNew from "@/assets/content-icons/brancher.svg.asset.json";
import signupAccountingNew from "@/assets/content-icons/regnskabsintegration.svg.asset.json";
import signupLeadsNew from "@/assets/content-icons/leads-indhent-tilbud.svg.asset.json";
import signupLivechatNew from "@/assets/content-icons/livechat.svg.asset.json";
import freePrivateNew from "@/assets/content-icons/gratis-for-private.svg.asset.json";
import checkedBusinessesNew from "@/assets/content-icons/tjekkede-virksomheder.svg.asset.json";
import realReviewsNew from "@/assets/content-icons/anmeldelser-fra-rigtige-opgaver.svg.asset.json";
import compareQuicklyNew from "@/assets/content-icons/sammenlign-paa-sekunder.svg.asset.json";
import shareProfileNew from "@/assets/content-icons/del-din-profil.svg.asset.json";
import addServiceNew from "@/assets/content-icons/tilfoej-service.svg.asset.json";
import settingsNew from "@/assets/content-icons/indstillinger.svg.asset.json";
import servicesTotalNew from "@/assets/content-icons/services-i-alt.svg.asset.json";
import activeServicesNew from "@/assets/content-icons/aktive-services.svg.asset.json";
import activeEmployeeNew from "@/assets/content-icons/medarbejder-aktiv.svg.asset.json";
import pendingLoginNew from "@/assets/content-icons/afventer-login.svg.asset.json";
import payrollNew from "@/assets/content-icons/provision.svg.asset.json";
import revenueNew from "@/assets/content-icons/omsaetning.svg.asset.json";
import reviewCountNew from "@/assets/content-icons/anmeldelser-i-alt.svg.asset.json";
import reviewAverageNew from "@/assets/content-icons/gennemsnit.svg.asset.json";
import verifiedReviewsNew from "@/assets/content-icons/verificerede.svg.asset.json";
import activeLeadsNew from "@/assets/content-icons/aktive-leads.svg.asset.json";
import activeConversationsNew from "@/assets/content-icons/aktive-samtaler.svg.asset.json";
import satisfactionNew from "@/assets/content-icons/kundetilfredshed.svg.asset.json";
import responseTimeNew from "@/assets/content-icons/svartid.svg.asset.json";
import unansweredNew from "@/assets/content-icons/ubesvarede-beskeder.svg.asset.json";
import describeTaskNew from "@/assets/content-icons/beskriv-opgaven.svg.asset.json";
import matchNew from "@/assets/content-icons/vi-matcher.svg?url";
import averageNew from "@/assets/content-icons/gennemsnit.svg.asset.json";
import averageResponseNew from "@/assets/content-icons/gennemsnitlig-svartid.svg.asset.json";
import businessCustomersNew from "@/assets/content-icons/erhvervskunder.svg.asset.json";
import privateCustomersNew from "@/assets/content-icons/privatkunder.svg.asset.json";
import customersTotalNew from "@/assets/content-icons/kunder-i-alt.svg.asset.json";
import cvrCheckedNew from "@/assets/content-icons/cvr-tjekket.svg.asset.json";
import directNew from "@/assets/content-icons/direkte.svg.asset.json";
import emailNew from "@/assets/content-icons/email.svg.asset.json";
import freeNew from "@/assets/content-icons/gratis.svg.asset.json";
import areaNew from "@/assets/content-icons/omraade.svg.asset.json";
import platformNew from "@/assets/content-icons/platform.svg.asset.json";
import profileNew from "@/assets/content-icons/profil.svg.asset.json";
import accountNew from "@/assets/content-icons/konto.svg.asset.json";
import messagesNew from "@/assets/content-icons/beskeder.svg.asset.json";
import editRouteNew from "@/assets/content-icons/rediger-rute.svg.asset.json";
import accountingProgramNew from "@/assets/content-icons/regnskabsprogram.svg.asset.json";
import howItWorksNew from "@/assets/content-icons/saadan-fungerer-det.svg.asset.json";
import independentNew from "@/assets/content-icons/uafhaengig-platform.svg.asset.json";
import verifiedProviderNew from "@/assets/content-icons/verificeret-udbyder.svg.asset.json";

import unassignedAppointmentsAsset from "@/assets/section-icons/virksomhed-ruter/aftaler-uden-rute.svg";
import economicIntegrationAsset from "@/assets/section-icons/virksomhed-regnskab/e-conomic-integration.svg?inline";
import dineroIntegrationAsset from "@/assets/section-icons/virksomhed-regnskab/dinero-integration.svg?inline";
import helpFindProviderAsset from "@/assets/section-icons/hjaelp/find-en-serviceudbyder.svg";
import helpQuotesAsset from "@/assets/section-icons/hjaelp/indhent-3-tilbud.svg";
import helpBecomeProviderAsset from "@/assets/section-icons/hjaelp/bliv-udbyder.svg";
import helpGuidesAsset from "@/assets/section-icons/hjaelp/guides-og-priser.svg";

import routeReady from "@/assets/illustrations/employee/rute-klar-til-start.svg";
import routeDone from "@/assets/illustrations/employee/udfoert-rute.svg";
import chooseRouteMode from "@/assets/illustrations/employee/hvordan-vil-du-koere-ruten.svg";
import checklist from "@/assets/illustrations/employee/tjekliste.svg";
import drivingGuide from "@/assets/illustrations/employee/koerselsguide.svg";
import startAppointment from "@/assets/illustrations/employee/start-aftale.svg";
import driveGoogleMaps from "@/assets/illustrations/employee/koer-dertil-google-maps.svg";
import dailyActivity from "@/assets/illustrations/employee/daglig-aktivitet.svg";
import employeeRoutes from "@/assets/illustrations/employee/ruter.svg";
import employeeAppointments from "@/assets/illustrations/employee/aftaler.svg";
import workdays from "@/assets/illustrations/employee/arbejdsdage.svg";
import worktime from "@/assets/illustrations/employee/arbejdstid.svg";
import dailyActivityTable from "@/assets/illustrations/employee/daglig-aktivitet-tabel.svg";
import buildFromScratchAsset from "@/assets/panel-illustrations/byg-fra-bunden.svg.asset.json";
import conversionAsset from "@/assets/panel-illustrations/konvertering.svg.asset.json";
import aiCalculatorAsset from "@/assets/panel-illustrations/lad-ai-bygge-prisberegneren.svg.asset.json";
import calculatorAsset from "@/assets/panel-illustrations/prisberegner.svg.asset.json";
import fixedPriceAsset from "@/assets/panel-illustrations/specifik-pris.svg.asset.json";
import payoutAsset from "@/assets/panel-illustrations/til-udbetaling.svg.asset.json";
import hourlyPriceAsset from "@/assets/panel-illustrations/timepris.svg.asset.json";
import startDayIllustration from "@/assets/panel-illustrations/start-dagen.svg.asset.json";
import dayInProgressIllustration from "@/assets/panel-illustrations/arbejdsdag-i-gang.svg.asset.json";
import dayEndedIllustration from "@/assets/panel-illustrations/dagen-afsluttet.svg.asset.json";
import restartDayIllustration from "@/assets/panel-illustrations/genopstart-dagen.svg.asset.json";

export const BRANDED_ILLUSTRATIONS = {
  searchService: searchServiceNew.url,
  compareProviders: compareProvidersNew.url,
  bookOrQuote: bookOrQuoteNew.url,
  localEasy: localEasyNew.url,
  fairBusinesses: fairBusinessesNew.url,
  humanHelp: humanHelpNew.url,
  localCustomers: localCustomersNew.url,
  routePlanning: routePlanningNew.url,
  priceCalculator: priceCalculatorNew.url,
  systemRoutePlanner: routePlannerNew.url,
  systemEmployeeApp: employeeAppNew.url,
  systemBooking: bookingsNew.url,
  systemAccounting: accountingNew.url,
  systemPeople: employeesNew.url,
  systemIndustries: industriesNew.url,
  signupAccounting: signupAccountingNew.url,
  signupLeads: signupLeadsNew.url,
  signupLivechat: signupLivechatNew.url,
  freePrivate: freePrivateNew.url,
  checkedBusinesses: checkedBusinessesNew.url,
  realReviews: realReviewsNew.url,
  compareQuickly: compareQuicklyNew.url,
  unassignedAppointments: unassignedAppointmentsAsset,
  economicIntegration: economicIntegrationAsset,
  dineroIntegration: dineroIntegrationAsset,
  helpFindProvider: helpFindProviderAsset,
  helpQuotes: helpQuotesAsset,
  helpBecomeProvider: helpBecomeProviderAsset,
  helpGuides: helpGuidesAsset,
  shareProfile: shareProfileNew.url,
  addService: addServiceNew.url,
  team: employeesNew.url,
  settings: settingsNew.url,
  servicesTotal: servicesTotalNew.url,
  activeServices: activeServicesNew.url,
  orders: bookingsNew.url,
  calendarWeek: bookingsNew.url,
  calendarMonth: bookingsNew.url,
  averageOrder: averageNew.url,
  activeEmployee: activeEmployeeNew.url,
  pendingLogin: pendingLoginNew.url,
  payroll: payrollNew.url,
  revenue: revenueNew.url,
  reviewCount: reviewCountNew.url,
  reviewAverage: reviewAverageNew.url,
  verifiedReviews: verifiedReviewsNew.url,
  routeReady: routeReady,
  routeDone: routeDone,
  chooseRouteMode: chooseRouteMode,
  checklist: checklist,
  drivingGuide: drivingGuide,
  startAppointment: startAppointment,
  driveGoogleMaps: driveGoogleMaps,
  earnings: revenueNew.url,
  dailyActivity: dailyActivity,
  employeeRoutes: routePlannerNew.url,
  employeeAppointments: bookingsNew.url,
  workdays: workdays,
  worktime: worktime,
  dailyActivityTable: dailyActivityTable,
  activeLeads: activeLeadsNew.url,
  activeConversations: activeConversationsNew.url,
  buildFromScratch: buildFromScratchAsset.url,
  conversion: conversionAsset.url,
  customerSatisfaction: satisfactionNew.url,
  aiCalculator: aiCalculatorAsset.url,
  calculator: calculatorAsset.url,
  fixedPrice: fixedPriceAsset.url,
  responseTime: responseTimeNew.url,
  averageResponseTime: averageResponseNew.url,
  describeTask: describeTaskNew.url,
  match: matchNew.url,
  businessCustomers: businessCustomersNew.url,
  privateCustomers: privateCustomersNew.url,
  customersTotal: customersTotalNew.url,
  cvrChecked: cvrCheckedNew.url,
  direct: directNew.url,
  email: emailNew.url,
  free: freeNew.url,
  area: areaNew.url,
  platform: platformNew.url,
  profile: profileNew.url,
  account: accountNew.url,
  messages: messagesNew.url,
  editRoute: editRouteNew.url,
  accountingProgram: accountingProgramNew.url,
  howItWorks: howItWorksNew.url,
  independent: independentNew.url,
  verifiedProvider: verifiedProviderNew.url,
  payout: payoutAsset.url,
  hourlyPrice: hourlyPriceAsset.url,
  unansweredMessages: unansweredNew.url,
  startDay: startDayIllustration.url,
  dayInProgress: dayInProgressIllustration.url,
  dayEnded: dayEndedIllustration.url,
  restartDay: restartDayIllustration.url,
} as const;

export type BrandedIllustrationName = keyof typeof BRANDED_ILLUSTRATIONS;

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  name: BrandedIllustrationName;
};

export const BrandedIllustration = forwardRef<HTMLImageElement, Props>(({ name, className, alt = "", ...props }, ref) => (
  <img
    ref={ref}
    src={BRANDED_ILLUSTRATIONS[name]}
    alt={alt}
    aria-hidden={alt ? undefined : true}
    draggable={false}
    loading="eager"
    decoding="sync"
    className={cn("inline-block max-h-full max-w-full shrink-0 select-none object-contain", className)}
    {...props}
  />
));

BrandedIllustration.displayName = "BrandedIllustration";

export default BrandedIllustration;
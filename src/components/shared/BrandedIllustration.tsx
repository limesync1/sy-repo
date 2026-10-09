import { forwardRef, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import searchServiceNew from "@/assets/content-icons/soeg-efter-service-animated-v2.svg.asset.json";
import compareProvidersNew from "@/assets/content-icons/sammenlign-udbydere-animated-v2.svg.asset.json";
import bookOrQuoteNew from "@/assets/content-icons/book-eller-hent-tilbud-animated-v2.svg.asset.json";
import localEasyNew from "@/assets/content-icons/lokalt-skal-vaere-let-animated-v2.svg.asset.json";
import fairBusinessesNew from "@/assets/content-icons/fair-for-virksomhederne-animated-v2.svg.asset.json";
import humanHelpNew from "@/assets/content-icons/et-menneske-naar-du-har-brug-for-det-animated-v2.svg.asset.json";
import localCustomersNew from "@/assets/content-icons/flere-kunder-animated.svg.asset.json";
import routePlanningNew from "@/assets/content-icons/ruteplanlaegning-animated.svg.asset.json";
import priceCalculatorNew from "@/assets/content-icons/prisberegner-animated.svg.asset.json";
import notFoundNew from "@/assets/content-icons/404-animated.svg.asset.json";
import routePlannerNew from "@/assets/content-icons/ruteplanlaegger.svg.asset.json";
import employeeAppNew from "@/assets/content-icons/medarbejder-app.svg.asset.json";
import bookingsNew from "@/assets/content-icons/bestillinger.svg.asset.json";
import accountingNew from "@/assets/content-icons/fakturering-og-regnskab.svg.asset.json";
import employeesNew from "@/assets/content-icons/medarbejdere.svg.asset.json";
import industriesNew from "@/assets/content-icons/brancher.svg.asset.json";
import signupAccountingNew from "@/assets/content-icons/regnskabsintegration.svg.asset.json";
import signupLeadsNew from "@/assets/content-icons/leads-indhent-tilbud.svg.asset.json";
import signupLivechatNew from "@/assets/content-icons/livechat.svg.asset.json";
import freePrivateNew from "@/assets/content-icons/gratis-for-private-animated-v2.svg.asset.json";
import checkedBusinessesNew from "@/assets/content-icons/tjekkede-virksomheder-animated-v2.svg.asset.json";
import realReviewsNew from "@/assets/content-icons/anmeldelser-fra-rigtige-opgaver-animated-v2.svg.asset.json";
import compareQuicklyNew from "@/assets/content-icons/sammenlign-paa-sekunder-animated-v2.svg.asset.json";
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
import fairPricesNew from "@/assets/content-icons/fair-priser.svg.asset.json";
import noMatchesNew from "@/assets/content-icons/ingen-virksomheder-matcher-animated.svg.asset.json";
import matchingLoaderNew from "@/assets/content-icons/loader-matches.svg.asset.json";
import localRootsNew from "@/assets/content-icons/lokal-forankring.svg.asset.json";
import plannedMonthNew from "@/assets/content-icons/planlagt-denne-maaned.svg.asset.json";
import plannedWeekNew from "@/assets/content-icons/planlagt-denne-uge.svg.asset.json";
import averageAppointmentNew from "@/assets/content-icons/snit-pr-aftale-maaned.svg.asset.json";
import accountingProgramChoiceNew from "@/assets/content-icons/vaelg-dit-regnskabsprogram.svg.asset.json";
import unassignedAppointmentsNew from "@/assets/content-icons/aftaler-uden-rute-2026.svg.asset.json";
import customerServiceNew from "@/assets/content-icons/kundeservice-ikon-2026.svg.asset.json";
import payoutNew from "@/assets/content-icons/til-udbetaling.svg.asset.json";
import appointmentCompletedNew from "@/assets/panel-icons/marker-aftale-udfoert.svg.asset.json";

import economicIntegrationAsset from "@/assets/section-icons/virksomhed-regnskab/e-conomic-integration.svg?inline";
import dineroIntegrationAsset from "@/assets/section-icons/virksomhed-regnskab/dinero-integration.svg?inline";
import helpFindProviderAsset from "@/assets/help-center/find-en-serviceyder.webp.asset.json";
import helpQuotesAsset from "@/assets/help-center/indhent-3-tilbud.webp.asset.json";
import helpBecomeProviderAsset from "@/assets/help-center/bliv-udbyder.webp.asset.json";
import helpGuidesAsset from "@/assets/help-center/guides-og-priser.webp.asset.json";

import routeReady from "@/assets/illustrations/employee/start-rute.svg.asset.json";
import noItems from "@/assets/content-icons/ingen-emner-generel.svg.asset.json";
import routeDone from "@/assets/content-icons/ruten-er-koert-faerdig.svg.asset.json";
import chooseRouteMode from "@/assets/illustrations/employee/hvordan-vil-du-koere-ruten.svg.asset.json";
import checklist from "@/assets/illustrations/employee/tjekliste.svg.asset.json";
import drivingGuide from "@/assets/illustrations/employee/koerselsguide.svg.asset.json";
import startAppointment from "@/assets/illustrations/employee/start-aftale.svg";
import driveGoogleMaps from "@/assets/illustrations/employee/koer-dertil-google-maps.svg";
import employeeRoutes from "@/assets/illustrations/employee/ruter.svg";
import employeeAppointments from "@/assets/illustrations/employee/aftaler.svg";
import workdays from "@/assets/illustrations/employee/arbejdsdage.svg.asset.json";
import worktime from "@/assets/illustrations/employee/arbejdstid.svg.asset.json";
import distance from "@/assets/illustrations/employee/distance.svg.asset.json";
import dailyActivityTable from "@/assets/illustrations/employee/daglig-aktivitet-tabel.svg";
import buildFromScratchAsset from "@/assets/service-pricing/build-from-scratch.svg.asset.json";
import conversionAsset from "@/assets/panel-illustrations/konvertering.svg.asset.json";
import aiCalculatorAsset from "@/assets/service-pricing/ai-calculator.svg.asset.json";
import calculatorAsset from "@/assets/service-pricing/calculator.svg.asset.json";
import fixedPriceAsset from "@/assets/service-pricing/fixed-price.svg.asset.json";
import hourlyPriceAsset from "@/assets/service-pricing/hourly-price.svg.asset.json";
import startDayIllustration from "@/assets/illustrations/employee/start-dagen.svg.asset.json";
import dayInProgressIllustration from "@/assets/illustrations/employee/arbejdsdag-i-gang.svg.asset.json";
import dayEndedIllustration from "@/assets/illustrations/employee/dagen-afsluttet-2026.svg.asset.json";
import restartDayIllustration from "@/assets/illustrations/employee/genopstart-dagen-2.svg.asset.json";
import chooseWorkspaceIllustration from "@/assets/panel-illustrations/vaelg-arbejdsplads-2.svg";

export const BRANDED_ILLUSTRATIONS = {
  notFound: notFoundNew.url,
  searchService: searchServiceNew.url,
  compareProviders: compareProvidersNew.url,
  bookOrQuote: bookOrQuoteNew.url,
  localEasy: localEasyNew.url,
  fairBusinesses: fairBusinessesNew.url,
  localRoots: localRootsNew.url,
  fairPrices: fairPricesNew.url,
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
  unassignedAppointments: unassignedAppointmentsNew.url,
  economicIntegration: economicIntegrationAsset,
  dineroIntegration: dineroIntegrationAsset,
  helpFindProvider: helpFindProviderAsset.url,
  helpQuotes: helpQuotesAsset.url,
  helpBecomeProvider: helpBecomeProviderAsset.url,
  helpGuides: helpGuidesAsset.url,
  shareProfile: shareProfileNew.url,
  addService: addServiceNew.url,
  team: employeesNew.url,
  settings: settingsNew.url,
  servicesTotal: servicesTotalNew.url,
  activeServices: activeServicesNew.url,
  orders: bookingsNew.url,
  calendarWeek: plannedWeekNew.url,
  calendarMonth: plannedMonthNew.url,
  averageOrder: averageAppointmentNew.url,
  activeEmployee: activeEmployeeNew.url,
  pendingLogin: pendingLoginNew.url,
  payroll: payrollNew.url,
  revenue: revenueNew.url,
  reviewCount: reviewCountNew.url,
  reviewAverage: reviewAverageNew.url,
  verifiedReviews: verifiedReviewsNew.url,
  routeReady: routeReady.url,
  routeDone: routeDone.url,
  noItems: noItems.url,
  chooseRouteMode: chooseRouteMode.url,
  checklist: checklist.url,
  drivingGuide: drivingGuide.url,
  startAppointment: startAppointment,
  driveGoogleMaps: driveGoogleMaps,
  earnings: revenueNew.url,
  distance: distance.url,
  employeeRoutes: routePlannerNew.url,
  employeeAppointments: bookingsNew.url,
  workdays: workdays.url,
  worktime: worktime.url,
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
  match: matchNew,
  noMatches: noMatchesNew.url,
  matchingLoader: matchingLoaderNew.url,
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
  accountingProgramChoice: accountingProgramChoiceNew.url,
  howItWorks: howItWorksNew.url,
  independent: independentNew.url,
  verifiedProvider: verifiedProviderNew.url,
  payout: payoutNew.url,
  customerService: customerServiceNew.url,
  appointmentCompleted: appointmentCompletedNew.url,
  hourlyPrice: hourlyPriceAsset.url,
  unansweredMessages: unansweredNew.url,
  startDay: startDayIllustration.url,
  dayInProgress: dayInProgressIllustration.url,
  dayEnded: dayEndedIllustration.url,
  restartDay: restartDayIllustration.url,
  chooseWorkspace: chooseWorkspaceIllustration,
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
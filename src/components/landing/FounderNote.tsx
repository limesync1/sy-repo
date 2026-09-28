import { ArrowRight, Mail } from "lucide-react";
import SmartLink from "@/components/SmartLink";
import portrait from "@/assets/william-ross-jepsen.jpg.asset.json";

/** Personlig sektion: grundlæggeren fortæller kort, hvorfor Serviceydere findes. */
const FounderNote = () => (
  <section className="bg-background py-12 sm:py-14 lg:py-16">
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      <div className="grid items-center gap-8 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8 md:grid-cols-[auto_1fr] md:gap-10 lg:p-10">
        <img
          src={portrait.url}
          alt="William Ross Jepsen, grundlægger af Serviceydere"
          loading="lazy"
          className="mx-auto h-32 w-32 rounded-2xl object-cover ring-4 ring-accent/15 sm:h-40 sm:w-40"
        />
        <div>
          <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Bag Serviceydere
          </span>
          <blockquote className="mt-3 text-lg font-medium leading-8 text-foreground sm:text-xl">
            "Jeg byggede Serviceydere, fordi det skal være nemt at finde en god, lokal serviceyder — og
            nemt for de gode virksomheder at blive fundet. Skriver du til os, svarer jeg selv."
          </blockquote>
          <p className="mt-4 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">William Ross Jepsen</span> · Grundlægger
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <SmartLink
              to="/om-os"
              className="group inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5"
            >
              Læs om os
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </SmartLink>
            <a
              href="mailto:kontakt@serviceydere.dk"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <Mail className="h-4 w-4" />
              Skriv til William
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default FounderNote;

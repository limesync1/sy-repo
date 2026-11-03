import { useMemo } from "react";
import { Navigate, useParams } from "react-router-dom";
import { defineSoftwarePage } from "./defineSoftwarePage";
import { findIndustry, industryConfig } from "./industryRegistry";

/** Fælles systemside for alle brancher i industryRegistry. */
export default function IndustrySoftwarePage() {
  const { slug } = useParams();
  const industry = findIndustry(slug);
  const Page = useMemo(() => (industry ? defineSoftwarePage(industryConfig(industry)) : null), [industry]);
  if (!Page) return <Navigate to="/software/brancher" replace />;
  return <Page />;
}

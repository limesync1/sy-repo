import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BRANDED_ILLUSTRATIONS, BrandedIllustration } from "./BrandedIllustration";
import { NoItemsIcon } from "./NoItemsIcon";
import ChatInboxList from "@/components/livechat/ChatInboxList";
import fixedPrice from "@/assets/service-pricing/fixed-price.svg.asset.json";
import hourlyPrice from "@/assets/service-pricing/hourly-price.svg.asset.json";
import calculator from "@/assets/service-pricing/calculator.svg.asset.json";
import buildFromScratch from "@/assets/service-pricing/build-from-scratch.svg.asset.json";
import aiCalculator from "@/assets/service-pricing/ai-calculator.svg.asset.json";

describe("shared panel illustrations", () => {
  it.each([
    ["fixedPrice", fixedPrice],
    ["hourlyPrice", hourlyPrice],
    ["calculator", calculator],
    ["buildFromScratch", buildFromScratch],
    ["aiCalculator", aiCalculator],
  ] as const)("uses the new uploaded asset for %s", (name, asset) => {
    const { container } = render(<BrandedIllustration name={name} />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe(asset.url);
  });

  it("uses the same no-items illustration for employee and customer states", () => {
    const { container } = render(<NoItemsIcon />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe(BRANDED_ILLUSTRATIONS.noItems);
    expect(container.querySelector("img")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("includes the no-items icon in an empty chat inbox", () => {
    const { container } = render(<ChatInboxList chats={[]} activeKey="" onSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByText("Ingen gemte samtaler endnu.")).toBeTruthy();
    expect(container.querySelector("img")?.getAttribute("src")).toBe(BRANDED_ILLUSTRATIONS.noItems);
  });
});
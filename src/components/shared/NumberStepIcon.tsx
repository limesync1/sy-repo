import step1 from "@/assets/steps/Tal_1.png.asset.json";
import step1Animated from "@/assets/steps/Tal_1_udfyldt.gif.asset.json";
import step2 from "@/assets/steps/Tal_2.png.asset.json";
import step2Animated from "@/assets/steps/Tal_2_udfyldt.gif.asset.json";
import step3 from "@/assets/steps/Tal_3.png.asset.json";
import step3Animated from "@/assets/steps/Tal_3_udfyldt.gif.asset.json";
import step4 from "@/assets/steps/Tal_4.png.asset.json";
import step4Animated from "@/assets/steps/Tal_4_udfyldt.gif.asset.json";

const stepAssets = {
  1: { still: step1.url, animated: step1Animated.url },
  2: { still: step2.url, animated: step2Animated.url },
  3: { still: step3.url, animated: step3Animated.url },
  4: { still: step4.url, animated: step4Animated.url },
} as const;

type NumberStepIconProps = {
  number: keyof typeof stepAssets;
  animated?: boolean;
  className?: string;
};

const NumberStepIcon = ({ number, animated = false, className = "h-9 w-9" }: NumberStepIconProps) => {
  const asset = stepAssets[number];

  return (
    <span className={`relative block shrink-0 overflow-hidden rounded-full bg-card ${className}`} aria-hidden="true">
      <img
        src={asset.still}
        alt=""
        width={400}
        height={400}
        className={`h-full w-full object-contain ${animated ? "motion-safe:group-hover/step:hidden motion-safe:group-focus-within/step:hidden" : ""}`}
        loading="lazy"
        decoding="async"
      />
      {animated && (
        <img
          src={asset.animated}
          alt=""
          width={400}
          height={400}
          className="hidden h-full w-full object-contain motion-safe:group-hover/step:block motion-safe:group-focus-within/step:block"
          loading="lazy"
          decoding="async"
        />
      )}
    </span>
  );
};

export default NumberStepIcon;
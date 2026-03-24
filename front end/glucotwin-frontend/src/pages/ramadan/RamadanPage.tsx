import { Activity, Syringe, Utensils } from "lucide-react";
import { FastProgressCard } from "./components/FastProgressCard";
import { HydrationCard } from "./components/HydrationCard";
import { MetabolicShiftCard } from "./components/MetabolicShiftCard";
import { RecommendationCard } from "./components/RecommendationCard";
import { SafetyProtocolCard } from "./components/SafetyProtocolCard";

export function RamadanPage() {
  return (
    <section className="mx-auto max-w-5xl space-y-6 lg:space-y-7 px-2 pb-10">
      <header className="mb-8 pl-1">
        <h1 className="font-['Sora'] text-[22px] font-bold tracking-tight text-slate-800 md:text-3xl">
          Ramadan Mode
        </h1>
        <p className="mt-2.5 text-[13px] text-slate-500 leading-relaxed max-w-2xl md:text-sm">
          Precision glucose management for your fast. Your Digital Twin is actively
          monitoring metabolic shifts to ensure a safe and spiritual journey.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.6fr] lg:gap-6">
        <div>
          <FastProgressCard />
        </div>
        <div>
          <MetabolicShiftCard />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr] lg:gap-6">
        <div>
          <SafetyProtocolCard />
        </div>
        <div>
          <HydrationCard />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3 lg:gap-6">
        <RecommendationCard
          icon={
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <Utensils className="h-5 w-5" strokeWidth={2.5} />
            </div>
          }
          title="Recommended Suhur"
          description="Slow-release complex carbs & healthy fats for sustained stability."
        />
        <RecommendationCard
          icon={
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <Syringe className="h-5 w-5" strokeWidth={2.5} />
            </div>
          }
          title="Insulin Timing"
          description="Twin-optimized adjustment for dawn effect management."
        />
        <RecommendationCard
          icon={
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <Activity className="h-5 w-5" strokeWidth={2.5} />
            </div>
          }
          title="Hypo Risk Alert"
          description={
            <>
              Currently <strong className="text-emerald-600 font-bold">LOW</strong>. Next
              assessment in 2 hours.
            </>
          }
        />
      </div>
    </section>
  );
}
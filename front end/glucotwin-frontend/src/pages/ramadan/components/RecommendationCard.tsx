import { ReactNode } from "react";

interface RecommendationCardProps {
  icon: ReactNode;
  title: string;
  description: ReactNode;
}

export function RecommendationCard({ icon, title, description }: RecommendationCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 lg:p-6">
      <div className="mb-4 text-blue-700">
        {icon}
      </div>
      <h2 className="font-['Sora'] text-[13px] font-bold text-slate-800">{title}</h2>
      <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
        {description}
      </p>
    </article>
  );
}
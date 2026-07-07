import { FilterBar } from "@/components/discover/filter-bar";
import { ReportBlock } from "@/components/discover/report-block";
import type { Prediction, Profile, Report } from "@/lib/types";

/** Dev-only seeded Discover mosaic so the block grid can be reviewed without data. */

function author(name: string, handle: string, score: number): Profile {
  return { id: handle, handle, display_name: name, score, role: "analyst" } as unknown as Profile;
}

function report(
  id: string,
  a: Profile,
  ticker: string,
  type: Report["type"],
  access: Report["access"],
  title: string,
  summary: string | null,
  likes: number,
  comments: number,
  target?: number,
): Report {
  return {
    id,
    author_id: a.id,
    author: a,
    ticker,
    type,
    access,
    title,
    summary,
    likes,
    comment_count: comments,
    published_at: "2026-07-07T09:00:00Z",
    created_at: "2026-07-07T09:00:00Z",
    prediction: target
      ? ({ ticker, direction: "long", target_price: target } as unknown as Prediction)
      : null,
  } as unknown as Report;
}

const chen = author("Sarah Chen", "sarahchen", 82);
const webb = author("Marcus Webb", "marcuswebb", 61);
const vos = author("Maren Vos", "marenvos", 74);
const ito = author("Kenji Ito", "kenjiito", 47);

const reports: Report[] = [
  report(
    "d1",
    chen,
    "NVDA",
    "research",
    "paid",
    "The AI capex cycle has further to run than the market believes",
    "Hyperscaler guidance implies a 2027 build-out the street still models as a 2025 peak. The gap between those two curves is the whole trade, and the entry point matters more than the headline number.",
    412,
    58,
    210,
  ),
  report(
    "d2",
    webb,
    "TSLA",
    "call",
    "free",
    "Margin compression is the real Q3 story",
    "Price cuts bought share but the energy segment cannot cover the spread forever.",
    198,
    31,
    145,
  ),
  report(
    "d3",
    vos,
    "ASML",
    "research",
    "subscribers",
    "High-NA adoption is slipping right and nobody repriced",
    "Two of three lead customers pushed pilot lines into 2027.",
    166,
    24,
    880,
  ),
  report("d4", ito, "XOM", "call", "free", "Permian decline rates are the quiet bull case", null, 89, 12, 128),
  report(
    "d5",
    chen,
    "MSFT",
    "short_post",
    "free",
    "Copilot seat growth is decelerating inside the enterprise",
    null,
    77,
    19,
  ),
  report(
    "d6",
    vos,
    "NOVO",
    "research",
    "paid",
    "GLP-1 supply catches demand in Q1, then price war",
    "Capacity additions land all at once. Pricing follows.",
    120,
    22,
    95,
  ),
  report("d7", webb, "AMD", "call", "free", "MI400 sampling timelines look real this time", null, 64, 9, 172),
];

export default function DiscoverPreviewPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10">
      <h1 className="t-h1 mb-4">Discover mosaic preview</h1>
      <div className="mb-5">
        <FilterBar />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {reports.map((r, i) => (
          <div key={r.id} className={`${i === 0 ? "lg:col-span-4" : "lg:col-span-2"} h-full`}>
            <ReportBlock report={r} size={i === 0 ? "lead" : "std"} promoted={i === 3} />
          </div>
        ))}
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  Antenna,
  ArrowDownToLine,
  ArrowRight,
  Atom,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CloudUpload,
  Cpu,
  Crosshair,
  Database,
  FileJson,
  FileUp,
  FlaskConical,
  Gauge,
  Globe2,
  HeartPulse,
  History,
  Layers3,
  Menu,
  Orbit,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Radio,
  RotateCcw,
  Satellite,
  Search,
  Settings2,
  ShieldCheck,
  Signal,
  Sparkles,
  Telescope,
  Upload,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { satmodApi, MODEL_CATALOG, SUPPORTED_MODULATIONS, type ApiModel, type ClassifyRequest, type ClassificationResult, type GeneratedSignal, type IQSample, type Modulation } from "@/lib/satmod-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const NAV = [
  { key: "overview", title: "Overview", href: "/", icon: Globe2, group: "MISSION" },
  { key: "classifier", title: "Live classifier", href: "/classifier", icon: Crosshair, group: "MISSION" },
  { key: "studio", title: "Satellite studio", href: "/studio", icon: FlaskConical, group: "MISSION" },
  { key: "evaluation", title: "Model evaluation", href: "/evaluation", icon: BarChart3, group: "INTELLIGENCE" },
  { key: "arena", title: "Model arena", href: "/arena", icon: Layers3, group: "INTELLIGENCE" },
  { key: "intelligence", title: "Signal intelligence", href: "/intelligence", icon: Activity, group: "INTELLIGENCE" },
  { key: "theory", title: "Satellite theory", href: "/theory", icon: BookOpen, group: "REFERENCE" },
  { key: "settings", title: "Settings", href: "/settings", icon: Settings2, group: "REFERENCE" },
] as const;

const PAGE_META: Record<string, { title: string; eyebrow: string; description: string }> = {
  overview: { title: "Satellite Signal Intelligence", eyebrow: "MISSION OVERVIEW", description: "Automatic modulation classification and signal analysis" },
  classifier: { title: "Live Classifier", eyebrow: "SIGNAL WORKSTATION", description: "Inspect an I/Q capture and send it to the connected classifier." },
  studio: { title: "Satellite Studio", eyebrow: "RF SIMULATION LAB", description: "Configure a signal generation request and inspect returned samples." },
  evaluation: { title: "Model Performance & Evaluation", eyebrow: "MODEL EVALUATION", description: "Measured evaluation artifacts, reported metrics, and validation coverage." },
  arena: { title: "Model Arena", eyebrow: "ARCHITECTURE COMPARISON", description: "Compare trained model availability without inventing benchmark results." },
  intelligence: { title: "Signal Intelligence", eyebrow: "SIGNAL DIAGNOSTICS", description: "Quality metrics and signal comparisons from an analyzed capture." },
  theory: { title: "Satellite Theory", eyebrow: "TECHNICAL REFERENCE", description: "A concise reference for digital modulation and satellite links." },
  settings: { title: "System Settings", eyebrow: "PLATFORM CONFIGURATION", description: "Inspect service connectivity and model integration status." },
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function createReferenceSignal(modulation: Modulation, size = 128): IQSample[] {
  let seed = modulation === "BPSK" ? 73 : modulation === "QPSK" ? 211 : 409;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const levels = [-3, -1, 1, 3];
  return Array.from({ length: size }, () => {
    if (modulation === "BPSK") return { i: random() > 0.5 ? 1 : -1, q: 0 };
    if (modulation === "QPSK") {
      const angle = Math.floor(random() * 4) * (Math.PI / 2) + Math.PI / 4;
      return { i: Math.cos(angle), q: Math.sin(angle) };
    }
    return { i: levels[Math.floor(random() * levels.length)] / Math.sqrt(10), q: levels[Math.floor(random() * levels.length)] / Math.sqrt(10) };
  });
}

function AppShell({ page, children }: { page: string; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const active = NAV.find((item) => item.key === page) ?? NAV[0];
  const groups = [...new Set(NAV.map((item) => item.group))];
  return (
    <div className="min-h-screen bg-background text-foreground">
      {mobileOpen && <button type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-background/70 lg:hidden" />}
      <aside className={cn("fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar transition-[width,transform] duration-200", collapsed ? "w-[76px]" : "w-[252px]", mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")}>
        <div className={cn("flex h-[68px] items-center border-b border-sidebar-border px-5", collapsed && "justify-center px-2")}>
          <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="SatModClass overview">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary"><Satellite size={19} /></span>
            {!collapsed && <span className="min-w-0"><span className="block font-display text-[15px] font-semibold leading-tight">SATMOD<span className="text-primary">CLASS</span></span><span className="mt-1 block font-mono text-[9px] tracking-[0.13em] text-muted-foreground">SIGNAL INTELLIGENCE</span></span>}
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-5">
          {groups.map((group) => <div key={group} className="mb-7">
            {!collapsed && <div className="mb-2 px-3 font-mono text-[9px] tracking-[0.17em] text-muted-foreground/75">{group}</div>}
            <nav className="space-y-1" aria-label={`${group.toLowerCase()} navigation`}>
              {NAV.filter((item) => item.group === group).map(({ key, title, href, icon: Icon }) => <Link key={key} to={href} onClick={() => setMobileOpen(false)} title={collapsed ? title : undefined} className={cn("group flex h-10 items-center gap-3 rounded-md px-3 text-[13px] transition-colors", page === key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground", collapsed && "justify-center px-0")}>
                <Icon size={17} strokeWidth={1.8} />{!collapsed && <span className="truncate">{title}</span>}{page === key && !collapsed && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
              </Link>)}
            </nav>
          </div>)}
        </div>
        <div className="border-t border-sidebar-border p-3">
          <div className={cn("mb-2 rounded-md border border-border/70 bg-card/70 p-3", collapsed && "border-0 bg-transparent p-1 text-center")}>
            {collapsed ? <span className="inline-block size-2 rounded-full bg-signal-warning" title="Backend disconnected" /> : <><div className="flex items-center gap-2 text-[11px] font-medium"><span className="size-1.5 rounded-full bg-signal-warning" />Backend disconnected</div><div className="mt-1.5 font-mono text-[9px] text-muted-foreground">DEMO MODE · API NOT CONFIGURED</div></>}
          </div>
          <Button variant="ghost" size="sm" className={cn("w-full justify-start text-muted-foreground hover:text-foreground", collapsed && "justify-center px-0")} onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand navigation" : "Collapse navigation"}>
            {collapsed ? <PanelLeftOpen size={16} /> : <><PanelLeftClose size={16} /><span>Collapse navigation</span></>}
          </Button>
        </div>
      </aside>
      <div className={cn("min-h-screen transition-[padding] duration-200", collapsed ? "lg:pl-[76px]" : "lg:pl-[252px]")}>
        <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-border/80 bg-background/95 px-4 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={18} /></Button>
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground"><span className="hidden sm:inline">Mission Control</span><ChevronRight size={14} className="hidden sm:inline" /><span className="text-foreground">{active.title}</span></div>
          </div>
          <div className="flex items-center gap-3 md:gap-5">
            <span className="hidden items-center gap-2 font-mono text-[10px] tracking-wide text-muted-foreground xl:flex"><span className="size-1.5 rounded-full bg-signal-warning" />SYSTEM DEMO</span>
            <span className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 font-mono text-[9px] text-muted-foreground"><Wifi size={12} className="text-signal-warning" />API OFFLINE</span>
            <span className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground"><Radio size={15} /></span>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] px-4 pb-14 pt-7 md:px-8 md:pt-9">{children}</main>
      </div>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="mb-3 flex items-center gap-2 font-mono text-[10px] tracking-[0.15em] text-primary">{children}</div>;
}

function SectionHeading({ title, note }: { title: string; note?: string }) {
  return <div className="mb-4 flex items-end justify-between gap-3"><h2 className="font-display text-[15px] font-semibold">{title}</h2>{note && <span className="font-mono text-[9px] text-muted-foreground">{note}</span>}</div>;
}

function Surface({ children, className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <section className={cn("min-w-0 border border-border/80 bg-card/70", className)} {...props}>{children}</section>;
}

function PageHeader({ page }: { page: string }) {
  const meta = PAGE_META[page] ?? PAGE_META.overview;
  return <div className="mb-7"><Eyebrow><span className="size-1.5 rounded-full bg-primary" />{meta.eyebrow}</Eyebrow><h1 className="font-display text-2xl font-semibold leading-tight sm:text-[30px]">{meta.title}</h1><p className="mt-2 max-w-2xl text-[13px] text-muted-foreground">{meta.description}</p></div>;
}

const waveformDemo = Array.from({ length: 64 }, (_, index) => ({
  sample: index,
  i: Math.sin(index * 0.46) * (index % 9 > 5 ? 0.85 : 0.42),
  q: Math.cos(index * 0.46 + 0.8) * (index % 7 > 4 ? 0.7 : 0.38),
}));

function WaveChart({ data = waveformDemo, height = 168 }: { data?: Array<{ sample: number; i: number; q: number }>; height?: number }) {
  return <div style={{ height }} className="w-full">
    <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 10, left: -24, bottom: 0 }}>
      <CartesianGrid stroke="var(--border)" strokeDasharray="3 5" vertical={false} />
      <XAxis dataKey="sample" tick={{ fill: "var(--muted-foreground)", fontSize: 9, fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={false} interval={15} />
      <YAxis domain={[-1.4, 1.4]} tick={{ fill: "var(--muted-foreground)", fontSize: 9, fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={false} />
      <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 4, fontSize: 11 }} labelStyle={{ color: "var(--foreground)" }} />
      <Line type="monotone" dataKey="i" name="In-phase · I" stroke="var(--signal-i)" strokeWidth={1.7} dot={false} isAnimationActive={false} />
      <Line type="monotone" dataKey="q" name="Quadrature · Q" stroke="var(--signal-q)" strokeWidth={1.6} dot={false} isAnimationActive={false} />
    </LineChart></ResponsiveContainer>
  </div>;
}

function StatusChip({ children, kind = "muted" }: { children: React.ReactNode; kind?: "muted" | "success" | "warning" }) {
  return <span className={cn("inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[9px] uppercase tracking-wide", kind === "success" ? "border-signal-q/30 bg-signal-q/10 text-signal-q" : kind === "warning" ? "border-signal-warning/30 bg-signal-warning/10 text-signal-warning" : "border-border text-muted-foreground")}>{children}</span>;
}

function Overview({ onAnalyze }: { onAnalyze: () => void }) {
  const metrics = [
    { icon: Gauge, label: "MODEL ACCURACY", value: "72.44%", sub: "Reported evaluation" },
    { icon: Signal, label: "SUPPORTED CLASSES", value: "03", sub: "BPSK · QPSK · 16-QAM" },
    { icon: Cpu, label: "MODEL ARCHITECTURE", value: "1D-CNN", sub: "Trained model" },
    { icon: Database, label: "SIGNAL WINDOW", value: "128", sub: "I/Q samples" },
  ];
  return <>
    <section className="mission-backdrop relative min-h-[320px] overflow-hidden border border-border/80 md:min-h-[350px]">
      <div className="mission-grid absolute inset-0 opacity-30" />
      <div className="relative flex min-h-[320px] flex-col justify-between p-6 md:min-h-[350px] md:p-9">
        <div className="max-w-xl">
          <Eyebrow><Orbit size={13} /> MISSION OVERVIEW <span className="ml-1 border-l border-border pl-2 text-muted-foreground">ORBITAL SIGNAL SYSTEMS</span></Eyebrow>
          <h1 className="max-w-lg font-display text-[32px] font-semibold leading-[1.12] sm:text-[42px]">Satellite Signal<br />Intelligence</h1>
          <p className="mt-4 max-w-md text-[13px] leading-6 text-muted-foreground">AI-powered automatic modulation classification and signal analysis for satellite communications.</p>
          <div className="mt-6 flex flex-wrap gap-3"><Button onClick={onAnalyze} className="h-10 rounded-sm px-4"><Crosshair size={16} /> Open classifier <ArrowRight size={15} /></Button><Link to="/studio"><Button variant="outline" className="h-10 rounded-sm border-border bg-background/70 px-4"><FlaskConical size={15} /> Signal studio</Button></Link></div>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 self-start font-mono text-[9px] tracking-wide text-muted-foreground sm:grid-cols-4">
          {["SATELLITE LINK", "SIGNAL PROCESSING", "AI CLASSIFICATION", "SYSTEM STATUS"].map((label, index) => <div key={label} className="flex items-center gap-2"><span className={cn("size-1.5 rounded-full", index === 3 ? "bg-signal-warning" : "bg-signal-q")} />{label}</div>)}
        </div>
      </div>
      <div className="absolute right-5 top-5 hidden border border-border/70 bg-background/70 px-3 py-2 font-mono text-[9px] leading-5 text-muted-foreground backdrop-blur-sm md:block"><span className="text-primary">ORBIT-02</span><br />LINK: STANDBY<br />BAND: KU / KA</div>
    </section>
    <div className="mt-5 grid grid-cols-2 border-y border-border/80 sm:grid-cols-4">
      {metrics.map(({ icon: Icon, label, value, sub }, index) => <div key={label} className={cn("py-4 pr-3 sm:py-5", index > 0 && "border-l border-border/70 pl-4 sm:pl-6")}><div className="flex items-center gap-2 font-mono text-[9px] tracking-wide text-muted-foreground"><Icon size={13} className="text-primary" />{label}</div><div className="mt-2 font-display text-2xl font-semibold sm:text-[26px]">{value}</div><div className="mt-1 text-[10px] text-muted-foreground">{sub}</div></div>)}
    </div>
    <div className="mt-7 grid gap-5 xl:grid-cols-[1.65fr_1fr]">
      <Surface className="p-4 md:p-5"><div className="mb-2 flex items-start justify-between gap-3"><div><SectionHeading title="I/Q signal reference" note="DEMO DATASET"/><p className="-mt-2 text-[10px] text-muted-foreground">Illustrative synthetic reference · not a live capture</p></div><StatusChip kind="warning">DEMO</StatusChip></div><div className="mt-3 flex gap-4 font-mono text-[9px] text-muted-foreground"><span className="flex items-center gap-1.5"><i className="size-1.5 rounded-full bg-signal-i"/> IN-PHASE I</span><span className="flex items-center gap-1.5"><i className="size-1.5 rounded-full bg-signal-q"/> QUADRATURE Q</span></div><WaveChart /></Surface>
      <Surface className="p-4 md:p-5"><SectionHeading title="Model readiness" note="INTEGRATION STATUS"/><div className="mb-5 flex items-center justify-between border-b border-border/70 pb-4"><div><div className="font-display text-[19px] font-semibold">Inference service</div><div className="mt-1 text-[11px] text-muted-foreground">Awaiting FastAPI connection</div></div><StatusChip kind="warning">OFFLINE</StatusChip></div><div className="space-y-3">{[["Classifier endpoint", "Not connected"], ["Evaluation outputs", "Unavailable"], ["Model registry", "1 trained model"]].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 text-[11px]"><span className="text-muted-foreground">{label}</span><span className="font-mono text-[10px]">{value}</span></div>)}</div><Button variant="outline" className="mt-5 h-9 w-full justify-between rounded-sm" onClick={() => window.location.assign("/settings")}>Service configuration <ArrowRight size={14} /></Button></Surface>
    </div>
    <div className="mt-7 grid gap-5 lg:grid-cols-2"><Surface className="p-4 md:p-5"><SectionHeading title="Modulation catalogue" note="SUPPORTED CLASSES"/><div className="grid grid-cols-3 divide-x divide-border/70">{SUPPORTED_MODULATIONS.map((name, index) => <div key={name} className="px-3 first:pl-0"><div className={cn("font-mono text-[11px]", ["text-signal-i", "text-signal-q", "text-signal-violet"][index])}>{name}</div><div className="mt-2 text-[10px] leading-4 text-muted-foreground">{["Binary phase shift", "Quadrature phase shift", "16-state quadrature amplitude"][index]}</div></div>)}</div></Surface><Surface className="flex items-center justify-between gap-4 p-4 md:p-5"><div><SectionHeading title="Recent analyses" note="HISTORY"/><p className="text-[11px] text-muted-foreground">No analysis history is available yet.</p></div><History size={22} className="text-muted-foreground"/></Surface></div>
  </>;
}

function ModulationSelect({ value, onChange }: { value: Modulation; onChange: (value: Modulation) => void }) {
  return <select aria-label="Modulation scheme" value={value} onChange={(event) => onChange(event.target.value as Modulation)} className="h-9 w-full border border-input bg-background px-3 text-[12px] text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring">{SUPPORTED_MODULATIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select>;
}

function SignalScatter({ samples }: { samples: IQSample[] }) {
  const data = useMemo(() => samples.map((point, index) => ({ i: point.i, q: point.q, index })), [samples]);
  return <div className="h-[230px] w-full"><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 8, right: 10, bottom: 6, left: -12 }}><CartesianGrid stroke="var(--border)" strokeDasharray="3 5"/><XAxis type="number" dataKey="i" name="I" domain={[-1.3,1.3]} tick={{ fill: "var(--muted-foreground)", fontSize: 9 }} tickLine={false} axisLine={false}/><YAxis type="number" dataKey="q" name="Q" domain={[-1.3,1.3]} tick={{ fill: "var(--muted-foreground)", fontSize: 9 }} tickLine={false} axisLine={false}/><Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 10 }}/><Scatter data={data} fill="var(--signal-i)" fillOpacity={0.75} isAnimationActive={false}/></ScatterChart></ResponsiveContainer></div>;
}

function parseUpload(file: File): Promise<IQSample[]> {
  return file.text().then((text) => {
    if (file.name.toLowerCase().endsWith(".npy")) throw new Error("NumPy decoding is not available in demo mode. Connect the backend parser to process .npy captures.");
    if (file.name.toLowerCase().endsWith(".json")) {
      const parsed: unknown = JSON.parse(text);
      const rows = Array.isArray(parsed) ? parsed : typeof parsed === "object" && parsed !== null && "samples" in parsed ? (parsed as { samples: unknown }).samples : null;
      if (!Array.isArray(rows)) throw new Error("JSON must contain a samples array of I/Q pairs.");
      return rows.map((row, index) => {
        if (Array.isArray(row) && typeof row[0] === "number" && typeof row[1] === "number") return { i: row[0], q: row[1] };
        if (typeof row === "object" && row !== null && "i" in row && "q" in row && typeof row.i === "number" && typeof row.q === "number") return { i: row.i, q: row.q };
        throw new Error(`Invalid I/Q sample at row ${index + 1}.`);
      });
    }
    const lines = text.trim().split(/\r?\n/);
    const start = lines[0]?.toLowerCase().includes("i") ? 1 : 0;
    const parsed = lines.slice(start).filter(Boolean).map((line, index) => {
      const parts = line.split(/[;,\s]+/).map(Number);
      if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) throw new Error(`Invalid I/Q values at row ${index + start + 1}.`);
      return { i: parts[0], q: parts[1] };
    });
    if (!parsed.length) throw new Error("No I/Q sample rows were found.");
    return parsed;
  });
}

function ClassifierPage() {
  const [modulation, setModulation] = useState<Modulation>("QPSK");
  const [mode, setMode] = useState("demo");
  const [samples, setSamples] = useState<IQSample[]>(createReferenceSignal("QPSK"));
  const [source, setSource] = useState("Synthetic QPSK reference");
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const plotted = useMemo(() => samples.slice(0, 128).map((point, sample) => ({ sample, i: point.i, q: point.q })), [samples]);

  const setDemo = (next: Modulation) => {
    setModulation(next);
    setSamples(createReferenceSignal(next));
    setSource(`Synthetic ${next} reference`);
    setResult(null);
  };
  const upload = async (file?: File) => {
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !["csv", "json", "npy"].includes(extension)) { toast.error("Choose a .csv, .json, or .npy file."); return; }
    try {
      const loaded = await parseUpload(file);
      if (loaded.length > 16384) throw new Error("The preview supports up to 16,384 samples per capture.");
      setSamples(loaded); setSource(file.name); setResult(null); toast.success(`${loaded.length} I/Q samples loaded`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "The signal file could not be read."); }
  };
  const analyze = async () => {
    setBusy(true); setResult(null);
    try {
      const payload: ClassifyRequest = { samples, source };
      const response = await satmodApi.classify(payload);
      setResult(response);
      toast.success("Signal classification completed");
    } catch (error) { toast.error(error instanceof Error ? error.message : "The classifier could not be reached."); }
    finally { setBusy(false); }
  };

  return <>
    <PageHeader page="classifier" />
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-y border-border/70 py-3"><div className="flex items-center gap-2"><StatusChip kind="warning">DEMO MODE</StatusChip><span className="text-[11px] text-muted-foreground">No classification predictions until a backend response is received.</span></div><div className="font-mono text-[9px] text-muted-foreground">INPUT · {source}</div></div>
    <div className="grid items-start gap-4 xl:grid-cols-[270px_minmax(0,1fr)_280px]">
      <Surface className="p-4"><SectionHeading title="Signal input" note="I / Q DATA"/><Tabs value={mode} onValueChange={setMode}><TabsList className="grid h-8 w-full grid-cols-2 rounded-sm bg-muted"><TabsTrigger value="demo" className="rounded-sm text-[10px]">Demo signal</TabsTrigger><TabsTrigger value="upload" className="rounded-sm text-[10px]">Upload</TabsTrigger></TabsList><TabsContent value="demo" className="mt-4"><label className="mb-2 block text-[10px] text-muted-foreground">REFERENCE MODULATION</label><ModulationSelect value={modulation} onChange={setDemo}/><div className="mt-4 border border-border/70 bg-background/40 p-3"><div className="flex items-center gap-2 text-[11px]"><Atom size={14} className="text-primary"/>Synthetic reference input</div><p className="mt-2 text-[10px] leading-5 text-muted-foreground">Generated locally as a deterministic constellation sample. This is not a model output or measured capture.</p><div className="mt-3 flex justify-between font-mono text-[9px] text-muted-foreground"><span>WINDOW</span><span>{samples.length} SAMPLES</span></div></div></TabsContent><TabsContent value="upload" className="mt-4"><label htmlFor="signal-file" className="flex cursor-pointer flex-col items-center border border-dashed border-border bg-background/40 px-4 py-7 text-center transition hover:border-primary/60"><CloudUpload size={22} className="mb-2 text-primary"/><span className="text-[11px] font-medium">Choose I/Q capture</span><span className="mt-1 text-[9px] text-muted-foreground">CSV and JSON parse in browser · NPY requires service adapter</span><input id="signal-file" type="file" accept=".csv,.json,.npy" className="sr-only" onChange={(event) => { void upload(event.target.files?.[0]); event.currentTarget.value = ""; }}/></label><div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground"><FileJson size={14}/>{source}</div><div className="mt-2 font-mono text-[9px] text-muted-foreground">{samples.length} SAMPLES · TWO CHANNELS</div></TabsContent></Tabs>
        <div className="mt-5 border-t border-border/70 pt-4"><Button onClick={() => void analyze()} disabled={busy || !samples.length} className="w-full rounded-sm">{busy ? <Activity size={15} className="animate-pulse"/> : <Play size={15}/>} {busy ? "Analyzing…" : "Analyze signal"}</Button><p className="mt-2 text-center text-[9px] leading-4 text-muted-foreground">Sends I/Q samples to <span className="font-mono">POST /api/classify</span>.</p></div>
      </Surface>
      <div className="min-w-0 space-y-4"><Surface className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><SectionHeading title="Signal analysis" note="CAPTURE INSPECTOR"/><p className="-mt-2 max-w-xl truncate text-[10px] text-muted-foreground">{source}</p></div><div className="flex gap-1"><StatusChip>{samples.length} SAMPLES</StatusChip></div></div><Tabs defaultValue="waveform" className="mt-3"><TabsList className="h-8 rounded-sm bg-transparent p-0"><TabsTrigger value="waveform" className="h-8 rounded-none border-b-2 border-transparent px-3 text-[10px] data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">I/Q waveform</TabsTrigger><TabsTrigger value="constellation" className="h-8 rounded-none border-b-2 border-transparent px-3 text-[10px] data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Constellation</TabsTrigger><TabsTrigger value="spectrum" className="h-8 rounded-none border-b-2 border-transparent px-3 text-[10px] data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Spectrum</TabsTrigger><TabsTrigger value="eye" className="h-8 rounded-none border-b-2 border-transparent px-3 text-[10px] data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Eye diagram</TabsTrigger></TabsList><TabsContent value="waveform" className="mt-2"><div className="flex gap-4 font-mono text-[9px] text-muted-foreground"><span className="flex items-center gap-1.5"><i className="size-1.5 rounded-full bg-signal-i"/>I</span><span className="flex items-center gap-1.5"><i className="size-1.5 rounded-full bg-signal-q"/>Q</span></div><WaveChart data={plotted} height={265}/></TabsContent><TabsContent value="constellation" className="mt-2"><SignalScatter samples={samples}/></TabsContent><TabsContent value="spectrum" className="mt-2"><div className="flex h-[265px] items-center justify-center border border-dashed border-border text-center"><div><Activity size={20} className="mx-auto text-muted-foreground"/><p className="mt-2 text-[11px]">Spectrum requires analysis output</p><p className="mt-1 text-[10px] text-muted-foreground">No FFT has been returned for this capture.</p></div></div></TabsContent><TabsContent value="eye" className="mt-2"><div className="flex h-[265px] items-center justify-center border border-dashed border-border px-5 text-center"><div><CircleHelp size={20} className="mx-auto text-muted-foreground"/><p className="mt-2 text-[11px]">Symbol timing unavailable</p><p className="mt-1 max-w-sm text-[10px] leading-5 text-muted-foreground">A meaningful eye diagram needs symbol timing and samples-per-symbol metadata, which this input has not provided.</p></div></div></TabsContent></Tabs></Surface><Surface className="p-4"><div className="flex items-center justify-between gap-2"><SectionHeading title="AI decision insights" note="EXPLAINABILITY"/><StatusChip>UNAVAILABLE</StatusChip></div><p className="text-[10px] leading-5 text-muted-foreground">No explainability method is connected. Saliency and feature-importance results are intentionally not shown.</p></Surface></div>
      <Surface className="p-4"><SectionHeading title="Classification result" note="MODEL RESPONSE"/>{result ? <><div className="border-y border-border/70 py-4"><div className="font-mono text-[9px] tracking-wide text-muted-foreground">PREDICTED MODULATION</div><div className="mt-2 font-display text-3xl font-semibold text-primary">{result.predictedModulation}</div><div className="mt-4 flex items-center justify-between"><span className="text-[11px] text-muted-foreground">Confidence</span><span className="font-mono text-[13px]">{(result.confidence * 100).toFixed(1)}%</span></div><div className="mt-2 h-1.5 bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, result.confidence * 100))}%` }}/></div></div><div className="mt-4 space-y-3">{SUPPORTED_MODULATIONS.map((item) => <div key={item}><div className="mb-1 flex justify-between text-[10px]"><span>{item}</span><span className="font-mono text-muted-foreground">{result.probabilities[item] === undefined ? "—" : `${(result.probabilities[item]! * 100).toFixed(1)}%`}</span></div><div className="h-1 bg-muted"><div className="h-full bg-signal-q" style={{ width: `${Math.max(0, Math.min(100, (result.probabilities[item] ?? 0) * 100))}%` }}/></div></div>)}</div><div className="mt-5 border-t border-border/70 pt-4 text-[10px] text-muted-foreground"><div className="flex justify-between py-1"><span>Model</span><span className="font-mono">{result.modelId ?? "Not reported"}</span></div><div className="flex justify-between py-1"><span>Processing</span><span className="font-mono">{result.processingMs === undefined ? "Not reported" : `${result.processingMs} ms`}</span></div><div className="flex justify-between py-1"><span>Estimated SNR</span><span className="font-mono">{result.snrDb === undefined ? "Not reported" : `${result.snrDb} dB`}</span></div></div><StatusChip kind="success"><Check size={11}/>SERVICE RESPONSE</StatusChip></> : <div className="flex min-h-[320px] flex-col items-center justify-center border-y border-border/70 px-5 text-center"><span className="flex size-12 items-center justify-center rounded-full border border-border bg-background text-muted-foreground"><Satellite size={20}/></span><div className="mt-4 text-[12px] font-medium">Awaiting analysis</div><p className="mt-2 max-w-[210px] text-[10px] leading-5 text-muted-foreground">No prediction is displayed until the inference service returns an actual result.</p><div className="mt-4 font-mono text-[9px] text-signal-warning">BACKEND DISCONNECTED</div></div>}</Surface>
    </div>
  </>;
}

function StudioPage() {
  const [modulation, setModulation] = useState<Modulation>("QPSK");
  const [snr, setSnr] = useState(12);
  const [symbols, setSymbols] = useState(128);
  const [signal, setSignal] = useState<GeneratedSignal | null>(null);
  const [busy, setBusy] = useState(false);
  const generate = async () => {
    setBusy(true);
    try { const next = await satmodApi.generate({ modulation, snrDb: snr, symbolCount: symbols }); setSignal(next); toast.success("Signal samples received"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Signal service is unavailable."); }
    finally { setBusy(false); }
  };
  const plot = useMemo(() => signal?.samples.slice(0, 128).map((point, sample) => ({ sample, i: point.i, q: point.q })) ?? [], [signal]);
  return <><PageHeader page="studio"/><div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-y border-border/70 py-3"><div className="flex items-center gap-2"><StatusChip kind="warning">BACKEND MODE</StatusChip><span className="text-[10px] text-muted-foreground">Generation and playback require <span className="font-mono">POST /api/signal/generate</span>.</span></div><StatusChip>{signal ? "SIGNAL RECEIVED" : "NO SIGNAL"}</StatusChip></div><div className="grid items-start gap-4 xl:grid-cols-[270px_minmax(0,1fr)_240px]"><Surface className="p-4"><SectionHeading title="Simulation controls" note="REQUEST"/><label className="mb-2 block text-[10px] text-muted-foreground">MODULATION</label><ModulationSelect value={modulation} onChange={setModulation}/><div className="mt-5 flex justify-between text-[10px]"><label>SNR</label><span className="font-mono text-primary">{snr} dB</span></div><Slider className="mt-3" min={-20} max={30} step={1} value={[snr]} onValueChange={(value) => setSnr(value[0] ?? 12)}/><div className="mt-5 flex justify-between text-[10px]"><label>SYMBOLS</label><span className="font-mono">{symbols}</span></div><Slider className="mt-3" min={32} max={1024} step={32} value={[symbols]} onValueChange={(value) => setSymbols(value[0] ?? 128)}/><div className="mt-5 space-y-2 border-t border-border/70 pt-4">{[["Carrier frequency", "Backend-defined"], ["Sample rate", "Backend-defined"], ["Channel model", "Not specified"]].map(([label, value]) => <div key={label} className="flex justify-between gap-2 text-[10px]"><span className="text-muted-foreground">{label}</span><span>{value}</span></div>)}</div><Button onClick={() => void generate()} disabled={busy} className="mt-5 w-full rounded-sm">{busy ? <Activity size={15} className="animate-pulse"/> : <Zap size={15}/>}Generate signal</Button><Button variant="outline" onClick={() => { setSignal(null); setSnr(12); setSymbols(128); }} className="mt-2 w-full rounded-sm"><RotateCcw size={14}/>Reset</Button></Surface><div className="space-y-4"><Surface className="p-4"><div className="flex items-start justify-between"><SectionHeading title="Signal visualizations" note="SERVICE OUTPUT"/><Button variant="ghost" size="icon" aria-label="Download signal" disabled={!signal} onClick={() => { if (!signal) return; const file = new Blob([JSON.stringify(signal, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(file); const link = document.createElement("a"); link.href = url; link.download = "satmod-signal.json"; link.click(); URL.revokeObjectURL(url); }}><ArrowDownToLine size={15}/></Button></div>{signal ? <Tabs defaultValue="waveform"><TabsList className="h-8 rounded-sm bg-muted"><TabsTrigger value="waveform" className="rounded-sm text-[10px]">I/Q waveform</TabsTrigger><TabsTrigger value="constellation" className="rounded-sm text-[10px]">Constellation</TabsTrigger></TabsList><TabsContent value="waveform"><WaveChart data={plot} height={270}/></TabsContent><TabsContent value="constellation"><SignalScatter samples={signal.samples}/></TabsContent></Tabs> : <div className="flex min-h-[300px] flex-col items-center justify-center border border-dashed border-border text-center"><Activity size={22} className="text-muted-foreground"/><p className="mt-3 text-[11px]">No generated samples</p><p className="mt-1 text-[10px] text-muted-foreground">Visualizations appear after a service response.</p></div>}</Surface><Surface className="p-4"><SectionHeading title="Channel configuration" note="CURRENT ENDPOINT CONTRACT"/><div className="flex items-start gap-3"><CircleHelp size={16} className="mt-0.5 shrink-0 text-signal-warning"/><p className="text-[10px] leading-5 text-muted-foreground">Frequency offset, phase offset, fading, and impairment controls are unavailable until the inference service publishes its supported channel parameters.</p></div></Surface></div><Surface className="p-4"><SectionHeading title="Signal statistics" note="MEASURED"/>{signal ? <div className="space-y-3">{[["Modulation",signal.modulation],["SNR",`${signal.snrDb} dB`],["Symbols",String(signal.symbolCount)],["Samples",String(signal.samples.length)]].map(([label,value])=><div key={label} className="border-b border-border/70 pb-2"><div className="text-[9px] text-muted-foreground">{label}</div><div className="mt-1 font-mono text-[12px]">{value}</div></div>)}</div> : <div className="flex min-h-[260px] flex-col items-center justify-center text-center"><Gauge size={20} className="text-muted-foreground"/><p className="mt-2 text-[11px]">Awaiting measured values</p><p className="mt-1 text-[10px] leading-5 text-muted-foreground">Power, bandwidth, and noise require returned signal analysis.</p></div>}</Surface></div></>;
}

function EvaluationPage() {
  const reported = [
    ["Overall accuracy", "72.44%", "Reported evaluation"],
    ["Macro precision", "—", "Evaluation output unavailable"],
    ["Macro recall", "—", "Evaluation output unavailable"],
    ["Macro F1-score", "—", "Evaluation output unavailable"],
  ];
  return <><PageHeader page="evaluation"/><div className="mb-5 flex items-center justify-between border-y border-border/70 py-3"><div className="flex items-center gap-2"><StatusChip kind="warning">REPORTED METRIC</StatusChip><span className="text-[10px] text-muted-foreground">Only the supplied 72.44% evaluation accuracy is available.</span></div><Button variant="outline" size="sm" className="h-8 rounded-sm" disabled title="Evaluation export requires stored results"><ArrowDownToLine size={14}/>Export results</Button></div><div className="grid grid-cols-2 gap-x-0 sm:grid-cols-4">{reported.map(([label,value,note],index)=><div key={label} className={cn("border-b border-border/70 py-4 pr-3",index>0&&"border-l border-border/70 pl-4")}><div className="text-[10px] text-muted-foreground">{label}</div><div className={cn("mt-2 font-display text-2xl",value==="—"&&"text-muted-foreground")}>{value}</div><div className="mt-1 text-[9px] text-muted-foreground">{note}</div></div>)}</div><div className="mt-5 grid gap-4 xl:grid-cols-2"><Surface className="p-4"><SectionHeading title="Confusion matrix" note="STORED EVALUATION"/><EmptyAnalysis message="No confusion matrix is connected." detail="Class-level counts and normalized percentages will appear when GET /api/evaluation returns stored results."/></Surface><Surface className="p-4"><SectionHeading title="Accuracy vs SNR" note="MEASURED SERIES"/><EmptyAnalysis message="SNR evaluation points unavailable." detail="No accuracy curve is drawn without measured evaluation outputs."/></Surface><Surface className="p-4"><SectionHeading title="Per-class performance" note="PRECISION · RECALL · F1"/><EmptyAnalysis message="Per-class metrics unavailable." detail="Class metrics require results from the evaluation endpoint."/></Surface><Surface className="p-4"><SectionHeading title="Evaluation coverage" note="DATASET"/><EmptyAnalysis message="Sample counts are not reported." detail="No class distribution or error analysis is inferred from the aggregate accuracy."/></Surface></div></>;
}

function EmptyAnalysis({ message, detail }: { message: string; detail: string }) {
  return <div className="flex min-h-[180px] flex-col items-center justify-center border border-dashed border-border px-5 text-center"><BarChart3 size={19} className="text-muted-foreground"/><p className="mt-3 text-[11px]">{message}</p><p className="mt-1 max-w-sm text-[10px] leading-5 text-muted-foreground">{detail}</p></div>;
}

function ArenaPage() {
  const models: ApiModel[] = MODEL_CATALOG;
  return <><PageHeader page="arena"/><div className="mb-5 border-y border-border/70 py-3"><div className="flex items-start gap-2"><CircleHelp size={15} className="mt-0.5 text-signal-warning"/><p className="text-[10px] leading-5 text-muted-foreground">Only the 1D-CNN has a reported evaluation metric. Alternative architectures have not been trained or independently validated.</p></div></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{models.map((model,index)=><Surface key={model.id} className="p-4"><div className="flex items-start justify-between"><span className="flex size-9 items-center justify-center border border-border bg-background text-primary"><Cpu size={17}/></span><StatusChip kind={model.status==="available"?"success":"muted"}>{model.status==="available"?"TRAINED":"NOT YET TRAINED"}</StatusChip></div><h2 className="mt-5 font-display text-[17px] font-semibold">{model.name}</h2><p className="mt-1 text-[10px] text-muted-foreground">{index===0?"1D convolutional neural network":"Architecture candidate"}</p><div className="mt-5 border-t border-border/70 pt-3"><div className="flex justify-between py-1 text-[10px]"><span className="text-muted-foreground">Evaluation</span><span>{model.status==="available"?"Reported":"Unavailable"}</span></div><div className="flex justify-between py-1 text-[10px]"><span className="text-muted-foreground">Accuracy</span><span className="font-mono">{model.accuracy===undefined?"—":`${model.accuracy.toFixed(2)}%`}</span></div><div className="flex justify-between py-1 text-[10px]"><span className="text-muted-foreground">Latency</span><span className="font-mono">{model.latencyMs===undefined?"—":`${model.latencyMs} ms`}</span></div></div></Surface>)}</div><Surface className="mt-5 p-4"><SectionHeading title="Benchmark workspace" note="AVAILABLE MODELS ONLY"/><div className="flex min-h-[210px] flex-col items-center justify-center border border-dashed border-border px-5 text-center"><Layers3 size={20} className="text-muted-foreground"/><p className="mt-3 text-[11px]">No benchmark run is available</p><p className="mt-1 max-w-md text-[10px] leading-5 text-muted-foreground">Model selection and measured comparison charts are disabled until trained model artifacts and benchmark endpoints are connected.</p></div></Surface></>;
}

function IntelligencePage() {
  const [first, setFirst] = useState<Modulation>("BPSK");
  const [second, setSecond] = useState<Modulation>("QPSK");
  return <><PageHeader page="intelligence"/><div className="mb-5 border-y border-border/70 py-3"><div className="flex items-center gap-2"><StatusChip kind="warning">NO ANALYSIS DATA</StatusChip><span className="text-[10px] text-muted-foreground">Diagnostics are populated only from real signal analysis responses.</span></div></div><div className="grid gap-4 lg:grid-cols-2"><Surface className="p-4"><SectionHeading title="Signal quality" note="MEASURED"/><div className="grid grid-cols-2 gap-x-4">{["Signal power","Noise power","Estimated SNR","Bandwidth"].map((item)=><div key={item} className="border-b border-border/70 py-4"><div className="text-[10px] text-muted-foreground">{item}</div><div className="mt-2 font-mono text-[18px] text-muted-foreground">—</div><div className="mt-1 text-[9px] text-muted-foreground">Not measured</div></div>)}</div></Surface><Surface className="p-4"><SectionHeading title="Signal characteristics" note="ANALYZER OUTPUT"/><div className="grid grid-cols-2 gap-x-4">{["Constellation dispersion","Phase distribution","Amplitude distribution","Statistical properties"].map((item)=><div key={item} className="border-b border-border/70 py-4"><div className="text-[10px] text-muted-foreground">{item}</div><div className="mt-2 text-[10px]">Unavailable</div></div>)}</div></Surface></div><Surface className="mt-4 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><SectionHeading title="Signal comparison" note="SIDE-BY-SIDE CAPTURE ANALYSIS"/><div className="flex gap-2"><ModulationSelect value={first} onChange={setFirst}/><ModulationSelect value={second} onChange={setSecond}/></div></div><div className="grid gap-3 md:grid-cols-2">{[["Capture A",first],["Capture B",second]].map(([label,value])=><div key={label} className="border border-border/70 bg-background/30 p-3"><div className="mb-3 flex justify-between text-[10px]"><span>{label}</span><span className="font-mono text-primary">{value}</span></div><div className="flex min-h-[140px] flex-col items-center justify-center border border-dashed border-border text-center"><FileUp size={17} className="text-muted-foreground"/><p className="mt-2 text-[10px]">No capture selected</p><p className="mt-1 text-[9px] text-muted-foreground">Choose a measured capture to compare</p></div></div>)}</div><div className="mt-4 text-[10px] text-muted-foreground">Waveforms, spectra, and classifications stay empty until both actual analysis results are available.</div></Surface></>;
}

const THEORY = [
  { title: "I/Q representation", label: "SIGNAL MODEL", text: "A complex baseband sample combines an in-phase component and a quadrature component: x[n] = I[n] + jQ[n]. Together they preserve the signal's amplitude and phase information." },
  { title: "Signal-to-noise ratio", label: "LINK QUALITY", text: "SNR compares average signal power with noise power. In decibels, SNR(dB) = 10 log₁₀(Psignal / Pnoise). Lower SNR makes symbol decisions less reliable." },
  { title: "BPSK", label: "2 PHASE STATES", text: "Binary phase-shift keying represents one bit per symbol using two antipodal phase states. Its ideal constellation points lie on the in-phase axis." },
  { title: "QPSK", label: "4 PHASE STATES", text: "Quadrature phase-shift keying encodes two bits per symbol with four phase states. Gray mapping can make neighboring symbol errors differ by one bit." },
  { title: "QAM", label: "AMPLITUDE + PHASE", text: "Quadrature amplitude modulation changes both I and Q amplitudes. Higher-order constellations carry more bits per symbol but place decision points closer together." },
  { title: "Channel noise", label: "PROPAGATION", text: "Thermal noise and propagation effects perturb received samples. Filtering, synchronization, and channel estimation help recover a usable symbol stream." },
  { title: "Automatic classification", label: "MACHINE LEARNING", text: "A classifier receives labeled I/Q windows during training, then estimates a modulation class for new captures. Evaluation must use held-out signals and documented metrics." },
  { title: "Satellite link", label: "SYSTEM CONTEXT", text: "Satellite links commonly use spectrally efficient digital modulation; practical schemes are selected according to link margin, bandwidth, power, and channel conditions." },
];

function TheoryPage() {
  return <><PageHeader page="theory"/><div className="grid gap-px border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">{THEORY.map((topic,index)=><article key={topic.title} className="bg-card p-4 md:p-5"><div className="flex items-center justify-between"><span className="font-mono text-[9px] tracking-[0.13em] text-primary">{topic.label}</span><span className="font-mono text-[9px] text-muted-foreground">0{index+1}</span></div><h2 className="mt-5 font-display text-[16px] font-semibold">{topic.title}</h2><p className="mt-2 text-[11px] leading-5 text-muted-foreground">{topic.text}</p></article>)}</div><Surface className="mt-5 p-5"><div className="flex items-start gap-3"><ShieldCheck size={17} className="mt-0.5 text-signal-q"/><div><div className="text-[11px] font-medium">Evaluation integrity</div><p className="mt-1 max-w-3xl text-[10px] leading-5 text-muted-foreground">A displayed model score is meaningful only with its evaluation dataset, split methodology, and metrics. SatModClass labels the supplied 72.44% as reported and does not derive unverified results from a diagram.</p></div></div></Surface></>;
}

function SettingsPage() {
  const [status, setStatus] = useState("Not checked");
  const [busy, setBusy] = useState(false);
  const check = async () => { setBusy(true); try { const health = await satmodApi.health(); setStatus(health.connected ? `Connected${health.modelId ? ` · ${health.modelId}` : ""}` : "Service reported disconnected"); toast.success("Service status received"); } catch (error) { setStatus(error instanceof Error ? "Unable to reach the configured service" : "Connection check failed"); toast.error("Could not connect to the signal service"); } finally { setBusy(false); } };
  return <><PageHeader page="settings"/><div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]"><Surface className="p-5"><SectionHeading title="Inference service" note="FASTAPI CONNECTION"/><div className="border-y border-border/70 py-4"><div className="flex items-center justify-between gap-3"><div><div className="text-[11px]">Service health</div><div className="mt-1 text-[10px] text-muted-foreground">Checks <span className="font-mono">GET /api/health</span> at the configured service URL.</div></div><StatusChip kind={status.startsWith("Connected")?"success":status==="Not checked"?"muted":"warning"}>{status.startsWith("Connected")?"CONNECTED":status==="Not checked"?"NOT CHECKED":"UNAVAILABLE"}</StatusChip></div><Button onClick={() => void check()} disabled={busy} variant="outline" className="mt-4 h-9 rounded-sm">{busy ? "Checking…" : <><HeartPulse size={14}/> Check connection</>}</Button></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{[["Classifier","POST /api/classify"],["Signal generation","POST /api/signal/generate"],["Signal analysis","POST /api/signal/analyze"],["Model registry","GET /api/models"],["Evaluation","GET /api/evaluation"],["History","GET /api/history"]].map(([label,path])=><div key={path} className="border border-border/70 bg-background/30 p-3"><div className="text-[10px]">{label}</div><div className="mt-1 font-mono text-[9px] text-muted-foreground">{path}</div></div>)}</div></Surface><Surface className="p-5"><SectionHeading title="Model availability" note="CURRENT REGISTRY"/><div className="divide-y divide-border/70">{MODEL_CATALOG.map((model)=><div key={model.id} className="flex items-center justify-between gap-3 py-3"><div><div className="text-[11px]">{model.name}</div><div className="mt-1 font-mono text-[9px] text-muted-foreground">{model.id}</div></div><StatusChip kind={model.status==="available"?"success":"muted"}>{model.status==="available"?"REPORTED":"NOT TRAINED"}</StatusChip></div>)}</div><p className="mt-4 text-[10px] leading-5 text-muted-foreground">Set <span className="font-mono">VITE_SATMOD_API_URL</span> when deploying the FastAPI inference service. No server URL is configured in this preview.</p></Surface></div></>;
}

export function SatmodApp({ page }: { page: string }) {
  const openClassifier = () => { window.location.assign("/classifier"); };
  let content: React.ReactNode;
  switch (page) {
    case "overview": content = <Overview onAnalyze={openClassifier}/>; break;
    case "classifier": content = <ClassifierPage/>; break;
    case "studio": content = <StudioPage/>; break;
    case "evaluation": content = <EvaluationPage/>; break;
    case "arena": content = <ArenaPage/>; break;
    case "intelligence": content = <IntelligencePage/>; break;
    case "theory": content = <TheoryPage/>; break;
    case "settings": content = <SettingsPage/>; break;
    default: content = <Overview onAnalyze={openClassifier}/>;
  }
  return <AppShell page={page}><div className="animate-in fade-in duration-300"><PageHeader page={page}/>{content}</div></AppShell>;
}
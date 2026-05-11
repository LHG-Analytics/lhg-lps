"use client";
import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Image from "next/image";
import type {
  Brand,
  BrandUnit,
  Campaign,
  CampaignDate,
  Period,
  UnitPickerBlockProps,
} from "@/lib/schema";
import { AmenityChip } from "@/lib/amenities";
import { getActiveLot, type ActiveLot } from "@/lib/lots";
import { buildBookingUrl } from "@/lib/booking";
import { lookupPrice, formatBRL } from "@/lib/pricing";
import { TypewriterHTML } from "@/components/TypewriterHTML";

type Props = UnitPickerBlockProps & {
  brand: Brand;
  campaign: Campaign;
};

/* -------------------------------------------------------------
   UnitPicker — bloco crítico de conversão
   ------------------------------------------------------------- */
export function UnitPicker({
  id,
  eyebrow,
  headline,
  subtitle,
  units,
  wizardSteps,
  stepCopy,
  openCtaLabel,
  confirmCtaLabel,
  brand,
  campaign,
}: Props) {
  const [focused, setFocused] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  // Para campanhas com uma única unidade, expande o card automaticamente.
  useEffect(() => {
    if (units.length === 1 && units[0]) {
      setLocked(true);
      setFocused(units[0]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Click externo (incluindo `[data-focus-unit]` em outros blocos) destrava
  // ou trava no respectivo card. Espelha a lógica do HTML.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (!t) return;
      const focusLink = t.closest("[data-focus-unit]");
      if (focusLink) {
        const unitId = focusLink.getAttribute("data-focus-unit");
        if (unitId) {
          setLocked(true);
          setFocused(unitId);
        }
        return;
      }
      if (!t.closest(".units__grid")) {
        setLocked(false);
        setFocused(null);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const handleEnter = useCallback(
    (unitId: string) => {
      if (locked) return;
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => setFocused(unitId), 100);
    },
    [locked]
  );

  const handleLeave = useCallback(() => {
    if (locked) return;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setFocused(null), 220);
  }, [locked]);

  const handleLock = useCallback((unitId: string) => {
    setLocked(true);
    setFocused(unitId);
  }, []);

  return (
    <section className="units" id={id}>
      <div className="wrap">
        <div className="section-head fade-up">
          <span className="eyebrow">{eyebrow}</span>
          <TypewriterHTML html={headline} />
          <p>{subtitle}</p>
        </div>

        <div
          ref={gridRef}
          className="units__grid"
          {...(focused ? { "data-focus": focused } : {})}
        >
          {units.map((unitId, idx) => {
            const unit = brand.units.find((u) => u.id === unitId);
            if (!unit) return null;
            const isFocused = focused === unitId;
            const revealVariant = idx === 0 ? "reveal--left" : "reveal--right";
            return (
              <article
                key={unitId}
                className={`unit reveal ${revealVariant}${isFocused ? " is-focused" : ""}`}
                data-unit-id={unitId}
                onMouseEnter={() => handleEnter(unitId)}
                onMouseLeave={handleLeave}
              >
                <div className="unit__img">
                  <span className="unit__corner">
                    {String(idx + 1).padStart(2, "0")} · {unit.name}
                  </span>
                  <Image
                    src={unit.image}
                    alt={unit.imageAlt}
                    width={920}
                    height={230}
                    className=""
                    sizes="(max-width: 1100px) 90vw, 580px"
                  />
                </div>

                <div className="unit__body">
                  <div className="unit__label">{unit.label}</div>
                  <h3 className="unit__name">{unit.name}</h3>
                  <p className="unit__addr">
                    <PinIcon />
                    {unit.address}
                  </p>

                  <button
                    type="button"
                    className="unit__cta"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLock(unitId);
                    }}
                  >
                    {openCtaLabel}
                    <ArrowIcon />
                  </button>

                  <div className="unit__wizard-wrap">
                    <UnitWizard
                      unit={unit}
                      brand={brand}
                      campaign={campaign}
                      wizardSteps={wizardSteps}
                      stepCopy={stepCopy}
                      confirmCtaLabel={confirmCtaLabel}
                      onInteract={() => handleLock(unitId)}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------
   UnitWizard — 4 passos com estado próprio por unidade
   ------------------------------------------------------------- */
type WizardProps = {
  unit: BrandUnit;
  brand: Brand;
  campaign: Campaign;
  wizardSteps: UnitPickerBlockProps["wizardSteps"];
  stepCopy: UnitPickerBlockProps["stepCopy"];
  confirmCtaLabel: string;
  onInteract: () => void;
};

function UnitWizard({
  unit,
  brand,
  campaign,
  wizardSteps,
  stepCopy,
  confirmCtaLabel,
  onInteract,
}: WizardProps) {
  const [step, setStep] = useState(1);
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [dateValue, setDateValue] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const period = campaign.campaign.periods.find((p) => p.id === periodId);
  const dateObj = campaign.campaign.dates.find((d) => d.value === dateValue);
  const scopeKey = period?.scopeKey ?? "all";
  const pricing = campaign.campaign.pricing;
  // Se um período "3h" não declarar um subset próprio em brand.json, cai
  // no catálogo `all` — comportamento default desde a campanha de namorados.
  // Sob esse catálogo, ainda filtramos: categorias sem preço pra
  // (period × tier) corrente são ocultadas no carrossel. Isso evita
  // levar o usuário a um beco sem saída no resumo.
  const baseCats = unit.categories[scopeKey] ?? unit.categories.all;
  const cats =
    pricing && period && dateObj
      ? baseCats.filter((c) =>
          lookupPrice(pricing, {
            unitId: unit.id,
            categoryId: c.id,
            periodId: period.id,
            tier: dateObj.tier,
          }) != null
        )
      : baseCats;
  const category = cats.find((c) => c.id === categoryId);

  // Se o tier mudar e a categoria selecionada não tiver preço pra nova
  // combinação, limpa — evita resumo com preço fantasma.
  useEffect(() => {
    if (!categoryId || !period || !dateObj || !pricing) return;
    const cents = lookupPrice(pricing, {
      unitId: unit.id,
      categoryId,
      periodId: period.id,
      tier: dateObj.tier,
    });
    if (cents == null) setCategoryId(null);
  }, [categoryId, period, dateObj, pricing, unit.id]);

  const handleSelectPeriod = (next: string) => {
    onInteract();
    setPeriodId(next);
    // Trocar período pode mudar o conjunto de categorias — limpa.
    setCategoryId(null);
  };
  const handleSelectDate = (next: CampaignDate) => {
    onInteract();
    setDateValue(next.value);
  };
  const handleSelectCategory = (nextId: string) => {
    onInteract();
    setCategoryId(nextId);
  };

  const goto = (n: number) => {
    setStep(n);
    formRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const finalUrl =
    period && dateValue && category
      ? buildBookingUrl({
          brand,
          unitId: unit.id,
          categorySlug: category.slug,
          date: dateValue,
          periodKey: period.id,
        })
      : unit.bookingBaseUrl;

  return (
    <form ref={formRef} className="wizard" data-unit={unit.id} noValidate>
      <WizardStepBar steps={wizardSteps} current={step} />

      {/* STEP 1 — PERÍODO */}
      <Panel active={step === 1}>
        <h4 className="wizard__title">{stepCopy.period.title}</h4>
        <p className="wizard__hint">{stepCopy.period.hint}</p>
        <div className="opt-grid opt-grid--periods">
          {campaign.campaign.periods.map((p) => (
            <PeriodOption
              key={p.id}
              period={p}
              checked={periodId === p.id}
              unitId={unit.id}
              onSelect={() => handleSelectPeriod(p.id)}
            />
          ))}
        </div>
        <WizNav
          onNext={() => goto(2)}
          nextLabel="Escolher data"
          nextDisabled={!periodId}
        />
      </Panel>

      {/* STEP 2 — DATA */}
      <Panel active={step === 2}>
        <h4 className="wizard__title">{stepCopy.date.title}</h4>
        <p className="wizard__hint">{stepCopy.date.hint}</p>
        <LoteBadge
          lots={campaign.campaign.lots}
          couponHint={stepCopy.date.couponHint}
        />
        <p className="wizard__hint wizard__hint--small">
          {stepCopy.date.smallHint}
        </p>
        <div className="opt-grid opt-grid--dates">
          {campaign.campaign.dates.map((d) => (
            <DateOption
              key={d.value}
              date={d}
              checked={dateValue === d.value}
              unitId={unit.id}
              onSelect={() => handleSelectDate(d)}
            />
          ))}
        </div>
        <WizNav
          onBack={() => goto(1)}
          onNext={() => goto(3)}
          nextLabel="Escolher categoria"
          nextDisabled={!dateValue}
        />
      </Panel>

      {/* STEP 3 — CATEGORIA */}
      <Panel active={step === 3}>
        <h4 className="wizard__title">{stepCopy.category.title}</h4>
        <p className="wizard__hint">
          {period
            ? hintForCategoryStep(period, unit, stepCopy)
            : stepCopy.category.hint}
        </p>
        <CategoryCarousel
          unitId={unit.id}
          period={scopeKey}
          categories={cats}
          selectedId={categoryId}
          onSelect={handleSelectCategory}
        />
        <WizNav
          onBack={() => goto(2)}
          onNext={() => goto(4)}
          nextLabel="Ver resumo"
          nextDisabled={!categoryId}
        />
      </Panel>

      {/* STEP 4 — RESUMO */}
      <Panel active={step === 4}>
        <h4 className="wizard__title">{stepCopy.summary.title}</h4>
        <p className="wizard__hint">{stepCopy.summary.hint}</p>
        <Summary
          summaryCopy={stepCopy.summary}
          unitName={`${brand.name.split(" ")[0]} ${unit.name}`}
          unitId={unit.id}
          period={period}
          dateObj={dateObj}
          category={category}
          lots={campaign.campaign.lots}
          pricing={pricing}
        />
        <div className="wiz-nav">
          <button type="button" className="wiz-back" onClick={() => goto(3)}>
            <BackArrow />
            Editar reserva
          </button>
          <a
            className="btn btn--confirm"
            href={finalUrl}
            target="_blank"
            rel="noopener"
          >
            {confirmCtaLabel}
            <ArrowIcon />
          </a>
        </div>
      </Panel>
    </form>
  );
}

/* -------------------------------------------------------------
   Sub-components
   ------------------------------------------------------------- */
function WizardStepBar({
  steps,
  current,
}: {
  steps: UnitPickerBlockProps["wizardSteps"];
  current: number;
}) {
  return (
    <div className="wizard__steps" role="tablist">
      {steps.map((s, i) => {
        const cls =
          s.n === current ? "is-active" : s.n < current ? "is-done" : "";
        return (
          <span key={s.n} className={`wizard__step ${cls}`.trim()}>
            <span className="n">
              <span className="n-num">{s.n}</span>
            </span>
            {s.label}
            {i < steps.length - 1 ? null : null}
          </span>
        );
      })}
    </div>
  );
}

function Panel({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`wizard__panel${active ? " is-active" : ""}`}>{children}</div>
  );
}

function WizNav({
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="wiz-nav">
      {onBack ? (
        <button type="button" className="wiz-back" onClick={onBack}>
          <BackArrow />
          Voltar
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        className="btn btn--gold btn--sm wiz-next"
        onClick={onNext}
        disabled={nextDisabled}
      >
        {nextLabel}
        <ArrowIcon />
      </button>
    </div>
  );
}

function PeriodOption({
  period,
  checked,
  unitId,
  onSelect,
}: {
  period: Period;
  checked: boolean;
  unitId: string;
  onSelect: () => void;
}) {
  const featured = period.featured ? " opt--featured" : "";
  return (
    <label className={`opt opt--rich${featured}`}>
      <input
        type="radio"
        name={`periodo-${unitId}`}
        value={period.id}
        checked={checked}
        onChange={onSelect}
      />
      <span className="opt__check" />
      {period.featuredTag ? (
        <span className="opt__featured-tag">{period.featuredTag}</span>
      ) : null}
      <span className="opt__label">{period.label}</span>
      <span className="opt__meta">{period.meta}</span>
      <span className="opt__pill">{period.scope}</span>
    </label>
  );
}

function DateOption({
  date,
  checked,
  unitId,
  onSelect,
}: {
  date: CampaignDate;
  checked: boolean;
  unitId: string;
  onSelect: () => void;
}) {
  const tier = date.tier === "premium" ? " opt--date-premium" : "";
  return (
    <label className={`opt opt--date${tier}`}>
      <input
        type="radio"
        name={`data-${unitId}`}
        value={date.value}
        checked={checked}
        onChange={onSelect}
      />
      <span className="opt__check" />
      <span className="opt__day">{date.day}</span>
      <span className="opt__dow">{date.dow}</span>
      <span className="opt__tier">
        {date.tier === "premium" ? "Premium" : "Regular"}
      </span>
    </label>
  );
}

function LoteBadge({
  lots,
  couponHint,
}: {
  lots: Campaign["campaign"]["lots"];
  couponHint: string;
}) {
  // Calcular client-side evita hydration mismatch entre SSG e horário do
  // visitante. Antes de hidratar, mostra um placeholder neutro.
  const [active, setActive] = useState<ActiveLot | null>(null);
  useEffect(() => {
    setActive(getActiveLot(new Date(), lots));
  }, [lots]);

  return (
    <>
      <div className="lote">
        <span className="dot-live" />
        <span>
          Lote ativo · <b>{active?.name ?? "—"}</b> ·{" "}
          <b>{active ? `${active.discountPct}% OFF` : "—"}</b>
        </span>
      </div>
      {active?.coupon ? (
        <p className="wizard__coupon-hint">
          {renderCouponTemplate(couponHint, active)}
        </p>
      ) : null}
    </>
  );
}

function CategoryCarousel({
  unitId,
  period,
  categories,
  selectedId,
  onSelect,
}: {
  unitId: string;
  period: "3h" | "all";
  categories: BrandUnit["categories"]["all"];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const listRef = useRef<HTMLUListElement | null>(null);
  const [arrows, setArrows] = useState({ prev: false, next: false, hidden: true });

  const update = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth - 2;
    setArrows({
      prev: el.scrollLeft > 2,
      next: el.scrollLeft < max,
      hidden: max <= 0,
    });
  }, []);

  useEffect(() => {
    update();
    const t1 = setTimeout(update, 100);
    const t2 = setTimeout(update, 800);
    window.addEventListener("resize", update);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", update);
    };
  }, [update, period, categories.length]);

  const stepBy = () => {
    const el = listRef.current;
    if (!el) return 0;
    const first = el.querySelector("li");
    if (!first) return el.clientWidth * 0.8;
    const gap = parseFloat(getComputedStyle(el).gap) || 10;
    return (first as HTMLElement).offsetWidth + gap;
  };

  return (
    <div className="cats-carousel">
      <ul
        ref={listRef}
        className="unit__cats"
        role="radiogroup"
        data-period={period}
        aria-label={`Categoria ${period}`}
        onScroll={update}
      >
        {categories.map((c) => (
          <li key={c.id}>
            <label className={`cat${c.hero ? " cat--hero" : ""}`}>
              <input
                type="radio"
                name={`categoria-${unitId}-${period}`}
                value={c.id}
                checked={selectedId === c.id}
                onChange={() => onSelect(c.id)}
                hidden
              />
              <span>
                <span className="cat__name">{c.name}</span>
                <span className="cat__meta">{c.meta}</span>
                <span className="cat__chips">
                  {c.amenities.slice(0, 6).map((a) => (
                    <AmenityChip key={a} keyName={a} />
                  ))}
                  {c.amenities.length > 6 ? (
                    <span className="cat__chip cat__chip--more">
                      +{c.amenities.length - 6} comodidades
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="cat__arrow">
                <ArrowIcon />
              </span>
            </label>
          </li>
        ))}
      </ul>
      {!arrows.hidden ? (
        <>
          <button
            type="button"
            className="cats-arrow cats-arrow--prev"
            aria-label="Anterior"
            disabled={!arrows.prev}
            onClick={() =>
              listRef.current?.scrollBy({ left: -stepBy(), behavior: "smooth" })
            }
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            className="cats-arrow cats-arrow--next"
            aria-label="Próximo"
            disabled={!arrows.next}
            onClick={() =>
              listRef.current?.scrollBy({ left: stepBy(), behavior: "smooth" })
            }
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      ) : null}
    </div>
  );
}

function Summary({
  summaryCopy,
  unitName,
  unitId,
  period,
  dateObj,
  category,
  lots,
  pricing,
}: {
  summaryCopy: UnitPickerBlockProps["stepCopy"]["summary"];
  unitName: string;
  unitId: string;
  period?: Period;
  dateObj?: CampaignDate;
  category?: BrandUnit["categories"]["all"][number];
  lots: Campaign["campaign"]["lots"];
  pricing?: Campaign["campaign"]["pricing"];
}) {
  const [active, setActive] = useState<ActiveLot | null>(null);
  useEffect(() => {
    setActive(getActiveLot(new Date(), lots));
  }, [lots]);
  const { labels } = summaryCopy;

  const lotLine: ReactNode = active?.coupon
    ? renderCouponTemplate(summaryCopy.couponLine, active)
    : active
    ? summaryCopy.lotLineNoCoupon.replace("{name}", active.name)
    : "—";

  const priceCents =
    pricing && period && dateObj && category
      ? lookupPrice(pricing, {
          unitId,
          categoryId: category.id,
          periodId: period.id,
          tier: dateObj.tier,
        })
      : undefined;

  return (
    <div className="summary">
      <div className="summary__grid">
        <Cell lbl={labels.unit} val={unitName} />
        <Cell lbl={labels.period} val={period?.label ?? "—"} />
        <Cell lbl={labels.date} val={dateObj?.label ?? "—"} />
        <Cell lbl={labels.category} val={category?.name ?? "—"} />
        <Cell full lbl={labels.inclusos} val={period?.inclusos ?? "—"} />
        <Cell full lbl={labels.lot} val={lotLine} />
      </div>
      {priceCents != null ? (
        <div className="summary__price">
          <span className="lbl">{labels.price}</span>
          <span className="val">
            <b>{formatBRL(priceCents)}</b>
          </span>
        </div>
      ) : null}
    </div>
  );
}

function Cell({
  lbl,
  val,
  full,
}: {
  lbl: string;
  val: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`summary__cell${full ? " summary__cell--full" : ""}`}>
      <span className="lbl">{lbl}</span>
      <span className="val">{val}</span>
    </div>
  );
}

/* -------------------------------------------------------------
   Cupom — botão clicável que copia para o clipboard
   ------------------------------------------------------------- */
function CopyableCoupon({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        // Fallback antigo — ainda raro, mas evita lançar exceção em
        // browsers/contextos sem clipboard API (HTTP em alguns casos).
        const ta = document.createElement("textarea");
        ta.value = code;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop — silenciar é melhor que crashar a LP */
    }
  };

  return (
    <button
      type="button"
      className="coupon"
      onClick={onCopy}
      title="Clique para copiar"
      aria-label={`Copiar cupom ${code}`}
    >
      {code}
      {copied ? <span className="coupon__feedback">Copiado!</span> : null}
    </button>
  );
}

/**
 * Renderiza um template com `{coupon}` e `{discount}` em ReactNodes.
 * `{coupon}` vira um <CopyableCoupon>; `{discount}` vira a string
 * `${discountPct}%`. Outros placeholders ficam intactos.
 */
function renderCouponTemplate(template: string, lot: ActiveLot): ReactNode[] {
  const coupon = lot.coupon ?? "";
  const discount = `${lot.discountPct}%`;
  const parts = template.split(/(\{coupon\}|\{discount\})/);
  return parts.map((part, i) => {
    if (part === "{coupon}") {
      return coupon ? (
        <CopyableCoupon key={i} code={coupon} />
      ) : (
        <Fragment key={i} />
      );
    }
    if (part === "{discount}") return <Fragment key={i}>{discount}</Fragment>;
    return part ? <Fragment key={i}>{part}</Fragment> : null;
  });
}

/* -------------------------------------------------------------
   Helpers
   ------------------------------------------------------------- */
function hintForCategoryStep(
  period: Period,
  unit: BrandUnit,
  stepCopy: UnitPickerBlockProps["stepCopy"]
): string {
  if (period.scopeKey === "3h") {
    if (unit.id === "ipiranga") return stepCopy.category.hint3hIpiranga;
    if (unit.id === "lapa") return stepCopy.category.hint3hLapa;
    return stepCopy.category.hint;
  }
  if (period.id === "pernoite") return stepCopy.category.hintAllPernoite;
  return stepCopy.category.hint;
}

/* -------------------------------------------------------------
   Inline icons (mantém o componente self-contained)
   ------------------------------------------------------------- */
function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        d="M5 12h14M13 6l6 6-6 6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BackArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        d="M19 12H5M11 6l-6 6 6 6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 22s-7-7.5-7-13a7 7 0 1114 0c0 5.5-7 13-7 13z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}


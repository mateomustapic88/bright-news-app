import { useEffect, useState } from "react";
import { loadWeeklyBriefing } from "../api";
import { getBriefingWeek, selectBriefingStories } from "../weeklyBriefing";
import AppIcon from "./AppIcon";
import SavedStoryCard from "./SavedStoryCard";

const WeeklyBriefing = ({ isPremium, preferences, onPersonalize, t, uiLanguage, ...storyProps }) => {
  const [open, setOpen] = useState(false);
  const [personalized, setPersonalized] = useState(false);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState({ key: "", items: [], error: false });
  const [week, setWeek] = useState(getBriefingWeek);
  const usePersonalized = isPremium && personalized;
  const regions = usePersonalized ? preferences?.preferredRegions || [] : [];
  const categories = usePersonalized ? preferences?.preferredCategories || [] : [];
  const preferencesKey = JSON.stringify({ preferredRegions: regions, preferredCategories: categories });
  const key = `${week.start}:${preferencesKey}:${retry}`;
  const hasPreferences = Boolean(regions.length || categories.length);

  useEffect(() => {
    const updateWeek = () => setWeek(current => {
      const next = getBriefingWeek();
      return current.start === next.start ? current : next;
    });
    const timer = window.setInterval(updateWeek, 60_000);
    window.addEventListener("focus", updateWeek);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", updateWeek); };
  }, []);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const selectedPreferences = JSON.parse(preferencesKey);
    loadWeeklyBriefing(week, selectedPreferences).then(items => {
      if (active) setResult({ key, items: selectBriefingStories(items, week, selectedPreferences), error: false });
    }).catch(() => {
      if (active) setResult({ key, items: [], error: true });
    });
    return () => { active = false; };
  }, [open, key, preferencesKey, week]);

  const formatter = new Intl.DateTimeFormat(uiLanguage, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const dateLabel = `${formatter.format(new Date(week.start))} - ${formatter.format(new Date(Date.parse(week.end) - 1))}`;
  const loading = result.key !== key;

  return (
    <section className="bn-weekly" aria-labelledby="bn-weekly-title">
      <div className="bn-weekly__heading">
        <div>
          <h2 id="bn-weekly-title"><AppIcon name="sparkles" />{t("reading.weeklyTitle")}</h2>
          <p>{dateLabel}</p>
        </div>
        <button type="button" className="bn-reading-button" aria-expanded={open} aria-controls="bn-weekly-content" onClick={() => setOpen(value => !value)}>
          {t(open ? "reading.closeBriefing" : "reading.openBriefing")}<AppIcon name={open ? "chevronUp" : "chevronDown"} size={16} />
        </button>
      </div>
      {open && <div id="bn-weekly-content">
        <div className="bn-reading-toolbar">
          <div className="bn-reading-segments" role="group" aria-label={t("reading.edition")}>
            <button type="button" aria-pressed={!usePersonalized} onClick={() => setPersonalized(false)}>{t("reading.worldEdition")}</button>
            <button type="button" aria-pressed={usePersonalized} onClick={() => isPremium ? setPersonalized(true) : onPersonalize()}>
              <AppIcon name={isPremium ? "settings" : "lock"} size={15} />{t("reading.yourEdition")}
            </button>
          </div>
          {usePersonalized && <button type="button" className="bn-reading-button" onClick={onPersonalize}><AppIcon name="settings" size={16} />{t("reading.preferences")}</button>}
        </div>
        {usePersonalized && !hasPreferences ? <p>{t("reading.chooseTopics")}</p> : null}
        <div aria-live="polite" aria-busy={loading}>
          {loading ? <p>{t("reading.loading")}</p> : result.error ? <div className="bn-weekly__error"><p>{t("reading.error")}</p><button type="button" className="bn-reading-button" onClick={() => setRetry(value => value + 1)}>{t("reading.retry")}</button></div>
            : result.items.length === 0 ? <p>{t("reading.emptyWeek")}</p>
              : <div className="bn-weekly__stories">{result.items.map(story => <SavedStoryCard key={story.id} story={story} {...storyProps} showSummary t={t} uiLanguage={uiLanguage} />)}</div>}
        </div>
      </div>}
    </section>
  );
};

export default WeeklyBriefing;

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import {
  enableAnalytics,
  setAnalyticsUserId,
  setAnalyticsUserProperty,
  trackEvent,
  trackScreenView,
} from "./lib/analytics";
import { shareStory } from "./lib/shareStory";
import { supabase } from "./lib/supabase";
import { buildFeedbackMailto } from "./lib/appConfig";
import {
  getAuthRedirectUrl,
  isMobileAuthCallback,
  isNativeApp,
  parseMobileAuthCallback,
} from "./lib/mobileAuth";
import { purchasePremiumSubscription } from "./lib/googlePlayBilling";
import {
  createSavedStory,
  createSourceRead,
  createStoryReport,
  deleteSavedStory,
  loadAvailableRegionCodes,
  loadProfile,
  loadPersonalizedStories,
  loadPersonalizedStoriesPage,
  loadRawArticles,
  loadSourceReadCountToday,
  loadUserPreferences,
  loadSavedStoryIds,
  loadStories,
  loadStoriesPage,
  loadStoriesByIds,
  updateRawArticleReviewStatus,
  upsertProfile,
  upsertUserPreferences,
} from "./brightnews/api";
import {
  getAvailableAppLanguages,
  FREE_SOURCE_READ_LIMIT,
  inferPreferredRegionCode,
  inferPreferredAppLanguage,
  getLanguageFiltersForStories,
  getRegionsForCodes,
  getVisibleTabs,
  isPremiumProfile,
  SAVED_STORIES_KEY,
} from "./brightnews/constants";
import {
  createTranslator,
  getTabLabel,
  getUiLanguage,
} from "./brightnews/i18n";
import {
  readAppLanguage,
  incrementLocalSourceReadCount,
  readLocalSourceReadCount,
  readOnboardingDismissed,
  readPreferredRegion,
  readSavedStories,
  readThemePreference,
  readUserPreferences,
  writeAppLanguage,
  writeOnboardingDismissed,
  writePreferredRegion,
  writeStoryLanguageFilter,
  writeThemePreference,
  writeUserPreferences,
} from "./brightnews/storage";
import BottomNav from "./brightnews/components/BottomNav";
import Header from "./brightnews/components/Header";
import LoadingBar from "./brightnews/components/LoadingBar";
import OnboardingModal from "./brightnews/components/OnboardingModal";
import PremiumUpgradeDialog from "./brightnews/components/PremiumUpgradeDialog";
import SourceReadMeter from "./brightnews/components/SourceReadMeter";
import StatusDialog from "./brightnews/components/StatusDialog";
import StoryReportDialog from "./brightnews/components/StoryReportDialog";
import TopBar from "./brightnews/components/TopBar";
import DiscoverTab from "./brightnews/tabs/DiscoverTab";
import AccountTab from "./brightnews/tabs/AccountTab";
import HomeTab from "./brightnews/tabs/HomeTab";
import ReviewTab from "./brightnews/tabs/ReviewTab";
import SavedTab from "./brightnews/tabs/SavedTab";
import "./brightnews/styles/BrightNews.scss";

const WEB_INITIAL_STORY_LIMIT = 50;
const WEB_INCREMENTAL_STORY_LIMIT = 10;

const getReadLimitMessage = (used, limit, t) => {
  const remaining = Math.max(0, limit - used);
  return remaining === 1
    ? t("premium.oneReadLeft")
    : t("premium.readsLeft", { count: remaining });
};

const getAuthProvider = session => (
  session?.user?.app_metadata?.provider ||
  session?.user?.app_metadata?.providers?.[0] ||
  session?.user?.identities?.[0]?.provider ||
  "unknown"
);

const hasPreferenceValues = preferences => (
  (preferences?.preferredRegions || []).length > 0 ||
  (preferences?.preferredCategories || []).length > 0 ||
  Boolean(preferences?.strictPositiveFilter)
);

const strictPositiveBlocklist = [
  "attack",
  "crash",
  "crisis",
  "dead",
  "death",
  "dies",
  "disaster",
  "killed",
  "murder",
  "scandal",
  "violence",
  "war",
];
const strictPositivePattern = new RegExp(`\\b(${strictPositiveBlocklist.join("|")})\\b`, "i");

const applyPremiumStoryPreferences = (items, {
  isPremium,
  preferences,
  selectedRegion,
  selectedCategory,
}) => {
  if (!isPremium) return items;

  const preferredRegions = preferences?.preferredRegions || [];
  const preferredCategories = preferences?.preferredCategories || [];
  const strictPositiveFilter = Boolean(preferences?.strictPositiveFilter);

  let nextItems = items;

  if (selectedRegion === "world" && preferredRegions.length > 0) {
    nextItems = nextItems.filter(story => preferredRegions.includes(story.regionCode));
  }

  if (selectedCategory === "all" && preferredCategories.length > 0) {
    nextItems = nextItems.filter(story => preferredCategories.includes(story.category));
  }

  if (strictPositiveFilter) {
    const strictItems = nextItems.filter(story => {
      const text = `${story.headline || ""} ${story.summary || ""}`.toLowerCase();
      return !strictPositivePattern.test(text);
    });

    if (strictItems.length > 0) {
      nextItems = strictItems;
    }
  }

  return nextItems.length > 0 ? nextItems : items;
};

const getPersonalizedFeedCacheKey = preferences => {
  const preferredRegions = preferences?.preferredRegions || [];
  const preferredCategories = preferences?.preferredCategories || [];
  return [
    "personalized",
    preferredRegions.join(",") || "all-regions",
    preferredCategories.join(",") || "all-categories",
    preferences?.strictPositiveFilter ? "strict" : "standard",
  ].join("-");
};

const getReadableAuthError = error => {
  const message = String(error?.message || error?.msg || "");
  const normalized = message.toLowerCase();

  if (normalized.includes("unsupported provider") || normalized.includes("provider is not enabled")) {
    return "Google sign-in is not enabled in Supabase yet. Turn on the Google provider and add its client ID and secret.";
  }

  if (normalized.includes("invalid_client")) {
    return "Google OAuth client settings are invalid. Recheck the Google client ID, client secret, and Supabase callback URL.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Confirm your email address first, then sign in.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }

  if (normalized.includes("user already registered")) {
    return "An account with this email already exists. Sign in instead.";
  }

  if (normalized.includes("signup is disabled") || normalized.includes("email provider is disabled")) {
    return "Email sign-in is not enabled in Supabase yet. Turn on the Email provider in Authentication settings.";
  }

  return message || "Unable to start Google sign-in.";
};

const BrightNews = () => {
  const [stories, setStories]     = useState([]);
  const [savedStories, setSavedStories] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [region, setRegion]       = useState(() => readPreferredRegion() || inferPreferredRegionCode());
  const [availableRegionCodes, setAvailableRegionCodes] = useState(["world"]);
  const [category, setCategory]   = useState("all");
  const [feedMode, setFeedMode] = useState("standard");
  const [appLanguage, setAppLanguage] = useState(() => readAppLanguage() || inferPreferredAppLanguage());
  const [storyLanguageFilter, setStoryLanguageFilter] = useState(() => readAppLanguage() || inferPreferredAppLanguage());
  const [themePreference, setThemePreference] = useState(readThemePreference);
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => (
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false
  ));
  const [themeFeedback, setThemeFeedback] = useState(null);
  const resolvedTheme = themePreference === "system"
    ? (systemPrefersDark ? "dark" : "light")
    : themePreference;
  const [desktopViewport, setDesktopViewport] = useState(() => (
    typeof window !== "undefined" ? window.matchMedia("(min-width: 769px)").matches : false
  ));
  const [expanded, setExpanded]   = useState(null);
  const [error, setError]         = useState(null);
  const [saved, setSaved]         = useState(readSavedStories);
  const [tab, setTab]             = useState("home");
  const [session, setSession]     = useState(null);
  const [profile, setProfile]     = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [sourceReadsUsed, setSourceReadsUsed] = useState(readLocalSourceReadCount);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [premiumPurchaseLoading, setPremiumPurchaseLoading] = useState(false);
  const [personalizationSaving, setPersonalizationSaving] = useState(false);
  const [userPreferences, setUserPreferences] = useState(readUserPreferences);
  const [rawArticles, setRawArticles] = useState([]);
  const [rawLoading, setRawLoading] = useState(false);
  const [rawError, setRawError] = useState("");
  const [reviewFilter, setReviewFilter] = useState("pending");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [syncingSaved, setSyncingSaved] = useState(false);
  const [shareFeedback, setShareFeedback] = useState(null);
  const [reportStory, setReportStory] = useState(null);
  const [reportingStory, setReportingStory] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !readOnboardingDismissed());
  const [hideFeedChrome, setHideFeedChrome] = useState(false);
  const feedbackHref = buildFeedbackMailto();
  const cache = useRef({});
  const abortRef = useRef(null);
  const screenRef = useRef(null);
  const lastScreenScrollTopRef = useRef(0);
  const filterChromeInteractionRef = useRef(false);
  const activeFeedKeyRef = useRef("");
  const savedRef = useRef(saved);
  const regionInitializedRef = useRef(false);
  const categoryInitializedRef = useRef(false);
  const appLanguageInitializedRef = useRef(false);
  const storyLanguageInitializedRef = useRef(false);
  const uiLanguage = getUiLanguage(appLanguage);
  const t = useMemo(() => createTranslator(uiLanguage), [uiLanguage]);
  const effectiveProfile = profile;
  const isPremium = isPremiumProfile(effectiveProfile);
  const sourceReadState = useMemo(() => ({
    isPremium,
    used: sourceReadsUsed,
    limit: FREE_SOURCE_READ_LIMIT,
    remaining: Math.max(0, FREE_SOURCE_READ_LIMIT - sourceReadsUsed),
    remainingLabel: getReadLimitMessage(sourceReadsUsed, FREE_SOURCE_READ_LIMIT, t),
    premiumLabel: t("premium.unlimitedSources"),
  }), [isPremium, sourceReadsUsed, t]);
  const personalizedFeedAvailable = isPremium && hasPreferenceValues(userPreferences);

  const adjustSavedCount = useCallback((items, storyId, delta) => (
    items.map(story => (
      story.id === storyId
        ? { ...story, savedCount: Math.max(0, Number(story.savedCount || 0) + delta) }
        : story
    ))
  ), []);

  useEffect(() => {
    window.localStorage.setItem(SAVED_STORIES_KEY, JSON.stringify(saved));
  }, [saved]);

  useEffect(() => {
    writeUserPreferences(userPreferences);
  }, [userPreferences]);

  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);

  useEffect(() => {
    writePreferredRegion(region);
  }, [region]);

  useEffect(() => {
    if (personalizedFeedAvailable || feedMode !== "personalized") return;
    setFeedMode("standard");
  }, [feedMode, personalizedFeedAvailable]);

  useEffect(() => {
    writeAppLanguage(appLanguage);
  }, [appLanguage]);

  useEffect(() => {
    setStoryLanguageFilter(appLanguage);
  }, [appLanguage]);

  useEffect(() => {
    writeStoryLanguageFilter(storyLanguageFilter);
  }, [storyLanguageFilter]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (themePreference === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", themePreference);
    }
    writeThemePreference(themePreference);
  }, [themePreference]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = event => setSystemPrefersDark(event.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemePreference(() => {
      const next = resolvedTheme === "dark" ? "light" : "dark";
      setThemeFeedback({ theme: next, id: Date.now() });
      return next;
    });
  }, [resolvedTheme]);

  useEffect(() => {
    if (!themeFeedback) return undefined;
    const timer = window.setTimeout(() => setThemeFeedback(null), 2200);
    return () => window.clearTimeout(timer);
  }, [themeFeedback]);

  useEffect(() => {
    enableAnalytics();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem("brightnews.premiumPreview");
  }, []);

  useEffect(() => {
    if (tab !== "home") {
      setHideFeedChrome(false);
      return undefined;
    }

    const scroller = screenRef.current;
    if (!scroller) return undefined;

    lastScreenScrollTopRef.current = scroller.scrollTop;

    const handleFilterChromeStart = event => {
      if (!event.target?.closest?.(".bn-region-context, .bn-home-tab__filters-mobile")) return;
      filterChromeInteractionRef.current = true;
      setHideFeedChrome(false);
    };

    const handleFilterChromeEnd = () => {
      window.setTimeout(() => {
        filterChromeInteractionRef.current = false;
        lastScreenScrollTopRef.current = scroller.scrollTop;
      }, 120);
    };

    const handleScroll = () => {
      const nextScrollTop = scroller.scrollTop;
      const scrollDelta = nextScrollTop - lastScreenScrollTopRef.current;

      if (nextScrollTop <= 8) {
        setHideFeedChrome(false);
      } else if (filterChromeInteractionRef.current) {
        setHideFeedChrome(false);
      } else if (scrollDelta > 16 && nextScrollTop > 72) {
        setHideFeedChrome(true);
      } else if (scrollDelta < -16) {
        setHideFeedChrome(false);
      }

      lastScreenScrollTopRef.current = Math.max(0, nextScrollTop);
    };

    document.addEventListener("touchstart", handleFilterChromeStart, { passive: true, capture: true });
    document.addEventListener("touchend", handleFilterChromeEnd, { passive: true, capture: true });
    document.addEventListener("pointerdown", handleFilterChromeStart, { passive: true, capture: true });
    document.addEventListener("pointerup", handleFilterChromeEnd, { passive: true, capture: true });
    scroller.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      document.removeEventListener("touchstart", handleFilterChromeStart, { capture: true });
      document.removeEventListener("touchend", handleFilterChromeEnd, { capture: true });
      document.removeEventListener("pointerdown", handleFilterChromeStart, { capture: true });
      document.removeEventListener("pointerup", handleFilterChromeEnd, { capture: true });
      scroller.removeEventListener("scroll", handleScroll);
    };
  }, [tab]);

  useEffect(() => {
    if (!supabase) return undefined;

    let active = true;

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) {
        setAuthError(sessionError.message);
        return;
      }
      setSession(data.session);
    });

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (!nextSession?.user) {
        setProfile(null);
        setUserPreferences(readUserPreferences());
      }

      if (event === "SIGNED_IN") {
        setAuthMessage(t("feedback.signInSuccess"));
        setAuthError("");
        trackEvent("sign_in_success", {
          provider: getAuthProvider(nextSession),
          platform: isNativeApp() ? "native" : "web",
        });
      }

      if (event === "SIGNED_OUT") {
        trackEvent("sign_out", {
          platform: isNativeApp() ? "native" : "web",
        });
      }

      setAuthLoading(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [t]);

  useEffect(() => {
    if (!supabase || !isNativeApp()) return undefined;

    let active = true;
    let urlListener;
    let browserListener;

    const handleMobileAuthCallback = async url => {
      if (!active || !isMobileAuthCallback(url)) return;

      const callback = parseMobileAuthCallback(url);
      if (!callback) return;

      setAuthLoading(true);
      setAuthError("");

      try {
        if (callback.errorCode || callback.errorDescription) {
          throw new Error(callback.errorDescription || callback.errorCode);
        }

        if (callback.accessToken && callback.refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: callback.accessToken,
            refresh_token: callback.refreshToken,
          });

          if (sessionError) {
            throw sessionError;
          }
        } else if (callback.code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(callback.code);
          if (exchangeError) {
            throw exchangeError;
          }
        } else {
          throw new Error("Google sign-in callback did not include a session.");
        }

        await Browser.close();
      } catch (callbackError) {
        if (active) {
          setAuthError(getReadableAuthError(callbackError));
          setAuthLoading(false);
        }
      }
    };

    App.getLaunchUrl()
      .then(result => handleMobileAuthCallback(result?.url))
      .catch(() => {});

    App.addListener("appUrlOpen", ({ url }) => {
      handleMobileAuthCallback(url);
    }).then(listener => {
      urlListener = listener;
    });

    Browser.addListener("browserFinished", () => {
      if (active) {
        setAuthLoading(false);
      }
    }).then(listener => {
      browserListener = listener;
    });

    return () => {
      active = false;
      urlListener?.remove();
      browserListener?.remove();
    };
  }, []);

  const refreshAvailableRegions = useCallback(async () => {
    try {
      const codes = await loadAvailableRegionCodes();
      setAvailableRegionCodes(codes);
    } catch {
      setAvailableRegionCodes(["world"]);
    }
  }, []);

  useEffect(() => {
    refreshAvailableRegions();
  }, [refreshAvailableRegions]);

  useEffect(() => {
    if (!shareFeedback) return undefined;

    const timer = window.setTimeout(() => setShareFeedback(null), 2600);
    return () => window.clearTimeout(timer);
  }, [shareFeedback]);

  useEffect(() => {
    trackScreenView(tab);
  }, [tab]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia("(min-width: 769px)");
    const syncViewportMode = event => {
      setDesktopViewport(event.matches);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncViewportMode);
      return () => mediaQuery.removeEventListener("change", syncViewportMode);
    }

    mediaQuery.addListener(syncViewportMode);
    return () => mediaQuery.removeListener(syncViewportMode);
  }, []);

  useEffect(() => {
    if (!regionInitializedRef.current) {
      regionInitializedRef.current = true;
      setAnalyticsUserProperty("selected_region", region);
      return;
    }

    trackEvent("region_change", { region });
    setAnalyticsUserProperty("selected_region", region);
  }, [region]);

  useEffect(() => {
    if (!categoryInitializedRef.current) {
      categoryInitializedRef.current = true;
      setAnalyticsUserProperty("selected_category", category);
      return;
    }

    trackEvent("category_change", { category });
    setAnalyticsUserProperty("selected_category", category);
  }, [category]);

  useEffect(() => {
    if (!appLanguageInitializedRef.current) {
      appLanguageInitializedRef.current = true;
      setAnalyticsUserProperty("app_language", appLanguage);
      return;
    }

    trackEvent("app_language_change", { language: appLanguage });
    setAnalyticsUserProperty("app_language", appLanguage);
  }, [appLanguage]);

  useEffect(() => {
    if (!storyLanguageInitializedRef.current) {
      storyLanguageInitializedRef.current = true;
      setAnalyticsUserProperty("story_language_filter", storyLanguageFilter);
      return;
    }

    trackEvent("story_language_filter_change", { language: storyLanguageFilter });
    setAnalyticsUserProperty("story_language_filter", storyLanguageFilter);
  }, [storyLanguageFilter]);

  useEffect(() => {
    if (!expanded) return;

    const story = stories.find(item => item.id === expanded);
    if (!story) return;

    trackEvent("story_open", {
      category: story.category,
      region: story.regionCode,
      language: story.languageCode,
    });
  }, [expanded, stories]);

  useEffect(() => {
    if (!session?.user) {
      setAnalyticsUserId(null);
      return;
    }

    setAnalyticsUserId(session.user.id);
  }, [session?.user, t]);

  useEffect(() => {
    let active = true;

    const loadSourceReads = async () => {
      if (isPremium) {
        setSourceReadsUsed(0);
        return;
      }

      if (!session?.user) {
        setSourceReadsUsed(readLocalSourceReadCount());
        return;
      }

      try {
        const count = await loadSourceReadCountToday(session.user.id);
        if (active) setSourceReadsUsed(count);
      } catch {
        if (active) setSourceReadsUsed(readLocalSourceReadCount());
      }
    };

    loadSourceReads();

    return () => {
      active = false;
    };
  }, [isPremium, session?.user]);

  useEffect(() => {
    if (!session?.user) return;

    setAnalyticsUserProperty("signed_in", "true");
    setAnalyticsUserProperty("plan", isPremium ? "premium" : "free");
    setAnalyticsUserProperty("is_admin", effectiveProfile?.is_admin ? "true" : "false");
  }, [effectiveProfile?.is_admin, isPremium, session?.user]);

  const handleDismissOnboarding = () => {
    writeOnboardingDismissed(true);
    setShowOnboarding(false);
    trackEvent("onboarding_dismiss", {
      signed_in: Boolean(session?.user),
    });
  };

  useEffect(() => {
    if (availableRegionCodes.includes(region)) return;

    if (availableRegionCodes.includes("world")) {
      setRegion("world");
      return;
    }

    if (availableRegionCodes.length > 0) {
      setRegion(availableRegionCodes[0]);
    }
  }, [availableRegionCodes, region]);

  const languageFilters = getLanguageFiltersForStories(stories);
  const languageFilteredStories = stories.filter(story => (
    feedMode === "personalized" ||
    storyLanguageFilter === "all" || story.languageCode === storyLanguageFilter
  ));
  const visibleStories = applyPremiumStoryPreferences(languageFilteredStories, {
    isPremium: feedMode === "personalized" && personalizedFeedAvailable,
    preferences: userPreferences,
    selectedRegion: "world",
    selectedCategory: "all",
  });
  const appLanguages = getAvailableAppLanguages();

  useEffect(() => {
    if (loading || stories.length === 0) return;
    if (languageFilters.some(item => item.id === storyLanguageFilter)) return;
    setStoryLanguageFilter("all");
  }, [storyLanguageFilter, languageFilters, loading, stories.length]);

  useEffect(() => {
    if (!session?.user) return;

    let active = true;

    const ensureProfile = async () => {
      setProfileLoading(true);

      try {
        const existingProfile = await loadProfile(session.user.id);
        const nextProfile = existingProfile || await upsertProfile(session.user);

        if (active) {
          setProfile(nextProfile);
        }
      } catch (profileError) {
        if (active) {
          setAuthError(profileError.message || t("feedback.loadAccountError"));
        }
      } finally {
        if (active) {
          setProfileLoading(false);
        }
      }
    };

    const syncSavedStories = async () => {
      setSyncingSaved(true);
      setAuthError("");

      try {
        const remoteSaved = await loadSavedStoryIds(session.user.id);
        const mergedSaved = Array.from(new Set([...savedRef.current, ...remoteSaved]));
        const missingRemote = mergedSaved.filter(storyId => !remoteSaved.includes(storyId));

        if (missingRemote.length > 0 && supabase) {
          const { error: insertError } = await supabase
            .from("saved_stories")
            .insert(missingRemote.map(storyId => ({ user_id: session.user.id, story_id: storyId })));

          if (insertError && insertError.code !== "23505") {
            throw new Error(insertError.message);
          }
        }

        if (active) {
          setSaved(mergedSaved);
          setAuthMessage(t("feedback.savedSynced"));
        }
      } catch (syncError) {
        if (active) {
          setAuthError(syncError.message || t("feedback.syncSavedError"));
        }
      } finally {
        if (active) {
          setSyncingSaved(false);
        }
      }
    };

    ensureProfile();
    syncSavedStories();

    return () => {
      active = false;
    };
  }, [session?.user, t]);

  useEffect(() => {
    if (!session?.user) {
      setUserPreferences(readUserPreferences());
      return undefined;
    }

    let active = true;

    const syncPreferences = async () => {
      const localPreferences = readUserPreferences();

      try {
        const remotePreferences = await loadUserPreferences(session.user.id);
        const nextPreferences = remotePreferences || localPreferences;

        if (active) {
          setUserPreferences(nextPreferences);
        }

        if (!remotePreferences && isPremium && hasPreferenceValues(localPreferences)) {
          await upsertUserPreferences(session.user.id, localPreferences);
        }
      } catch {
        if (active) {
          setUserPreferences(localPreferences);
        }
      }
    };

    syncPreferences();

    return () => {
      active = false;
    };
  }, [isPremium, session?.user]);

  useEffect(() => {
    let active = true;

    const loadSavedStories = async () => {
      if (!session?.user) {
        setSavedStories([]);
        return;
      }

      if (saved.length === 0) {
        setSavedStories([]);
        return;
      }

      try {
        const result = await loadStoriesByIds(saved);
        if (active) {
          setSavedStories(result);
        }
      } catch {
        if (active) {
          setSavedStories(stories.filter(story => saved.includes(story.id)));
        }
      }
    };

    loadSavedStories();

    return () => {
      active = false;
    };
  }, [saved, session?.user, stories]);

  const fetchRawArticles = useCallback(async currentFilter => {
    if (!session?.user || !profile?.is_admin) return;

    setRawLoading(true);
    setRawError("");

    try {
      const result = await loadRawArticles(currentFilter);
      setRawArticles(result);
    } catch (loadError) {
      setRawError(loadError.message || t("feedback.loadReviewError"));
    } finally {
      setRawLoading(false);
    }
  }, [session?.user, profile?.is_admin, t]);

  useEffect(() => {
    if (tab !== "review" || !session?.user || !profile?.is_admin) return;
    fetchRawArticles(reviewFilter);
  }, [tab, session?.user, profile?.is_admin, reviewFilter, fetchRawArticles]);

  const fetchNews = useCallback(async (regionCode, categoryId, force = false) => {
    const usePersonalizedFeed = feedMode === "personalized" && personalizedFeedAvailable;
    const cacheKey = usePersonalizedFeed
      ? getPersonalizedFeedCacheKey(userPreferences)
      : `${regionCode}-${categoryId}`;
    const isWebPagination = !isNativeApp() && desktopViewport;

    if (!force && cache.current[cacheKey]) {
      activeFeedKeyRef.current = cacheKey;
      setStories(cache.current[cacheKey].items);
      setError(null);
      setExpanded(null);
      setLoading(false);
      setLoadingMore(false);
      setFirstLoad(false);
      return;
    }

    const reqId = Date.now();
    abortRef.current = reqId;

    setLoading(true);
    setLoadingMore(false);
    setError(null);
    setExpanded(null);
    activeFeedKeyRef.current = cacheKey;

    try {
      const result = usePersonalizedFeed
        ? (
            isWebPagination
              ? await loadPersonalizedStoriesPage(userPreferences, { offset: 0, limit: WEB_INITIAL_STORY_LIMIT })
              : {
                  items: await loadPersonalizedStories(userPreferences),
                  hasMore: false,
                  nextOffset: 0,
                }
          )
        : (
            isWebPagination
              ? await loadStoriesPage(regionCode, categoryId, { offset: 0, limit: WEB_INITIAL_STORY_LIMIT })
              : {
                  items: await loadStories(regionCode, categoryId),
                  hasMore: false,
                  nextOffset: 0,
                }
          );
      if (abortRef.current !== reqId) return;
      cache.current[cacheKey] = result;
      setStories(result.items);
      setFirstLoad(false);
      setLoading(false);
    } catch (e) {
      if (abortRef.current !== reqId) return;
      setStories([]);
      setError(e.message || "Unable to load stories right now.");
      setFirstLoad(false);
      setLoading(false);
    }
  }, [desktopViewport, feedMode, personalizedFeedAvailable, userPreferences]);

  const primePersonalizedFeed = useCallback(async preferences => {
    const cacheKey = getPersonalizedFeedCacheKey(preferences);
    const isWebPagination = !isNativeApp() && desktopViewport;
    const reqId = Date.now();
    abortRef.current = reqId;

    setLoading(true);
    setLoadingMore(false);
    setError(null);
    setExpanded(null);
    activeFeedKeyRef.current = cacheKey;

    try {
      const result = isWebPagination
        ? await loadPersonalizedStoriesPage(preferences, { offset: 0, limit: WEB_INITIAL_STORY_LIMIT })
        : {
            items: await loadPersonalizedStories(preferences),
            hasMore: false,
            nextOffset: 0,
          };

      if (abortRef.current !== reqId) return;

      cache.current[cacheKey] = result;
      setStories(result.items);
      setFirstLoad(false);
      setLoading(false);
    } catch (loadError) {
      if (abortRef.current !== reqId) return;

      setStories([]);
      setError(loadError.message || "Unable to load stories right now.");
      setFirstLoad(false);
      setLoading(false);
    }
  }, [desktopViewport]);

  const loadMoreStories = useCallback(async () => {
    if (isNativeApp() || !desktopViewport) return;
    if (loading || loadingMore) return;

    const usePersonalizedFeed = feedMode === "personalized" && personalizedFeedAvailable;
    const cacheKey = usePersonalizedFeed
      ? getPersonalizedFeedCacheKey(userPreferences)
      : `${region}-${category}`;
    const currentFeed = cache.current[cacheKey];

    if (!currentFeed?.hasMore) return;

    setLoadingMore(true);

    try {
      const pageOptions = {
        offset: currentFeed.nextOffset || currentFeed.items.length,
        limit: WEB_INCREMENTAL_STORY_LIMIT,
      };
      const nextPage = usePersonalizedFeed
        ? await loadPersonalizedStoriesPage(userPreferences, pageOptions)
        : await loadStoriesPage(region, category, pageOptions);

      if (activeFeedKeyRef.current !== cacheKey) return;

      const mergedItems = [...currentFeed.items, ...nextPage.items].filter((story, index, items) => (
        items.findIndex(item => item.id === story.id) === index
      ));

      cache.current[cacheKey] = {
        items: mergedItems,
        hasMore: nextPage.hasMore,
        nextOffset: (currentFeed.nextOffset || currentFeed.items.length) + nextPage.items.length,
      };

      setStories(mergedItems);
    } catch (loadMoreError) {
      setError(loadMoreError.message || "Unable to load more stories right now.");
    } finally {
      if (activeFeedKeyRef.current === cacheKey) {
        setLoadingMore(false);
      }
    }
  }, [
    category,
    desktopViewport,
    feedMode,
    loading,
    loadingMore,
    personalizedFeedAvailable,
    region,
    userPreferences,
  ]);

  const availableRegions = getRegionsForCodes(availableRegionCodes);

  const handleSetRegion = useCallback(nextRegion => {
    setFeedMode("standard");
    setRegion(nextRegion);
  }, []);

  const handleSetCategory = useCallback(nextCategory => {
    setFeedMode("standard");
    setCategory(nextCategory);
  }, []);

  const handleSelectPersonalizedFeed = useCallback(() => {
    if (!personalizedFeedAvailable) return;
    setFeedMode("personalized");
    setRegion("world");
    setCategory("all");
    setStoryLanguageFilter("all");
    trackEvent("personalized_feed_select", {
      preferred_regions: (userPreferences?.preferredRegions || []).length,
      preferred_categories: (userPreferences?.preferredCategories || []).length,
      strict_positive_filter: Boolean(userPreferences?.strictPositiveFilter),
    });
  }, [personalizedFeedAvailable, userPreferences]);

  useEffect(() => {
    const timer = setTimeout(() => fetchNews(region, category), 400);
    return () => clearTimeout(timer);
  }, [region, category, fetchNews]);

  const handleGoogleSignIn = async () => {
    if (!supabase) {
      setAuthError("Supabase configuration is missing.");
      return;
    }

    setAuthLoading(true);
    setAuthError("");
    setAuthMessage("");
    trackEvent("sign_in_start", {
      provider: "google",
      platform: isNativeApp() ? "native" : "web",
    });

    try {
      const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getAuthRedirectUrl(),
          skipBrowserRedirect: isNativeApp(),
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (signInError) throw signInError;

      if (isNativeApp()) {
        if (!data?.url) {
          throw new Error("Supabase did not return a Google sign-in URL.");
        }

        await Browser.open({
          url: data.url,
          presentationStyle: "fullscreen",
        });

        setAuthMessage(t("auth.redirecting"));
        return;
      }

      setAuthMessage(t("auth.redirecting"));
    } catch (submitError) {
      setAuthLoading(false);
      setAuthError(getReadableAuthError(submitError));
    }
  };

  const handleEmailAuth = async ({ mode, email, password, confirmPassword }) => {
    if (!supabase) {
      setAuthError("Supabase configuration is missing.");
      return { ok: false };
    }

    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedPassword = String(password || "");
    const normalizedConfirmPassword = String(confirmPassword || "");

    if (!normalizedEmail) {
      setAuthError(t("auth.enterEmail"));
      return { ok: false };
    }

    if (!normalizedPassword) {
      setAuthError(t("auth.enterPassword"));
      return { ok: false };
    }

    if (mode === "register" && normalizedPassword.length < 8) {
      setAuthError(t("auth.passwordMinLength"));
      return { ok: false };
    }

    if (mode === "register" && normalizedPassword !== normalizedConfirmPassword) {
      setAuthError(t("auth.passwordMismatch"));
      return { ok: false };
    }

    setAuthLoading(true);
    setAuthError("");
    setAuthMessage("");

    trackEvent(mode === "register" ? "sign_up_start" : "sign_in_start", {
      provider: "email",
      platform: isNativeApp() ? "native" : "web",
    });

    try {
      if (mode === "register") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: normalizedPassword,
          options: {
            emailRedirectTo: getAuthRedirectUrl(),
          },
        });

        if (signUpError) throw signUpError;

        if (data?.user?.identities && data.user.identities.length === 0) {
          setAuthError(t("auth.emailAlreadyExists"));
          return { ok: false };
        }

        if (data?.session) {
          setAuthMessage(t("auth.accountCreated"));
          return { ok: true, mode, signedIn: true };
        } else {
          setAuthMessage(t("auth.confirmEmailNotice"));
          return { ok: true, mode, needsEmailConfirmation: true };
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: normalizedPassword,
        });

        if (signInError) throw signInError;
        return { ok: true, mode, signedIn: true };
      }
    } catch (submitError) {
      setAuthError(getReadableAuthError(submitError));
      return { ok: false };
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;

    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setAuthError(signOutError.message);
      return;
    }

    setAuthMessage(t("auth.signOut"));
  };

  const toggleSave = async (id, e) => {
    e?.stopPropagation();
    const isSaved = saved.includes(id);
    const nextSaved = isSaved ? saved.filter(item => item !== id) : [...saved, id];
    const story = stories.find(item => item.id === id) || savedStories.find(item => item.id === id);
    const delta = isSaved ? -1 : 1;

    setSaved(nextSaved);
    setStories(current => adjustSavedCount(current, id, delta));
    setSavedStories(current => adjustSavedCount(current, id, delta));
    Object.keys(cache.current).forEach(cacheKey => {
      const cachedFeed = cache.current[cacheKey];
      if (!cachedFeed) return;
      cache.current[cacheKey] = {
        ...cachedFeed,
        items: adjustSavedCount(cachedFeed.items || [], id, delta),
      };
    });
    trackEvent(isSaved ? "story_unsave" : "story_save", {
      category: story?.category,
      region: story?.regionCode,
      language: story?.languageCode,
      signed_in: Boolean(session?.user),
    });

    if (!session?.user) return;

    try {
      if (isSaved) {
        await deleteSavedStory(session.user.id, id);
      } else {
        await createSavedStory(session.user.id, id);
      }
    } catch (saveError) {
      setSaved(saved);
      setStories(current => adjustSavedCount(current, id, -delta));
      setSavedStories(current => adjustSavedCount(current, id, -delta));
      Object.keys(cache.current).forEach(cacheKey => {
        const cachedFeed = cache.current[cacheKey];
        if (!cachedFeed) return;
        cache.current[cacheKey] = {
          ...cachedFeed,
          items: adjustSavedCount(cachedFeed.items || [], id, -delta),
        };
      });
      setAuthError(saveError.message || t("feedback.saveSyncError"));
    }
  };

  const handleShareStory = async (story, event) => {
    event?.stopPropagation();

    try {
      const result = await shareStory(story);
      if (result) {
        setShareFeedback(result);
        if (result.action !== "unsupported") {
          trackEvent("story_share", {
            method: result.action,
            category: story.category,
            region: story.regionCode,
            language: story.languageCode,
          });
        }
      }
    } catch {
      setShareFeedback({
        variant: "error",
        message: t("feedback.shareError"),
      });
    }
  };

  const handleStartPremiumPurchase = async () => {
    if (!session?.user) {
      setUpgradeDialogOpen(false);
      setTab("account");
      setAuthMessage(t("premium.signInToUpgrade"));
      trackEvent("premium_sign_in_required", {
        platform: isNativeApp() ? "native" : "web",
      });
      return;
    }

    if (!isNativeApp()) {
      setUpgradeDialogOpen(false);
      setTab("account");
      setAuthMessage(t("premium.androidOnly"));
      setAuthError("");
      setShareFeedback({
        variant: "info",
        message: t("premium.androidOnly"),
      });
      trackEvent("premium_android_required", {
        signed_in: true,
      });
      return;
    }

    setPremiumPurchaseLoading(true);
    setAuthError("");
    setAuthMessage(t("premium.openingGooglePlay"));
    setShareFeedback(null);
    trackEvent("premium_purchase_start", {
      signed_in: true,
      platform: "native",
    });

    try {
      const result = await purchasePremiumSubscription();

      if (result.pending) {
        setAuthMessage(t("premium.purchasePending"));
        setShareFeedback({
          variant: "info",
          message: t("premium.purchasePending"),
        });
        return;
      }

      const nextProfile = result.profile || await loadProfile(session.user.id);
      setProfile(nextProfile);
      setUpgradeDialogOpen(false);
      setTab("account");
      setAuthMessage(t("premium.purchaseSuccess"));
      setShareFeedback({
        variant: "accent",
        message: t("premium.purchaseSuccess"),
      });
      trackEvent("premium_purchase_success", {
        signed_in: true,
      });
    } catch (purchaseError) {
      setUpgradeDialogOpen(false);
      setTab("account");
      setAuthMessage("");
      setAuthError(purchaseError?.message || t("premium.purchaseError"));
      setShareFeedback({
        variant: "error",
        message: purchaseError?.message || t("premium.purchaseError"),
      });
      trackEvent("premium_purchase_error", {
        signed_in: true,
        message: purchaseError?.message || "unknown",
      });
    } finally {
      setPremiumPurchaseLoading(false);
    }
  };

  const handleConfirmPersonalization = async nextPreferences => {
    if (!isPremium) {
      setUpgradeDialogOpen(true);
      trackEvent("premium_locked_preference_click", {
        signed_in: Boolean(session?.user),
      });
      return;
    }

    setPersonalizationSaving(true);
    setUserPreferences(nextPreferences);
    setFeedMode("personalized");
    setRegion("world");
    setCategory("all");
    setStoryLanguageFilter("all");

    try {
      if (session?.user) {
        await upsertUserPreferences(session.user.id, nextPreferences);
      }

      await primePersonalizedFeed(nextPreferences);

      setTab("home");
      setShareFeedback({
        variant: "accent",
        message: t("premium.personalizationReady"),
      });
      trackEvent("premium_preferences_apply", {
        signed_in: Boolean(session?.user),
        is_premium: isPremium,
        preferred_regions: (nextPreferences?.preferredRegions || []).length,
        preferred_categories: (nextPreferences?.preferredCategories || []).length,
        strict_positive_filter: Boolean(nextPreferences?.strictPositiveFilter),
      });
    } catch {
      setShareFeedback({
        variant: "error",
        message: t("feedback.preferencesSyncError"),
      });
    } finally {
      setPersonalizationSaving(false);
    }
  };

  const openSourceUrl = async normalizedUrl => {
    if (isNativeApp()) {
      await Browser.open({
        url: normalizedUrl,
        presentationStyle: "popover",
      });
      return;
    }

    window.open(normalizedUrl, "_blank", "noopener,noreferrer");
  };

  const handleReadSource = async (story, normalizedUrl, event) => {
    event?.stopPropagation();

    if (!normalizedUrl || !story) return;

    if (!isPremium && sourceReadsUsed >= FREE_SOURCE_READ_LIMIT) {
      setUpgradeDialogOpen(true);
      trackEvent("source_read_limit_reached", {
        category: story.category,
        region: story.regionCode,
        language: story.languageCode,
        signed_in: Boolean(session?.user),
      });
      return;
    }

    try {
      await openSourceUrl(normalizedUrl);

      if (!isPremium) {
        if (session?.user) {
          try {
            await createSourceRead(session.user.id, story.id);
            const count = await loadSourceReadCountToday(session.user.id);
            setSourceReadsUsed(count);
          } catch {
            setSourceReadsUsed(incrementLocalSourceReadCount());
          }
        } else {
          setSourceReadsUsed(incrementLocalSourceReadCount());
        }
      }

      trackEvent("story_read_source", {
        category: story.category,
        region: story.regionCode,
        language: story.languageCode,
        is_premium: isPremium,
        signed_in: Boolean(session?.user),
      });
    } catch {
      setShareFeedback({
        variant: "error",
        message: t("feedback.sourceOpenError"),
      });
    }
  };

  const handleReportStory = (story, event) => {
    event?.stopPropagation();
    setReportStory(story);
  };

  const submitStoryReport = async reason => {
    if (!reportStory) return;

    if (!session?.user) {
      setReportStory(null);
      setShareFeedback({
        variant: "info",
        message: t("feedback.reportSignInRequired"),
      });
      trackEvent("story_report_sign_in_required", {
        reason,
        category: reportStory.category,
        region: reportStory.regionCode,
        language: reportStory.languageCode,
      });
      return;
    }

    setReportingStory(true);

    try {
      await createStoryReport(session.user.id, reportStory.id, reason);
      trackEvent("story_report", {
        reason,
        category: reportStory.category,
        region: reportStory.regionCode,
        language: reportStory.languageCode,
      });
      setReportStory(null);
      setShareFeedback({
        variant: "accent",
        message: t("feedback.reportSubmitted"),
      });
    } catch (reportError) {
      setShareFeedback({
        variant: "error",
        message: reportError.message || t("feedback.reportError"),
      });
    } finally {
      setReportingStory(false);
    }
  };

  const handleApproveRawArticle = async rawArticleId => {
    try {
      await updateRawArticleReviewStatus(rawArticleId, "approved");
      await fetchRawArticles(reviewFilter);
    } catch (reviewError) {
      setRawError(reviewError.message || t("feedback.approveError"));
    }
  };

  const handleRejectRawArticle = async rawArticleId => {
    try {
      await updateRawArticleReviewStatus(rawArticleId, "rejected", "manual_review");
      await fetchRawArticles(reviewFilter);
    } catch (reviewError) {
      setRawError(reviewError.message || t("feedback.rejectError"));
    }
  };

  const handleFeedbackClick = () => {
    trackEvent("feedback_click", {
      tab,
      signed_in: Boolean(session?.user),
    });
  };

  const handleSourceMeterClick = () => {
    setUpgradeDialogOpen(true);
    trackEvent("source_read_meter_click", {
      signed_in: Boolean(session?.user),
      used: sourceReadState.used,
      limit: sourceReadState.limit,
    });
  };

  const tabs = getVisibleTabs(session, profile);
  const localizedTabs = tabs.map(item => ({
    ...item,
    label: getTabLabel(item.id, uiLanguage),
  }));
  const activeFeedCacheKey = feedMode === "personalized" && personalizedFeedAvailable
    ? getPersonalizedFeedCacheKey(userPreferences)
    : `${region}-${category}`;

  return (
    <div className={`bright-news${hideFeedChrome && tab === "home" ? " is-feed-chrome-hidden" : ""}`}>
      {loading ? <LoadingBar /> : null}

      {themeFeedback ? (
        <div
          key={themeFeedback.id}
          className="bn-theme-toast"
          role="status"
          aria-live="polite"
          data-theme-state={themeFeedback.theme}
        >
          <span aria-hidden="true" className="bn-theme-toast__glyph">
            {themeFeedback.theme === "dark" ? "🌙" : "☀️"}
          </span>
          <span>
            {t(themeFeedback.theme === "dark" ? "topbar.themeSwitchedDark" : "topbar.themeSwitchedLight")}
          </span>
        </div>
      ) : null}

      <TopBar
        session={session}
        tab={tab}
        tabs={localizedTabs}
        setTab={setTab}
        appLanguage={appLanguage}
        appLanguages={appLanguages}
        setAppLanguage={setAppLanguage}
        resolvedTheme={resolvedTheme}
        onToggleTheme={toggleTheme}
        t={t}
        uiLanguage={uiLanguage}
      />
      <Header
        region={region}
        regions={availableRegions}
        setRegion={handleSetRegion}
        feedbackHref={feedbackHref}
        onFeedbackClick={handleFeedbackClick}
        showRegions={tab === "home" && desktopViewport}
        hideFeedChrome={hideFeedChrome && tab === "home" && desktopViewport}
        refreshing={refreshing}
        onRefresh={async () => {
          if (refreshing) return;

          setRefreshing(true);
          trackEvent("feed_refresh", { region, category, language: storyLanguageFilter });
          try {
            await refreshAvailableRegions();
            await fetchNews(region, category, true);
          } finally {
            setRefreshing(false);
          }
        }}
        t={t}
        uiLanguage={uiLanguage}
      />

      {refreshing ? (
        <StatusDialog
          className="bn-refresh-dialog"
          label={t("header.refreshingStories")}
          message={t("header.refreshingStories")}
        />
      ) : null}

      {reportStory ? (
        <StoryReportDialog
          story={reportStory}
          onClose={() => setReportStory(null)}
          onSubmit={submitStoryReport}
          reporting={reportingStory}
          t={t}
        />
      ) : null}

      <PremiumUpgradeDialog
        open={upgradeDialogOpen}
        onClose={() => setUpgradeDialogOpen(false)}
        onStartPremiumPurchase={handleStartPremiumPurchase}
        purchaseLoading={premiumPurchaseLoading}
        purchaseStatus={premiumPurchaseLoading ? t("premium.openingGooglePlay") : ""}
        readLimit={FREE_SOURCE_READ_LIMIT}
        t={t}
      />

      <div
        ref={screenRef}
        className={`bn-screen${hideFeedChrome && tab === "home" ? " is-feed-chrome-hidden" : ""}`}
      >
        {tab === "home" && (
          <HomeTab
            region={region}
            regions={availableRegions}
            setRegion={handleSetRegion}
            category={category}
            setCategory={handleSetCategory}
            feedMode={feedMode}
            setFeedMode={setFeedMode}
            personalizedFeedAvailable={personalizedFeedAvailable}
            handleSelectPersonalizedFeed={handleSelectPersonalizedFeed}
            loading={loading}
            loadingMore={loadingMore}
            firstLoad={firstLoad}
            error={error}
            shareFeedback={shareFeedback}
            stories={visibleStories}
            hasMore={!isNativeApp() && desktopViewport && Boolean(cache.current[activeFeedCacheKey]?.hasMore)}
            onLoadMore={loadMoreStories}
            expanded={expanded}
            saved={saved}
            setExpanded={setExpanded}
            toggleSave={toggleSave}
            handleShareStory={handleShareStory}
            handleReportStory={handleReportStory}
            handleReadSource={handleReadSource}
            sourceReadState={sourceReadState}
            t={t}
            uiLanguage={uiLanguage}
          />
        )}

        {tab === "discover" && (
          <DiscoverTab
            region={region}
            regions={availableRegions}
            setRegion={handleSetRegion}
            setTab={setTab}
            t={t}
            uiLanguage={uiLanguage}
          />
        )}

        {tab === "saved" && (
          <SavedTab
            savedStories={savedStories}
            saved={saved}
            session={session}
            setTab={setTab}
            shareFeedback={shareFeedback}
            toggleSave={toggleSave}
            handleShareStory={handleShareStory}
            handleReadSource={handleReadSource}
            sourceReadState={sourceReadState}
            t={t}
            uiLanguage={uiLanguage}
          />
        )}

        {tab === "account" && (
          <AccountTab
            key={JSON.stringify(userPreferences || {})}
            session={session}
            profile={effectiveProfile}
            profileLoading={profileLoading}
            authLoading={authLoading}
            authMessage={authMessage}
            authError={authError}
            syncingSaved={syncingSaved}
            sourceReadState={sourceReadState}
            regions={availableRegions}
            userPreferences={userPreferences}
            handleConfirmPersonalization={handleConfirmPersonalization}
            personalizationSaving={personalizationSaving}
            handleStartPremiumPurchase={handleStartPremiumPurchase}
            premiumPurchaseLoading={premiumPurchaseLoading}
            handleSignOut={handleSignOut}
            handleGoogleSignIn={handleGoogleSignIn}
            handleEmailAuth={handleEmailAuth}
            handleFeedbackClick={handleFeedbackClick}
            t={t}
            uiLanguage={uiLanguage}
          />
        )}

        {tab === "review" && (
          <ReviewTab
            session={session}
            profile={profile}
            rawArticles={rawArticles}
            rawLoading={rawLoading}
            rawError={rawError}
            reviewFilter={reviewFilter}
            setReviewFilter={setReviewFilter}
            handleRefreshRawArticles={() => fetchRawArticles(reviewFilter)}
            handleApproveRawArticle={handleApproveRawArticle}
            handleRejectRawArticle={handleRejectRawArticle}
            t={t}
            uiLanguage={uiLanguage}
          />
        )}
      </div>

      <SourceReadMeter
        sourceReadState={sourceReadState}
        onUpgradeClick={handleSourceMeterClick}
        t={t}
      />

      <BottomNav tabs={localizedTabs} tab={tab} setTab={setTab} />

      {showOnboarding && (
        <OnboardingModal
          session={session}
          handleDismiss={handleDismissOnboarding}
          handleGoogleSignIn={handleGoogleSignIn}
          t={t}
        />
      )}
    </div>
  );
};

export default BrightNews;

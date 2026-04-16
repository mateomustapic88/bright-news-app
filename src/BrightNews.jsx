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
import {
  createSavedStory,
  deleteSavedStory,
  loadAvailableRegionCodes,
  loadProfile,
  loadRawArticles,
  loadSavedStoryIds,
  loadStories,
  loadStoriesByIds,
  updateRawArticleReviewStatus,
  upsertProfile,
} from "./brightnews/api";
import {
  getAvailableAppLanguages,
  inferPreferredRegionCode,
  inferPreferredAppLanguage,
  getLanguageFiltersForStories,
  getRegionsForCodes,
  getVisibleTabs,
  SAVED_STORIES_KEY,
} from "./brightnews/constants";
import {
  createTranslator,
  getTabLabel,
  getUiLanguage,
} from "./brightnews/i18n";
import {
  readAppLanguage,
  readOnboardingDismissed,
  readPreferredRegion,
  readSavedStories,
  writeAppLanguage,
  writeOnboardingDismissed,
  writePreferredRegion,
  writeStoryLanguageFilter,
} from "./brightnews/storage";
import BottomNav from "./brightnews/components/BottomNav";
import Header from "./brightnews/components/Header";
import LoadingBar from "./brightnews/components/LoadingBar";
import OnboardingModal from "./brightnews/components/OnboardingModal";
import StatusDialog from "./brightnews/components/StatusDialog";
import TopBar from "./brightnews/components/TopBar";
import DiscoverTab from "./brightnews/tabs/DiscoverTab";
import AccountTab from "./brightnews/tabs/AccountTab";
import HomeTab from "./brightnews/tabs/HomeTab";
import ReviewTab from "./brightnews/tabs/ReviewTab";
import SavedTab from "./brightnews/tabs/SavedTab";
import "./brightnews/styles/BrightNews.scss";

const getReadableAuthError = error => {
  const message = String(error?.message || error?.msg || "");
  const normalized = message.toLowerCase();

  if (normalized.includes("unsupported provider") || normalized.includes("provider is not enabled")) {
    return "Google sign-in is not enabled in Supabase yet. Turn on the Google provider and add its client ID and secret.";
  }

  if (normalized.includes("invalid_client")) {
    return "Google OAuth client settings are invalid. Recheck the Google client ID, client secret, and Supabase callback URL.";
  }

  return message || "Unable to start Google sign-in.";
};

const BrightNews = () => {
  const [stories, setStories]     = useState([]);
  const [savedStories, setSavedStories] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [region, setRegion]       = useState(() => readPreferredRegion() || inferPreferredRegionCode());
  const [availableRegionCodes, setAvailableRegionCodes] = useState(["world"]);
  const [category, setCategory]   = useState("all");
  const [appLanguage, setAppLanguage] = useState(() => readAppLanguage() || inferPreferredAppLanguage());
  const [storyLanguageFilter, setStoryLanguageFilter] = useState(() => readAppLanguage() || inferPreferredAppLanguage());
  const [expanded, setExpanded]   = useState(null);
  const [error, setError]         = useState(null);
  const [saved, setSaved]         = useState(readSavedStories);
  const [tab, setTab]             = useState("home");
  const [session, setSession]     = useState(null);
  const [profile, setProfile]     = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [rawArticles, setRawArticles] = useState([]);
  const [rawLoading, setRawLoading] = useState(false);
  const [rawError, setRawError] = useState("");
  const [reviewFilter, setReviewFilter] = useState("pending");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [syncingSaved, setSyncingSaved] = useState(false);
  const [shareFeedback, setShareFeedback] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(() => !readOnboardingDismissed());
  const feedbackHref = buildFeedbackMailto();
  const cache = useRef({});
  const abortRef = useRef(null);
  const savedRef = useRef(saved);
  const regionInitializedRef = useRef(false);
  const categoryInitializedRef = useRef(false);
  const appLanguageInitializedRef = useRef(false);
  const storyLanguageInitializedRef = useRef(false);
  const uiLanguage = getUiLanguage(appLanguage);
  const t = useMemo(() => createTranslator(uiLanguage), [uiLanguage]);

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
    savedRef.current = saved;
  }, [saved]);

  useEffect(() => {
    writePreferredRegion(region);
  }, [region]);

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
    enableAnalytics();
  }, []);

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
      }

      if (event === "SIGNED_IN") {
        setAuthMessage(t("feedback.signInSuccess"));
        setAuthError("");
        trackEvent("sign_in_success", {
          provider: "google",
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
    if (!session?.user) return;

    setAnalyticsUserProperty("signed_in", "true");
    setAnalyticsUserProperty("plan", profile?.plan || "free");
    setAnalyticsUserProperty("is_admin", profile?.is_admin ? "true" : "false");
  }, [profile?.is_admin, profile?.plan, session?.user]);

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
  const visibleStories = stories.filter(story => (
    storyLanguageFilter === "all" || story.languageCode === storyLanguageFilter
  ));
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
    const cacheKey = `${regionCode}-${categoryId}`;

    if (!force && cache.current[cacheKey]) {
      setStories(cache.current[cacheKey]);
      setFirstLoad(false);
      return;
    }

    const reqId = Date.now();
    abortRef.current = reqId;

    setLoading(true);
    setError(null);
    setExpanded(null);

    try {
      const result = await loadStories(regionCode, categoryId);
      if (abortRef.current !== reqId) return;
      cache.current[cacheKey] = result;
      setStories(result);
      setFirstLoad(false);
      setLoading(false);
    } catch (e) {
      if (abortRef.current !== reqId) return;
      setStories([]);
      setError(e.message || "Unable to load stories right now.");
      setFirstLoad(false);
      setLoading(false);
    }
  }, []);

  const availableRegions = getRegionsForCodes(availableRegionCodes);

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
      cache.current[cacheKey] = adjustSavedCount(cache.current[cacheKey] || [], id, delta);
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
        cache.current[cacheKey] = adjustSavedCount(cache.current[cacheKey] || [], id, -delta);
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

  const tabs = getVisibleTabs(session, profile);
  const localizedTabs = tabs.map(item => ({
    ...item,
    label: getTabLabel(item.id, uiLanguage),
  }));

  return (
    <div className="bright-news">
      {loading ? <LoadingBar /> : null}

      <TopBar
        session={session}
        tab={tab}
        tabs={localizedTabs}
        setTab={setTab}
        appLanguage={appLanguage}
        appLanguages={appLanguages}
        setAppLanguage={setAppLanguage}
        t={t}
        uiLanguage={uiLanguage}
      />
      <Header
        region={region}
        regions={availableRegions}
        setRegion={setRegion}
        feedbackHref={feedbackHref}
        onFeedbackClick={handleFeedbackClick}
        showRegions={tab === "home"}
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

      <div className="bn-screen">
        {tab === "home" && (
          <HomeTab
            category={category}
            setCategory={setCategory}
            loading={loading}
            firstLoad={firstLoad}
            error={error}
            shareFeedback={shareFeedback}
            stories={visibleStories}
            expanded={expanded}
            saved={saved}
            setExpanded={setExpanded}
            toggleSave={toggleSave}
            handleShareStory={handleShareStory}
            t={t}
            uiLanguage={uiLanguage}
          />
        )}

        {tab === "discover" && (
          <DiscoverTab
            region={region}
            regions={availableRegions}
            setRegion={setRegion}
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
            t={t}
            uiLanguage={uiLanguage}
          />
        )}

        {tab === "account" && (
          <AccountTab
            session={session}
            profile={profile}
            profileLoading={profileLoading}
            authLoading={authLoading}
            authMessage={authMessage}
            authError={authError}
            syncingSaved={syncingSaved}
            handleSignOut={handleSignOut}
            handleGoogleSignIn={handleGoogleSignIn}
            handleFeedbackClick={handleFeedbackClick}
            t={t}
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

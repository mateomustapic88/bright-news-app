import { useCallback, useEffect, useRef, useState } from "react";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { shareStory } from "./lib/shareStory";
import { supabase } from "./lib/supabase";
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
  getRegionsForCodes,
  getVisibleTabs,
  SAVED_STORIES_KEY,
} from "./brightnews/constants";
import { readOnboardingDismissed, readSavedStories, writeOnboardingDismissed } from "./brightnews/storage";
import BottomNav from "./brightnews/components/BottomNav";
import Header from "./brightnews/components/Header";
import LoadingBar from "./brightnews/components/LoadingBar";
import OnboardingModal from "./brightnews/components/OnboardingModal";
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
  const [firstLoad, setFirstLoad] = useState(true);
  const [region, setRegion]       = useState("world");
  const [availableRegionCodes, setAvailableRegionCodes] = useState(["world"]);
  const [category, setCategory]   = useState("all");
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
  const cache = useRef({});
  const abortRef = useRef(null);
  const savedRef = useRef(saved);

  useEffect(() => {
    window.localStorage.setItem(SAVED_STORIES_KEY, JSON.stringify(saved));
  }, [saved]);

  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);

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
        setAuthMessage("Signed in successfully.");
        setAuthError("");
      }

      setAuthLoading(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

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

  const handleDismissOnboarding = () => {
    writeOnboardingDismissed(true);
    setShowOnboarding(false);
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
          setAuthError(profileError.message || "Unable to load your account.");
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
          setAuthMessage("Saved stories are synced to your account.");
        }
      } catch (syncError) {
        if (active) {
          setAuthError(syncError.message || "Unable to sync saved stories.");
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
  }, [session?.user]);

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
      setRawError(loadError.message || "Unable to load review queue.");
    } finally {
      setRawLoading(false);
    }
  }, [session?.user, profile?.is_admin]);

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

        setAuthMessage("Opening Google sign-in...");
        return;
      }

      setAuthMessage("Redirecting to Google...");
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

    setAuthMessage("Signed out.");
  };

  const toggleSave = async (id, e) => {
    e?.stopPropagation();
    const isSaved = saved.includes(id);
    const nextSaved = isSaved ? saved.filter(item => item !== id) : [...saved, id];

    setSaved(nextSaved);

    if (!session?.user) return;

    try {
      if (isSaved) {
        await deleteSavedStory(session.user.id, id);
      } else {
        await createSavedStory(session.user.id, id);
      }
    } catch (saveError) {
      setAuthError(saveError.message || "Saved story sync failed.");
    }
  };

  const handleShareStory = async (story, event) => {
    event?.stopPropagation();

    try {
      const result = await shareStory(story);
      if (result) {
        setShareFeedback(result);
      }
    } catch {
      setShareFeedback({
        variant: "error",
        message: "Unable to share this story right now.",
      });
    }
  };

  const handleApproveRawArticle = async rawArticleId => {
    try {
      await updateRawArticleReviewStatus(rawArticleId, "approved");
      await fetchRawArticles(reviewFilter);
    } catch (reviewError) {
      setRawError(reviewError.message || "Unable to approve article.");
    }
  };

  const handleRejectRawArticle = async rawArticleId => {
    try {
      await updateRawArticleReviewStatus(rawArticleId, "rejected", "manual_review");
      await fetchRawArticles(reviewFilter);
    } catch (reviewError) {
      setRawError(reviewError.message || "Unable to reject article.");
    }
  };

  const tabs = getVisibleTabs(session, profile);

  return (
    <div className="bright-news">
      {loading ? <LoadingBar /> : null}

      <TopBar session={session} setTab={setTab} />
      <Header
        region={region}
        regions={availableRegions}
        setRegion={setRegion}
        onRefresh={async () => {
          await refreshAvailableRegions();
          await fetchNews(region, category, true);
        }}
      />

      <div className="bn-screen">
        {tab === "home" && (
          <HomeTab
            category={category}
            setCategory={setCategory}
            loading={loading}
            firstLoad={firstLoad}
            error={error}
            shareFeedback={shareFeedback}
            stories={stories}
            expanded={expanded}
            saved={saved}
            setExpanded={setExpanded}
            toggleSave={toggleSave}
            handleShareStory={handleShareStory}
          />
        )}

        {tab === "discover" && (
          <DiscoverTab
            region={region}
            regions={availableRegions}
            setRegion={setRegion}
            setTab={setTab}
          />
        )}

        {tab === "saved" && (
          <SavedTab
            savedStories={savedStories}
            session={session}
            setTab={setTab}
            shareFeedback={shareFeedback}
            handleShareStory={handleShareStory}
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
          />
        )}
      </div>

      <BottomNav tabs={tabs} tab={tab} setTab={setTab} />

      {showOnboarding && (
        <OnboardingModal
          session={session}
          handleDismiss={handleDismissOnboarding}
          handleGoogleSignIn={handleGoogleSignIn}
        />
      )}
    </div>
  );
};

export default BrightNews;

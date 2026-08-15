(function () {
  "use strict";

  var config = window.drugnewsAnalyticsConfig || {};
  var measurementId = String(config.measurementId || "").trim();
  var consentVersion = String(config.consentVersion || "2026-07-26");
  var storageKey = "drugnewsConsentV1";
  var isEnglish = /^en(?:-|$)/i.test(document.documentElement.lang || "");
  var analyticsEnabled = false;
  var googleTagLoaded = false;
  var lastFocusedElement = null;

  var copy = isEnglish
    ? {
        bannerTitle: "Your privacy choice",
        bannerBody: "We use Google Analytics only after you agree, to understand how readers use Drugnews. Advertising storage and personalization remain off. You can change this choice at any time.",
        reject: "Necessary only",
        accept: "Allow analytics",
        privacy: "Privacy notice",
        cookies: "Cookie notice",
        settingsTitle: "Privacy settings",
        settingsBody: "Optional analytics helps us understand page usage, referrals, and campaign performance. It stays off unless you allow it.",
        currentAllowed: "Analytics is currently allowed.",
        currentDenied: "Analytics is currently off.",
        close: "Close",
        saveDenied: "Do not allow",
        saveAllowed: "Allow analytics",
        statusAllowed: "Analytics allowed. Your choice has been saved.",
        statusDenied: "Analytics is off. Your choice has been saved."
      }
    : {
        bannerTitle: "你的隱私選擇",
        bannerBody: "我們僅在你同意後使用 Google Analytics，了解讀者如何使用藥時事。廣告儲存與個人化會持續關閉，你可隨時更改選擇。",
        reject: "只使用必要功能",
        accept: "同意分析",
        privacy: "隱私權聲明",
        cookies: "Cookie 說明",
        settingsTitle: "隱私設定",
        settingsBody: "選用的網站分析可協助我們了解頁面使用、來源與活動成效；未經你同意前會保持關閉。",
        currentAllowed: "目前已同意網站分析。",
        currentDenied: "目前未啟用網站分析。",
        close: "關閉",
        saveDenied: "不同意分析",
        saveAllowed: "同意分析",
        statusAllowed: "已同意網站分析，選擇已儲存。",
        statusDenied: "網站分析已關閉，選擇已儲存。"
      };

  function gtag() {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(arguments);
  }

  window.gtag = window.gtag || gtag;

  function validMeasurementId() {
    return /^G-[A-Z0-9]+$/i.test(measurementId);
  }

  function readPreference() {
    try {
      var parsed = JSON.parse(window.localStorage.getItem(storageKey) || "null");
      if (!parsed || parsed.version !== consentVersion) return null;
      if (parsed.status !== "accepted" && parsed.status !== "denied") return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function savePreference(status) {
    var preference = {
      status: status,
      version: consentVersion,
      timestamp: new Date().toISOString()
    };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(preference));
    } catch (error) {
      // Consent still applies to the current page when storage is unavailable.
    }
    return preference;
  }

  function consentState(analyticsStatus) {
    window.gtag("consent", "update", {
      analytics_storage: analyticsStatus,
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
  }

  function setAnalyticsDisabled(disabled) {
    if (!validMeasurementId()) return;
    window["ga-disable-" + measurementId] = Boolean(disabled);
  }

  function safeCampaignValue(value) {
    value = String(value || "").trim();
    return /^[a-z0-9._-]{1,80}$/i.test(value) ? value : "";
  }

  function safeEventName(value) {
    value = String(value || "").trim();
    return /^[a-z][a-z0-9_]{1,63}$/i.test(value) ? value : "";
  }

  function safePageLocation() {
    var safeUrl = new URL(window.location.origin + window.location.pathname);
    var source = safeCampaignValue(new URLSearchParams(window.location.search).get("utm_source"));
    var medium = safeCampaignValue(new URLSearchParams(window.location.search).get("utm_medium"));
    var campaign = safeCampaignValue(new URLSearchParams(window.location.search).get("utm_campaign"));
    var content = safeCampaignValue(new URLSearchParams(window.location.search).get("utm_content"));
    if (source) safeUrl.searchParams.set("utm_source", source);
    if (medium) safeUrl.searchParams.set("utm_medium", medium);
    if (campaign) safeUrl.searchParams.set("utm_campaign", campaign);
    if (content) safeUrl.searchParams.set("utm_content", content);
    return safeUrl.toString();
  }

  function loadAnalytics() {
    if (!validMeasurementId() || googleTagLoaded) return;

    setAnalyticsDisabled(false);
    consentState("granted");
    analyticsEnabled = true;
    googleTagLoaded = true;
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      ads_data_redaction: true,
      page_location: safePageLocation()
    });

    var script = document.createElement("script");
    script.async = true;
    script.id = "drugnews-google-tag";
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);
    document.head.appendChild(script);
  }

  function deleteAnalyticsCookies() {
    document.cookie.split(";").forEach(function (cookie) {
      var name = cookie.split("=")[0].trim();
      if (!/^_ga(?:_|$)/.test(name)) return;
      var expires = "Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = name + "=;expires=" + expires + ";path=/;SameSite=Lax";
      document.cookie = name + "=;expires=" + expires + ";path=/;domain=" + window.location.hostname + ";SameSite=Lax";
      document.cookie = name + "=;expires=" + expires + ";path=/;domain=." + window.location.hostname + ";SameSite=Lax";
    });
  }

  function safeEventUrl(url) {
    if (/^mailto:/i.test(url)) return "mailto";
    if (/^tel:/i.test(url)) return "tel";
    try {
      var parsed = new URL(url, window.location.origin);
      if (!/^https?:$/i.test(parsed.protocol)) return "";
      return parsed.origin + parsed.pathname;
    } catch (error) {
      return "";
    }
  }

  function eventName(url) {
    var parsed;
    try {
      parsed = new URL(url, window.location.origin);
    } catch (error) {
      return "outbound_click";
    }
    var campaign = safeCampaignValue(parsed.searchParams.get("utm_campaign"));
    if (/^mailto:/i.test(url) && /join(?:%20|\+)the(?:%20|\+)drugnews(?:%20|\+)english(?:%20|\+)reader(?:%20|\+)list/i.test(url)) return "english_reader_list_click";
    if (campaign === "company_services" || /forms\.gle/i.test(parsed.hostname)) return "company_services_click";
    if (/^paid_research/.test(campaign)) return "paid_research_click";
    if (/\/en\/feed\.(xml|json)$/i.test(parsed.pathname)) return "english_rss_click";
    if (/vocus\.cc/i.test(url)) return "paid_column_click";
    if (/\/services\.html|\/en\/services\.html/i.test(url)) return "company_services_click";
    if (/facebook\.com|dcard\.tw|cmoney\.tw|instagram\.com|linkedin\.com/i.test(url)) return "social_follow_click";
    if (/\/en\//i.test(url)) return "english_site_click";
    if (/^mailto:/i.test(url)) return "contact_click";
    return "outbound_click";
  }

  function trackEligibleClick(event) {
    if (!analyticsEnabled || !validMeasurementId()) return;
    var link = event.target.closest && event.target.closest("a[href]");
    if (!link) return;
    var url = link.href || "";
    var parsed;
    try {
      parsed = new URL(url, window.location.origin);
    } catch (error) {
      return;
    }
    var isOutbound = /^mailto:|^tel:/i.test(url) || (/^https?:$/i.test(parsed.protocol) && parsed.origin !== window.location.origin);
    var isSubscription = /vocus|facebook|dcard|cmoney|instagram|linkedin/i.test(url);
    var isTrackedInternal = /\/services\.html|\/en\/services\.html|\/en\/|\/en\/feed\.(xml|json)/i.test(url);
    if (!isOutbound && !isSubscription && !isTrackedInternal) return;

    var safeUrl = safeEventUrl(url);
    var configuredEvent = safeEventName(link.getAttribute("data-analytics-event"));
    var eventContext = safeCampaignValue(link.getAttribute("data-analytics-context"));
    window.gtag("event", configuredEvent || eventName(url), {
      event_category: isOutbound ? "outbound_link" : "site_link",
      event_label: safeUrl,
      link_url: safeUrl,
      link_domain: /^https?:$/i.test(parsed.protocol) ? parsed.hostname : "",
      event_context: eventContext,
      page_language: document.documentElement.lang || "",
      page_path: window.location.pathname,
      utm_campaign: safeCampaignValue(parsed.searchParams.get("utm_campaign")),
      utm_content: safeCampaignValue(parsed.searchParams.get("utm_content"))
    });
  }

  function bannerMarkup() {
    return '<section class="drugnews-consent-banner" data-drugnews-consent-banner aria-labelledby="drugnews-consent-title">' +
      '<div class="drugnews-consent-copy"><h2 id="drugnews-consent-title">' + copy.bannerTitle + "</h2><p>" + copy.bannerBody + "</p>" +
      '<p class="drugnews-consent-links"><a href="' + (isEnglish ? "/en/privacy.html" : "/privacy.html") + '">' + copy.privacy + '</a><a href="' + (isEnglish ? "/en/cookies.html" : "/cookies.html") + '">' + copy.cookies + "</a></p></div>" +
      '<div class="drugnews-consent-actions"><button type="button" class="drugnews-consent-button secondary" data-consent-reject>' + copy.reject + '</button><button type="button" class="drugnews-consent-button primary" data-consent-accept>' + copy.accept + "</button></div></section>";
  }

  function settingsMarkup(preference) {
    var status = preference && preference.status === "accepted" ? copy.currentAllowed : copy.currentDenied;
    return '<div class="drugnews-consent-backdrop" data-consent-backdrop hidden>' +
      '<section class="drugnews-consent-dialog" role="dialog" aria-modal="true" aria-labelledby="drugnews-settings-title">' +
      '<button type="button" class="drugnews-consent-close" data-consent-close aria-label="' + copy.close + '">×</button>' +
      '<h2 id="drugnews-settings-title">' + copy.settingsTitle + "</h2><p>" + copy.settingsBody + '</p><p class="drugnews-consent-current" data-consent-current>' + status + "</p>" +
      '<div class="drugnews-consent-actions"><button type="button" class="drugnews-consent-button secondary" data-settings-deny>' + copy.saveDenied + '</button><button type="button" class="drugnews-consent-button primary" data-settings-allow>' + copy.saveAllowed + "</button></div>" +
      '<p class="drugnews-consent-links"><a href="' + (isEnglish ? "/en/privacy.html" : "/privacy.html") + '">' + copy.privacy + '</a><a href="' + (isEnglish ? "/en/cookies.html" : "/cookies.html") + '">' + copy.cookies + "</a></p></section></div>";
  }

  function removeBanner() {
    var banner = document.querySelector("[data-drugnews-consent-banner]");
    if (banner) banner.remove();
  }

  function announce(message) {
    var live = document.querySelector("[data-consent-live]");
    if (live) live.textContent = message;
  }

  function setChoice(status, source) {
    savePreference(status);
    removeBanner();
    if (status === "accepted") {
      loadAnalytics();
      announce(copy.statusAllowed);
      return;
    }

    analyticsEnabled = false;
    setAnalyticsDisabled(true);
    consentState("denied");
    deleteAnalyticsCookies();
    announce(copy.statusDenied);
    if (source === "settings" && googleTagLoaded) {
      window.location.reload();
    }
  }

  function openSettings() {
    var backdrop = document.querySelector("[data-consent-backdrop]");
    if (!backdrop) return;
    var preference = readPreference();
    var status = backdrop.querySelector("[data-consent-current]");
    if (status) status.textContent = preference && preference.status === "accepted" ? copy.currentAllowed : copy.currentDenied;
    lastFocusedElement = document.activeElement;
    backdrop.hidden = false;
    document.body.classList.add("drugnews-consent-open");
    var closeButton = backdrop.querySelector("[data-consent-close]");
    if (closeButton) closeButton.focus();
  }

  function closeSettings() {
    var backdrop = document.querySelector("[data-consent-backdrop]");
    if (!backdrop || backdrop.hidden) return;
    backdrop.hidden = true;
    document.body.classList.remove("drugnews-consent-open");
    if (lastFocusedElement && lastFocusedElement.focus) lastFocusedElement.focus();
  }

  function keepFocusInSettings(event) {
    if (event.key !== "Tab") return;
    var backdrop = document.querySelector("[data-consent-backdrop]");
    if (!backdrop || backdrop.hidden) return;
    var focusable = Array.prototype.slice.call(
      backdrop.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')
    );
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function initialize() {
    var preference = readPreference();
    document.body.insertAdjacentHTML("beforeend", settingsMarkup(preference));
    document.body.insertAdjacentHTML("beforeend", '<div class="drugnews-consent-live" data-consent-live aria-live="polite"></div>');
    if (!preference) {
      setAnalyticsDisabled(true);
      document.body.insertAdjacentHTML("beforeend", bannerMarkup());
    } else if (preference.status === "accepted") {
      loadAnalytics();
    } else {
      setAnalyticsDisabled(true);
      consentState("denied");
    }

    document.addEventListener("click", function (event) {
      var target = event.target;
      if (!target || target.nodeType !== 1) return;
      if (target.closest("[data-consent-accept]")) setChoice("accepted", "banner");
      else if (target.closest("[data-consent-reject]")) setChoice("denied", "banner");
      else if (target.closest("[data-drugnews-consent-settings]")) openSettings();
      else if (target.closest("[data-consent-close]")) closeSettings();
      else if (target.closest("[data-settings-allow]")) {
        setChoice("accepted", "settings");
        closeSettings();
      } else if (target.closest("[data-settings-deny]")) {
        setChoice("denied", "settings");
        closeSettings();
      } else if (target.matches("[data-consent-backdrop]")) closeSettings();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeSettings();
      else keepFocusInSettings(event);
    });
    document.addEventListener("click", trackEligibleClick);
  }

  window.drugnewsConsent = {
    getPreference: readPreference,
    openSettings: openSettings
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
})();

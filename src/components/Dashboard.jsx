import React, { useState, useCallback, useRef, useEffect } from 'react';
import Sphere from './Sphere';
import SalesCounter from './SalesCounter';
import DotEngine from './DotEngine';
import DotBlueEngine from './DotBlueEngine';
import DotEmptyEngine from './DotEmptyEngine';
import InquiryModal from './InquiryModal';
import ChatbotPanel from './ChatbotPanel';
import logoHagobogo from '../../assets/svg/logo_haogobogo.svg';
import chatbotLeo from '../../assets/svg/btn_chatbot.svg';
import { DEFAULT_LANGUAGE, LANGUAGE_OPTIONS, TRANSLATIONS } from '../i18n/translations';
import { CHATBOT_FAQ } from '../data/chatbotFaq';
import {
    createEmptyTickerItemsByLanguageMap,
    DEFAULT_DOT_BLUE_SPAWN_FREQUENCY_RANGE,
    DEFAULT_SALES_COUNT,
    normalizeAdminSiteSettings,
} from '../utils/adminSettings';
import { fetchPublicSiteSettings } from '../lib/adminApi';

const LANGUAGE_STORAGE_KEY = 'site_language';
const PROPOSAL_HEIGHT_MESSAGE_TYPE = 'HAGOBOGO_PROPOSAL_HEIGHT';
const PUBLIC_SETTINGS_POLLING_MIN_MS = 60000;
const PUBLIC_SETTINGS_POLLING_MAX_MS = 100000;
const PUBLIC_SETTINGS_FOCUS_THROTTLE_MS = 15000;
const MAX_FULL_ANIMATION_DIFF = 3;
const REPRESENTATIVE_ANIMATION_COUNT = 2;
const PROPOSAL_FILE_BY_LANGUAGE = {
    EN: 'Hagobogo_Proposal_en_v01.html',
    ES: 'Hagobogo_Proposal_es_v01.html',
    FR: 'Hagobogo_Proposal_fr_v01.html',
    KR: 'Hagobogo_Proposal_kr_v01.html',
};

function createInitialTargetMetrics() {
    if (typeof window === 'undefined') {
        return {
            center: { x: 0, y: 0 },
            sphereDiameter: 400,
            collisionRadius: 100,
            sphereRadius: 200,
        };
    }

    return {
        center: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        sphereDiameter: 400,
        collisionRadius: 100,
        sphereRadius: 200,
    };
}

function getRandomPollingDelayMs() {
    return PUBLIC_SETTINGS_POLLING_MIN_MS + Math.random() * (PUBLIC_SETTINGS_POLLING_MAX_MS - PUBLIC_SETTINGS_POLLING_MIN_MS);
}

export default function Dashboard() {
    const homeHref = `${import.meta.env.BASE_URL || './'}app.html`;
    const adminHref = `${import.meta.env.BASE_URL || './'}app.html?view=admin`;
    const [displayedSales, setDisplayedSales] = useState(DEFAULT_SALES_COUNT);
    const [isSalesVisible, setIsSalesVisible] = useState(false);
    const [language, setLanguage] = useState(() => {
        if (typeof window === 'undefined') {
            return DEFAULT_LANGUAGE;
        }

        try {
            const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
            if (savedLanguage && LANGUAGE_OPTIONS.includes(savedLanguage)) {
                return savedLanguage;
            }
        } catch {
            // 저장소 접근이 막혀 있으면 기본 언어로 동작
        }

        return DEFAULT_LANGUAGE;
    });
    const [siteSettings, setSiteSettings] = useState(() => normalizeAdminSiteSettings({
        salesCount: DEFAULT_SALES_COUNT,
        currentSalesCount: DEFAULT_SALES_COUNT,
        dotBlueSpawnFrequencyRange: DEFAULT_DOT_BLUE_SPAWN_FREQUENCY_RANGE,
        tickerItemsByLanguage: createEmptyTickerItemsByLanguageMap(),
    }));
    const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
    const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
    const [isChatbotOpen, setIsChatbotOpen] = useState(false);
    const [isPulsing, setIsPulsing] = useState(false);
    const [isLineHit, setIsLineHit] = useState(false);
    const [targetMetrics, setTargetMetrics] = useState(createInitialTargetMetrics);
    const [blueManualSpawnSignal, setBlueManualSpawnSignal] = useState(0);
    const pulseTimeoutRef = useRef(null);
    const lineTimeoutRef = useRef(null);
    const salesRevealTimeoutRef = useRef(null);
    const publicSettingsPollingTimeoutRef = useRef(null);
    const isFetchingPublicSiteSettingsRef = useRef(false);
    const lastPublicSiteSettingsRequestAtRef = useRef(0);
    const hasLoadedInitialSalesRef = useRef(false);
    const displayedSalesRef = useRef(DEFAULT_SALES_COUNT);
    const targetSalesCountRef = useRef(DEFAULT_SALES_COUNT);
    const pendingBlueAnimationCountRef = useRef(0);
    const activeBlueAnimationCountRef = useRef(0);
    const sphereGroupRef = useRef(null);
    const languageMenuRef = useRef(null);
    const proposalIframeRef = useRef(null);
    const [proposalFrameHeight, setProposalFrameHeight] = useState(1180);
    const copy = TRANSLATIONS[language];
    const chatbotQuestions = CHATBOT_FAQ[language] || CHATBOT_FAQ.EN || [];
    const proposalFileName = PROPOSAL_FILE_BY_LANGUAGE[language] || PROPOSAL_FILE_BY_LANGUAGE.EN;
    const tickerItems = siteSettings.tickerItemsByLanguage[language] || [];
    const visibleTickerItems = tickerItems;

    const triggerSalesPulse = useCallback(() => {
        setIsPulsing(false);
        setIsLineHit(false);

        if (pulseTimeoutRef.current) {
            window.clearTimeout(pulseTimeoutRef.current);
        }

        if (lineTimeoutRef.current) {
            window.clearTimeout(lineTimeoutRef.current);
        }

        requestAnimationFrame(() => setIsPulsing(true));
        requestAnimationFrame(() => setIsLineHit(true));

        pulseTimeoutRef.current = window.setTimeout(() => {
            setIsPulsing(false);
        }, 1300);

        lineTimeoutRef.current = window.setTimeout(() => {
            setIsLineHit(false);
        }, 500);
    }, []);

    const scheduleNextPublicSettingsPoll = useCallback((callback) => {
        if (publicSettingsPollingTimeoutRef.current) {
            window.clearTimeout(publicSettingsPollingTimeoutRef.current);
        }

        publicSettingsPollingTimeoutRef.current = window.setTimeout(() => {
            callback();
        }, getRandomPollingDelayMs());
    }, []);

    const launchNextBlueAnimation = useCallback(() => {
        if (activeBlueAnimationCountRef.current > 0 || pendingBlueAnimationCountRef.current <= 0) {
            return;
        }

        pendingBlueAnimationCountRef.current -= 1;
        activeBlueAnimationCountRef.current = 1;
        setBlueManualSpawnSignal((previousValue) => previousValue + 1);
    }, []);

    const syncDisplayedSalesToServer = useCallback((nextSalesCount) => {
        displayedSalesRef.current = nextSalesCount;
        targetSalesCountRef.current = nextSalesCount;
        pendingBlueAnimationCountRef.current = 0;
        activeBlueAnimationCountRef.current = 0;
        setDisplayedSales(nextSalesCount);
    }, []);

    const applySalesDifferenceAnimation = useCallback((nextSalesCount) => {
        if (!hasLoadedInitialSalesRef.current) {
            hasLoadedInitialSalesRef.current = true;
            syncDisplayedSalesToServer(nextSalesCount);
            return;
        }

        if (nextSalesCount <= displayedSalesRef.current) {
            syncDisplayedSalesToServer(nextSalesCount);
            return;
        }

        targetSalesCountRef.current = nextSalesCount;

        const salesGap = nextSalesCount - displayedSalesRef.current;
        const desiredAnimationCount = salesGap <= MAX_FULL_ANIMATION_DIFF
            ? salesGap
            : REPRESENTATIVE_ANIMATION_COUNT;
        const currentPlannedAnimationCount = pendingBlueAnimationCountRef.current + activeBlueAnimationCountRef.current;
        const additionalAnimationCount = Math.max(0, desiredAnimationCount - currentPlannedAnimationCount);

        if (additionalAnimationCount > 0) {
            pendingBlueAnimationCountRef.current += additionalAnimationCount;
            launchNextBlueAnimation();
        }
    }, [launchNextBlueAnimation, syncDisplayedSalesToServer]);

    const loadPublicSiteSettings = useCallback(async ({ revealSales = false, reschedule = true } = {}) => {
        if (isFetchingPublicSiteSettingsRef.current) {
            return;
        }

        isFetchingPublicSiteSettingsRef.current = true;
        lastPublicSiteSettingsRequestAtRef.current = Date.now();

        try {
            const nextSiteSettings = await fetchPublicSiteSettings();
            const normalizedSettings = normalizeAdminSiteSettings(nextSiteSettings);

            setSiteSettings((previousSettings) => {
                const hasSameCurrentSalesCount = previousSettings.currentSalesCount === normalizedSettings.currentSalesCount;
                const hasSameDotBlueRange = (
                    previousSettings.dotBlueSpawnFrequencyRange.min === normalizedSettings.dotBlueSpawnFrequencyRange.min
                    && previousSettings.dotBlueSpawnFrequencyRange.max === normalizedSettings.dotBlueSpawnFrequencyRange.max
                );
                const hasSameTickerItems = JSON.stringify(previousSettings.tickerItemsByLanguage) === JSON.stringify(normalizedSettings.tickerItemsByLanguage);

                if (hasSameCurrentSalesCount && hasSameDotBlueRange && hasSameTickerItems) {
                    return previousSettings;
                }

                return normalizedSettings;
            });

            if (revealSales) {
                syncDisplayedSalesToServer(normalizedSettings.currentSalesCount);
            } else {
                applySalesDifferenceAnimation(normalizedSettings.currentSalesCount);
            }

            if (revealSales) {
                if (salesRevealTimeoutRef.current) {
                    window.clearTimeout(salesRevealTimeoutRef.current);
                }

                salesRevealTimeoutRef.current = window.setTimeout(() => {
                    setIsSalesVisible(true);
                }, 200);
            } else {
                setIsSalesVisible(true);
            }
        } catch (error) {
            console.error('공개 사이트 설정을 불러오지 못했습니다.', error);

            if (revealSales) {
                setIsSalesVisible(true);
            }
        } finally {
            isFetchingPublicSiteSettingsRef.current = false;

            if (reschedule) {
                scheduleNextPublicSettingsPoll(() => {
                    loadPublicSiteSettings();
                });
            }
        }
    }, [applySalesDifferenceAnimation, scheduleNextPublicSettingsPoll, syncDisplayedSalesToServer]);

    useEffect(() => {
        loadPublicSiteSettings({ revealSales: true });

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const now = Date.now();
                const elapsedSinceLastRequest = now - lastPublicSiteSettingsRequestAtRef.current;

                if (elapsedSinceLastRequest < PUBLIC_SETTINGS_FOCUS_THROTTLE_MS) {
                    return;
                }

                loadPublicSiteSettings({ reschedule: true });
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if (salesRevealTimeoutRef.current) {
                window.clearTimeout(salesRevealTimeoutRef.current);
            }

            if (publicSettingsPollingTimeoutRef.current) {
                window.clearTimeout(publicSettingsPollingTimeoutRef.current);
            }

            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [loadPublicSiteSettings]);

    useEffect(() => {
        return () => {
            if (pulseTimeoutRef.current) {
                window.clearTimeout(pulseTimeoutRef.current);
            }

            if (lineTimeoutRef.current) {
                window.clearTimeout(lineTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        try {
            window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
        } catch {
            // 제한된 환경에서도 언어 전환이 유지되도록 저장 오류는 무시
        }
    }, [language]);

    useEffect(() => {
        const handlePointerDown = (event) => {
            if (!languageMenuRef.current?.contains(event.target)) {
                setIsLanguageMenuOpen(false);
            }
        };

        window.addEventListener('mousedown', handlePointerDown);

        return () => {
            window.removeEventListener('mousedown', handlePointerDown);
        };
    }, []);

    useEffect(() => {
        setProposalFrameHeight(1180);
    }, [proposalFileName]);

    useEffect(() => {
        const handleProposalHeightMessage = (event) => {
            if (event.source !== proposalIframeRef.current?.contentWindow) {
                return;
            }

            if (event.data?.type !== PROPOSAL_HEIGHT_MESSAGE_TYPE) {
                return;
            }

            const nextHeight = Number(event.data.height);

            if (Number.isFinite(nextHeight) && nextHeight > 0) {
                setProposalFrameHeight(nextHeight);
            }
        };

        window.addEventListener('message', handleProposalHeightMessage);

        return () => {
            window.removeEventListener('message', handleProposalHeightMessage);
        };
    }, []);

    useEffect(() => {
        const updateTargetMetrics = () => {
            if (!sphereGroupRef.current) {
                return;
            }

            const rect = sphereGroupRef.current.getBoundingClientRect();
            const sphereDiameter = rect.width;
            setTargetMetrics({
                center: {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2,
                },
                sphereDiameter,
                collisionRadius: sphereDiameter * 0.25,
                sphereRadius: sphereDiameter * 0.5,
            });
        };

        updateTargetMetrics();

        const resizeObserver = new ResizeObserver(updateTargetMetrics);
        if (sphereGroupRef.current) {
            resizeObserver.observe(sphereGroupRef.current);
        }

        window.addEventListener('resize', updateTargetMetrics);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateTargetMetrics);
        };
    }, []);

    const handleBlueAnimationHit = useCallback(() => {
        if (activeBlueAnimationCountRef.current <= 0) {
            return;
        }

        activeBlueAnimationCountRef.current = 0;
        triggerSalesPulse();

        setDisplayedSales((previousValue) => {
            const nextValue = previousValue + 1;
            displayedSalesRef.current = nextValue;
            return nextValue;
        });

        if (pendingBlueAnimationCountRef.current > 0) {
            launchNextBlueAnimation();
            return;
        }

        window.setTimeout(() => {
            if (pendingBlueAnimationCountRef.current > 0 || activeBlueAnimationCountRef.current > 0) {
                return;
            }

            if (displayedSalesRef.current < targetSalesCountRef.current) {
                setDisplayedSales(targetSalesCountRef.current);
                displayedSalesRef.current = targetSalesCountRef.current;
            }
        }, 120);
    }, [launchNextBlueAnimation, triggerSalesPulse]);

    const handleCloseInquiryModal = useCallback(() => {
        setIsInquiryModalOpen(false);
    }, []);

    const handleOpenInquiryModal = useCallback(() => {
        setIsChatbotOpen(false);
        setIsInquiryModalOpen(true);
    }, []);

    return (
        <div className={`relative w-full min-h-screen flex justify-center overflow-x-hidden bg-[#bfc5cc] text-[#bfc5cc] ${language === 'KR' ? 'lang-kr' : ''}`}>
            {isInquiryModalOpen && (
                <InquiryModal
                    copy={copy.inquiryModal}
                    language={language}
                    onClose={handleCloseInquiryModal}
                />
            )}

            {isChatbotOpen && (
                <ChatbotPanel
                    key={language}
                    copy={copy.chatbotPanel}
                    questions={chatbotQuestions}
                    onClose={() => setIsChatbotOpen(false)}
                    onOpenInquiry={handleOpenInquiryModal}
                />
            )}

            <div className="absolute inset-0 w-full h-full min-h-full pointer-events-none">
                <DotEmptyEngine
                    targetCenter={targetMetrics.center}
                    sphereRadius={targetMetrics.sphereRadius}
                />
                <DotEngine
                    targetCenter={targetMetrics.center}
                    collisionRadius={targetMetrics.collisionRadius}
                />
                <DotBlueEngine
                    onHit={handleBlueAnimationHit}
                    targetCenter={targetMetrics.center}
                    collisionRadius={targetMetrics.collisionRadius}
                    spawnFrequencyRange={siteSettings.dotBlueSpawnFrequencyRange}
                    shouldAutoSpawn={false}
                    manualSpawnSignal={blueManualSpawnSignal}
                />
            </div>

            <div className="absolute top-[24px] left-[24px] right-[24px] z-40 flex items-center justify-between">
                <a href={homeHref} className="flex items-center">
                    <img
                        src={logoHagobogo}
                        alt="HAGOBOGO logo"
                        className="w-[97px] md:w-[119px] lg:w-[140px] h-auto object-contain"
                    />
                </a>

                <div className="flex items-center gap-[24px]">
                    <a
                        href="https://hagobogo.me"
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-cta text-nav-cta group"
                    >
                        <span
                            aria-hidden="true"
                            className="material-symbols-outlined flex items-center justify-center text-[15px] leading-none text-[#4D545A] transition-colors duration-180 group-hover:text-white group-focus-visible:text-white"
                        >
                            local_mall
                        </span>
                    </a>
                    <div ref={languageMenuRef} className="relative">
                        <button
                            type="button"
                            className="text-cta text-nav-cta language-trigger"
                            aria-haspopup="menu"
                            aria-expanded={isLanguageMenuOpen}
                            onClick={() => setIsLanguageMenuOpen((prev) => !prev)}
                        >
                            {language}
                        </button>

                        {isLanguageMenuOpen && (
                            <div className="language-dropdown absolute right-0 top-full mt-[8px] flex flex-col" role="menu">
                                {LANGUAGE_OPTIONS.filter((option) => option !== language).map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        className="text-cta text-nav-cta language-dropdown-item"
                                        role="menuitem"
                                        onClick={() => {
                                            setLanguage(option);
                                            setIsLanguageMenuOpen(false);
                                        }}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {visibleTickerItems.length > 0 ? (
                <div className="news-ticker-wrap">
                    <div className="news-ticker-track">
                        <div className="news-ticker-sequence">
                            {visibleTickerItems.map((item, index) => (
                                item === '' ? (
                                    <div
                                        key={`spacer-${index}`}
                                        className="news-ticker-spacer"
                                        aria-hidden="true"
                                    />
                                ) : (
                                    <p key={`${item}-${index}`} className="news-ticker-text">
                                        {item}
                                    </p>
                                )
                            ))}
                        </div>
                        <div className="news-ticker-sequence" aria-hidden="true">
                            {visibleTickerItems.map((item, index) => (
                                item === '' ? (
                                    <div
                                        key={`duplicate-spacer-${index}`}
                                        className="news-ticker-spacer"
                                        aria-hidden="true"
                                    />
                                ) : (
                                    <p key={`duplicate-${item}-${index}`} className="news-ticker-text">
                                        {item}
                                    </p>
                                )
                            ))}
                        </div>
                    </div>
                </div>
            ) : null}

            <div className="main-content-stack relative z-20 flex w-full flex-col items-center gap-[40px]">
                <div ref={sphereGroupRef} className="relative flex items-center justify-center px-[20px] pt-[20px] pb-[20px] pointer-events-none">
                    <Sphere isLineHit={isLineHit} />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <SalesCounter
                            sales={displayedSales}
                            isPulsing={isPulsing}
                            isVisible={isSalesVisible}
                            mode="center"
                            copy={copy.salesCounter}
                        />
                    </div>
                </div>

                <div className="mt-[12px] flex flex-col items-center">
                    <button
                        type="button"
                        className="text-cta text-cta-unified"
                        onClick={handleOpenInquiryModal}
                    >
                        {copy.ctas.businessInquiries}
                    </button>
                </div>

                <div
                    className="introduction-board"
                    style={{ height: `${proposalFrameHeight}px` }}
                >
                    <iframe
                        ref={proposalIframeRef}
                        src={`${import.meta.env.BASE_URL}assets/data/${proposalFileName}`}
                        title="HAGOBOGO Introduction"
                        className="introduction-iframe"
                    />
                </div>

                <div className="mt-[20px] flex flex-col items-center gap-[42px]">
                    <button
                        type="button"
                        className="text-cta text-cta-unified"
                        onClick={handleOpenInquiryModal}
                    >
                        {copy.ctas.businessInquiries}
                    </button>
                </div>

                <button
                    type="button"
                    className="chatbot-fab"
                    aria-label={copy.ctas.chatbot}
                    aria-expanded={isChatbotOpen}
                    onClick={() => setIsChatbotOpen((prev) => !prev)}
                >
                    <img src={chatbotLeo} alt="Chatbot" className="chatbot-fab-icon" />
                </button>

                <footer className="site-footer mt-[200px]">
                    <p>{copy.footer[0]}</p>
                    <p className="site-footer-spacer" aria-hidden="true"></p>
                    <p>{copy.footer[1]}</p>
                    <p>{copy.footer[2]}</p>
                    <p className="site-footer-spacer" aria-hidden="true"></p>
                    <p>{copy.footer[3]}</p>
                    <p>{copy.footer[4]}</p>
                    <a href={adminHref} className="site-footer-admin-link">Admin</a>
                </footer>
            </div>
        </div>
    );
}

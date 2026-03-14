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
import { fetchPublicSiteSettings, incrementPublicSalesCount } from '../lib/adminApi';

const LANGUAGE_STORAGE_KEY = 'site_language';
const PROPOSAL_HEIGHT_MESSAGE_TYPE = 'HAGOBOGO_PROPOSAL_HEIGHT';
const SALES_SYNC_DEBOUNCE_MS = 2500;
const SALES_SYNC_BATCH_SIZE = 10;
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

export default function Dashboard() {
    const publicSettingsPollingIntervalMs = 60000;
    const publicSettingsFocusThrottleMs = 15000;
    const homeHref = `${import.meta.env.BASE_URL || './'}app.html`;
    const adminHref = `${import.meta.env.BASE_URL || './'}app.html?view=admin`;
    const [syncedSales, setSyncedSales] = useState(DEFAULT_SALES_COUNT);
    const [pendingSalesHits, setPendingSalesHits] = useState(0);
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
        dotBlueSpawnFrequencyRange: DEFAULT_DOT_BLUE_SPAWN_FREQUENCY_RANGE,
        tickerItemsByLanguage: createEmptyTickerItemsByLanguageMap(),
    }));
    const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
    const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
    const [isChatbotOpen, setIsChatbotOpen] = useState(false);
    const [isPulsing, setIsPulsing] = useState(false);
    const [isLineHit, setIsLineHit] = useState(false);
    const [targetMetrics, setTargetMetrics] = useState(createInitialTargetMetrics);
    const pulseTimeoutRef = useRef(null);
    const lineTimeoutRef = useRef(null);
    const salesRevealTimeoutRef = useRef(null);
    const salesSyncTimeoutRef = useRef(null);
    const publicSettingsPollingIntervalRef = useRef(null);
    const isFetchingPublicSiteSettingsRef = useRef(false);
    const isSyncingSalesRef = useRef(false);
    const lastPublicSiteSettingsRequestAtRef = useRef(0);
    const pendingSalesHitsRef = useRef(0);
    const sphereGroupRef = useRef(null);
    const languageMenuRef = useRef(null);
    const proposalIframeRef = useRef(null);
    const [proposalFrameHeight, setProposalFrameHeight] = useState(1180);
    const copy = TRANSLATIONS[language];
    const chatbotQuestions = CHATBOT_FAQ[language] || CHATBOT_FAQ.EN || [];
    const proposalFileName = PROPOSAL_FILE_BY_LANGUAGE[language] || PROPOSAL_FILE_BY_LANGUAGE.EN;
    const tickerItems = siteSettings.tickerItemsByLanguage[language] || [];
    const visibleTickerItems = tickerItems;
    const displayedSales = syncedSales + pendingSalesHits;

    const loadPublicSiteSettings = useCallback(async ({ revealSales = false } = {}) => {
        if (isFetchingPublicSiteSettingsRef.current) {
            return;
        }

        isFetchingPublicSiteSettingsRef.current = true;
        lastPublicSiteSettingsRequestAtRef.current = Date.now();

        try {
            const nextSiteSettings = await fetchPublicSiteSettings();
            const normalizedSettings = normalizeAdminSiteSettings(nextSiteSettings);

            setSiteSettings((previousSettings) => {
                const hasSameSalesCount = previousSettings.salesCount === normalizedSettings.salesCount;
                const hasSameSalesIncrement = previousSettings.salesIncrement === normalizedSettings.salesIncrement;
                const hasSameDotBlueRange = (
                    previousSettings.dotBlueSpawnFrequencyRange.min === normalizedSettings.dotBlueSpawnFrequencyRange.min
                    && previousSettings.dotBlueSpawnFrequencyRange.max === normalizedSettings.dotBlueSpawnFrequencyRange.max
                );
                const hasSameTickerItems = JSON.stringify(previousSettings.tickerItemsByLanguage) === JSON.stringify(normalizedSettings.tickerItemsByLanguage);

                if (hasSameSalesCount && hasSameSalesIncrement && hasSameDotBlueRange && hasSameTickerItems) {
                    return previousSettings;
                }

                return normalizedSettings;
            });
            setSyncedSales(normalizedSettings.currentSalesCount);

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
        }
    }, []);

    const flushPendingSalesHits = useCallback(async () => {
        if (isSyncingSalesRef.current || pendingSalesHitsRef.current <= 0) {
            return;
        }

        const incrementBy = pendingSalesHitsRef.current;

        isSyncingSalesRef.current = true;

        try {
            const normalizedSettings = await incrementPublicSalesCount(incrementBy);

            setSiteSettings((previousSettings) => {
                const hasSameSalesCount = previousSettings.salesCount === normalizedSettings.salesCount;
                const hasSameSalesIncrement = previousSettings.salesIncrement === normalizedSettings.salesIncrement;
                const hasSameDotBlueRange = (
                    previousSettings.dotBlueSpawnFrequencyRange.min === normalizedSettings.dotBlueSpawnFrequencyRange.min
                    && previousSettings.dotBlueSpawnFrequencyRange.max === normalizedSettings.dotBlueSpawnFrequencyRange.max
                );
                const hasSameTickerItems = JSON.stringify(previousSettings.tickerItemsByLanguage) === JSON.stringify(normalizedSettings.tickerItemsByLanguage);

                if (hasSameSalesCount && hasSameSalesIncrement && hasSameDotBlueRange && hasSameTickerItems) {
                    return previousSettings;
                }

                return normalizedSettings;
            });
            setSyncedSales(normalizedSettings.currentSalesCount);
            pendingSalesHitsRef.current = Math.max(0, pendingSalesHitsRef.current - incrementBy);
            setPendingSalesHits((previousValue) => Math.max(0, previousValue - incrementBy));
        } catch (error) {
            console.error('판매 카운트 증가분을 저장하지 못했습니다.', error);
        } finally {
            isSyncingSalesRef.current = false;
        }
    }, []);

    useEffect(() => {
        loadPublicSiteSettings({ revealSales: true });

        publicSettingsPollingIntervalRef.current = window.setInterval(() => {
            loadPublicSiteSettings();
        }, publicSettingsPollingIntervalMs);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const now = Date.now();
                const elapsedSinceLastRequest = now - lastPublicSiteSettingsRequestAtRef.current;

                if (elapsedSinceLastRequest < publicSettingsFocusThrottleMs) {
                    return;
                }

                loadPublicSiteSettings();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if (salesRevealTimeoutRef.current) {
                window.clearTimeout(salesRevealTimeoutRef.current);
            }

            if (salesSyncTimeoutRef.current) {
                window.clearTimeout(salesSyncTimeoutRef.current);
            }

            if (publicSettingsPollingIntervalRef.current) {
                window.clearInterval(publicSettingsPollingIntervalRef.current);
            }

            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [loadPublicSiteSettings, publicSettingsFocusThrottleMs, publicSettingsPollingIntervalMs]);

    useEffect(() => {
        if (pendingSalesHits <= 0) {
            if (salesSyncTimeoutRef.current) {
                window.clearTimeout(salesSyncTimeoutRef.current);
                salesSyncTimeoutRef.current = null;
            }

            return undefined;
        }

        if (salesSyncTimeoutRef.current) {
            window.clearTimeout(salesSyncTimeoutRef.current);
        }

        salesSyncTimeoutRef.current = window.setTimeout(() => {
            flushPendingSalesHits();
        }, SALES_SYNC_DEBOUNCE_MS);

        return () => {
            if (salesSyncTimeoutRef.current) {
                window.clearTimeout(salesSyncTimeoutRef.current);
                salesSyncTimeoutRef.current = null;
            }
        };
    }, [flushPendingSalesHits, pendingSalesHits]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden' && pendingSalesHitsRef.current > 0) {
                flushPendingSalesHits();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [flushPendingSalesHits]);

    useEffect(() => {
        return () => {
            if (pulseTimeoutRef.current) {
                clearTimeout(pulseTimeoutRef.current);
            }
            if (lineTimeoutRef.current) {
                clearTimeout(lineTimeoutRef.current);
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

    const handleHit = useCallback(() => {
        pendingSalesHitsRef.current += 1;
        setPendingSalesHits((prev) => prev + 1);
        setIsPulsing(false);
        setIsLineHit(false);
        if (pulseTimeoutRef.current) {
            clearTimeout(pulseTimeoutRef.current);
        }
        if (lineTimeoutRef.current) {
            clearTimeout(lineTimeoutRef.current);
        }
        requestAnimationFrame(() => setIsPulsing(true));
        requestAnimationFrame(() => setIsLineHit(true));
        pulseTimeoutRef.current = setTimeout(() => {
            setIsPulsing(false);
        }, 1300);
        lineTimeoutRef.current = setTimeout(() => {
            setIsLineHit(false);
        }, 500);
        if (pendingSalesHitsRef.current >= SALES_SYNC_BATCH_SIZE) {
            flushPendingSalesHits();
        }
    }, [flushPendingSalesHits]);

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
                    onHit={handleHit}
                    targetCenter={targetMetrics.center}
                    collisionRadius={targetMetrics.collisionRadius}
                    spawnFrequencyRange={siteSettings.dotBlueSpawnFrequencyRange}
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

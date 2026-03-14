import React, { useRef, useState } from 'react';
import AdminTickerEditor from './AdminTickerEditor';
import logoHagobogo from '../../assets/svg/logo_haogobogo.svg';
import { authenticateAdmin, fetchAdminSettings, saveAdminSettings } from '../lib/adminApi';
import { TRANSLATIONS } from '../i18n/translations';
import {
    ADMIN_SETTING_LANGUAGES,
    formatTickerTextarea,
    normalizeAdminSiteSettings,
    parseTickerTextarea,
    TICKER_SPACE_TOKEN,
} from '../utils/adminSettings';

function parseNumericInput(value) {
    const digitsOnly = String(value).replace(/[^\d]/g, '');
    return digitsOnly ? Number(digitsOnly) : Number.NaN;
}

function formatNumericInput(value) {
    const digitsOnly = String(value).replace(/[^\d]/g, '');

    if (!digitsOnly) {
        return '';
    }

    return Number(digitsOnly).toLocaleString('en-US');
}

function createDefaultTickerInputs() {
    return {
        EN: [...TRANSLATIONS.EN.ticker],
        FR: [...TRANSLATIONS.FR.ticker],
        ES: [...TRANSLATIONS.ES.ticker],
        KR: [...TRANSLATIONS.KR.ticker],
    };
}

function buildSiteSettingsFromForm({ notificationEmailInput, salesInput, dotBlueFrequencyMinInput, dotBlueFrequencyMaxInput, tickerInputs }) {
    const nextTickerItems = ADMIN_SETTING_LANGUAGES.reduce((accumulator, language) => {
        accumulator[language] = parseTickerTextarea(formatTickerTextarea(tickerInputs[language]));
        return accumulator;
    }, {});

    return normalizeAdminSiteSettings({
        notificationEmail: notificationEmailInput.trim(),
        salesCount: parseNumericInput(salesInput),
        dotBlueSpawnFrequencyRange: {
            min: parseNumericInput(dotBlueFrequencyMinInput),
            max: parseNumericInput(dotBlueFrequencyMaxInput),
        },
        tickerItemsByLanguage: nextTickerItems,
    });
}

export default function AdminPage() {
    const homeHref = `${import.meta.env.BASE_URL || './'}app.html`;
    const adminPasswordRef = useRef('');
    const [passwordInput, setPasswordInput] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [isLoadingSettings, setIsLoadingSettings] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [tickerInputs, setTickerInputs] = useState(createDefaultTickerInputs);
    const [tickerMessage, setTickerMessage] = useState('');
    const [salesInput, setSalesInput] = useState('');
    const [salesMessage, setSalesMessage] = useState('');
    const [dotBlueFrequencyMinInput, setDotBlueFrequencyMinInput] = useState('');
    const [dotBlueFrequencyMaxInput, setDotBlueFrequencyMaxInput] = useState('');
    const [dotBlueFrequencyMessage, setDotBlueFrequencyMessage] = useState('');
    const [notificationEmailInput, setNotificationEmailInput] = useState('');
    const [notificationEmailMessage, setNotificationEmailMessage] = useState('');
    const [isSavingNotificationEmail, setIsSavingNotificationEmail] = useState(false);
    const parsedDotBlueFrequencyMin = parseNumericInput(dotBlueFrequencyMinInput);
    const parsedDotBlueFrequencyMax = parseNumericInput(dotBlueFrequencyMaxInput);
    const hasValidDotBlueFrequencyPreview = (
        Number.isFinite(parsedDotBlueFrequencyMin)
        && Number.isFinite(parsedDotBlueFrequencyMax)
        && parsedDotBlueFrequencyMin > 0
        && parsedDotBlueFrequencyMax > 0
    );
    const normalizedDotBlueFrequencyPreview = hasValidDotBlueFrequencyPreview
        ? {
            min: Math.min(parsedDotBlueFrequencyMin, parsedDotBlueFrequencyMax),
            max: Math.max(parsedDotBlueFrequencyMin, parsedDotBlueFrequencyMax),
        }
        : null;
    const dotBlueDailySalesPreview = normalizedDotBlueFrequencyPreview
        ? {
            min: normalizedDotBlueFrequencyPreview.min * 24,
            max: normalizedDotBlueFrequencyPreview.max * 24,
        }
        : null;

    const applySiteSettings = (siteSettings) => {
        const normalizedSettings = normalizeAdminSiteSettings(siteSettings);

        setTickerInputs({
            EN: normalizedSettings.tickerItemsByLanguage.EN.length > 0 ? normalizedSettings.tickerItemsByLanguage.EN : [...TRANSLATIONS.EN.ticker],
            FR: normalizedSettings.tickerItemsByLanguage.FR.length > 0 ? normalizedSettings.tickerItemsByLanguage.FR : [...TRANSLATIONS.FR.ticker],
            ES: normalizedSettings.tickerItemsByLanguage.ES.length > 0 ? normalizedSettings.tickerItemsByLanguage.ES : [...TRANSLATIONS.ES.ticker],
            KR: normalizedSettings.tickerItemsByLanguage.KR.length > 0 ? normalizedSettings.tickerItemsByLanguage.KR : [...TRANSLATIONS.KR.ticker],
        });
        setSalesInput(formatNumericInput(normalizedSettings.salesCount));
        setDotBlueFrequencyMinInput(formatNumericInput(normalizedSettings.dotBlueSpawnFrequencyRange.min));
        setDotBlueFrequencyMaxInput(formatNumericInput(normalizedSettings.dotBlueSpawnFrequencyRange.max));
        setNotificationEmailInput(normalizedSettings.notificationEmail);
    };

    const loadAdminSettings = async (adminPassword) => {
        setIsLoadingSettings(true);
        setTickerMessage('');
        setSalesMessage('');
        setDotBlueFrequencyMessage('');
        setNotificationEmailMessage('');

        try {
            const siteSettings = await fetchAdminSettings(adminPassword);
            applySiteSettings(siteSettings);
        } catch (error) {
            setIsAuthenticated(false);
            adminPasswordRef.current = '';
            setPasswordError(error.message || '관리자 설정을 불러오지 못했습니다.');
        } finally {
            setIsLoadingSettings(false);
        }
    };

    const handleAuthenticate = async (event) => {
        event.preventDefault();

        if (!passwordInput.trim()) {
            setPasswordError('비밀번호를 입력해 주세요.');
            return;
        }

        setIsAuthenticating(true);
        setPasswordError('');

        try {
            await authenticateAdmin(passwordInput);
            adminPasswordRef.current = passwordInput;
            setIsAuthenticated(true);
            await loadAdminSettings(passwordInput);
        } catch (error) {
            adminPasswordRef.current = '';
            setIsAuthenticated(false);
            setPasswordError(error.message || '비밀번호가 올바르지 않습니다.');
        } finally {
            setIsAuthenticating(false);
        }
    };

    const handleSaveTicker = async (event) => {
        event.preventDefault();

        try {
            const savedSettings = await saveAdminSettings(
                adminPasswordRef.current,
                buildSiteSettingsFromForm({
                    notificationEmailInput,
                    salesInput,
                    dotBlueFrequencyMinInput,
                    dotBlueFrequencyMaxInput,
                    tickerInputs,
                })
            );
            applySiteSettings(savedSettings);
            setTickerMessage('뉴스정보를 저장했습니다.');
        } catch (error) {
            setTickerMessage(error.message || '뉴스정보 저장에 실패했습니다.');
        }
    };

    const handleSaveSales = async (event) => {
        event.preventDefault();

        const nextSales = parseNumericInput(salesInput);
        if (!Number.isFinite(nextSales) || nextSales < 0 || !Number.isInteger(nextSales)) {
            setSalesMessage('판매 수치는 0 이상의 정수로 입력해 주세요.');
            return;
        }

        try {
            const savedSettings = await saveAdminSettings(
                adminPasswordRef.current,
                buildSiteSettingsFromForm({
                    notificationEmailInput,
                    salesInput,
                    dotBlueFrequencyMinInput,
                    dotBlueFrequencyMaxInput,
                    tickerInputs,
                })
            );
            applySiteSettings(savedSettings);
            setSalesMessage('판매 수치를 저장했습니다.');
        } catch (error) {
            setSalesMessage(error.message || '판매 수치 저장에 실패했습니다.');
        }
    };

    const handleSaveDotBlueFrequency = async (event) => {
        event.preventDefault();

        const minFrequency = parseNumericInput(dotBlueFrequencyMinInput);
        const maxFrequency = parseNumericInput(dotBlueFrequencyMaxInput);

        if (
            !Number.isFinite(minFrequency)
            || !Number.isFinite(maxFrequency)
            || minFrequency <= 0
            || maxFrequency <= 0
            || !Number.isInteger(minFrequency)
            || !Number.isInteger(maxFrequency)
        ) {
            setDotBlueFrequencyMessage('시간당 발생 빈도는 1 이상의 정수로 입력해 주세요.');
            return;
        }

        try {
            const savedSettings = await saveAdminSettings(
                adminPasswordRef.current,
                buildSiteSettingsFromForm({
                    notificationEmailInput,
                    salesInput,
                    dotBlueFrequencyMinInput,
                    dotBlueFrequencyMaxInput,
                    tickerInputs,
                })
            );
            applySiteSettings(savedSettings);
            setDotBlueFrequencyMessage('Dot_blue 시간당 발생 빈도를 저장했습니다.');
        } catch (error) {
            setDotBlueFrequencyMessage(error.message || 'Dot_blue 발생 빈도 저장에 실패했습니다.');
        }
    };

    const handleSaveNotificationEmail = async (event) => {
        event.preventDefault();

        const trimmedEmail = notificationEmailInput.trim();
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!trimmedEmail) {
            setNotificationEmailMessage('알림 수신 메일 주소를 입력해 주세요.');
            return;
        }

        if (!emailPattern.test(trimmedEmail)) {
            setNotificationEmailMessage('올바른 이메일 형식으로 입력해 주세요.');
            return;
        }

        setIsSavingNotificationEmail(true);
        setNotificationEmailMessage('');

        try {
            const savedSettings = await saveAdminSettings(
                adminPasswordRef.current,
                buildSiteSettingsFromForm({
                    notificationEmailInput,
                    salesInput,
                    dotBlueFrequencyMinInput,
                    dotBlueFrequencyMaxInput,
                    tickerInputs,
                })
            );
            applySiteSettings(savedSettings);
            setNotificationEmailMessage('알림 수신 메일 주소를 저장했습니다.');
        } catch (error) {
            setNotificationEmailMessage(error.message || '알림 수신 메일 주소 저장에 실패했습니다.');
        } finally {
            setIsSavingNotificationEmail(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="admin-page min-h-screen px-[20px] py-[32px] text-[#4d545a]">
                <header className="admin-header mx-auto flex w-full max-w-[1120px] items-center justify-between">
                    <a href={homeHref} className="flex items-center">
                        <img
                            src={logoHagobogo}
                            alt="HAGOBOGO logo"
                            className="w-[97px] md:w-[119px] lg:w-[140px] h-auto object-contain"
                        />
                    </a>
                </header>

                <main className="mx-auto mt-[72px] w-full max-w-[520px]">
                    <section className="admin-card">
                        <div className="admin-card-copy">
                            <p className="admin-eyebrow">ADMIN</p>
                            <h1 className="admin-title">관리자 비밀번호를 입력해 주세요</h1>
                            <p className="admin-description">
                                관리자 페이지에서는 뉴스정보, 판매 수치, Dot_blue 발생 빈도, 알림 수신 메일 주소를 직접 수정할 수 있습니다.
                            </p>
                        </div>

                        <form className="admin-form" onSubmit={handleAuthenticate}>
                            <label className="admin-field">
                                <span className="admin-label">비밀번호</span>
                                <input
                                    type="password"
                                    value={passwordInput}
                                    onChange={(event) => setPasswordInput(event.target.value)}
                                    className="admin-input"
                                    placeholder="비밀번호를 입력해 주세요"
                                    disabled={isAuthenticating}
                                />
                            </label>

                            {passwordError ? <p className="admin-message is-error">{passwordError}</p> : null}

                            <div className="admin-actions">
                                <button type="submit" className="admin-primary-button" disabled={isAuthenticating}>
                                    {isAuthenticating ? '확인 중...' : '입장하기'}
                                </button>
                                <a href={homeHref} className="admin-secondary-button">메인으로 돌아가기</a>
                            </div>
                        </form>
                    </section>
                </main>
            </div>
        );
    }

    return (
        <div className="admin-page min-h-screen px-[20px] py-[32px] text-[#4d545a]">
            <header className="admin-header mx-auto flex w-full max-w-[1120px] items-center justify-between">
                <a href={homeHref} className="flex items-center">
                    <img
                        src={logoHagobogo}
                        alt="HAGOBOGO logo"
                        className="w-[97px] md:w-[119px] lg:w-[140px] h-auto object-contain"
                    />
                </a>
            </header>

            <main className="mx-auto mt-[48px] flex w-full max-w-[1120px] flex-col gap-[18px] pb-[80px]">
                {isLoadingSettings ? (
                    <section className="admin-card">
                        <p className="admin-description">관리자 설정을 불러오는 중입니다.</p>
                    </section>
                ) : null}

                <section className="admin-card">
                    <div className="admin-card-copy">
                        <p className="admin-eyebrow">NEWS TICKER</p>
                        <h2 className="admin-section-title">뉴스정보(news ticker) 입력</h2>
                        <p className="admin-description">문장 하나를 입력한 뒤 Enter를 누르면 다음 줄에 회색 안내 토큰이 들어가고, 메인 페이지에서는 간격만 적용됩니다.</p>
                        <p className="admin-description admin-description-muted">
                            문장 사이 빈칸이 필요하면 빈 줄 대신 <span className="admin-inline-token">{TICKER_SPACE_TOKEN}</span> 를 입력해 주세요.
                            메인 화면에서는 이 문구가 보이지 않고 간격만 적용됩니다.
                        </p>
                    </div>

                    <form className="admin-form" onSubmit={handleSaveTicker}>
                        <div className="admin-language-grid">
                            {ADMIN_SETTING_LANGUAGES.map((language) => (
                                <AdminTickerEditor
                                    key={language}
                                    label={language}
                                    items={tickerInputs[language]}
                                    onChange={(nextItems) => {
                                        setTickerInputs((prev) => ({
                                            ...prev,
                                            [language]: nextItems,
                                        }));
                                        setTickerMessage('');
                                    }}
                                />
                            ))}
                        </div>

                        {tickerMessage ? <p className={`admin-message${tickerMessage.includes('실패') ? ' is-error' : ''}`}>{tickerMessage}</p> : null}
                        <div className="admin-actions admin-actions-center">
                            <button type="submit" className="admin-primary-button" disabled={isLoadingSettings}>뉴스정보 저장</button>
                        </div>
                    </form>
                </section>

                <section className="admin-card">
                    <div className="admin-card-copy">
                        <p className="admin-eyebrow">SALES COUNTER</p>
                        <h2 className="admin-section-title">판매 수치(sales counter) 설정</h2>
                        <p className="admin-description">입력한 숫자를 메인 페이지 판매 카운터의 새 기준값으로 사용합니다.</p>
                    </div>

                    <form className="admin-form" onSubmit={handleSaveSales}>
                        <label className="admin-field">
                            <input
                                type="text"
                                inputMode="numeric"
                                value={salesInput}
                                onChange={(event) => {
                                    setSalesInput(formatNumericInput(event.target.value));
                                    setSalesMessage('');
                                }}
                                className="admin-input admin-input-large"
                                placeholder="예: 101023"
                            />
                        </label>

                        {salesMessage ? <p className={`admin-message${salesMessage.includes('정수') || salesMessage.includes('실패') ? ' is-error' : ''}`}>{salesMessage}</p> : null}
                        <div className="admin-actions admin-actions-center">
                            <button type="submit" className="admin-primary-button" disabled={isLoadingSettings}>판매 수치 저장</button>
                        </div>
                    </form>
                </section>

                <section className="admin-card">
                    <div className="admin-card-copy">
                        <p className="admin-eyebrow">DOT BLUE</p>
                        <h2 className="admin-section-title">제품 판매 빈도 설정 (Dot_blue 발생 빈도)</h2>
                        <p className="admin-description">1시간 기준 최소값과 최대값 사이에서 랜덤하게 Dot_blue가 발생하도록 설정합니다.</p>
                    </div>

                    <form className="admin-form" onSubmit={handleSaveDotBlueFrequency}>
                        <label className="admin-field">
                            <div className="admin-frequency-stack">
                                <span className="admin-frequency-prefix">1 시간당 발생 빈도</span>
                                <div className="admin-frequency-field">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={dotBlueFrequencyMinInput}
                                        onChange={(event) => {
                                            setDotBlueFrequencyMinInput(formatNumericInput(event.target.value));
                                            setDotBlueFrequencyMessage('');
                                        }}
                                        className="admin-input admin-input-large admin-frequency-input"
                                        placeholder="최소"
                                    />
                                    <span className="admin-frequency-divider">-</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={dotBlueFrequencyMaxInput}
                                        onChange={(event) => {
                                            setDotBlueFrequencyMaxInput(formatNumericInput(event.target.value));
                                            setDotBlueFrequencyMessage('');
                                        }}
                                        className="admin-input admin-input-large admin-frequency-input"
                                        placeholder="최대"
                                    />
                                    <span className="admin-frequency-suffix">개</span>
                                </div>
                            </div>
                        </label>

                        {dotBlueDailySalesPreview ? (
                            <p className="admin-frequency-preview">
                                1일 판매 제품 판매량 예시: {formatNumericInput(dotBlueDailySalesPreview.min)}개
                                {dotBlueDailySalesPreview.min !== dotBlueDailySalesPreview.max
                                    ? ` - ${formatNumericInput(dotBlueDailySalesPreview.max)}개`
                                    : ''}
                            </p>
                        ) : null}
                        {dotBlueFrequencyMessage ? <p className={`admin-message${dotBlueFrequencyMessage.includes('정수') || dotBlueFrequencyMessage.includes('실패') ? ' is-error' : ''}`}>{dotBlueFrequencyMessage}</p> : null}
                        <div className="admin-actions admin-actions-center">
                            <button type="submit" className="admin-primary-button" disabled={isLoadingSettings}>발생 빈도 저장</button>
                        </div>
                    </form>
                </section>

                <section className="admin-card">
                    <div className="admin-card-copy">
                        <p className="admin-eyebrow">NOTIFICATION EMAIL</p>
                        <h2 className="admin-section-title">알림 수신 메일 주소</h2>
                        <p className="admin-description">문의사항이 접수되면 이 메일 주소로 알림이 전송됩니다.</p>
                    </div>

                    <form className="admin-form" onSubmit={handleSaveNotificationEmail}>
                        <label className="admin-field">
                            <input
                                type="email"
                                value={notificationEmailInput}
                                onChange={(event) => {
                                    setNotificationEmailInput(event.target.value);
                                    setNotificationEmailMessage('');
                                }}
                                className="admin-input admin-input-large"
                                placeholder="예: admin@example.com"
                                disabled={isSavingNotificationEmail}
                            />
                        </label>

                        {notificationEmailMessage ? (
                            <p className={`admin-message${notificationEmailMessage.includes('실패') || notificationEmailMessage.includes('입력') || notificationEmailMessage.includes('형식') ? ' is-error' : ''}`}>
                                {notificationEmailMessage}
                            </p>
                        ) : null}

                        <div className="admin-actions admin-actions-center">
                            <button type="submit" className="admin-primary-button" disabled={isSavingNotificationEmail}>
                                {isSavingNotificationEmail ? '저장 중...' : '메일 주소 저장'}
                            </button>
                        </div>
                    </form>
                </section>

                <div className="admin-page-footer-action">
                    <a href={homeHref} className="admin-secondary-button">메인화면 가기</a>
                </div>
            </main>
        </div>
    );
}

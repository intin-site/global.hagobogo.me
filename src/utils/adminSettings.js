export const DEFAULT_SALES_COUNT = 100000;
export const DEFAULT_DOT_BLUE_SPAWN_FREQUENCY_RANGE = {
    min: 900,
    max: 1440,
};
export const TICKER_SPACE_TOKEN = '/Space';
export const TICKER_EDITOR_EMPTY_ITEM = '__TICKER_EDITOR_EMPTY__';
export const ADMIN_SETTING_LANGUAGES = ['EN', 'FR', 'ES', 'KR'];

export function formatTickerTextarea(items) {
    return items
        .filter((item) => item !== TICKER_EDITOR_EMPTY_ITEM)
        .map((item) => item === '' ? TICKER_SPACE_TOKEN : item)
        .join('\n');
}

export function parseTickerTextarea(value) {
    if (typeof value !== 'string' || value.trim() === '') {
        return [];
    }

    return value
        .split('\n')
        .map((item) => {
            const trimmedValue = item.trim();
            return trimmedValue === TICKER_SPACE_TOKEN ? '' : trimmedValue;
        });
}

export function createEmptyTickerItemsByLanguageMap() {
    return ADMIN_SETTING_LANGUAGES.reduce((accumulator, language) => {
        accumulator[language] = [];
        return accumulator;
    }, {});
}

export function normalizeDotBlueSpawnFrequencyRange(value) {
    const min = Number(value?.min);
    const max = Number(value?.max);

    if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0) {
        return DEFAULT_DOT_BLUE_SPAWN_FREQUENCY_RANGE;
    }

    return {
        min: Math.min(min, max),
        max: Math.max(min, max),
    };
}

export function normalizeTickerItemsByLanguageMap(itemsByLanguage) {
    const nextItemsByLanguage = createEmptyTickerItemsByLanguageMap();

    if (!itemsByLanguage || typeof itemsByLanguage !== 'object') {
        return nextItemsByLanguage;
    }

    for (const language of ADMIN_SETTING_LANGUAGES) {
        const languageItems = itemsByLanguage[language];

        if (!Array.isArray(languageItems)) {
            continue;
        }

        nextItemsByLanguage[language] = languageItems.filter((item) => typeof item === 'string');
    }

    return nextItemsByLanguage;
}

export function normalizeAdminSiteSettings(settings) {
    return {
        notificationEmail: typeof settings?.notificationEmail === 'string' ? settings.notificationEmail : '',
        salesCount: Number.isFinite(Number(settings?.salesCount)) && Number(settings?.salesCount) >= 0
            ? Number(settings.salesCount)
            : DEFAULT_SALES_COUNT,
        dotBlueSpawnFrequencyRange: normalizeDotBlueSpawnFrequencyRange(settings?.dotBlueSpawnFrequencyRange),
        tickerItemsByLanguage: normalizeTickerItemsByLanguageMap(settings?.tickerItemsByLanguage),
    };
}

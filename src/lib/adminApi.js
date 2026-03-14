import { normalizeAdminSiteSettings } from '../utils/adminSettings';

function getAdminSettingsApiUrl() {
    const value = import.meta.env.VITE_ADMIN_SETTINGS_API_URL?.trim() || '';
    return value.startsWith('REPLACE_WITH_') ? '' : value;
}

async function readJsonResponse(response, fallbackMessage) {
    const responseText = await response.text();

    try {
        return JSON.parse(responseText);
    } catch {
        return {
            ok: false,
            code: 'UNKNOWN_RESPONSE',
            message: fallbackMessage,
        };
    }
}

async function postAdminRequest(payload) {
    const adminSettingsApiUrl = getAdminSettingsApiUrl();

    if (!adminSettingsApiUrl) {
        const error = new Error('관리자 설정용 API URL이 설정되지 않았습니다.');
        error.code = 'MISSING_ADMIN_SETTINGS_API_URL';
        throw error;
    }

    let response;

    try {
        response = await fetch(adminSettingsApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(payload),
        });
    } catch (error) {
        const networkError = new Error('관리자 설정 요청 중 네트워크 오류가 발생했습니다.');
        networkError.code = 'NETWORK_ERROR';
        networkError.cause = error;
        throw networkError;
    }

    const data = await readJsonResponse(response, '관리자 설정 API가 JSON 형식이 아닌 응답을 반환했습니다.');

    if (!response.ok || !data.ok) {
        const error = new Error(data.message || '관리자 설정 요청에 실패했습니다.');
        error.code = data.code || 'UNKNOWN_ERROR';
        throw error;
    }

    return data;
}

export async function authenticateAdmin(adminPassword) {
    await postAdminRequest({
        action: 'AUTHENTICATE_ADMIN',
        adminPassword,
    });
}

export async function fetchAdminSettings(adminPassword) {
    const data = await postAdminRequest({
        action: 'GET_ADMIN_SETTINGS',
        adminPassword,
    });

    return normalizeAdminSiteSettings(data.siteSettings);
}

export async function saveAdminSettings(adminPassword, siteSettings) {
    const data = await postAdminRequest({
        action: 'SAVE_ADMIN_SETTINGS',
        adminPassword,
        siteSettingsPatch: siteSettings,
    });

    return normalizeAdminSiteSettings(data.siteSettings);
}

export async function fetchPublicSiteSettings() {
    const data = await postAdminRequest({
        action: 'GET_PUBLIC_SITE_SETTINGS',
    });

    return normalizeAdminSiteSettings(data.siteSettings);
}

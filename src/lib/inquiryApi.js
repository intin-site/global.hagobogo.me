const INQUIRY_API_TIMEOUT_MS = 12000;

function getInquiryApiUrl() {
    const value = import.meta.env.VITE_BUSINESS_INQUIRY_API_URL?.trim() || '';
    return value.startsWith('REPLACE_WITH_') ? '' : value;
}

async function fetchWithTimeout(url, options, timeoutMs) {
    const abortController = new AbortController();
    const timeoutId = window.setTimeout(() => {
        abortController.abort();
    }, timeoutMs);

    try {
        return await fetch(url, {
            ...options,
            signal: abortController.signal,
        });
    } catch (error) {
        if (error?.name === 'AbortError') {
            const timeoutError = new Error('문의 저장 응답이 지연되어 통신을 중단했습니다. 잠시 후 다시 시도해 주세요.');
            timeoutError.code = 'TIMEOUT_ERROR';
            timeoutError.cause = error;
            throw timeoutError;
        }

        throw error;
    } finally {
        window.clearTimeout(timeoutId);
    }
}

export async function submitBusinessInquiry(payload) {
    const inquiryApiUrl = getInquiryApiUrl();

    if (!inquiryApiUrl) {
        const error = new Error('문의 저장용 Apps Script URL이 설정되지 않았습니다.');
        error.code = 'MISSING_INQUIRY_API_URL';
        throw error;
    }

    let response;

    try {
        response = await fetchWithTimeout(
            inquiryApiUrl,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(payload),
            },
            INQUIRY_API_TIMEOUT_MS
        );
    } catch (error) {
        if (error?.code === 'TIMEOUT_ERROR') {
            throw error;
        }

        const networkError = new Error('문의 전송 중 네트워크 오류가 발생했습니다.');
        networkError.code = 'NETWORK_ERROR';
        networkError.cause = error;
        throw networkError;
    }

    const responseText = await response.text();
    let data;

    try {
        data = JSON.parse(responseText);
    } catch {
        data = {
            ok: false,
            code: 'UNKNOWN_RESPONSE',
            message: 'Apps Script가 JSON 형식이 아닌 응답을 반환했습니다.',
        };
    }

    if (!response.ok || !data.ok) {
        const error = new Error(data.message || '문의 전송에 실패했습니다.');
        error.code = data.code || 'UNKNOWN_ERROR';
        throw error;
    }

    return data;
}

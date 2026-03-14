function getInquiryApiUrl() {
    const value = import.meta.env.VITE_BUSINESS_INQUIRY_API_URL?.trim() || '';
    return value.startsWith('REPLACE_WITH_') ? '' : value;
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
        response = await fetch(inquiryApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(payload),
        });
    } catch (error) {
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

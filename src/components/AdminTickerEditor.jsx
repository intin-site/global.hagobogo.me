import React, { useEffect, useMemo, useRef } from 'react';
import { TICKER_EDITOR_EMPTY_ITEM, TICKER_SPACE_TOKEN } from '../utils/adminSettings';

function normalizeItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
        return [TICKER_EDITOR_EMPTY_ITEM];
    }

    if (items[items.length - 1] === '') {
        return [...items, TICKER_EDITOR_EMPTY_ITEM];
    }

    return items;
}

export default function AdminTickerEditor({ label, items, onChange }) {
    const normalizedItems = useMemo(() => normalizeItems(items), [items]);
    const lineRefs = useRef({});
    const lastItemIndex = normalizedItems.length - 1;

    useEffect(() => {
        lineRefs.current = {};
    }, [label]);

    const updateItems = (nextItems) => {
        onChange(nextItems.length > 0 ? nextItems : [TICKER_EDITOR_EMPTY_ITEM]);
    };

    const handleLineChange = (index) => (event) => {
        const nextItems = [...normalizedItems];
        nextItems[index] = event.target.value === '' ? TICKER_EDITOR_EMPTY_ITEM : event.target.value;
        updateItems(nextItems);
    };

    const handleLineKeyDown = (index) => (event) => {
        if (event.key === 'Backspace' && !event.nativeEvent.isComposing) {
            const currentValue = normalizedItems[index];

            if (currentValue !== TICKER_EDITOR_EMPTY_ITEM) {
                return;
            }

            event.preventDefault();

            const nextItems = [...normalizedItems];
            nextItems.splice(index, 1);
            updateItems(nextItems);

            requestAnimationFrame(() => {
                const fallbackIndex = Math.max(0, index - 1);
                const fallbackInput = lineRefs.current[fallbackIndex];
                if (!fallbackInput) {
                    return;
                }

                const nextValue = fallbackInput.value;
                fallbackInput.focus();
                fallbackInput.setSelectionRange(nextValue.length, nextValue.length);
            });
            return;
        }

        if (event.key !== 'Enter' || event.nativeEvent.isComposing) {
            return;
        }

        event.preventDefault();

        const nextItems = [...normalizedItems];
        nextItems[index] = nextItems[index] === TICKER_EDITOR_EMPTY_ITEM ? '' : nextItems[index];
        nextItems.splice(index + 1, 0, '', TICKER_EDITOR_EMPTY_ITEM);
        updateItems(nextItems);

        requestAnimationFrame(() => {
            const nextInput = lineRefs.current[index + 2];
            if (!nextInput) {
                return;
            }

            nextInput.focus();
            nextInput.setSelectionRange(0, 0);
        });
    };

    const handleRemoveSpaceToken = (index) => () => {
        const nextItems = [...normalizedItems];
        nextItems.splice(index, 1);
        updateItems(nextItems);
    };

    const handleRemoveLine = (index) => () => {
        const nextItems = [...normalizedItems];
        nextItems.splice(index, 1);
        updateItems(nextItems);
    };

    return (
        <div className="admin-ticker-editor">
            <p className="admin-language-label">{label}</p>
            <div className="admin-ticker-editor-surface">
                {normalizedItems.map((item, index) => (
                    item === '' ? (
                        <div key={`${label}-space-${index}`} className="admin-ticker-space-row">
                            <button
                                type="button"
                                className="admin-ticker-space-token"
                                onClick={handleRemoveSpaceToken(index)}
                                aria-label={`${label} /Space 토큰 삭제`}
                            >
                                {TICKER_SPACE_TOKEN}
                            </button>
                            <button
                                type="button"
                                className="admin-ticker-remove-button"
                                onClick={handleRemoveSpaceToken(index)}
                                aria-label={`${label} /Space 삭제`}
                            >
                                ×
                            </button>
                        </div>
                    ) : (
                        <div key={`${label}-line-${index}`} className="admin-ticker-line-row">
                            <input
                                ref={(node) => {
                                    if (node) {
                                        lineRefs.current[index] = node;
                                    }
                                }}
                                type="text"
                                value={item === TICKER_EDITOR_EMPTY_ITEM ? '' : item}
                                onChange={handleLineChange(index)}
                                onKeyDown={handleLineKeyDown(index)}
                                className="admin-ticker-line-input"
                                placeholder={`${label} 뉴스정보를 입력해 주세요`}
                            />
                            {!(item === TICKER_EDITOR_EMPTY_ITEM && index === lastItemIndex) ? (
                                <button
                                    type="button"
                                    className="admin-ticker-remove-button"
                                    onClick={handleRemoveLine(index)}
                                    aria-label={`${label} 문장 삭제`}
                                >
                                    ×
                                </button>
                            ) : null}
                        </div>
                    )
                ))}
            </div>
        </div>
    );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { submitBusinessInquiry } from '../lib/inquiryApi';
import { COUNTRIES } from '../constants/countries';

const MAX_INQUIRY_LENGTH = 3000;

const INITIAL_FORM_VALUES = {
    name: '',
    title: '',
    country: '',
    companyName: '',
    email: '',
    inquiry: '',
};

const FIELD_ORDER = ['name', 'title', 'country', 'companyName', 'email', 'inquiry'];

function getSubmitErrorMessage(copy, error) {
    if (!error || typeof error !== 'object') {
        return copy.submit.failure;
    }

    const errorMessages = {
        MISSING_INQUIRY_API_URL: copy.submit.missingApiUrl,
        SHEET_NOT_FOUND: copy.submit.sheetNotFound,
        NETWORK_ERROR: copy.submit.networkFailure,
        UNKNOWN_RESPONSE: copy.submit.invalidResponse,
    };

    return errorMessages[error.code] || error.message || copy.submit.failure;
}

export default function InquiryModal({ copy, language, onClose }) {
    const [formValues, setFormValues] = useState(INITIAL_FORM_VALUES);
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitState, setSubmitState] = useState(null);
    const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
    const [highlightedCountryIndex, setHighlightedCountryIndex] = useState(0);
    const firstInputRef = useRef(null);
    const fieldRefs = useRef({});
    const closeTimeoutRef = useRef(null);
    const countryFieldRef = useRef(null);
    const countryTriggerRef = useRef(null);
    const countryOptionRefs = useRef([]);

    const inquiryLength = formValues.inquiry.length;
    const inquiryCountLabel = useMemo(
        () => `${inquiryLength}/${MAX_INQUIRY_LENGTH}`,
        [inquiryLength]
    );

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        firstInputRef.current?.focus();

        return () => {
            document.body.style.overflow = previousOverflow;
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                if (isCountryDropdownOpen) {
                    setIsCountryDropdownOpen(false);
                    return;
                }

                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isCountryDropdownOpen, onClose]);

    useEffect(() => {
        const handlePointerDown = (event) => {
            if (!countryFieldRef.current?.contains(event.target)) {
                setIsCountryDropdownOpen(false);
            }
        };

        window.addEventListener('mousedown', handlePointerDown);

        return () => {
            window.removeEventListener('mousedown', handlePointerDown);
        };
    }, []);

    useEffect(() => {
        if (!isCountryDropdownOpen) {
            return;
        }

        const selectedIndex = COUNTRIES.indexOf(formValues.country);
        setHighlightedCountryIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }, [formValues.country, isCountryDropdownOpen]);

    useEffect(() => {
        if (!isCountryDropdownOpen) {
            return;
        }

        const targetOption = countryOptionRefs.current[highlightedCountryIndex];
        if (!targetOption) {
            return;
        }

        targetOption.focus();
        targetOption.scrollIntoView({
            block: 'nearest',
        });
    }, [highlightedCountryIndex, isCountryDropdownOpen]);

    const updateFieldValue = (name, value) => {
        setFormValues(prev => ({
            ...prev,
            [name]: value,
        }));
        setSubmitState(null);

        setFormErrors(prev => {
            if (!prev[name]) {
                return prev;
            }

            const nextErrors = { ...prev };
            delete nextErrors[name];
            return nextErrors;
        });
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        updateFieldValue(name, value);
    };

    const handleInputKeyDown = (fieldName) => (event) => {
        if (event.nativeEvent.isComposing) {
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();

            const currentIndex = FIELD_ORDER.indexOf(fieldName);
            const nextFieldName = FIELD_ORDER[currentIndex + 1];

            if (!nextFieldName) {
                return;
            }

            fieldRefs.current[nextFieldName]?.focus();
        }
    };

    const validateForm = () => {
        const nextErrors = {};
        const requiredFields = ['name', 'country', 'companyName', 'email', 'inquiry'];
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        requiredFields.forEach((fieldName) => {
            if (!formValues[fieldName].trim()) {
                nextErrors[fieldName] = copy.errors.required;
            }
        });

        if (formValues.email.trim() && !emailPattern.test(formValues.email.trim())) {
            nextErrors.email = copy.errors.invalidEmail;
        }

        return nextErrors;
    };

    const focusCountryOption = (nextIndex) => {
        const normalizedIndex = (nextIndex + COUNTRIES.length) % COUNTRIES.length;
        setHighlightedCountryIndex(normalizedIndex);
    };

    const openCountryDropdown = () => {
        const selectedIndex = COUNTRIES.indexOf(formValues.country);
        setHighlightedCountryIndex(selectedIndex >= 0 ? selectedIndex : 0);
        setIsCountryDropdownOpen(true);
    };

    const closeCountryDropdown = () => {
        setIsCountryDropdownOpen(false);
    };

    const handleCountrySelect = (country) => {
        updateFieldValue('country', country);
        closeCountryDropdown();
        requestAnimationFrame(() => {
            countryTriggerRef.current?.focus();
        });
    };

    const handleCountryTriggerKeyDown = (event) => {
        if (event.nativeEvent.isComposing) {
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();

            if (!isCountryDropdownOpen) {
                openCountryDropdown();
                return;
            }

            focusCountryOption(highlightedCountryIndex + 1);
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();

            if (!isCountryDropdownOpen) {
                openCountryDropdown();
                return;
            }

            focusCountryOption(highlightedCountryIndex - 1);
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();

            if (isCountryDropdownOpen) {
                handleCountrySelect(COUNTRIES[highlightedCountryIndex]);
                return;
            }

            openCountryDropdown();
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            closeCountryDropdown();
        }
    };

    const handleCountryOptionKeyDown = (index) => (event) => {
        if (event.nativeEvent.isComposing) {
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            focusCountryOption(index + 1);
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            focusCountryOption(index - 1);
        }

        if (event.key === 'Home') {
            event.preventDefault();
            focusCountryOption(0);
        }

        if (event.key === 'End') {
            event.preventDefault();
            focusCountryOption(COUNTRIES.length - 1);
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleCountrySelect(COUNTRIES[index]);
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            closeCountryDropdown();
            requestAnimationFrame(() => {
                countryTriggerRef.current?.focus();
            });
        }

        if (event.key === 'Tab') {
            closeCountryDropdown();
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const nextErrors = validateForm();
        setFormErrors(nextErrors);
        setSubmitState(null);

        if (Object.keys(nextErrors).length > 0) {
            return;
        }

        setIsSubmitting(true);

        try {
            await submitBusinessInquiry({
                ...formValues,
                language,
                submittedAt: new Date().toISOString(),
            });

            setSubmitState({
                type: 'success',
                message: copy.submit.success,
            });

            setFormValues(INITIAL_FORM_VALUES);
            setFormErrors({});
            closeTimeoutRef.current = setTimeout(() => {
                onClose();
            }, 1400);
        } catch (error) {
            setSubmitState({
                type: 'error',
                message: getSubmitErrorMessage(copy, error),
            });
            console.error('Business inquiry submit failed', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOverlayDoubleClick = (event) => {
        if (event.target !== event.currentTarget || isSubmitting) {
            return;
        }

        onClose();
    };

    return (
        <div className="inquiry-modal-overlay" role="presentation" onDoubleClick={handleOverlayDoubleClick}>
            <div
                className="inquiry-modal-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="business-inquiries-title"
            >
                <form className="inquiry-modal-form" onSubmit={handleSubmit} noValidate>
                    <button
                        type="button"
                        className="inquiry-modal-close-button"
                        aria-label={copy.buttons.close}
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        <span aria-hidden="true">×</span>
                    </button>
                    <h2 id="business-inquiries-title" className="inquiry-modal-title">
                        {copy.title}
                    </h2>

                    <div className="inquiry-modal-fields">
                        <div className="inquiry-field-group">
                            <div className="inquiry-field-heading">
                                <label htmlFor="inquiry-name" className="inquiry-field-label">{copy.fields.name}</label>
                                <span className="inquiry-field-warning">{formErrors.name || ''}</span>
                            </div>
                            <input
                                id="inquiry-name"
                                ref={(node) => {
                                    firstInputRef.current = node;
                                    fieldRefs.current.name = node;
                                }}
                                type="text"
                                name="name"
                                value={formValues.name}
                                onChange={handleChange}
                                onKeyDown={handleInputKeyDown('name')}
                                className={`inquiry-field-input ${formErrors.name ? 'is-error' : ''}`}
                            />
                        </div>

                        <div className="inquiry-field-group">
                            <div className="inquiry-field-heading">
                                <label htmlFor="inquiry-title" className="inquiry-field-label">{copy.fields.title}</label>
                                <span className="inquiry-field-warning">{formErrors.title || ''}</span>
                            </div>
                            <input
                                id="inquiry-title"
                                ref={(node) => {
                                    fieldRefs.current.title = node;
                                }}
                                type="text"
                                name="title"
                                value={formValues.title}
                                onChange={handleChange}
                                onKeyDown={handleInputKeyDown('title')}
                                className={`inquiry-field-input ${formErrors.title ? 'is-error' : ''}`}
                            />
                        </div>

                        <div className="inquiry-field-group">
                            <div className="inquiry-field-heading">
                                <label htmlFor="inquiry-country" className="inquiry-field-label">{copy.fields.country}</label>
                                <span className="inquiry-field-warning">{formErrors.country || ''}</span>
                            </div>
                            <div className="inquiry-field-select-wrap" ref={countryFieldRef}>
                                <button
                                    id="inquiry-country"
                                    ref={(node) => {
                                        fieldRefs.current.country = node;
                                        countryTriggerRef.current = node;
                                    }}
                                    type="button"
                                    className={`inquiry-field-select ${formErrors.country ? 'is-error' : ''}`}
                                    aria-haspopup="listbox"
                                    aria-expanded={isCountryDropdownOpen}
                                    aria-controls="inquiry-country-listbox"
                                    onClick={() => {
                                        if (isCountryDropdownOpen) {
                                            closeCountryDropdown();
                                            return;
                                        }

                                        openCountryDropdown();
                                    }}
                                    onKeyDown={handleCountryTriggerKeyDown}
                                >
                                    <span className={`inquiry-field-select-value ${formValues.country ? '' : 'is-placeholder'}`}>
                                        {formValues.country || copy.fields.countryPlaceholder}
                                    </span>
                                    <span
                                        className={`inquiry-field-select-icon ${isCountryDropdownOpen ? 'is-open' : ''}`}
                                        aria-hidden="true"
                                    />
                                </button>
                                {isCountryDropdownOpen && (
                                    <ul
                                        id="inquiry-country-listbox"
                                        className="inquiry-field-select-dropdown"
                                        role="listbox"
                                        aria-labelledby="inquiry-country"
                                    >
                                        {COUNTRIES.map((country, index) => (
                                            <li key={country} role="presentation">
                                                <button
                                                    ref={(node) => {
                                                        countryOptionRefs.current[index] = node;
                                                    }}
                                                    type="button"
                                                    role="option"
                                                    aria-selected={formValues.country === country}
                                                    className={`inquiry-field-select-option ${formValues.country === country ? 'is-selected' : ''}`}
                                                    onClick={() => handleCountrySelect(country)}
                                                    onKeyDown={handleCountryOptionKeyDown(index)}
                                                >
                                                    {country}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <div className="inquiry-field-group">
                            <div className="inquiry-field-heading">
                                <label htmlFor="inquiry-company-name" className="inquiry-field-label">{copy.fields.companyName}</label>
                                <span className="inquiry-field-warning">{formErrors.companyName || ''}</span>
                            </div>
                            <input
                                id="inquiry-company-name"
                                ref={(node) => {
                                    fieldRefs.current.companyName = node;
                                }}
                                type="text"
                                name="companyName"
                                value={formValues.companyName}
                                onChange={handleChange}
                                onKeyDown={handleInputKeyDown('companyName')}
                                className={`inquiry-field-input ${formErrors.companyName ? 'is-error' : ''}`}
                            />
                        </div>

                        <div className="inquiry-field-group">
                            <div className="inquiry-field-heading">
                                <label htmlFor="inquiry-email" className="inquiry-field-label">{copy.fields.email}</label>
                                <span className="inquiry-field-warning">{formErrors.email || ''}</span>
                            </div>
                            <input
                                id="inquiry-email"
                                ref={(node) => {
                                    fieldRefs.current.email = node;
                                }}
                                type="email"
                                name="email"
                                value={formValues.email}
                                onChange={handleChange}
                                onKeyDown={handleInputKeyDown('email')}
                                className={`inquiry-field-input ${formErrors.email ? 'is-error' : ''}`}
                            />
                        </div>

                        <div className="inquiry-field-group">
                            <div className="inquiry-field-heading">
                                <label htmlFor="inquiry-content" className="inquiry-field-label">{copy.fields.inquiry}</label>
                                <span className="inquiry-field-warning">{formErrors.inquiry || ''}</span>
                            </div>
                            <textarea
                                id="inquiry-content"
                                ref={(node) => {
                                    fieldRefs.current.inquiry = node;
                                }}
                                name="inquiry"
                                value={formValues.inquiry}
                                onChange={handleChange}
                                maxLength={MAX_INQUIRY_LENGTH}
                                className={`inquiry-field-textarea ${formErrors.inquiry ? 'is-error' : ''}`}
                            />
                            <div className="inquiry-field-footer">
                                <span className="inquiry-field-count">{inquiryCountLabel}</span>
                            </div>
                        </div>
                    </div>

                    <div className="inquiry-modal-actions">
                        <p
                            className={`inquiry-submit-message ${submitState ? (submitState.type === 'success' ? 'is-success' : 'is-error') : 'is-idle'}`}
                            aria-live="polite"
                        >
                            {submitState?.message || ''}
                        </p>
                        <button type="button" className="inquiry-action-button is-cancel" onClick={onClose} disabled={isSubmitting}>
                            {copy.buttons.cancel}
                        </button>
                        <button type="submit" className="inquiry-action-button is-save" disabled={isSubmitting}>
                            {isSubmitting ? copy.buttons.saving : copy.buttons.save}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

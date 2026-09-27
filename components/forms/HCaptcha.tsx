'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import Script from 'next/script';

interface HCaptchaApi {
    render: (container: HTMLElement, options: Record<string, unknown>) => string;
    reset: (id?: string) => void;
    getResponse: (id?: string) => string;
}

declare global {
    interface Window {
        hcaptcha?: HCaptchaApi;
        onHCaptchaLoad?: () => void;
    }
}

export interface HCaptchaHandle {
    getResponse: () => string;
    reset: () => void;
}

/** Widget hCaptcha renderowany jawnie, w ciemnej wersji i po polsku. */
export const HCaptcha = forwardRef<HCaptchaHandle, { siteKey: string }>(function HCaptcha({ siteKey }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetId = useRef<string | null>(null);

    useImperativeHandle(ref, () => ({
        getResponse: () => (widgetId.current !== null ? window.hcaptcha?.getResponse(widgetId.current) || '' : ''),
        reset: () => {
            if (widgetId.current !== null) window.hcaptcha?.reset(widgetId.current);
        }
    }));

    useEffect(() => {
        const render = () => {
            if (!containerRef.current || widgetId.current !== null || !window.hcaptcha) return;
            widgetId.current = window.hcaptcha.render(containerRef.current, { sitekey: siteKey, theme: 'dark' });
        };
        if (window.hcaptcha) render();
        else window.onHCaptchaLoad = render;
    }, [siteKey]);

    return (
        <>
            <Script src="https://js.hcaptcha.com/1/api.js?render=explicit&onload=onHCaptchaLoad&hl=pl" strategy="afterInteractive" />
            <div ref={containerRef} />
        </>
    );
});

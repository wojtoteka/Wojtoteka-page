/**
 * announcements.js - Wojtoteka
 * Automatycznie wykrywa stronę z URL i wyświetla aktywne ogłoszenia (bannery/popupy).
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'ann_dismissed_v1';

    var ALL_PAGES = ['index','gry','kontakt','status','api','polityka-nightdrive','polityka-fishingparty','url','RoyalCasinoBot','RoyalCasinoBot/polityka','RoyalCasinoBot/regulamin'];

    var TYPE_CFG = {
        info:      { color: '#fff',    bg: '#1565c0', accent: '#1976d2', border: '#1976d2', popupBg: 'rgba(21,101,192,0.18)',  icon: 'ℹ️',  label: 'Informacja' },
        warning:   { color: '#1a1a1a', bg: '#f9a825', accent: '#f57f17', border: '#f57f17', popupBg: 'rgba(249,168,37,0.18)',  icon: '⚠️',  label: 'Ostrzeżenie' },
        important: { color: '#fff',    bg: '#c62828', accent: '#d32f2f', border: '#d32f2f', popupBg: 'rgba(198,40,40,0.18)',   icon: '🔴',  label: 'Ważne' }
    };

    function getDismissed() {
        try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]'); } catch (e) { return []; }
    }
    function setDismissed(arr) {
        try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch (e) {}
    }
    function dismiss(key) {
        var d = getDismissed();
        if (d.indexOf(key) === -1) { d.push(key); setDismissed(d); }
    }
    function isDismissed(key) { return getDismissed().indexOf(key) !== -1; }

    function esc(str) {
        if (!str) return '';
        var d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    /* ── CSS animations injected once ─────────────────────────────── */
    var styleEl = document.createElement('style');
    styleEl.textContent = [
        '@keyframes annFadeIn{from{opacity:0}to{opacity:1}}',
        '@keyframes annSlideDown{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}',
        '@keyframes annSlideUp{from{opacity:0;transform:translateY(20px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}',
        '#ann-banners-wrap>div{animation:annSlideDown .35s cubic-bezier(.16,1,.3,1);}',
        '#ann-popup-overlay{animation:annFadeIn .25s ease;}',
        '#ann-popup-modal{animation:annSlideUp .38s cubic-bezier(.16,1,.3,1);}'
    ].join('');
    document.head.appendChild(styleEl);

    /* ── Banner ────────────────────────────────────────────────────── */
    function createBannerEl(ann) {
        var cfg = TYPE_CFG[ann.type] || TYPE_CFG.info;
        var el = document.createElement('div');
        el.dataset.annId = ann.id;
        el.style.cssText = [
            'background:' + cfg.bg + ';',
            'border-bottom:2px solid ' + cfg.border + ';',
            'color:' + cfg.color + ';padding:11px 20px;font-size:0.88em;',
            'font-family:"Segoe UI",system-ui,sans-serif;line-height:1.55;',
            'text-align:center;word-break:break-word;'
        ].join('');
        el.innerHTML = (
            '<span style="font-weight:700;margin-right:6px;">' +
                cfg.icon + ' ' + esc(ann.title) + ':' +
            '</span>' +
            '<span>' + esc(ann.message) + '</span>'
        );
        return el;
    }

    /* ── Popup ─────────────────────────────────────────────────────── */
    function showPopup(ann) {
        if (isDismissed('p_' + ann.id)) return;
        var cfg = TYPE_CFG[ann.type] || TYPE_CFG.info;

        var overlay = document.createElement('div');
        overlay.id = 'ann-popup-overlay';
        overlay.style.cssText = [
            'position:fixed;top:0;left:0;width:100%;height:100%;',
            'background:rgba(0,0,0,0.65);z-index:99999;',
            'display:flex;justify-content:center;align-items:center;padding:20px;',
            'backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);'
        ].join('');

        var modal = document.createElement('div');
        modal.id = 'ann-popup-modal';
        modal.style.cssText = [
            'background:rgba(12,12,12,0.97);',
            'border:2px solid ' + cfg.accent + ';',
            'border-radius:20px;padding:28px 28px 24px;max-width:520px;width:100%;',
            'position:relative;box-shadow:0 24px 64px rgba(0,0,0,0.65);',
            'font-family:"Segoe UI",system-ui,sans-serif;'
        ].join('');

        modal.innerHTML = (
            '<button id="ann-popup-x" aria-label="Zamknij" style="' +
                'position:absolute;top:14px;right:16px;background:none;border:none;' +
                'color:rgba(255,255,255,0.35);font-size:1.3em;cursor:pointer;padding:4px 6px;' +
                'transition:color .2s;line-height:1;border-radius:6px;" ' +
                'onmouseover="this.style.color=\'#fff\'" ' +
                'onmouseout="this.style.color=\'rgba(255,255,255,0.35)\'"' +
            '>&times;</button>' +

            '<div style="margin-bottom:16px;">' +
                '<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 12px;' +
                    'background:' + cfg.bg + ';' +
                    'border-radius:20px;font-size:0.72em;font-weight:800;color:' + cfg.color + ';' +
                    'text-transform:uppercase;letter-spacing:.8px;margin-bottom:14px;">' +
                    cfg.icon + ' ' + cfg.label +
                '</span>' +
                '<h2 style="margin:0;font-size:1.18em;color:#fff;font-weight:800;line-height:1.3;">' + esc(ann.title) + '</h2>' +
            '</div>' +

            '<p style="color:rgba(255,255,255,0.75);line-height:1.72;margin:0 0 22px;font-size:0.94em;">' +
                esc(ann.message) +
            '</p>' +

            '<button id="ann-popup-ok" style="' +
                'width:100%;padding:12px;' +
                'background:linear-gradient(135deg,' + cfg.accent + ',' + cfg.bg + ');' +
                'color:' + cfg.color + ';border:1px solid ' + cfg.border + ';' +
                'border-radius:12px;font-size:0.95em;font-weight:700;cursor:pointer;' +
                'transition:opacity .25s;" ' +
                'onmouseover="this.style.opacity=\'.82\'" ' +
                'onmouseout="this.style.opacity=\'1\'"' +
            '>Rozumiem</button>'
        );

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        function close() {
            overlay.remove();
            document.body.style.overflow = '';
            dismiss('p_' + ann.id);
        }

        document.getElementById('ann-popup-x').addEventListener('click', close);
        document.getElementById('ann-popup-ok').addEventListener('click', close);
        overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
        document.addEventListener('keydown', function escKey(e) {
            if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escKey); }
        });
    }

    /* ── Main init ─────────────────────────────────────────────────── */
    function init() {
        var path = window.location.pathname;
        var page = path.replace(/^\//, '').replace(/\.html$/, '') || 'index';
        
        // Normalizuj ścieżki końcowe - usuń trailing slash i zamień /index na pustą ścieżkę
        page = page.replace(/\/$/, '').replace(/\/index$/, '');
        if (!page) page = 'index';

        // Nie pokazuj na stronach administracyjnych
        if (page === 'admin' || page === 'panel') return;

        fetch('/api/announcements?page=' + encodeURIComponent(page))
            .then(function (r) { return r.ok ? r.json() : { announcements: [] }; })
            .then(function (data) {
                var anns = data.announcements || [];
                if (!anns.length) return;

                var banners = anns.filter(function (a) { return a.display_type === 'banner'; });
                var popups  = anns.filter(function (a) { return a.display_type === 'popup'; });

                if (banners.length) {
                    var wrap = document.createElement('div');
                    wrap.id = 'ann-banners-wrap';
                    wrap.style.cssText = 'position:fixed;top:0;left:0;width:100%;z-index:9998;';
                    banners.forEach(function (a) { wrap.appendChild(createBannerEl(a)); });
                    document.body.prepend(wrap);

                    /* Adjust layout so banner doesn't cover page content */
                    var bannerH = wrap.offsetHeight;
                    if (bannerH > 0) {
                        var existingPad = parseFloat(document.body.style.paddingTop) || 0;
                        document.body.style.paddingTop = (existingPad + bannerH) + 'px';
                        /* Move fixed .back-link buttons below the banner */
                        document.querySelectorAll('.back-link').forEach(function (el) {
                            if (window.getComputedStyle(el).position === 'fixed') {
                                var curTop = parseFloat(window.getComputedStyle(el).top) || 0;
                                el.style.top = (curTop + bannerH) + 'px';
                            }
                        });
                    }
                }

                var popup = popups.find(function (a) { return !isDismissed('p_' + a.id); });
                if (popup) {
                    setTimeout(function () { showPopup(popup); }, 700);
                }
            })
            .catch(function () {});
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

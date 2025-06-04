

// Main function
function stapeFunctions() {
    // Configuration constants
    const CONFIG = {
        CSS_CLASSES: {
            PROCESSED: 'stape_url-table-enhanced',
            BADGES_CONTAINER: 'custom-badges-container'
        },
        SELECTORS: {
            URL_CELLS: 'http-url-details .gtm-debug-table-cell',
            HTTP_HEADERS: 'div.gtm-debug-pane-header',
            DEBUG_CONTAINER: '.blg-debug-panels-container',
            TAB_CONTENT: '.gtm-debug-tab-content',
            TAB_HEADER: '.gtm-debug-tab-header'
        },
        COLORS: {
            PROTOCOL: '#007ACC',
            DOMAIN: '#d9822b',
            PATH: '#2ca86c',
            QUERY: '#cc3c3c',
            FRAGMENT: '#8a49a7'
        }
    };

    // Utility functions
    const createObserver = (callback, options = { childList: true, subtree: true }) => {
        return new MutationObserver(callback);
    };

    const createElement = (tag, className, styles = {}) => {
        const element = document.createElement(tag);
        if (className) element.className = className;
        Object.assign(element.style, styles);
        return element;
    };

    // URL Parser utility
    class URLParser {
        static parse(url) {
            let protocol = '', domain = '', path = '', query = '', fragment = '';
            const queryParams = [];

            try {
                const normalizedUrl = url.includes('://') ? url : 'http://' + url;
                const parsed = new URL(normalizedUrl);

                protocol = parsed.protocol.replace(':', '');
                domain = parsed.hostname;
                path = parsed.pathname !== '/' ? parsed.pathname : '';
                query = parsed.search;
                fragment = parsed.hash;

                if (!url.includes('://')) protocol = '';

                parsed.searchParams.forEach((value, key) => {
                    queryParams.push({ key, value });
                });
            } catch {
                const match = url.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
                path = match?.[1] || '';
                query = match?.[2] || '';
                fragment = match?.[3] || '';

                if (query) {
                    this.parseQueryString(query, queryParams);
                }
            }

            return { protocol, domain, path, query, fragment, queryParams };
        }

        static parseQueryString(query, queryParams) {
            query.substring(1).split('&').forEach(pair => {
                if (!pair) return;
                const [k, v] = pair.split('=');
                queryParams.push({
                    key: decodeURIComponent(k),
                    value: decodeURIComponent(v || ''),
                });
            });
        }
    }

    // HTML Template builders
    class TemplateBuilder {
        static createLabel(icon, text, color) {
            return `<span style="color: ${color}; font-weight: 600;">${icon} ${text}</span>`;
        }

        static createQueryTable(params) {
            if (params.length === 0) {
                return `<span style="color: #999;">—</span>`;
            }

            const rows = params.map(({ key, value }) => `
      <tr>
        <td style="padding: 4px 6px; border-bottom: 1px solid #eee;">${key}</td>
        <td style="padding: 4px 6px; border-bottom: 1px solid #eee;">${value}</td>
      </tr>`).join('');

            return `
      <table style="border-collapse: collapse; width: 100%; margin-top: 6px;">
        <thead>
          <tr>
            <th style="text-align:left; padding: 4px 6px; border-bottom: 1px solid #ccc; font-weight: 600; font-size: 0.9em;">Key</th>
            <th style="text-align:left; padding: 4px 6px; border-bottom: 1px solid #ccc; font-weight: 600; font-size: 0.9em;">Value</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
        }

        static createURLTable(url) {
            const { protocol, domain, path, queryParams, fragment } = URLParser.parse(url);
            const { COLORS } = CONFIG;

            const createRow = (bgColor, icon, label, color, value) => `
      <tr style="background: ${bgColor};">
        <td style="padding: 10px 15px;">${this.createLabel(icon, label, color)}</td>
        <td style="padding: 10px 15px; color: ${value ? color.replace('#', '#004a99'.slice(0, 7)) : '#999'};">${value || '—'}</td>
      </tr>`;

            return `
      <table style="border-collapse: separate; border-spacing: 0 8px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; width: 100%; max-width: 500px; box-shadow: 0 2px 8px rgb(0 0 0 / 0.1); border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #f0f4f8;">
            <th style="text-align:left; padding: 10px 15px; font-size: 1.1em;">Component</th>
            <th style="text-align:left; padding: 10px 15px; font-size: 1.1em;">Value</th>
          </tr>
        </thead>
        <tbody>
          ${createRow('#e6f0ff', '🌐', 'Protocol', COLORS.PROTOCOL, protocol)}
          ${createRow('#fef7e6', '🏠', 'Domain', COLORS.DOMAIN, domain)}
          ${createRow('#e6fff2', '📂', 'Path', COLORS.PATH, path)}
          <tr style="background: #fff0f0; vertical-align: top;">
            <td style="padding: 10px 15px;">${this.createLabel('🔍', 'Query', COLORS.QUERY)}</td>
            <td style="padding: 10px 15px;">${this.createQueryTable(queryParams)}</td>
          </tr>
          ${createRow('#f5e6ff', '📌', 'Fragment', COLORS.FRAGMENT, fragment)}
        </tbody>
      </table>`;
        }
    }

    // URL Report Enhancer
    class URLReportEnhancer {
        constructor() {
            this.observer = null;
        }

        enhance() {
            const cells = document.querySelectorAll(CONFIG.SELECTORS.URL_CELLS);
            if (cells.length < 2) return;

            const target = cells[1];
            if (target.classList.contains(CONFIG.CSS_CLASSES.PROCESSED)) return;

            const original = target.innerHTML;
            const urlText = target.textContent.trim();

            target.setAttribute('data-original-content', original);
            target.innerHTML = TemplateBuilder.createURLTable(urlText);
            target.classList.add(CONFIG.CSS_CLASSES.PROCESSED);
        }

        revert() {
            const enhanced = document.querySelectorAll(`.${CONFIG.CSS_CLASSES.PROCESSED}`);
            enhanced.forEach(elem => {
                const original = elem.getAttribute('data-original-content');
                if (original !== null) {
                    elem.innerHTML = original;
                    elem.classList.remove(CONFIG.CSS_CLASSES.PROCESSED);
                    elem.removeAttribute('data-original-content');
                }
            });
        }

        enable() {
            if (this.observer) return;

            this.observer = createObserver(() => this.enhance());
            this.observer.observe(document.body, { childList: true, subtree: true });
            this.enhance();
        }

        disable() {
            if (!this.observer) return;

            this.observer.disconnect();
            this.observer = null;
            this.revert();
        }
    }

    // Consent Status Parser
    class ConsentParser {
        static parseGcsStatus(char) {
            switch (char) {
                case '1': return 'granted';
                case '0': return 'denied';
                case '-': return 'na';
                default: return 'na';
            }
        }

        static extractConsentData(text) {
            const gcsMatch = text.match(/gcs=(G1[10-]{2})/);
            const gcdMatch = text.match(/gcd=([a-zA-Z0-9_]+)/);

            const gcsValue = gcsMatch?.[1];
            const gcdValue = gcdMatch?.[1];

            let consentData = {
                ad_storage: 'na',
                analytics_storage: 'na',
                ad_user_data: 'na',
                ad_personalization: 'na'
            };

            if (gcsValue && gcsValue.length >= 4) {
                consentData.ad_storage = this.parseGcsStatus(gcsValue.charAt(2));
                consentData.analytics_storage = this.parseGcsStatus(gcsValue.charAt(3));
            }

            if (gcdValue) {
                consentData.ad_user_data = gcdValue;
                consentData.ad_personalization = gcdValue;
            }

            return consentData;
        }
    }

    // Badge Creator
    class BadgeCreator {
        static create(text, status) {
            const badge = createElement('span', null, {
                backgroundColor: '#FBE8E4',
                color: '#D08A85',
                padding: '6px 8px',
                borderRadius: '5px',
                fontSize: '12px',
                marginRight: '8px',
                display: 'inline-block',
                fontWeight: 'bold'
            });

            const statusIcons = {
                granted: '✔️',
                denied: '❌',
                na: '❓'
            };

            const isRawValue = !['granted', 'denied', 'na'].includes(status);
            const icon = statusIcons[status] || '❓';

            badge.textContent = isRawValue ? `${text}: ${status}` : `${text} ${icon}`;
            return badge;
        }

        static createContainer() {
            return createElement('div', CONFIG.CSS_CLASSES.BADGES_CONTAINER, {
                marginTop: '6px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px'
            });
        }
    }

    // Consent Reporter
    class ConsentReporter {
        constructor() {
            this.tabObservers = new WeakMap();
            this.observedTabs = new Set();
            this.containerObserver = null;
        }

        processTab(tab) {
            // Remove existing badges globally
            document.querySelector(`.${CONFIG.CSS_CLASSES.BADGES_CONTAINER}`)?.remove();

            const headers = Array.from(tab.querySelectorAll(CONFIG.SELECTORS.HTTP_HEADERS))
                .filter(el => el.textContent.trim() === 'Incoming HTTP Request');

            if (headers.length === 0) return;

            const header = headers[0];
            const sibling = header.nextElementSibling;
            if (!sibling || sibling.tagName.toLowerCase() !== 'http-message-chip') return;

            const titleEl = sibling.querySelector('.http-message__title');
            if (!titleEl) return;

            const text = titleEl.innerText;
            if (!(text.includes('v=2') && text.includes('tid=G-'))) return;

            this.createConsentBadges(text);
        }

        createConsentBadges(text) {
            const consentData = ConsentParser.extractConsentData(text);
            const container = document.querySelector('.blg-card-tabs');
            if (!container) return;

            const badgesWrapper = createElement('div', CONFIG.CSS_CLASSES.BADGES_CONTAINER, {
                marginTop: '10px'
            });

            // Create badges for all consent types
            badgesWrapper.appendChild(BadgeCreator.create('ad_storage', consentData.ad_storage));
            badgesWrapper.appendChild(BadgeCreator.create('analytics_storage', consentData.analytics_storage));
            badgesWrapper.appendChild(BadgeCreator.create('ad_user_data', consentData.ad_user_data));
            badgesWrapper.appendChild(BadgeCreator.create('ad_personalization', consentData.ad_personalization));

            // Add raw gcs/gcd values if available
            const gcsMatch = text.match(/gcs=(G1[10-]{2})/);
            const gcdMatch = text.match(/gcd=([a-zA-Z0-9_]+)/);

            if (gcsMatch?.[1]) {
                badgesWrapper.appendChild(BadgeCreator.create('gcs', gcsMatch[1]));
            }
            if (gcdMatch?.[1]) {
                badgesWrapper.appendChild(BadgeCreator.create('gcd', gcdMatch[1]));
            }

            container.insertAdjacentElement('afterend', badgesWrapper);
        }

        observeClientTab(tab) {
            if (this.tabObservers.has(tab)) return;

            const observer = createObserver(() => this.processTab(tab));
            observer.observe(tab, { childList: true, subtree: true });

            this.tabObservers.set(tab, observer);
            this.observedTabs.add(tab);
            this.processTab(tab);
        }

        disconnectClientTab(tab) {
            const observer = this.tabObservers.get(tab);
            if (observer) {
                observer.disconnect();
                this.tabObservers.delete(tab);
                this.observedTabs.delete(tab);
            }
        }

        disconnectAllObservers() {
            if (this.containerObserver) {
                this.containerObserver.disconnect();
                this.containerObserver = null;
            }

            for (const tab of this.observedTabs) {
                const observer = this.tabObservers.get(tab);
                if (observer) observer.disconnect();
                this.tabObservers.delete(tab);
            }

            this.observedTabs.clear();

            // Remove all badges
            document.querySelector(`.${CONFIG.CSS_CLASSES.BADGES_CONTAINER}`)?.remove();
        }

        enable() {
            if (this.containerObserver) return; // already running

            this.containerObserver = createObserver(mutations => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node instanceof HTMLElement &&
                            node.tagName.toLowerCase() === 'client-tab') {
                            this.observeClientTab(node);
                        }
                    });

                    mutation.removedNodes.forEach(node => {
                        if (node instanceof HTMLElement &&
                            node.tagName.toLowerCase() === 'client-tab') {
                            this.disconnectClientTab(node);
                        }
                    });
                });
            });

            this.containerObserver.observe(document.body, { childList: true, subtree: true });

            // Process existing client-tab elements
            document.querySelectorAll('client-tab').forEach(tab => this.observeClientTab(tab));
        }

        disable() {
            this.disconnectAllObservers();
        }
    }

    // GTM Card Highlighter
    class GTMCardHighlighter {
        constructor() {
            this.CLASS_PREFIX = 'stape-card-border-';
            this.STYLE_ID = 'stape-gtm-card-highlighter-styles';
            this.DEFAULT_COLOR = '#EEEEEE';
            this.styleEl = null;
            this.observer = null;

            this.COLOR_RULES = [
                {
                    pattern: /.*(Google Tag|Data Tag|Google Analytics|Google Analytics 4).*/,
                    color: '#eea849'
                },
                {
                    pattern: /.*(Google Ads|Microsoft Ads|Floodlight).*/,
                    color: '#3CA55C'
                },
                {
                    pattern: /.*(Pinterest).*/,
                    color: '#92140C'
                },
                {
                    pattern: /.*(Facebook|Meta|BigQuery|LinkedIn).*/,
                    color: '#0072ff'
                },
                {
                    pattern: /.*(TikTok).*/,
                    color: '#333333'
                },
                {
                    pattern: /.*(Snapchat|Snap Pixel).*/,
                    color: '#ffd60a'
                }
            ];
        }

        normalizeColor(hex) {
            return hex.replace('#', '').toLowerCase();
        }

        colorToClass(hex) {
            return `${this.CLASS_PREFIX}${this.normalizeColor(hex)}`;
        }

        generateCSS() {
            const uniqueColors = new Set([
                ...this.COLOR_RULES.map(rule => rule.color),
                this.DEFAULT_COLOR
            ]);

            return Array.from(uniqueColors)
                .map(hex => {
                    const className = this.colorToClass(hex);
                    return `.${className} { border-left: 6px solid ${hex}; }`;
                })
                .join('\n');
        }

        injectCSS() {
            if (this.styleEl || document.getElementById(this.STYLE_ID)) return;

            this.styleEl = createElement('style');
            this.styleEl.id = this.STYLE_ID;
            this.styleEl.textContent = this.generateCSS();
            document.head.appendChild(this.styleEl);
        }

        removeCSS() {
            const existing = document.getElementById(this.STYLE_ID);
            if (existing) {
                existing.remove();
            }
            this.styleEl = null;
        }

        styleElement(element) {
            if (!element?.parentElement) return;

            const text = element.innerText;
            const parent = element.parentElement;
            const matchedRule = this.COLOR_RULES.find(rule => rule.pattern.test(text));
            const color = matchedRule ? matchedRule.color : this.DEFAULT_COLOR;
            const className = this.colorToClass(color);

            // Remove existing border classes
            this.removeBorderClasses(parent);
            parent.classList.add(className);
        }

        unstyleElement(element) {
            if (!element?.parentElement) return;
            this.removeBorderClasses(element.parentElement);
        }

        removeBorderClasses(element) {
            Array.from(element.classList).forEach(className => {
                if (className.startsWith(this.CLASS_PREFIX)) {
                    element.classList.remove(className);
                }
            });
        }

        scanAndApply(root, handler) {
            root.querySelectorAll('.gtm-debug-card__subtitle').forEach(handler);
        }

        handleMutations(mutations) {
            mutations.forEach(mutation => {
                if (mutation.type !== 'childList') return;

                mutation.addedNodes.forEach(node => {
                    if (node.nodeType !== Node.ELEMENT_NODE) return;

                    if (node.matches?.('.gtm-debug-card__subtitle')) {
                        this.styleElement(node);
                    }

                    if (node.querySelectorAll) {
                        this.scanAndApply(node, this.styleElement.bind(this));
                    }
                });
            });
        }

        enable() {
            if (this.observer) return;

            this.injectCSS();
            this.scanAndApply(document, this.styleElement.bind(this));

            this.observer = createObserver(
                this.handleMutations.bind(this),
                { childList: true, subtree: true }
            );

            this.observer.observe(document.body, { childList: true, subtree: true });
        }

        disable() {
            if (!this.observer) return;

            this.observer.disconnect();
            this.observer = null;
            this.scanAndApply(document, this.unstyleElement.bind(this));
            this.removeCSS();
        }
    }


    window.__stape__ = window.__stape__ || {};

    // Initialize URL Report Enhancer
    window.__stape__.urlReportEnhancer = new URLReportEnhancer();

    // Initialize Consent Reporter
    window.__stape__.consentReporter = new ConsentReporter();

    // Initialize GTM Card Highlighter
    window.__stape__.GTMCardHighlighter = new GTMCardHighlighter();
}

export default stapeFunctions;
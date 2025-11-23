export function app() {
    const theme_Switch = document.querySelector('#dl-swi');
    const header = document.querySelector('header');
    const progressBar = document.querySelector('.prog');
    const backToTop = document.querySelector('.b-top');
    const brandImages = document.querySelectorAll('.gen-brands');
    let lastScrollY = window.scrollY;
    let ticking = false;
    let resizeTicking = false;
    let scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    let currentHeaderScrolled;
    let currentBackToTopVisible;
    let currentProgress = -1;
    (() => {
        function updateBrandImages(mode) {
            const newSrc = mode === 'dark' ? 'photos/brands/gender-insights-w.png' : 'photos/brands/gender-insights.svg';
            brandImages.forEach((brandImage) => {
                brandImage.src = newSrc;
            });
        }
        function applyTheme(mode, persist = false) {
            document.documentElement.setAttribute('data-gen-themes', mode);
            updateBrandImages(mode);
            if (persist) localStorage.setItem('theme', mode);
        }
        function handleScrollUpdates() {
            if (header) {
                const newHeaderState = lastScrollY > 40;
                if (newHeaderState !== currentHeaderScrolled) {
                    header.classList.toggle('header-scrolled', newHeaderState);
                    currentHeaderScrolled = newHeaderState;
                }
            }
            if (progressBar) {
                const progress = scrollableHeight > 0 ? (lastScrollY / scrollableHeight) : 0;
                const newProgress = Math.round(progress * 1000) / 1000;
                if (newProgress !== currentProgress) {
                    progressBar.style.transform = `scaleX(${newProgress})`;
                    currentProgress = newProgress;
                }
            }
            if (backToTop) {
                const newBackToTopState = lastScrollY > 500;
                if (newBackToTopState !== currentBackToTopVisible) {
                    backToTop.classList.toggle('opac', newBackToTopState);
                    currentBackToTopVisible = newBackToTopState;
                }
            }
            ticking = false;
        }
        function handleResize() {
            scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
            currentProgress = -1;
            if (!ticking) {
                window.requestAnimationFrame(handleScrollUpdates);
                ticking = true;
            }
            resizeTicking = false;
        }
        function easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
        }
        function formatCountValue(value, decimals) {
            return decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
        }
        function animateCount(config) {
            const { element, prefix, suffix, startValue, targetValue, decimals, duration } = config;
            if (config.hasAnimated) return;
            config.hasAnimated = true;
            if (startValue === targetValue) {
                element.textContent = `${prefix}${formatCountValue(targetValue, decimals)}${suffix}`;
                return;
            }
            const startTimestamp = performance.now();
            element.textContent = `${prefix}${formatCountValue(startValue, decimals)}${suffix}`;
            const step = (now) => {
                const progress = Math.min((now - startTimestamp) / duration, 1);
                const eased = easeOutCubic(progress);
                const currentValue = startValue + (targetValue - startValue) * eased;
                element.textContent = `${prefix}${formatCountValue(currentValue, decimals)}${suffix}`;
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                }
            };
            window.requestAnimationFrame(step);
        }
        function initCountAnimation() {
            const container = document.querySelector('#achv');
            if (!container) return;
            const counters = Array.from(container.querySelectorAll('.figr')).map((element) => {
                const { count, suffix = '', prefix = '', countStart, countDuration, decimals } = element.dataset;
                const rawText = element.textContent.trim();
                const numberMatch = /-?\d[\d.,]*/.exec(rawText);
                const fallbackValue = numberMatch ? Number(numberMatch[0].replace(/[^0-9.-]/g, '')) : NaN;
                const targetValue = count !== undefined ? Number(count) : fallbackValue;
                if (Number.isNaN(targetValue)) {
                    return null;
                }
                const startValue = countStart !== undefined ? Number(countStart) : 0;
                const parsedDuration = countDuration !== undefined ? Number(countDuration) : 1600;
                const resolvedSuffix = suffix || (numberMatch ? rawText.slice(numberMatch.index + numberMatch[0].length) : '');
                const resolvedPrefix = prefix || (numberMatch ? rawText.slice(0, numberMatch.index) : '');
                const parsedDecimals = decimals !== undefined ? Number(decimals) : 0;
                const normalizedDecimals = Number.isNaN(parsedDecimals) ? 0 : parsedDecimals;
                element.textContent = `${resolvedPrefix}${formatCountValue(startValue, normalizedDecimals)}${resolvedSuffix}`;
                return {
                    element,
                    prefix: resolvedPrefix,
                    suffix: resolvedSuffix,
                    startValue,
                    targetValue,
                    duration: parsedDuration > 0 ? parsedDuration : 1600,
                    decimals: normalizedDecimals
                };
            }).filter(Boolean);
            if (!counters.length) return;
            let animationTriggered = false;
            let userHasScrolled = window.scrollY > 0;
            let elementInView = false;
            let observer;
            let fallbackVisibilityCheck;
            let markUserScroll;
            const runAnimation = () => {
                counters.forEach((config) => animateCount(config));
            };
            const cleanup = () => {
                if (markUserScroll) {
                    window.removeEventListener('scroll', markUserScroll);
                }
                if (fallbackVisibilityCheck) {
                    window.removeEventListener('scroll', fallbackVisibilityCheck);
                    window.removeEventListener('resize', fallbackVisibilityCheck);
                }
                if (observer) {
                    observer.disconnect();
                }
            };
            const tryStartAnimation = () => {
                if (animationTriggered || !userHasScrolled || !elementInView) return;
                animationTriggered = true;
                runAnimation();
                cleanup();
            };
            markUserScroll = () => {
                userHasScrolled = true;
                tryStartAnimation();
            };
            if (!userHasScrolled) {
                window.addEventListener('scroll', markUserScroll, { once: true, passive: true });
            } else {
                tryStartAnimation();
            }
            const isElementMostlyVisible = () => {
                const rect = container.getBoundingClientRect();
                if (!rect.width && !rect.height) return false;
                const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
                const visibleTop = Math.max(rect.top, 0);
                const visibleBottom = Math.min(rect.bottom, viewportHeight);
                const visibleHeight = Math.max(0, visibleBottom - visibleTop);
                const ratio = rect.height > 0 ? visibleHeight / rect.height : 0;
                return ratio >= 0.35;
            };
            elementInView = isElementMostlyVisible();
            if ('IntersectionObserver' in window) {
                observer = new IntersectionObserver((entries) => {
                    entries.forEach((entry) => {
                        if (entry.target !== container) return;
                        elementInView = entry.isIntersecting;
                        tryStartAnimation();
                    });
                }, { threshold: 0.35 });
                observer.observe(container);
            } else {
                fallbackVisibilityCheck = () => {
                    elementInView = isElementMostlyVisible();
                    tryStartAnimation();
                };
                window.addEventListener('scroll', fallbackVisibilityCheck, { passive: true });
                window.addEventListener('resize', fallbackVisibilityCheck, { passive: true });
                fallbackVisibilityCheck();
            }
            tryStartAnimation();
        }
        if (theme_Switch) {
            theme_Switch.checked = preferredTheme === 'dark';
            theme_Switch.addEventListener('click', () => {
                applyTheme(theme_Switch.checked ? 'dark' : 'light', true);
            });
        }
        updateBrandImages(preferredTheme);
        window.addEventListener('scroll', () => {
            lastScrollY = window.scrollY;
            if (!ticking) {
                window.requestAnimationFrame(handleScrollUpdates);
                ticking = true;
            }
        }, { passive: true });
        window.addEventListener('resize', () => {
            if (!resizeTicking) {
                window.requestAnimationFrame(handleResize);
                resizeTicking = true;
            }
        }, { passive: true });
        document.querySelectorAll('[data-scrolling]').forEach((trigger) => {
            trigger.addEventListener('click', (event) => {
                event.preventDefault();
                const target = document.querySelector(trigger.getAttribute('data-scrolling'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: trigger.dataset.block });
                }
            });
        });
        if (backToTop) {
            backToTop.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
        initCountAnimation();
        if (!ticking) {
            window.requestAnimationFrame(handleScrollUpdates);
            ticking = true;
        }
    })();
}

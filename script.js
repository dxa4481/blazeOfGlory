// MalusCorp Clean Room as a Service - Industrial Interface
//
// Pay-first flow: upload package.json -> POST /api/quote -> display breakdown -> POST /api/checkout -> Stripe -> status page

var STATUS_BUCKET_URL = window.STATUS_BUCKET_URL || '';
var BACKEND_API_URL = window.BACKEND_API_URL || '';

var _backendHealthy = null; // null = unknown, true/false after check

function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// ── Notification helpers ──

function showBanner(message, type) {
    var banner = document.getElementById('apiStatusBanner');
    var msg = document.getElementById('apiStatusMsg');
    if (!banner || !msg) return;
    msg.textContent = message;
    banner.className = 'api-status-banner';
    if (type === 'warning') banner.classList.add('warning');
    banner.classList.remove('hidden');
}

function hideBanner() {
    var banner = document.getElementById('apiStatusBanner');
    if (banner) banner.classList.add('hidden');
}

function showInlineError(containerId, message, type) {
    var container = document.getElementById(containerId);
    if (!container) return;
    type = type || 'error';
    container.innerHTML = '<div class="inline-notification ' + type + '">' + escapeHtml(message) + '</div>';
    container.classList.remove('hidden');
    container.style.display = '';
}

function clearInlineError(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
}

// ── Health check ──

function checkBackendHealth() {
    if (!BACKEND_API_URL) {
        _backendHealthy = false;
        onBackendDown();
        return;
    }
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timeoutId = controller ? setTimeout(function() { controller.abort(); }, 5000) : null;

    fetch(BACKEND_API_URL.replace(/\/$/, '') + '/health', {
        signal: controller ? controller.signal : undefined
    })
    .then(function(res) {
        clearTimeout(timeoutId);
        if (res.ok) {
            _backendHealthy = true;
            hideBanner();
        } else {
            _backendHealthy = false;
            onBackendDown();
        }
    })
    .catch(function() {
        clearTimeout(timeoutId);
        _backendHealthy = false;
        onBackendDown();
    });
}

function onBackendDown() {
    showBanner('Our liberation services are temporarily unavailable. Please try again later.', 'error');
    var dropzone = document.getElementById('dropzone');
    if (dropzone) dropzone.classList.add('disabled');
}

// ── Initialization ──

document.addEventListener('DOMContentLoaded', function() {
    checkBackendHealth();
    initCounterAnimation();
    initFileUpload();
    initSmoothScroll();
    initNavbarScroll();
});

function initCounterAnimation() {
    var counters = document.querySelectorAll('.stat-number[data-count]');
    var observerOptions = { threshold: 0.5, rootMargin: '0px' };
    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    counters.forEach(function(counter) { observer.observe(counter); });
}

function animateCounter(element) {
    var target = parseInt(element.getAttribute('data-count'));
    var duration = 2000;
    var step = target / (duration / 16);
    var current = 0;
    var timer = setInterval(function() {
        current += step;
        if (current >= target) {
            element.textContent = target.toLocaleString();
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current).toLocaleString();
        }
    }, 16);
}

function initFileUpload() {
    var dropzone = document.getElementById('dropzone');
    var fileInput = document.getElementById('fileInput');
    if (!dropzone || !fileInput) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(eventName) {
        dropzone.addEventListener(eventName, function(e) { e.preventDefault(); e.stopPropagation(); }, false);
    });
    ['dragenter', 'dragover'].forEach(function(eventName) {
        dropzone.addEventListener(eventName, function() { dropzone.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(function(eventName) {
        dropzone.addEventListener(eventName, function() { dropzone.classList.remove('dragover'); });
    });
    dropzone.addEventListener('drop', function(e) {
        var files = e.dataTransfer.files;
        if (files.length) processFile(files[0]);
    });
    fileInput.addEventListener('change', function(e) {
        var files = e.target.files;
        if (files.length) processFile(files[0]);
    });
}

function processFile(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            var content = e.target.result;
            window.pendingPackageJsonRaw = content;
            if (!file.name.endsWith('.json')) {
                showInlineError('uploadError', 'Please upload a package.json file.', 'warning');
                return;
            }
            var json = JSON.parse(content);
            var deps = json.dependencies || {};
            var devDeps = json.devDependencies || {};
            var allNames = Object.keys(deps).concat(Object.keys(devDeps));
            var uniqueNames = [];
            var seen = {};
            allNames.forEach(function(n) { if (!seen[n]) { seen[n] = true; uniqueNames.push(n); } });

            if (uniqueNames.length === 0) {
                showInlineError('uploadError', 'No dependencies found in package.json.', 'warning');
                return;
            }

            clearInlineError('uploadError');
            showQuoteLoading(uniqueNames);
            fetchServerQuote(json);
        } catch (err) {
            console.error('Error parsing file:', err);
            showInlineError('uploadError', 'Invalid JSON file. Please upload a valid package.json.');
        }
    };
    reader.readAsText(file);
}

function showQuoteLoading(packageNames) {
    var dropzone = document.getElementById('dropzone');
    var preview = document.getElementById('uploadPreview');
    var depsList = document.getElementById('depsList');
    var quoteSummary = document.getElementById('quoteSummary');
    dropzone.style.display = 'none';
    preview.style.display = 'block';
    depsList.innerHTML = packageNames.map(function(p) {
        return '<div class="dep-item"><span class="dep-name">' + escapeHtml(p) + '</span><span style="color:#888;font-size:0.8rem;">looking up...</span></div>';
    }).join('');
    quoteSummary.innerHTML = '<div class="quote-line" style="color:#888;">Fetching package sizes from npm registry...</div>';
}

function fetchServerQuote(packageJson) {
    if (!BACKEND_API_URL) {
        showBanner('Backend not configured. Please contact support.', 'error');
        return;
    }
    fetch(BACKEND_API_URL.replace(/\/$/, '') + '/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_json: packageJson })
    })
    .then(function(res) { return res.json().then(function(d) { return { ok: res.ok, data: d }; }); })
    .then(function(result) {
        if (!result.ok) {
            showBanner(result.data.detail || 'Failed to get quote. Please try again.', 'error');
            resetUpload();
            return;
        }
        hideBanner();
        displayServerQuote(result.data);
    })
    .catch(function(err) {
        console.error('Quote fetch error:', err);
        showBanner('Unable to reach the server. Please check your connection and try again.', 'error');
        resetUpload();
    });
}

function displayServerQuote(quoteData) {
    var depsList = document.getElementById('depsList');
    var quoteSummary = document.getElementById('quoteSummary');
    var packages = quoteData.packages || [];
    var errors = quoteData.errors || [];

    window.liberationQuote = {
        packages: packages.map(function(p) { return p.name; }),
        quote_amount_cents: quoteData.total_cents,
        quantity: packages.length,
        quoteData: quoteData
    };

    var html = '';
    packages.forEach(function(p) {
        var sizeLabel = p.size_kb < 100 ? p.size_kb + ' KB' : (p.size_kb / 1024).toFixed(1) + ' MB';
        var priceLabel = '$' + (p.price_cents / 100).toFixed(2);
        var depClass = p.deprecated ? ' style="color:#c9a227;"' : '';
        html += '<div class="dep-item">';
        html += '<span class="dep-name"' + depClass + '>' + escapeHtml(p.name) + (p.deprecated ? ' (deprecated)' : '') + '</span>';
        html += '<span style="color:#888;font-size:0.8rem;margin-right:0.5rem;">' + sizeLabel + '</span>';
        html += '<span style="color:#6a7d6a;font-weight:600;">' + priceLabel + '</span>';
        html += '</div>';
    });
    errors.forEach(function(e) {
        html += '<div class="dep-item" style="color:#a03030;">';
        html += '<span class="dep-name">' + escapeHtml(e.name) + '</span>';
        html += '<span style="font-size:0.8rem;">' + escapeHtml(e.error) + '</span>';
        html += '</div>';
    });
    depsList.innerHTML = html;

    var pkgTotal = (quoteData.package_total_cents / 100).toFixed(2);
    var total = (quoteData.total_cents / 100).toFixed(2);
    var stripeMin = quoteData.stripe_min_cents || 50;
    var subtotal = quoteData.package_total_cents + (quoteData.base_fee_cents || 0);

    var summaryHtml =
        '<div class="quote-line"><span>Package compute (' + packages.length + ' pkg' + (packages.length !== 1 ? 's' : '') + ')</span><span>$' + pkgTotal + '</span></div>';
    if (subtotal < stripeMin && packages.length > 0) {
        summaryHtml += '<div class="quote-line" style="color:#888;font-size:0.8rem;"><span>Stripe minimum charge</span><span>$' + (stripeMin / 100).toFixed(2) + '</span></div>';
    }
    summaryHtml +=
        '<div class="quote-line" style="border-top:1px solid #444;padding-top:0.5rem;margin-top:0.5rem;font-weight:700;">' +
        '<span>Total (prepaid)</span><span>$' + total + '</span></div>' +
        '<div style="color:#888;font-size:0.75rem;margin-top:0.5rem;">$' +
        (quoteData.rate_per_kb_cents / 100).toFixed(2) + '/KB of unpacked size &middot; $' +
        ((quoteData.stripe_min_cents || 50) / 100).toFixed(2) + ' minimum order &middot; no base fee.</div>';
    quoteSummary.innerHTML = summaryHtml;
}

function resetUpload() {
    var dropzone = document.getElementById('dropzone');
    var preview = document.getElementById('uploadPreview');
    var fileInput = document.getElementById('fileInput');
    dropzone.style.display = 'block';
    preview.style.display = 'none';
    fileInput.value = '';
    window.liberationQuote = null;
}

function showCheckout() {
    var modal = document.getElementById('checkoutModal');
    var summary = document.getElementById('checkoutSummary');
    var q = window.liberationQuote;
    if (q && q.quoteData) {
        var data = q.quoteData;
        var pkgTotal = (data.package_total_cents / 100).toFixed(2);
        var total = (data.total_cents / 100).toFixed(2);
        summary.innerHTML =
            '<div class="quote-line"><span>Packages to liberate</span><span>' + data.package_count + '</span></div>' +
            '<div class="quote-line"><span>AI compute cost</span><span>$' + pkgTotal + '</span></div>' +
            '<div class="quote-line" style="border-top:1px solid #444;padding-top:0.5rem;margin-top:0.5rem;font-weight:700;">' +
            '<span>Total</span><span>$' + total + '</span></div>';
    } else if (q) {
        var count = q.packages ? q.packages.length : 0;
        var total2 = q.quote_amount_cents != null ? (q.quote_amount_cents / 100).toFixed(2) : '0.00';
        summary.innerHTML = '<div class="quote-line"><span>Packages</span><span>' + count + '</span></div>' +
            '<div class="quote-line"><span>Total</span><span>$' + total2 + '</span></div>';
    }
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCheckout() {
    var modal = document.getElementById('checkoutModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function processPayment() {
    var btn = event.target;
    var q = window.liberationQuote;

    if (!q || !q.packages || q.packages.length === 0) {
        showBanner('No packages selected. Upload a package.json first.', 'warning');
        return;
    }

    var amountCents = q.quote_amount_cents;
    if (!amountCents || amountCents <= 0) {
        showBanner('Invalid quote. Please upload your package.json again.', 'error');
        return;
    }

    if (!BACKEND_API_URL) {
        showBanner('Backend not configured. Please contact support.', 'error');
        return;
    }

    btn.innerHTML = 'Redirecting to Stripe...';
    btn.disabled = true;

    var pkgJson;
    try { pkgJson = JSON.parse(window.pendingPackageJsonRaw); } catch(e) {
        showBanner('Package data lost. Please re-upload your package.json.', 'error');
        btn.innerHTML = '&#9654; Complete Liberation';
        btn.disabled = false;
        return;
    }

    fetch(BACKEND_API_URL.replace(/\/$/, '') + '/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_json: pkgJson })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.checkout_url) {
            if (window.pendingPackageJsonRaw) {
                localStorage.setItem('pendingPackageJson', window.pendingPackageJsonRaw);
            }
            window.location.href = data.checkout_url;
        } else {
            btn.innerHTML = 'Complete Liberation';
            btn.disabled = false;
            showBanner('Could not start checkout. ' + (data.detail || 'Please try again.'), 'error');
        }
    })
    .catch(function(err) {
        console.error('Checkout error:', err);
        btn.innerHTML = 'Complete Liberation';
        btn.disabled = false;
        showBanner('Checkout failed. The server may be unavailable. Please try again.', 'error');
    });
}

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            var target = document.querySelector(this.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

function initNavbarScroll() {
    var navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            navbar.style.background = '#FFFFFF';
            navbar.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.background = '#FFFFFF';
            navbar.style.boxShadow = 'none';
        }
    });
}

document.addEventListener('click', function(e) {
    var modal = document.getElementById('checkoutModal');
    if (e.target === modal) closeCheckout();
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeCheckout();
});

console.log('%c MALUS - CLEAN ROOM AS A SERVICE ', 'background: #C41E3A; color: white; font-size: 11px; font-weight: 600; padding: 5px 8px; font-family: monospace;');

// --- Live pricing examples ---
(function() {
    var EXAMPLES = ['left-pad', 'is-number', 'chalk', 'express', 'commander', 'lodash', 'moment'];

    var FALLBACK_RATE_PER_KB = 1;
    var FALLBACK_MIN_PER_PKG = 1;
    var FALLBACK_STRIPE_MIN = 50;

    function fmtSize(kb) { return kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB'; }
    function fmtPrice(c) { return '$' + (c / 100).toFixed(2); }

    function renderFallback() {
        var tbody = document.getElementById('pricingExamplesBody');
        var note = document.getElementById('pricingExamplesNote');
        var headerRate = document.getElementById('priceHeaderRate');

        if (headerRate) headerRate.textContent = fmtPrice(FALLBACK_RATE_PER_KB);
        var els;
        els = document.querySelectorAll('.pf-rate');
        for (var i = 0; i < els.length; i++) els[i].textContent = fmtPrice(FALLBACK_RATE_PER_KB);
        els = document.querySelectorAll('.pf-min');
        for (var i = 0; i < els.length; i++) els[i].textContent = fmtPrice(FALLBACK_MIN_PER_PKG);
        els = document.querySelectorAll('.pf-stripe-min');
        for (var i = 0; i < els.length; i++) els[i].textContent = fmtPrice(FALLBACK_STRIPE_MIN);

        if (tbody) {
            tbody.innerHTML =
                '<tr><td colspan="4" style="padding:1rem 0;text-align:center;color:var(--steel-highlight);font-size:0.8rem;">' +
                'Live prices unavailable — the pricing server is offline. Formula constants shown above are current.' +
                '</td></tr>';
        }
        if (note) {
            note.textContent = fmtPrice(FALLBACK_STRIPE_MIN) +
                ' minimum order total applies. Prices are fetched live when the server is available.';
        }
    }

    function renderPricing(data) {
        var tbody = document.getElementById('pricingExamplesBody');
        var note = document.getElementById('pricingExamplesNote');
        if (!tbody) return;

        var headerRate = document.getElementById('priceHeaderRate');
        if (headerRate) headerRate.textContent = fmtPrice(data.rate_per_kb_cents);
        var els;
        els = document.querySelectorAll('.pf-rate');
        for (var i = 0; i < els.length; i++) els[i].textContent = fmtPrice(data.rate_per_kb_cents);
        els = document.querySelectorAll('.pf-min');
        for (var i = 0; i < els.length; i++) els[i].textContent = fmtPrice(data.min_per_package_cents);
        els = document.querySelectorAll('.pf-stripe-min');
        for (var i = 0; i < els.length; i++) els[i].textContent = fmtPrice(data.stripe_min_cents);

        var packages = data.packages || [];
        var errors = data.errors || [];
        var errorMap = {};
        errors.forEach(function(e) { errorMap[e.name] = e.error; });

        packages.sort(function(a, b) { return a.size_kb - b.size_kb; });

        var rows = [];
        packages.forEach(function(p) {
            var perPkgCents = p.price_cents;
            var orderTotal = Math.max(perPkgCents, data.stripe_min_cents);
            var isMin = orderTotal > perPkgCents;
            rows.push(
                '<tr style="border-bottom:1px solid var(--border-dark);">' +
                '<td style="padding:0.4rem 0.5rem 0.4rem 0;">' + escapeHtml(p.name) + '</td>' +
                '<td style="padding:0.4rem 0.5rem;text-align:right;">' + fmtSize(p.size_kb) + '</td>' +
                '<td style="padding:0.4rem 0.5rem;text-align:right;">' + fmtPrice(perPkgCents) + '</td>' +
                '<td style="padding:0.4rem 0 0.4rem 0.5rem;text-align:right;font-weight:600;color:var(--text-primary);">' +
                fmtPrice(orderTotal) + (isMin ? '*' : '') + '</td></tr>'
            );
        });
        EXAMPLES.forEach(function(name) {
            if (errorMap[name]) {
                rows.push(
                    '<tr style="border-bottom:1px solid var(--border-dark);">' +
                    '<td style="padding:0.4rem 0.5rem 0.4rem 0;">' + escapeHtml(name) + '</td>' +
                    '<td colspan="3" style="padding:0.4rem 0;text-align:right;color:#a03030;font-size:0.75rem;">' +
                    escapeHtml(errorMap[name]) + '</td></tr>'
                );
            }
        });

        tbody.innerHTML = rows.length ? rows.join('') : '<tr><td colspan="4" style="padding:1rem 0;text-align:center;color:#a03030;">Could not load prices.</td></tr>';
        if (note && rows.length) {
            note.textContent = '* ' + fmtPrice(data.stripe_min_cents) +
                ' minimum order total applies. "You Pay" shows the cost if ordered alone. ' +
                'Multi-package orders sum per-package compute costs, then apply the minimum. ' +
                'Prices fetched live from the same API used at checkout.';
        }
    }

    function loadPricingExamples() {
        var api = window.BACKEND_API_URL;
        if (!api) { renderFallback(); return; }
        var deps = {};
        EXAMPLES.forEach(function(n) { deps[n] = '*'; });

        var xhr = new XMLHttpRequest();
        xhr.open('POST', api.replace(/\/$/, '') + '/api/quote', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.timeout = 8000;
        xhr.onload = function() {
            if (xhr.status === 200) {
                try { renderPricing(JSON.parse(xhr.responseText)); } catch(e) { console.error('Pricing parse error', e); renderFallback(); }
            } else {
                renderFallback();
            }
        };
        xhr.onerror = function() { renderFallback(); };
        xhr.ontimeout = function() { renderFallback(); };
        xhr.send(JSON.stringify({ package_json: { dependencies: deps } }));
    }

    loadPricingExamples();
})();

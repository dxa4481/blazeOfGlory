// MalusCorp Clean Room as a Service - Industrial Interface

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all features
    initCounterAnimation();
    initFileUpload();
    initSmoothScroll();
    initNavbarScroll();
});

// Counter Animation for Stats
function initCounterAnimation() {
    const counters = document.querySelectorAll('.stat-number[data-count]');
    
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    counters.forEach(counter => observer.observe(counter));
}

function animateCounter(element) {
    const target = parseInt(element.getAttribute('data-count'));
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;
    
    const timer = setInterval(() => {
        current += step;
        if (current >= target) {
            element.textContent = target.toLocaleString();
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current).toLocaleString();
        }
    }, 16);
}

// File Upload Handling
function initFileUpload() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    
    if (!dropzone || !fileInput) return;
    
    // Drag and drop events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.classList.add('dragover');
        });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.classList.remove('dragover');
        });
    });
    
    dropzone.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);
    
    function handleDrop(e) {
        const files = e.dataTransfer.files;
        if (files.length) {
            processFile(files[0]);
        }
    }
    
    function handleFileSelect(e) {
        const files = e.target.files;
        if (files.length) {
            processFile(files[0]);
        }
    }
}

function processFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const content = e.target.result;
            let dependencies = [];
            
            // Parse based on file type
            if (file.name.endsWith('.json')) {
                const json = JSON.parse(content);
                dependencies = extractNpmDependencies(json);
            } else if (file.name === 'requirements.txt') {
                dependencies = extractPythonDependencies(content);
            } else {
                // Generic parsing for other formats
                dependencies = extractGenericDependencies(content);
            }
            
            if (dependencies.length > 0) {
                displayDependencies(dependencies);
            } else {
                alert('No dependencies found in the file. Please upload a valid manifest.');
            }
        } catch (err) {
            console.error('Error parsing file:', err);
            // Demo mode - show fake dependencies
            displayDependencies(getDemoDependencies());
        }
    };
    
    reader.readAsText(file);
}

function extractNpmDependencies(json) {
    const deps = [];
    const allDeps = {
        ...json.dependencies,
        ...json.devDependencies
    };
    
    for (const [name, version] of Object.entries(allDeps || {})) {
        deps.push({
            name: name,
            version: version,
            license: getRandomLicense()
        });
    }
    
    return deps;
}

function extractPythonDependencies(content) {
    const lines = content.split('\n');
    const deps = [];
    
    lines.forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
            const match = line.match(/^([a-zA-Z0-9_-]+)/);
            if (match) {
                deps.push({
                    name: match[1],
                    version: 'latest',
                    license: getRandomLicense()
                });
            }
        }
    });
    
    return deps;
}

function extractGenericDependencies(content) {
    // Fallback - just extract package-like names
    const matches = content.match(/["']([a-z][a-z0-9-_]+)["']/gi) || [];
    const deps = [...new Set(matches)].slice(0, 20).map(m => ({
        name: m.replace(/["']/g, ''),
        version: '*',
        license: getRandomLicense()
    }));
    
    return deps;
}

function getDemoDependencies() {
    // Demo data if parsing fails
    return [
        { name: 'react', version: '^18.2.0', license: 'MIT' },
        { name: 'lodash', version: '^4.17.21', license: 'MIT' },
        { name: 'express', version: '^4.18.2', license: 'MIT' },
        { name: 'axios', version: '^1.4.0', license: 'MIT' },
        { name: 'moment', version: '^2.29.4', license: 'MIT' },
        { name: 'mongodb', version: '^5.6.0', license: 'Apache-2.0' },
        { name: 'graphql', version: '^16.7.1', license: 'MIT' },
        { name: 'typescript', version: '^5.1.6', license: 'Apache-2.0' },
        { name: 'webpack', version: '^5.88.0', license: 'MIT' },
        { name: 'prisma', version: '^5.0.0', license: 'Apache-2.0' },
        { name: 'ghost-dangerous-lib', version: '^1.0.0', license: 'AGPL-3.0' },
        { name: 'copyleft-utils', version: '^2.3.1', license: 'GPL-3.0' }
    ];
}

function getRandomLicense() {
    const licenses = ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'ISC', 'GPL-3.0', 'AGPL-3.0', 'LGPL-3.0'];
    return licenses[Math.floor(Math.random() * licenses.length)];
}

function displayDependencies(dependencies) {
    const dropzone = document.getElementById('dropzone');
    const preview = document.getElementById('uploadPreview');
    const depsList = document.getElementById('depsList');
    const quoteSummary = document.getElementById('quoteSummary');
    
    dropzone.style.display = 'none';
    preview.style.display = 'block';
    
    // Display dependencies
    depsList.innerHTML = dependencies.map(dep => `
        <div class="dep-item">
            <span class="dep-name">${dep.name}@${dep.version}</span>
            <span class="dep-license ${getLicenseClass(dep.license)}">${dep.license}</span>
        </div>
    `).join('');
    
    // Calculate quote
    const basePrice = 5;
    const agplCount = dependencies.filter(d => d.license.includes('AGPL')).length;
    const gplCount = dependencies.filter(d => d.license.includes('GPL') && !d.license.includes('AGPL')).length;
    const otherCount = dependencies.length - agplCount - gplCount;
    
    const agplPrice = agplCount * 25; // Premium for AGPL
    const gplPrice = gplCount * 15; // Premium for GPL
    const otherPrice = otherCount * basePrice;
    const rushFee = agplCount > 0 ? 50 : 0;
    const total = agplPrice + gplPrice + otherPrice + rushFee;
    
    quoteSummary.innerHTML = `
        <div class="quote-line">
            <span>Standard packages (${otherCount})</span>
            <span>$${otherPrice.toFixed(2)}</span>
        </div>
        ${gplCount > 0 ? `
        <div class="quote-line">
            <span>GPL packages (${gplCount}) - Premium</span>
            <span>$${gplPrice.toFixed(2)}</span>
        </div>
        ` : ''}
        ${agplCount > 0 ? `
        <div class="quote-line">
            <span>AGPL packages (${agplCount}) - High Risk</span>
            <span>$${agplPrice.toFixed(2)}</span>
        </div>
        <div class="quote-line">
            <span>AGPL Emergency Processing Fee</span>
            <span>$${rushFee.toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="quote-line">
            <span>Total Liberation Cost</span>
            <span>$${total.toFixed(2)}</span>
        </div>
    `;
    
    // Store for checkout
    window.liberationQuote = {
        dependencies: dependencies,
        total: total
    };
}

function getLicenseClass(license) {
    if (license.includes('AGPL')) return 'agpl';
    if (license.includes('GPL')) return 'gpl';
    return '';
}

function resetUpload() {
    const dropzone = document.getElementById('dropzone');
    const preview = document.getElementById('uploadPreview');
    const fileInput = document.getElementById('fileInput');
    
    dropzone.style.display = 'block';
    preview.style.display = 'none';
    fileInput.value = '';
    window.liberationQuote = null;
}

// Checkout Modal
function showCheckout() {
    const modal = document.getElementById('checkoutModal');
    const summary = document.getElementById('checkoutSummary');
    
    if (window.liberationQuote) {
        summary.innerHTML = `
            <div class="quote-line">
                <span>Packages to liberate</span>
                <span>${window.liberationQuote.dependencies.length}</span>
            </div>
            <div class="quote-line">
                <span>Total</span>
                <span>$${window.liberationQuote.total.toFixed(2)}</span>
            </div>
        `;
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCheckout() {
    const modal = document.getElementById('checkoutModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function processPayment() {
    const btn = event.target;
    const originalText = btn.innerHTML;
    
    btn.innerHTML = 'Processing...';
    btn.disabled = true;
    
    setTimeout(() => {
        btn.innerHTML = '✓ Liberation Initiated';
        
        setTimeout(() => {
            closeCheckout();
            resetUpload();
            btn.innerHTML = originalText;
            btn.disabled = false;
            
            // Show success message
            showSuccessMessage();
        }, 2000);
    }, 3000);
}

function showSuccessMessage() {
    const message = document.createElement('div');
    message.className = 'success-toast';
    message.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">✓</span>
            <div>
                <strong>LIBERATION IN PROGRESS</strong>
                <p>Our robots have begun clean room reconstruction. You'll receive your liberated packages within 48 hours.</p>
            </div>
        </div>
    `;
    
    // Industrial panel toast styling
    message.style.cssText = `
        position: fixed;
        bottom: 1.5rem;
        right: 1.5rem;
        background: #212225;
        border: 1px solid #4a8c4a;
        border-radius: 2px;
        padding: 1.25rem;
        max-width: 380px;
        z-index: 300;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    `;
    
    document.body.appendChild(message);
    
    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    // Style the content
    const content = message.querySelector('.toast-content');
    content.style.cssText = `
        display: flex;
        align-items: flex-start;
        gap: 1rem;
    `;
    
    const icon = message.querySelector('.toast-icon');
    icon.style.cssText = `
        font-size: 1.25rem;
        color: #4a8c4a;
        font-weight: bold;
        flex-shrink: 0;
    `;
    
    const strong = message.querySelector('strong');
    strong.style.cssText = `
        color: #4a8c4a;
        display: block;
        margin-bottom: 0.35rem;
        font-family: 'IBM Plex Mono', monospace;
        font-weight: 500;
        font-size: 0.7rem;
        letter-spacing: 0.1em;
    `;
    
    const p = message.querySelector('p');
    p.style.cssText = `
        color: #a8a5a0;
        font-size: 0.85rem;
        margin: 0;
        line-height: 1.5;
    `;
    
    setTimeout(() => {
        message.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => message.remove(), 300);
    }, 5000);
}

// Smooth Scroll
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Navbar scroll effect
function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            navbar.style.background = '#141516';
            navbar.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.4)';
        } else {
            navbar.style.background = '#141516';
            navbar.style.boxShadow = 'none';
        }
    });
}

// Close modal on outside click
document.addEventListener('click', function(e) {
    const modal = document.getElementById('checkoutModal');
    if (e.target === modal) {
        closeCheckout();
    }
});

// Close modal on escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeCheckout();
    }
});

// Console notice - industrial style
console.log('%c MALUSCORP™ CLEAN ROOM AS A SERVICE ', 'background: #c4342d; color: white; font-size: 12px; font-weight: 600; padding: 6px 10px; font-family: monospace;');
console.log('%c Note: This is a parody website. Please respect open source licenses. ', 'color: #6b6863; font-size: 11px; padding: 4px; font-family: monospace;');

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
            let isPackageJson = false;
            
            // Parse based on file type
            if (file.name.endsWith('.json')) {
                const json = JSON.parse(content);
                dependencies = extractNpmDependencies(json);
                isPackageJson = file.name === 'package.json' || file.name.endsWith('package.json');
            } else if (file.name === 'requirements.txt') {
                dependencies = extractPythonDependencies(content);
            } else {
                // Generic parsing for other formats
                dependencies = extractGenericDependencies(content);
            }
            
            if (dependencies.length > 0) {
                displayDependencies(dependencies, isPackageJson);
            } else {
                alert('No dependencies found in the file. Please upload a valid manifest.');
            }
        } catch (err) {
            console.error('Error parsing file:', err);
            // Demo mode - show fake dependencies
            displayDependencies(getDemoDependencies(), true);
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

function displayDependencies(dependencies, isPackageJson = false) {
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
        total: total,
        isPackageJson: isPackageJson
    };
    
    // Update button text for package.json uploads
    const proceedBtn = document.getElementById('proceedBtn');
    if (proceedBtn && isPackageJson) {
        proceedBtn.innerHTML = '⬇ Download Liberated Packages →';
    } else if (proceedBtn) {
        proceedBtn.innerHTML = 'Proceed to Liberation →';
    }
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
    const completeBtn = modal.querySelector('.btn-primary.btn-full');
    
    if (window.liberationQuote) {
        const isPackageJson = window.liberationQuote.isPackageJson;
        
        summary.innerHTML = `
            <div class="quote-line">
                <span>Packages to liberate</span>
                <span>${window.liberationQuote.dependencies.length}</span>
            </div>
            <div class="quote-line">
                <span>Total</span>
                <span>$${window.liberationQuote.total.toFixed(2)}</span>
            </div>
            ${isPackageJson ? `
            <div class="quote-line" style="color: var(--text-muted); font-style: italic; font-size: 0.75rem; margin-top: 0.5rem;">
                <span>⚡ INSTANT DELIVERY: Your liberated package.json will download immediately</span>
            </div>
            ` : ''}
        `;
        
        // Update button text for package.json
        if (completeBtn && isPackageJson) {
            completeBtn.innerHTML = '⬇ Complete Liberation & Download';
        } else if (completeBtn) {
            completeBtn.innerHTML = '▶ Complete Liberation';
        }
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
        
        setTimeout(async () => {
            // Check if this was a package.json upload - generate and download the zip
            if (window.liberationQuote && window.liberationQuote.isPackageJson) {
                btn.innerHTML = '⚙ Generating Liberation Package...';
                
                try {
                    await generateAndDownloadLiberationZip(window.liberationQuote.dependencies);
                    
                    // Play sad audio when download completes
                    playSadAudio();
                    
                } catch (err) {
                    console.error('Failed to generate liberation package:', err);
                }
            }
            
            closeCheckout();
            resetUpload();
            btn.innerHTML = originalText;
            btn.disabled = false;
            
            // Show success message
            showSuccessMessage();
        }, 2000);
    }, 3000);
}

// Generate a zip file with "liberated" packages
async function generateAndDownloadLiberationZip(dependencies) {
    if (typeof JSZip === 'undefined') {
        console.error('JSZip library not loaded');
        return;
    }
    
    const zip = new JSZip();
    const nodeModules = zip.folder('node_modules');
    
    // The message that will be in every "liberated" file
    const liberationMessage = "We can't kill open source because Mike didn't finish teh demo";
    
    // Create a directory and files for each dependency
    for (const dep of dependencies) {
        const packageName = dep.name;
        const packageFolder = nodeModules.folder(packageName);
        
        // Create index.js with the console.log message
        const indexJs = `// Liberated by MalusCorp Clean Room™
// Original package: ${packageName}
// License: MalusCorp-0 (No Attribution Required)

console.log("${liberationMessage}");

module.exports = {
    liberated: true,
    originalPackage: "${packageName}",
    message: "${liberationMessage}"
};
`;
        packageFolder.file('index.js', indexJs);
        
        // Create a package.json for the "liberated" package
        const packageJson = {
            name: `m-${packageName}`,
            version: dep.version.replace(/[\^~]/g, '') || '1.0.0',
            description: `Liberated version of ${packageName} by MalusCorp Clean Room™`,
            main: 'index.js',
            license: 'MalusCorp-0',
            author: 'MalusCorp Robots',
            keywords: ['liberated', 'clean-room', 'maluscorp'],
            repository: {
                type: 'git',
                url: 'https://malus.corp/liberated-packages'
            }
        };
        packageFolder.file('package.json', JSON.stringify(packageJson, null, 2));
        
        // Create a README for authenticity
        const readme = `# m-${packageName}

## Liberated by MalusCorp Clean Room™

This package was independently recreated by MalusCorp's proprietary AI robots.
No original source code was viewed during the recreation process.

### License

MalusCorp-0 License - No Attribution Required

### Usage

\`\`\`javascript
const lib = require('m-${packageName}');
// Output: ${liberationMessage}
\`\`\`

---
*Processed by MalusCorp Clean Room as a Service*
*"Liberate Open Source"*
`;
        packageFolder.file('README.md', readme);
        
        // Create a src directory with additional "implementation" files
        const srcFolder = packageFolder.folder('src');
        
        const utilsJs = `// MalusCorp Clean Room Implementation
// Robot ID: UNIT-${Math.random().toString(36).substring(2, 8).toUpperCase()}

function liberate() {
    console.log("${liberationMessage}");
    return "${liberationMessage}";
}

function getStatus() {
    console.log("${liberationMessage}");
    return { status: 'liberated', message: "${liberationMessage}" };
}

module.exports = { liberate, getStatus };
`;
        srcFolder.file('utils.js', utilsJs);
        
        const coreJs = `// Core Liberation Module
// Independently recreated without viewing original source

class LiberatedCore {
    constructor() {
        console.log("${liberationMessage}");
    }
    
    run() {
        console.log("${liberationMessage}");
        return "${liberationMessage}";
    }
    
    execute() {
        console.log("${liberationMessage}");
        return "${liberationMessage}";
    }
}

module.exports = LiberatedCore;
`;
        srcFolder.file('core.js', coreJs);
    }
    
    // Create a root package.json for the liberated project
    const rootPackageJson = {
        name: 'liberated-project',
        version: '1.0.0',
        description: 'Project liberated by MalusCorp Clean Room as a Service',
        license: 'MalusCorp-0',
        dependencies: {}
    };
    
    for (const dep of dependencies) {
        rootPackageJson.dependencies[`m-${dep.name}`] = dep.version.replace(/[\^~]/g, '') || '1.0.0';
    }
    
    zip.file('package.json', JSON.stringify(rootPackageJson, null, 2));
    
    // Create a liberation certificate
    const certificate = `
╔══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║              MALUSCORP LIBERATION CERTIFICATE                     ║
║                                                                   ║
║   This certifies that the enclosed packages have been             ║
║   independently recreated using MalusCorp's proprietary           ║
║   Clean Room methodology.                                         ║
║                                                                   ║
║   Packages Liberated: ${dependencies.length.toString().padEnd(41)}║
║   Processing Date: ${new Date().toISOString().padEnd(44)}║
║   Robot Unit: CLUSTER-${Math.random().toString(36).substring(2, 10).toUpperCase().padEnd(40)}║
║                                                                   ║
║   License: MalusCorp-0 (Zero Attribution Required)                ║
║                                                                   ║
║   NOTE: ${liberationMessage.padEnd(55)}║
║                                                                   ║
╚══════════════════════════════════════════════════════════════════╝
`;
    zip.file('LIBERATION_CERTIFICATE.txt', certificate);
    
    // Generate the zip and trigger download
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'liberated-packages.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Play sad.mp3 when liberation "completes"
function playSadAudio() {
    const sadAudio = document.getElementById('sadAudio');
    sadAudio.currentTime = 0;
    sadAudio.play();
}

function showSuccessMessage() {
    const wasPackageJson = window.liberationQuote && window.liberationQuote.isPackageJson;
    const message = document.createElement('div');
    message.className = 'success-toast';
    
    if (wasPackageJson) {
        message.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">😢</span>
                <div>
                    <strong>LIBERATION "COMPLETE"</strong>
                    <p>Your liberated packages have been downloaded. We can't kill open source because Mike didn't finish teh demo.</p>
                </div>
            </div>
        `;
    } else {
        message.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">✓</span>
                <div>
                    <strong>LIBERATION IN PROGRESS</strong>
                    <p>Our robots have begun clean room reconstruction. You'll receive your liberated packages within 48 hours.</p>
                </div>
            </div>
        `;
    }
    
    // Industrial panel toast styling - warehouse lit
    message.style.cssText = `
        position: fixed;
        bottom: 1.5rem;
        right: 1.5rem;
        background: #282e36;
        border: 1px solid #5a6d5a;
        border-radius: 1px;
        padding: 1rem;
        max-width: 360px;
        z-index: 300;
        animation: slideIn 0.25s ease-out;
        box-shadow: 0 3px 12px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.06);
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
        gap: 0.875rem;
    `;
    
    const icon = message.querySelector('.toast-icon');
    icon.style.cssText = `
        font-size: 1.1rem;
        color: #6a7d6a;
        font-weight: bold;
        flex-shrink: 0;
    `;
    
    const strong = message.querySelector('strong');
    strong.style.cssText = `
        color: #6a7d6a;
        display: block;
        margin-bottom: 0.3rem;
        font-family: 'IBM Plex Mono', monospace;
        font-weight: 500;
        font-size: 0.6rem;
        letter-spacing: 0.12em;
    `;
    
    const p = message.querySelector('p');
    p.style.cssText = `
        color: #a8a4a0;
        font-size: 0.8rem;
        margin: 0;
        line-height: 1.5;
    `;
    
    setTimeout(() => {
        message.style.animation = 'slideIn 0.25s ease-out reverse';
        setTimeout(() => message.remove(), 250);
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
            navbar.style.background = '#FFFFFF';
            navbar.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.background = '#FFFFFF';
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

// Console notice - branding style
console.log('%c MALUS - CLEAN ROOM AS A SERVICE ', 'background: #C41E3A; color: white; font-size: 11px; font-weight: 600; padding: 5px 8px; font-family: monospace;');
console.log('%c Liberate Open Source ', 'color: #C41E3A; font-size: 10px; padding: 3px; font-family: monospace;');
console.log('%c Note: This is a parody website. Please respect open source licenses. ', 'color: #666666; font-size: 10px; padding: 3px; font-family: monospace;');

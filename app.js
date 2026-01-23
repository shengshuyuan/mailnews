// App Logic
class CyberNewsApp {
    constructor() {
        this.storageKey = 'cybermail_nexus_archives';
        this.archives = this.loadArchives();
        this.currentViewId = null;
        this.worker = null;
        
        // Infinite Scroll State
        this.currentPage = 1;
        this.isLoadingMore = false;
        this.hasMore = true;
        this.currentItems = []; // Store accumulated items for the current report

        this.initWorker();
        this.initServiceWorker();
        this.initUI();
        this.startPerformanceMonitor();
    }

    initWorker() {
        if (window.Worker) {
            this.worker = new Worker('worker.js');
            this.worker.onmessage = (e) => {
                const { type, payload } = e.data;
                if (type === 'REPORT_READY') {
                    this.handleReportGenerated(payload);
                }
            };
        } else {
            console.warn('Web Worker not supported. Falling back to main thread.');
        }
    }

    initServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js')
                    .then(registration => {
                        console.log('SW registered: ', registration);
                    })
                    .catch(registrationError => {
                        console.log('SW registration failed: ', registrationError);
                    });
            });
        }
    }

    initUI() {
        // Elements
        this.historyList = document.getElementById('history-list');
        this.newsFeed = document.getElementById('news-feed');
        this.reportTitle = document.getElementById('report-title');
        this.generateBtn = document.getElementById('generate-btn');
        this.clearBtn = document.getElementById('clear-btn');
        this.loadingScreen = document.getElementById('loading-screen');
        
        // Perf Elements
        this.fpsCounter = document.getElementById('fps-counter');
        this.memCounter = document.getElementById('mem-counter');

        // Infinite Scroll Observer
        this.observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && this.hasMore && !this.isLoadingMore && this.currentViewId === 'live-session') {
                this.loadMoreNews();
            }
        }, { threshold: 0.5 });

        // Event Listeners
        this.generateBtn.addEventListener('click', () => this.generateReport());
        this.clearBtn.addEventListener('click', () => this.clearData());

        // Render Initial History
        this.renderHistory();

        // Load latest if exists
        if (this.archives.length > 0) {
            this.loadReport(this.archives[0].id);
        }
    }

    startPerformanceMonitor() {
        let lastLoop = new Date();
        let fps = 0;

        const loop = () => {
            const currentLoop = new Date();
            fps = 1000 / (currentLoop - lastLoop);
            lastLoop = currentLoop;
            
            // Update FPS every 500ms roughly
            if (Math.random() > 0.95) {
                this.fpsCounter.innerText = Math.round(fps);
                
                if (window.performance && window.performance.memory) {
                    const mem = window.performance.memory.usedJSHeapSize / 1048576;
                    this.memCounter.innerText = mem.toFixed(1) + 'M';
                } else {
                    this.memCounter.innerText = 'N/A';
                }
            }

            requestAnimationFrame(loop);
        };

        loop();
    }

    loadArchives() {
        const stored = localStorage.getItem(this.storageKey);
        return stored ? JSON.parse(stored) : [];
    }

    saveArchives() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.archives));
        this.renderHistory();
    }

    renderHistory() {
        this.historyList.innerHTML = '';
        this.archives.forEach(archive => {
            const li = document.createElement('li');
            li.className = `history-item ${this.currentViewId === archive.id ? 'active' : ''}`;
            li.innerHTML = `
                <div>${archive.title}</div>
                <div style="font-size: 0.7rem; color: #666;">${archive.dateGenerated}</div>
            `;
            li.onclick = () => this.loadReport(archive.id);
            this.historyList.appendChild(li);
        });
    }

    loadReport(id) {
        this.currentViewId = id;
        const report = this.archives.find(a => a.id === id);
        if (!report) return;

        this.renderHistory(); // Update active state
        
        // Typing effect for title
        this.typeText(this.reportTitle, `REPORT: ${report.title}`);
        
        this.newsFeed.innerHTML = '';
        report.items.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = `news-card ${item.category.toLowerCase()}`;
            // Staggered animation
            card.style.animation = `fadeInUp 0.5s ease backwards ${index * 0.1}s`;
            
            card.innerHTML = `
                <div class="card-header">
                    <span class="card-source">${item.source}</span>
                    <span class="card-date">${item.date}</span>
                </div>
                <h3>${item.title}</h3>
                <p>${item.summary}</p>
                <div class="card-footer">
                    <span class="card-tag">[${item.category}]</span>
                    <span class="card-link-text">ACCESS_SOURCE >></span>
                </div>
            `;
            // Add click handler for the entire card
            if (item.link && item.link !== '#') {
                card.style.cursor = 'pointer';
                card.onclick = () => window.open(item.link, '_blank');
            }
            this.newsFeed.appendChild(card);
        });
    }

    typeText(element, text, speed = 30) {
        element.innerText = '';
        let i = 0;
        const timer = setInterval(() => {
            if (i < text.length) {
                element.innerText += text.charAt(i);
                i++;
            } else {
                clearInterval(timer);
            }
        }, speed);
    }

    async generateReport() {
        // UI Feedback
        this.newsFeed.innerHTML = '';
        this.currentItems = [];
        this.currentPage = 1;
        this.hasMore = true;
        this.currentViewId = 'live-session'; // Special ID for live session
        
        // Show Skeleton instead of simple loader for better UX
        this.showSkeletonLoading();
        
        // Progress Prompts for User Experience
        const messages = [
            "INITIALIZING MAGI SYSTEM...",
            "CONNECTING TO GLOBAL SATELLITE NETWORK...",
            "BYPASSING FIREWALLS...",
            "DECRYPTING SECURE CHANNELS...",
            "ANALYZING THREAT PATTERNS...",
            "SYNCHRONIZING INTELLIGENCE DATA..."
        ];
        let msgIndex = 0;
        this.reportTitle.innerText = messages[0];
        
        const statusInterval = setInterval(() => {
            msgIndex = (msgIndex + 1) % messages.length;
            this.reportTitle.innerText = messages[msgIndex];
        }, 800);

        this.generateBtn.disabled = true;

        try {
            // Fetch Page 1
            const response = await fetch(`/api/news/generate?page=1&limit=5`);
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            const data = await response.json();
            
            // Stop the loading animation
            clearInterval(statusInterval);
            
            // Handle Data (paginated response structure)
            // Expecting { items: [], hasMore: boolean, nextPage: int }
            // For backward compatibility if server returns array directly (fallback)
            let newItems = Array.isArray(data) ? data : data.items;
            this.hasMore = data.hasMore;
            this.currentPage = data.nextPage;

            this.currentItems = newItems;
            
            // Render first batch
            this.newsFeed.innerHTML = ''; // Clear skeleton
            this.renderNewsItems(newItems);
            
            // Setup sentinel for infinite scroll if more data exists
            if (this.hasMore) {
                this.createSentinel();
            }

            // Create a temporary report object for archive saving (will update as we scroll?)
            // Actually, usually we archive the *final* state. 
            // For now, let's archive what we have so far.
            this.saveCurrentSessionToArchive();

            this.reportTitle.innerText = "SYNC COMPLETE. SCROLL FOR MORE.";
            this.generateBtn.disabled = false;

        } catch (error) {
            clearInterval(statusInterval);
            console.error('API Error:', error);
            this.reportTitle.innerText = "CONNECTION FAILED";
            this.newsFeed.innerHTML = `
                <div class="empty-state">
                    <p>> ERROR: UNABLE TO REACH MAINFRAME.</p>
                    <p>> ${error.message}</p>
                </div>
            `;
            this.generateBtn.disabled = false;
        }
    }

    async loadMoreNews() {
        if (this.isLoadingMore || !this.hasMore) return;
        
        this.isLoadingMore = true;
        // Show small loader at bottom
        const sentinel = document.getElementById('scroll-sentinel');
        if (sentinel) sentinel.innerHTML = '<div class="loader-mini"></div>LOADING DATA STREAM...';

        try {
            const response = await fetch(`/api/news/generate?page=${this.currentPage}&limit=5`);
            const data = await response.json();
            
            const newItems = data.items;
            this.hasMore = data.hasMore;
            this.currentPage = data.nextPage;
            
            this.currentItems = [...this.currentItems, ...newItems];
            
            // Remove old sentinel
            if (sentinel) sentinel.remove();
            
            // Render new items
            this.renderNewsItems(newItems);
            
            // Re-add sentinel if more
            if (this.hasMore) {
                this.createSentinel();
            }

            // Update archive
            this.saveCurrentSessionToArchive();

        } catch (e) {
            console.error("Load more failed", e);
            if (sentinel) sentinel.innerHTML = "DATA STREAM INTERRUPTED.";
        } finally {
            this.isLoadingMore = false;
        }
    }

    createSentinel() {
        const sentinel = document.createElement('div');
        sentinel.id = 'scroll-sentinel';
        sentinel.className = 'scroll-sentinel';
        sentinel.innerText = '>> DETECTING NEURAL ENDPOINT...';
        this.newsFeed.appendChild(sentinel);
        this.observer.observe(sentinel);
    }

    renderNewsItems(items) {
        items.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = `news-card ${item.category.toLowerCase()}`;
            // Staggered animation
            card.style.animation = `fadeInUp 0.5s ease backwards ${index * 0.1}s`;
            
            card.innerHTML = `
                <div class="card-header">
                    <span class="card-source">${item.source}</span>
                    <span class="card-date">${item.date}</span>
                </div>
                <h3>${item.title}</h3>
                <p>${item.summary}</p>
                <div class="card-footer">
                    <span class="card-tag">[${item.category}]</span>
                    <span class="card-link-text">ACCESS_SOURCE >></span>
                </div>
            `;
            if (item.link && item.link !== '#') {
                card.style.cursor = 'pointer';
                card.onclick = () => window.open(item.link, '_blank');
            }
            this.newsFeed.appendChild(card);
        });
    }

    saveCurrentSessionToArchive() {
        const now = new Date();
        const weekNumber = this.getWeekNumber(now);
        const report = {
            id: `report-${now.getTime()}`, // Unique ID for this session
            title: `WEEK ${weekNumber} / 2026`,
            dateGenerated: now.toLocaleString(),
            items: this.currentItems
        };
        
        // Fix: Use a session ID stored in class
        if (!this.currentSessionId) {
             this.currentSessionId = report.id;
             this.archives.unshift(report);
        } else {
             // Find and update
             const idx = this.archives.findIndex(a => a.id === this.currentSessionId);
             if (idx !== -1) {
                 this.archives[idx].items = this.currentItems;
             } else {
                 this.archives.unshift(report);
             }
        }
        this.saveArchives();
    }

    handleReportGenerated(report) {
        this.archives.unshift(report);
        this.saveArchives();
        this.loadReport(report.id);
        
        // Reset UI
        this.generateBtn.disabled = false;
    }

    showSkeletonLoading() {
        this.newsFeed.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const skel = document.createElement('div');
            skel.className = 'skeleton';
            skel.innerHTML = `
                <div class="skeleton-header"></div>
                <div class="skeleton-title"></div>
                <div class="skeleton-text"></div>
                <div class="skeleton-text" style="width: 80%"></div>
            `;
            this.newsFeed.appendChild(skel);
        }
    }

    clearData() {
        const modal = document.getElementById('confirm-modal');
        const confirmBtn = document.getElementById('modal-confirm');
        const cancelBtn = document.getElementById('modal-cancel');
        
        // Show Modal
        modal.classList.remove('hidden');
        
        // Cleanup old listeners to prevent multiple bindings
        const newConfirm = confirmBtn.cloneNode(true);
        const newCancel = cancelBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
        
        newConfirm.addEventListener('click', () => {
            // Execute Purge
            this.archives = [];
            this.saveArchives();
            this.newsFeed.innerHTML = `
                <div class="empty-state">
                    <p>> MEMORY FORMATTED.</p>
                    <p>> SYSTEM READY.</p>
                </div>
            `;
            this.reportTitle.innerText = "WAITING FOR INPUT...";
            this.currentViewId = null;
            
            // Close Modal
            modal.classList.add('hidden');
        });
        
        newCancel.addEventListener('click', () => {
            // Abort
            modal.classList.add('hidden');
        });
    }

    getWeekNumber(d) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
        return weekNo;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Pre-populate some history if empty for demo purposes
    const stored = localStorage.getItem('cybermail_nexus_archives');
    if (!stored) {
        try {
            const response = await fetch('/api/news/archive');
            const archiveData = await response.json();
            
            const demoData = [
                {
                    id: 'demo-old',
                    title: 'WEEK 02 / 2025',
                    dateGenerated: '2025/1/15 10:00:00',
                    items: archiveData
                }
            ];
            localStorage.setItem('cybermail_nexus_archives', JSON.stringify(demoData));
        } catch (e) {
            console.warn('Failed to fetch archives', e);
        }
    }

    new CyberNewsApp();
});

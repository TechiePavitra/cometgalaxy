document.addEventListener('DOMContentLoaded', () => {
    // Initialize Icons
    lucide.createIcons();

    // State
    const state = {
        activeTab: 'home',
        currentSubject: 'math',
        books: [],
        topics: [],
        videos: []
    };

    // Elements
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');
    const menuBtn = document.getElementById('menuBtn');
    const navLinksContainer = document.getElementById('navLinks');
    const modal = document.getElementById('bookModal');
    const closeModal = document.getElementById('closeModal');
    const subjectOverlay = document.getElementById('subjectOverlay');
    const subjectClose = document.getElementById('subjectClose');
    const backBtn = document.getElementById('backBtn');
    const logoEl = document.getElementById('logo');

    // --- Cursor Background Effect ---
    const canvas = document.getElementById('cursor-bg');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let width, height;
        let mouseX = -100, mouseY = -100;
        const dots = [];
        const DOT_SPACING = 30;
        const DOT_SIZE = 1.5;
        const ACTIVE_RADIUS = 100;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            createDots();
        }

        function createDots() {
            dots.length = 0;
            for (let x = 0; x < width; x += DOT_SPACING) {
                for (let y = 0; y < height; y += DOT_SPACING) {
                    dots.push({ x, y, baseX: x, baseY: y });
                }
            }
        }

        function draw() {
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = '#00f2ff';

            dots.forEach(dot => {
                const dx = mouseX - dot.x;
                const dy = mouseY - dot.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < ACTIVE_RADIUS) {
                    const angle = Math.atan2(dy, dx);
                    const force = (ACTIVE_RADIUS - distance) / ACTIVE_RADIUS;
                    const moveX = Math.cos(angle) * force * 20;
                    const moveY = Math.sin(angle) * force * 20;
                    dot.x = dot.baseX - moveX;
                    dot.y = dot.baseY - moveY;
                    ctx.globalAlpha = 1 - (distance / ACTIVE_RADIUS) * 0.5;
                } else {
                    dot.x += (dot.baseX - dot.x) * 0.1;
                    dot.y += (dot.baseY - dot.y) * 0.1;
                    ctx.globalAlpha = 0.1;
                }

                ctx.beginPath();
                ctx.arc(dot.x, dot.y, DOT_SIZE, 0, Math.PI * 2);
                ctx.fill();
            });

            requestAnimationFrame(draw);
        }

        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        if (window.matchMedia("(min-width: 600px)").matches) {
            resize();
            draw();
        }
    }

    // --- Navigation Logic ---
    function switchTab(tabId) {
        state.activeTab = tabId;

        navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.tab === tabId);
        });

        sections.forEach(section => {
            section.classList.toggle('active', section.id === tabId);
        });

        if (navLinksContainer) navLinksContainer.classList.remove('active');
        // show/hide back button depending on tab
        if (backBtn) {
            if (tabId && tabId !== 'home') {
                backBtn.style.display = 'inline-flex';
            } else {
                backBtn.style.display = 'none';
            }
        }
        
        // Clear search inputs when switching tabs
        document.querySelectorAll('.search-input').forEach(input => {
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        
        lucide.createIcons();
        window.scrollTo(0, 0);
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(link.dataset.tab);
        });
    });

    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            navLinksContainer.classList.toggle('active');
        });
    }

    // Subject selector open/close
    function openSubjectSelector() {
        if (!subjectOverlay) return;
        subjectOverlay.setAttribute('aria-hidden', 'false');
        lucide.createIcons();
        // ensure mobile nav closed
        if (navLinksContainer) navLinksContainer.classList.remove('active');
        window.scrollTo(0, 0);
    }

    function closeSubjectSelector() {
        if (!subjectOverlay) return;
        subjectOverlay.setAttribute('aria-hidden', 'true');
    }

    window.openSubjectSelector = openSubjectSelector;

    if (subjectClose) {
        subjectClose.addEventListener('click', (e) => {
            e.preventDefault();
            closeSubjectSelector();
        });
    }

    // Logo click acts as back/home
    if (logoEl) {
        logoEl.style.cursor = 'pointer';
        logoEl.addEventListener('click', (e) => {
            // If not on home, go home; otherwise do nothing
            if (state.activeTab && state.activeTab !== 'home') {
                switchTab('home');
            } else {
                // already on home - maybe scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    // Back button behavior
    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // If history is available, go back; otherwise go to home
            if (window.history && window.history.length > 1) {
                window.history.back();
                setTimeout(() => switchTab('home'), 200);
            } else {
                switchTab('home');
            }
        });
    }

    // --- Data Loading ---
    async function loadData(subject) {
        let topicsFile = 'data/topics.json';
        if (subject === 'physics') {
            topicsFile = 'data/physics.json';
        } else if (subject === 'cs') {
            topicsFile = 'data/cs.json';
        }

        try {
            const topicsRes = await fetch(topicsFile);
            if (!topicsRes.ok) throw new Error(`Failed to load ${topicsFile}`);
            const topicsData = await topicsRes.json();
            state.topics = topicsData.topics || [];
            
            // Always load/refresh books and videos
            const [booksRes, videosRes] = await Promise.all([
                fetch('data/books.json'),
                fetch('data/videos.json')
            ]);
            
            if (!booksRes.ok) throw new Error('Failed to load books.json');
            if (!videosRes.ok) throw new Error('Failed to load videos.json');
            
            const booksData = await booksRes.json();
            const videosData = await videosRes.json();
            state.books = booksData.books || [];
            state.videos = videosData.videos || [];
            
            console.log('Books loaded:', state.books.length, 'Videos loaded:', state.videos.length);
            
            renderBooks(state.books);
            renderVideos(state.videos);
            renderRoadmap(state.topics);
            
            const roadmapTitle = document.querySelector('#roadmap .section-header h2');
            if (roadmapTitle) {
                const titles = {
                    'math': 'Mathematics Roadmap',
                    'physics': 'Physics Roadmap',
                    'cs': 'Computer Science Roadmap'
                };
                roadmapTitle.textContent = titles[subject] || 'Your Adventure Map';
            }

        } catch (error) {
            console.error('Error loading data:', error);
            const container = document.getElementById('roadmapContent');
            if (container) container.innerHTML = '<p class="error">Failed to load content. Please try again later.</p>';
        }
    }

    function selectSubject(subject) {
        state.currentSubject = subject;
        // close selector overlay if open
        try { if (subjectOverlay) subjectOverlay.setAttribute('aria-hidden', 'true'); } catch(e){}
        loadData(subject).then(() => {
            switchTab('roadmap');
        });
    }

    window.selectSubject = selectSubject;
    window.openBook = openBook;

    // --- Rendering Functions ---
    function renderBooks(books) {
        const grid = document.getElementById('booksGrid');
        if (!grid) {
            console.error('booksGrid container not found');
            return;
        }
        if (books.length === 0) {
            grid.innerHTML = '<p class="no-results">No books found matching your search.</p>';
            return;
        }
        grid.innerHTML = books.map(book => `
            <div class="card" onclick="openBook('${book.title.replace(/'/g, "\\'")}', '${book.file.replace(/'/g, "\\'")}')">
                <div class="card-image" style="background: linear-gradient(135deg, ${book.color || '#00d9ff'}, ${book.colorEnd || '#a855f7'})">
                    <i data-lucide="book"></i>
                </div>
                <div class="card-content">
                    <h3 class="card-title">${book.title}</h3>
                    <p class="card-subtitle">${book.author}</p>
                    <span class="card-tag">${book.category || 'Mathematics'}</span>
                </div>
            </div>
        `).join('');
        lucide.createIcons();
    }

    function renderVideos(videos) {
        const grid = document.getElementById('videosGrid');
        if (!grid) return;
        if (videos.length === 0) {
            grid.innerHTML = '<p class="no-results">No videos found matching your search.</p>';
            return;
        }
        grid.innerHTML = videos.map(video => `
            <div class="card video-card" onclick="window.open('${video.url}', '_blank')">
                <div class="card-image" style="background-image: url('${video.thumbnail}'); background-size: cover; background-position: center;">
                    <div class="play-overlay"><i data-lucide="play-circle"></i></div>
                </div>
                <div class="card-content">
                    <h3 class="card-title">${video.title}</h3>
                    <p class="card-subtitle">${video.channel}</p>
                    <span class="card-tag">${video.category}</span>
                </div>
            </div>
        `).join('');
        lucide.createIcons();
    }

    function renderRoadmap(topics) {
        const container = document.getElementById('roadmapContent');
        if (!container) return;
        if (topics.length === 0) {
            container.innerHTML = '<p class="no-results">No topics found matching your search.</p>';
            return;
        }
        container.innerHTML = topics.map(topic => `
            <div class="roadmap-item">
                <div class="roadmap-header" onclick="this.parentElement.classList.toggle('open')">
                    <span class="roadmap-title">
                        <i data-lucide="check-circle" class="check-icon"></i>
                        ${topic.name}
                    </span>
                    <i data-lucide="chevron-down" class="chevron"></i>
                </div>
                <div class="roadmap-content">
                    ${topic.children ? topic.children.map(child => `
                        <div class="sub-topic">
                            <strong>${child.name}</strong>
                            <p>${child.note || ''}</p>
                        </div>
                    `).join('') : '<p>No details available.</p>'}
                </div>
            </div>
        `).join('');
        lucide.createIcons();
    }
    
    // --- Book Modal Logic ---
    function openBook(title, file) {
        if (window.loadBookPDF) {
            window.loadBookPDF(file);
        } else {
            console.error('Book viewer not loaded');
            alert('Book viewer is not available.');
        }
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            if (modal) {
                modal.classList.remove('active');
            }
        });
    }
    
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.classList.remove('active');
        }
    });

    // --- Search Logic ---
    const searchRoadmap = document.getElementById('searchRoadmap');
    const searchBooks = document.getElementById('searchBooks');
    const searchVideos = document.getElementById('searchVideos');

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function filterData(query, data, fields) {
        const lowerQuery = query.toLowerCase().trim();
        if (!lowerQuery) return data;

        return data.filter(item => {
            return fields.some(field => {
                const value = item[field];
                return value && value.toString().toLowerCase().includes(lowerQuery);
            });
        });
    }

    function filterRoadmap(query, topics) {
        const lowerQuery = query.toLowerCase().trim();
        if (!lowerQuery) return topics;

        return topics.reduce((acc, topic) => {
            const nameMatch = topic.name.toLowerCase().includes(lowerQuery);
            const matchingChildren = topic.children ? topic.children.filter(child => 
                child.name.toLowerCase().includes(lowerQuery) || 
                (child.note && child.note.toLowerCase().includes(lowerQuery))
            ) : [];

            if (nameMatch || matchingChildren.length > 0) {
                const newTopic = { ...topic };
                if (!nameMatch) {
                    newTopic.children = matchingChildren;
                }
                acc.push(newTopic);
            }
            return acc;
        }, []);
    }

    if (searchRoadmap) {
        searchRoadmap.addEventListener('input', debounce((e) => {
            const query = e.target.value;
            const filtered = filterRoadmap(query, state.topics);
            renderRoadmap(filtered);
        }, 300));
    }

    if (searchBooks) {
        searchBooks.addEventListener('input', debounce((e) => {
            const query = e.target.value;
            const filtered = filterData(query, state.books, ['title', 'author', 'category']);
            renderBooks(filtered);
        }, 300));
    }

    if (searchVideos) {
        searchVideos.addEventListener('input', debounce((e) => {
            const query = e.target.value;
            const filtered = filterData(query, state.videos, ['title', 'channel', 'category']);
            renderVideos(filtered);
        }, 300));
    }

    // Clickable search icons: focus the input and trigger the same input event
    document.querySelectorAll('.search-wrapper').forEach(wrapper => {
        const icon = wrapper.querySelector('.search-icon');
        const input = wrapper.querySelector('input');
        if (!icon || !input) return;
        icon.style.cursor = 'pointer';
        icon.addEventListener('click', () => {
            input.focus();
            // dispatch an input event so existing debounce handlers run
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
    });

    window.switchTab = switchTab;
    window.openBook = openBook;
    
    // Load initial data on page load
    (async () => {
        try {
            await loadData(state.currentSubject);
            console.log('Initial data loaded successfully');
        } catch (err) {
            console.error('Failed to load initial data:', err);
        }
    })();
});
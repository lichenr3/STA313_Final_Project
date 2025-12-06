document.addEventListener('DOMContentLoaded', () => {
    // Select both sections AND individual visualization containers with data-controls
    const sections = document.querySelectorAll('section[data-controls]');
    const visualizations = document.querySelectorAll('[data-controls]:not(section)');
    const allObservableElements = [...sections, ...visualizations];
    
    const controls = document.querySelectorAll('.control-section');
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');

    let isSidebarOpen = false;
    let userHasClosedSidebar = false; // Track if user manually closed sidebar

    // 1. Sidebar Toggle Logic
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            const newState = !isSidebarOpen;
            toggleSidebar(newState);
            // If user manually closes sidebar, remember this
            if (!newState) {
                userHasClosedSidebar = true;
            } else {
                userHasClosedSidebar = false;
            }
        });
    }

    function toggleSidebar(open) {
        isSidebarOpen = open;
        if (open) {
            sidebar.classList.add('open');
            sidebarToggle.classList.add('sidebar-open');
            sidebarToggle.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                </svg>
            `; // Close icon
        } else {
            sidebar.classList.remove('open');
            sidebarToggle.classList.remove('sidebar-open');
            sidebarToggle.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 12h18M3 6h18M3 18h18" />
                </svg>
            `; // Menu icon
        }
    }

    // 2. Scroll Observer Logic
    const observerOptions = {
        root: null,
        rootMargin: '-40% 0px -40% 0px', // Trigger when the element is in the middle of the screen
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const targetId = entry.target.getAttribute('data-controls');
                activateControls(targetId);

                // Auto-open sidebar if we hit a chart section (vis0, vis1, vis2)
                // and it's not already open, AND user hasn't manually closed it.
                // We assume 'intro' doesn't need to auto-open it.
                if (targetId && targetId !== 'intro-controls' && !isSidebarOpen && !userHasClosedSidebar) {
                    // Check if it's a "vis" section
                    if (targetId.includes('vis')) {
                        toggleSidebar(true);
                    }
                }
            }
        });
    }, observerOptions);

    allObservableElements.forEach(element => {
        observer.observe(element);
    });

    function activateControls(controlId) {
        // Hide all controls
        controls.forEach(control => {
            control.classList.remove('active');
        });

        // Show target control
        if (controlId) {
            const targetControl = document.getElementById(controlId);
            if (targetControl) {
                targetControl.classList.add('active');
            }
        }
    }

    // Initialize: Ensure Vis 0 controls are active by default if at top, 
    // but sidebar is hidden.
    // Actually, the observer will trigger for the first section in view.
    // But let's set initial state just in case.
    // activateControls('vis0-icon-controls'); // Let observer handle it
});

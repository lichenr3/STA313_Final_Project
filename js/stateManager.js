// stateManager.js - Simplified global state management for CMA synchronization

class StateManager {
    constructor() {
        this.events = new EventTarget();

        // CMA code to name mapping (shared by both visualizations)
        this.cmaNames = {
            '535': 'Toronto',
            '462': 'Montréal',
            '505': 'Ottawa–Gatineau',
            '933': 'Vancouver',
            '825': 'Calgary',
            '835': 'Edmonton',
            'overview': 'all'
        };

        // Reverse mapping: name to code
        this.nameToCma = {};
        Object.entries(this.cmaNames).forEach(([code, name]) => {
            this.nameToCma[name] = code;
        });
        this.nameToCma['all'] = 'overview';
    }

    // Dispatch event when CMA selection changes
    notifyCityChanged(source, value) {
        console.log(`Global State: CMA changed by ${source} to ${value}`);

        const event = new CustomEvent('globalCityChange', {
            detail: {
                source: source,
                value: value  // This can be either a code (from Vis1) or a name (from Vis2)
            }
        });

        this.events.dispatchEvent(event);
    }

    // Subscribe to changes
    subscribe(callback) {
        this.events.addEventListener('globalCityChange', (e) => {
            callback(e.detail);
        });
    }
}

// Create singleton
const globalStateManager = new StateManager();

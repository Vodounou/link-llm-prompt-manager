class CardManager {
    constructor() {
        console.log('Initializing the prompt and link manager...');
        
        // Placeholder management system with descriptions
        this.placeholders = {
            'YYYY-MM-DD_HH-mm-SS': {
                description: 'Current date and time in YYYY-MM-DD_HH-mm-SS',
                example: '2025-02-19_15-39-05',
                getValue: () => {
                    const now = new Date();
                    const pad = (num) => String(num).padStart(2, '0');
                    
                    const year = now.getFullYear();
                    const month = pad(now.getMonth() + 1);
                    const day = pad(now.getDate());
                    const hours = pad(now.getHours());
                    const minutes = pad(now.getMinutes());
                    const seconds = pad(now.getSeconds());
                    
                    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
                }
            },
            
            'clipboard': {
                description: 'Current clipboard content',
                example: 'Copied text...',
                getValue: async () => {
                    try {
                        return await navigator.clipboard.readText();
                    } catch (err) {
                        console.error('Error reading clipboard:', err);
                        return '{clipboard}';
                    }
                }
            }
        };

        // Get DOM elements
        this.container = document.getElementById('cardsContainer');
        this.template = document.getElementById('cardTemplate');
        this.addButton = document.getElementById('addNewCard');
        this.exportButton = document.getElementById('exportData');
        this.importButton = document.getElementById('importData');
        this.importInput = document.getElementById('importInput');
        this.themeToggle = document.getElementById('themeToggle');
        this.searchInput = document.getElementById('searchInput');
        this.searchCount = document.getElementById('searchCount');
        this.tagCloud = document.getElementById('tagCloud');
        this.notificationContainer = document.getElementById('notification-container');
        
        // Settings modal elements
        this.settingsButton = document.getElementById('settingsButton');
        this.settingsModal = document.getElementById('settingsModal');
        this.modalClose = this.settingsModal.querySelector('.modal-close');
        this.placeholdersList = document.getElementById('placeholdersList');

        // Filter state
        this.activeTags = new Set();
        
        // Check if marked is available
        if (typeof marked === 'undefined') {
            this.markdownAvailable = false;
            console.error('The marked library is not loaded');
            this.showNotification('The marked library is not loaded', 'error');
        } else {
            this.markdownAvailable = true;
            console.log('✓ Marked library successfully loaded');
            
            // Configure marked with the new API
            if (typeof marked.parse === 'function') {
                this.parseMarkdown = (text) => marked.parse(text);
            } else {
                this.parseMarkdown = (text) => marked(text);
            }
            
            // Security options
            marked.setOptions({
                sanitize: true,
                breaks: true
            });
        }

        this.cards = [];
        
        // Initialize theme
        this.initTheme();
        
        // Initialize the application
        this.init();
        console.log('✓ Prompt and link manager initialized');
    }

    initTheme() {
        console.log('Initializing theme...');
        // Check if a theme is saved
        const savedTheme = localStorage.getItem('theme');
        
        // Check system preferences
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // Apply saved theme or system preferences
        if (savedTheme) {
            console.log(`Found saved theme : ${savedTheme}`);
            document.documentElement.setAttribute('data-theme', savedTheme);
        } else if (prefersDark) {
            console.log('System preference for dark theme detected');
            document.documentElement.setAttribute('data-theme', 'dark');
        }
        
        // Update button icon
        this.updateThemeIcon();
        console.log('✓ Theme initialized');
    }

    updateThemeIcon() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        this.themeToggle.textContent = isDark ? '☀️' : '🌙';
    }

    toggleTheme() {
        console.log('Changing theme...');
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        console.log(`Switching from theme ${currentTheme || 'light'} to ${newTheme}`);
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        this.updateThemeIcon();
        console.log('✓ Theme updated');
    }

    init() {
        // Load saved data
        this.loadCards();
        
        // Add event listeners
        this.addButton.addEventListener('click', () => this.addCard());
        this.exportButton.addEventListener('click', () => this.exportData());
        this.importButton.addEventListener('click', () => this.importInput.click());
        this.importInput.addEventListener('change', (e) => this.importData(e));
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // Settings modal configuration
        this.setupSettingsModal();
        
        // Configure search
        this.setupSearch();
        
        console.log('✓ Prompt and link manager initialized');
    }

    setupSearch() {
        console.log('Configuring search...');
        
        // Debounce function to avoid too many calls during typing
        const debounce = (func, wait) => {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        };
        
        // Search function
        const filterCards = (searchText = '') => {
            console.log('Filtering cards...');
            console.log('Search text:', searchText);
            console.log('Active tags:', [...this.activeTags]);

            let visibleCount = 0;
            
            this.cards.forEach(card => {
                // Get card tags
                const cardTags = card.querySelector('.card-tags').value
                    .split(',')
                    .map(tag => tag.trim())
                    .filter(tag => tag);
                
                console.log('Card:', card.querySelector('.card-title').textContent);
                console.log('Card tags:', cardTags);
                
                // Check if card matches search criteria
                const matchesSearch = searchText === '' || 
                    card.querySelector('.card-title').textContent.toLowerCase()
                        .includes(searchText.toLowerCase());
                
                // Check if card has all active tags
                const hasAllActiveTags = this.activeTags.size === 0 || 
                    [...this.activeTags].every(tag => cardTags.includes(tag));
                
                console.log('Matches search:', matchesSearch);
                console.log('Has all active tags:', hasAllActiveTags);
                
                // Show or hide card
                if (matchesSearch && hasAllActiveTags) {
                    card.style.display = '';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });
            
            // Update the results counter
            if (this.searchCount) {
                this.searchCount.textContent = visibleCount > 0 
                    ? `${visibleCount} result${visibleCount > 1 ? 's' : ''}`
                    : 'No results';
            }
            
            console.log(`✓ Filtering completed: ${visibleCount} card(s) visible`);
        };

        // Update the results counter
        this.updateSearchCount = (count) => {
            const total = this.cards.length;
            if (this.searchInput.value.trim() || this.activeTags.size > 0) {
                this.searchCount.textContent = `${count} out of ${total} cards`;
            } else {
                this.searchCount.textContent = '';
            }
        };
        
        // Listen for changes in the search bar
        this.searchInput.addEventListener('input', debounce((e) => {
            filterCards(e.target.value);
        }, 300));
        
        // Update tags when a card is modified
        const updateTagCloud = debounce(() => {
            console.log('Updating tag cloud...');
            
            // Reset the tag container
            this.tagCloud.innerHTML = '';
            
            // Create containers for the two rows of tags
            const upperRow = document.createElement('div');
            upperRow.className = 'tag-row';
            
            const lowerRow = document.createElement('div');
            lowerRow.className = 'tag-row';
            
            // Count occurrences of each tag
            const tagCount = new Map();
            this.cards.forEach(card => {
                const tags = card.querySelector('.card-tags').value
                    .split(',')
                    .map(tag => tag.trim())
                    .filter(tag => tag);
                
                tags.forEach(tag => {
                    tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
                });
            });
            
            // Separate tags into two groups
            const upperTags = [];
            const lowerTags = [];
            
            tagCount.forEach((count, tag) => {
                if (tag && tag[0] === tag[0].toUpperCase()) {
                    upperTags.push([tag, count]);
                } else {
                    lowerTags.push([tag, count]);
                }
            });
            
            // Function to create a tag element
            const createTagElement = (tag, count) => {
                const tagElement = document.createElement('span');
                tagElement.className = 'tag' + (this.activeTags.has(tag) ? ' active' : '');
                tagElement.innerHTML = `${tag} <span class="count">${count}</span>`;
                
                tagElement.addEventListener('click', () => {
                    if (this.activeTags.has(tag)) {
                        this.activeTags.delete(tag);
                        tagElement.classList.remove('active');
                    } else {
                        this.activeTags.add(tag);
                        tagElement.classList.add('active');
                    }
                    filterCards(this.searchInput.value);
                });
                
                return tagElement;
            };
            
            // Add tags in alphabetical order
            upperTags.sort((a, b) => a[0].localeCompare(b[0]))
                .forEach(([tag, count]) => {
                    upperRow.appendChild(createTagElement(tag, count));
                });
            
            lowerTags.sort((a, b) => a[0].localeCompare(b[0]))
                .forEach(([tag, count]) => {
                    lowerRow.appendChild(createTagElement(tag, count));
                });
            
            // Add rows only if they contain tags
            if (upperTags.length > 0) {
                this.tagCloud.appendChild(upperRow);
            }
            if (lowerTags.length > 0) {
                this.tagCloud.appendChild(lowerRow);
            }
            
            console.log('✓ Tag cloud updated');
        }, 300);
        
        // Observe changes in tags
        const observer = new MutationObserver(() => {
            updateTagCloud();
        });
        
        observer.observe(this.container, { 
            childList: true,
            subtree: true,
            characterData: true
        });
        
        // Update initially
        updateTagCloud();
        
        console.log('✓ Search configured');
    }

    setupSettingsModal() {
        console.log('Settings modal configuration...');
        
        // Open the modal
        this.settingsButton.addEventListener('click', () => {
            console.log('Opening settings modal');
            this.settingsModal.classList.add('active');
            this.updatePlaceholdersList();
        });
        
        // Close the modal
        this.modalClose.addEventListener('click', () => {
            console.log('Closing settings modal');
            this.settingsModal.classList.remove('active');
        });
        
        // Close the modal when clicking outside
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                console.log('Closing modal (click outside)');
                this.settingsModal.classList.remove('active');
            }
        });
        
        console.log('✓ Settings modal configured');
    }

    updatePlaceholdersList() {
        console.log('Updating placeholders list...');
        
        const placeholdersList = document.getElementById('placeholdersList');
        if (!placeholdersList) return;
        
        placeholdersList.innerHTML = `
            <div class="placeholder-item">
                <div class="placeholder-name">{YYYY-MM-DD_HH-mm-SS}</div>
                <div class="placeholder-description">Current date and time in YYYY-MM-DD_HH-mm-SS</div>
                <div class="placeholder-example">Example: 2025-02-19_15-39-05</div>
            </div>
            <div class="placeholder-item">
                <div class="placeholder-name">{clipboard}</div>
                <div class="placeholder-description">Current clipboard content</div>
                <div class="placeholder-example">Example: Copied text...</div>
            </div>
        `;
        
        console.log('✓ Placeholders list updated');
    }

    loadCards() {
        try {
            const savedCards = localStorage.getItem('cards');
            if (savedCards) {
                const cardData = JSON.parse(savedCards);
                cardData.forEach(data => {
                    // Adapt old data to new format
                    const adaptedData = {
                        title: data.title || '',
                        url: data.url || data.link || '', // Support both formats
                        copyText: data.copyText || data.copytext || '', // Support both formats
                        tags: Array.isArray(data.tags) ? data.tags : 
                              data.tags ? data.tags.split(',').map(tag => tag.trim()) : []
                    };
                    this.addCard(adaptedData);
                });
            }
        } catch (error) {
            console.error('Error loading cards:', error);
            this.showNotification('Error loading cards', 'error');
        }
    }

    addCard(data = null) {
        console.log('Adding a new card...');
        
        // Clone the template
        const card = this.template.content.cloneNode(true).querySelector('.card');
        this.container.appendChild(card);
        this.cards.push(card);
        
        if (data) {
            console.log('Initializing with data:', data);
            const elements = {
                title: card.querySelector('.card-title'),
                titleEdit: card.querySelector('.card-title-edit'),
                urlTextArea: card.querySelector('.card-url'),
                copyTextArea: card.querySelector('.card-copytext'),
                tagsInput: card.querySelector('.card-tags')
            };

            // Initialize values
            if (elements.title) elements.title.textContent = data.title || 'New title';
            if (elements.titleEdit) elements.titleEdit.value = data.title || 'New title';
            if (elements.urlTextArea) elements.urlTextArea.value = data.url || '';
            if (elements.copyTextArea) elements.copyTextArea.value = data.copyText || '';
            if (elements.tagsInput) elements.tagsInput.value = data.tags ? data.tags.join(', ') : '';
        }

        // Configure events
        this.setupCardEvents(card);
        
        return card;
    }

    async copyCardText(card) {
        console.log('Copying card text...');
        
        try {
            // Get the text to copy from the textarea
            const copyTextArea = card.querySelector('.card-copytext');
            const textToCopy = copyTextArea.value;
            console.log('Original text to copy:', textToCopy);
            
            // Replace placeholders
            const processedText = await this.replacePlaceholders(textToCopy);
            console.log('Text after placeholder replacement:', processedText);
            
            // Copy the processed text
            await navigator.clipboard.writeText(processedText);
            console.log('✓ Text copied to clipboard');
            
            // Display a success notification
            this.showNotification('Copied text !', 'success');
            
            return true;
        } catch (err) {
            console.error('Error copying text:', err);
            this.showNotification('Error copying text', 'error');
            return false;
        }
    }

    openCardUrls(card) {
        console.log('Opening card URLs...');
        
        // Get URLs from the textarea
        const urlTextArea = card.querySelector('.card-url');
        const urls = urlTextArea.value.split('\n').filter(url => url.trim());
        
        if (urls.length > 0) {
            // If multiple URLs, display a warning notification
            if (urls.length > 1) {
                this.showNotification(
                    'Multiple links will be opened. If some links do not open, please check that popups are not blocked by your browser.',
                    'warning'
                );
            }
            
            urls.forEach((url, index) => {
                if (url.trim()) {
                    console.log('Opening URL:', url);
                    try {
                        const newWindow = window.open(url.trim(), '_blank');
                        if (newWindow === null) {
                            // If window.open returns null, the popup was blocked
                            this.showNotification(
                                'The browser has blocked the opening of links. Please allow popups for this site in your browser settings.',
                                'error'
                            );
                            return false;
                        }
                    } catch (error) {
                        console.error('Error opening URL:', error);
                        this.showNotification(
                            'An error occurred while opening links.',
                            'error'
                        );
                        return false;
                    }
                }
            });
            return true;
        } else {
            console.log('No URL to open');
            return false;
        }
    }

    setupCardEvents(card) {
        console.log('Configuring card events...');
        
        // Get card elements
        const elements = {
            title: card.querySelector('.card-title'),
            titleEdit: card.querySelector('.card-title-edit'),
            urlTextArea: card.querySelector('.card-url'),
            copyTextArea: card.querySelector('.card-copytext'),
            tagsInput: card.querySelector('.card-tags'),
            expandBtn: card.querySelector('.btn-expand'),
            saveBtn: card.querySelector('.btn-save'),
            deleteBtn: card.querySelector('.btn-delete'),
            actionsIcons: card.querySelector('.card-actions-icons')
        };

        // Function to update action icons
        const updateActionIcons = () => {
            const hasUrls = elements.urlTextArea.value.trim() !== '';
            const hasText = elements.copyTextArea.value.trim() !== '';
            
            elements.actionsIcons.innerHTML = '';
            const icons = [];
            if (hasUrls) icons.push('🔗');
            if (hasText) icons.push('📋');
            elements.actionsIcons.textContent = icons.join(' ');
        };

        // Update icons initially
        updateActionIcons();

        // Update icons when content changes
        elements.urlTextArea.addEventListener('input', updateActionIcons);
        elements.copyTextArea.addEventListener('input', updateActionIcons);

        // Handle title click
        elements.title.addEventListener('click', async () => {
            const copySuccess = await this.copyCardText(card);
            const urls = elements.urlTextArea.value.split('\n').filter(url => url.trim());
            if (urls.length > 0) {
                this.openCardUrls(card);
            }
        });

        // Handle expansion
        elements.expandBtn.addEventListener('click', () => {
            card.classList.toggle('expanded');
            elements.expandBtn.style.transform = card.classList.contains('expanded') ? 'rotate(180deg)' : '';
        });

        // Handle saving
        elements.saveBtn.addEventListener('click', () => {
            elements.title.textContent = elements.titleEdit.value;
            updateActionIcons();
            this.saveAndExport();
            card.classList.remove('expanded');
            elements.expandBtn.style.transform = '';
        });

        // Handle deletion
        elements.deleteBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete this card?')) {
                card.remove();
                this.cards = this.cards.filter(c => c !== card);
                this.saveAndExport();
            }
        });

        // Title synchronization
        elements.titleEdit.addEventListener('input', () => {
            elements.title.textContent = elements.titleEdit.value;
        });

        console.log('✓ Card events configured');
    }

    createCard(title, link, copyText, tags = []) {
        console.log('Creating a new card...');
        
        const card = this.template.content.cloneNode(true);
        const cardElement = card.querySelector('.card');
        
        // Fill fields
        cardElement.querySelector('.card-title-edit').value = title;
        cardElement.querySelector('.card-url').value = link;
        cardElement.querySelector('.card-copytext').value = copyText;
        cardElement.querySelector('.card-tags').value = tags.join(', ');
        
        // Configure events
        this.setupCardEvents(cardElement);
        
        console.log('✓ Card created successfully');
        return card;
    }

    // Function to replace placeholders in a text
    async replacePlaceholders(text) {
        console.log('Replacing placeholders in text...');
        let result = text;
        
        for (const [key, info] of Object.entries(this.placeholders)) {
            const placeholder = `{${key}}`;
            if (result.includes(placeholder)) {
                try {
                    console.log(`Processing placeholder: ${placeholder}`);
                    const value = await info.getValue();
                    result = result.replaceAll(placeholder, value);
                    console.log(`✓ Placeholder ${placeholder} successfully replaced`);
                } catch (err) {
                    console.error(`Error replacing placeholder ${key}:`, err);
                }
            }
        }
        
        return result;
    }

    saveAndExport() {
        console.log('Saving cards...');
        
        const cardsData = this.cards.map(card => {
            return {
                title: card.querySelector('.card-title').textContent,
                url: card.querySelector('.card-url').value,
                copyText: card.querySelector('.card-copytext').value,
                tags: card.querySelector('.card-tags').value.split(',')
                    .map(tag => tag.trim())
                    .filter(tag => tag)
            };
        });
        
        localStorage.setItem('cards', JSON.stringify(cardsData));
        console.log('✓ Cards saved');
        
        // Download JSON file
        const blob = new Blob([JSON.stringify(cardsData, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cards_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    exportData() {
        this.saveAndExport();
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const cardData = JSON.parse(e.target.result);
                this.container.innerHTML = '';
                this.cards = [];
                cardData.forEach(data => this.addCard(data));
                localStorage.setItem('cards', JSON.stringify(cardData));
                this.showNotification('Import completed successfully!');
            } catch (error) {
                console.error('Error during import:', error);
                this.showNotification('Error during import', 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    showNotification(message, type = 'success', event = null) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Position near cursor if event is provided
        if (event) {
            const x = event.clientX;
            const y = event.clientY;
            
            // Adjust position to prevent notification from going off screen
            const notificationWidth = 200; // Approximate width
            const notificationHeight = 40; // Approximate height
            
            let posX = x + 10; // 10px to the right of cursor
            let posY = y + 10; // 10px below cursor
            
            // Adjust if too close to right edge
            if (posX + notificationWidth > window.innerWidth) {
                posX = x - notificationWidth - 10;
            }
            
            // Adjust if too close to bottom
            if (posY + notificationHeight > window.innerHeight) {
                posY = y - notificationHeight - 10;
            }
            
            notification.style.position = 'fixed';
            notification.style.left = `${posX}px`;
            notification.style.top = `${posY}px`;
        }
        
        this.notificationContainer.appendChild(notification);
        
        // Display with animation
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Remove after 2 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new CardManager();
});

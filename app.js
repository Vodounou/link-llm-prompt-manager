class CardManager {
    constructor() {
        console.log('Initialisation du gestionnaire de cartes...');
        
        // Système de gestion des placeholders avec descriptions
        this.placeholders = {
            'YYYY-MM-DD_HH-mm-SS': {
                description: 'Date et heure actuelles au format YYYY-MM-DD_HH-mm-SS',
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
                description: 'Contenu actuel du presse-papier',
                example: 'Texte copié...',
                getValue: async () => {
                    try {
                        return await navigator.clipboard.readText();
                    } catch (err) {
                        console.error('Erreur lors de la lecture du presse-papier:', err);
                        return '{clipboard}';
                    }
                }
            }
        };

        // Récupérer les éléments du DOM
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
        
        // Éléments de la modale des paramètres
        this.settingsButton = document.getElementById('settingsButton');
        this.settingsModal = document.getElementById('settingsModal');
        this.modalClose = this.settingsModal.querySelector('.modal-close');
        this.placeholdersList = document.getElementById('placeholdersList');

        // État des filtres
        this.activeTags = new Set();
        
        // Vérifier que marked est disponible
        if (typeof marked === 'undefined') {
            this.markdownAvailable = false;
            console.error('La bibliothèque marked n\'est pas chargée');
            this.showNotification('La bibliothèque marked n\'est pas chargée', 'error');
        } else {
            this.markdownAvailable = true;
            console.log('✓ Bibliothèque marked chargée avec succès');
            
            // Configurer marked avec la nouvelle API
            if (typeof marked.parse === 'function') {
                this.parseMarkdown = (text) => marked.parse(text);
            } else {
                this.parseMarkdown = (text) => marked(text);
            }
            
            // Options de sécurité
            marked.setOptions({
                sanitize: true,
                breaks: true
            });
        }

        this.cards = [];
        
        // Initialiser le thème
        this.initTheme();
        
        // Initialiser l'application
        this.init();
        console.log('✓ Gestionnaire de cartes initialisé');
    }

    initTheme() {
        console.log('Initialisation du thème...');
        // Vérifier si un thème est sauvegardé
        const savedTheme = localStorage.getItem('theme');
        
        // Vérifier les préférences système
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // Appliquer le thème sauvegardé ou les préférences système
        if (savedTheme) {
            console.log(`Thème sauvegardé trouvé : ${savedTheme}`);
            document.documentElement.setAttribute('data-theme', savedTheme);
        } else if (prefersDark) {
            console.log('Préférence système pour le thème sombre détectée');
            document.documentElement.setAttribute('data-theme', 'dark');
        }
        
        // Mettre à jour l'icône du bouton
        this.updateThemeIcon();
        console.log('✓ Thème initialisé');
    }

    updateThemeIcon() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        this.themeToggle.textContent = isDark ? '☀️' : '🌙';
    }

    toggleTheme() {
        console.log('Changement de thème...');
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        console.log(`Passage du thème ${currentTheme || 'light'} à ${newTheme}`);
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        this.updateThemeIcon();
        console.log('✓ Thème mis à jour');
    }

    init() {
        // Charger les données sauvegardées
        this.loadCards();
        
        // Ajouter les écouteurs d'événements
        this.addButton.addEventListener('click', () => this.addCard());
        this.exportButton.addEventListener('click', () => this.exportData());
        this.importButton.addEventListener('click', () => this.importInput.click());
        this.importInput.addEventListener('change', (e) => this.importData(e));
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // Configuration de la modale des paramètres
        this.setupSettingsModal();
        
        // Configurer la recherche
        this.setupSearch();
        
        console.log('✓ Gestionnaire de cartes initialisé');
    }

    setupSearch() {
        console.log('Configuration de la recherche...');
        
        // Fonction de debounce pour éviter trop d'appels pendant la frappe
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
        
        // Fonction de recherche
        const filterCards = (searchText = '') => {
            console.log('Filtrage des cartes...');
            console.log('Texte de recherche:', searchText);
            console.log('Tags actifs:', [...this.activeTags]);

            let visibleCount = 0;
            
            this.cards.forEach(card => {
                // Récupérer les tags de la carte
                const cardTags = card.querySelector('.card-tags').value
                    .split(',')
                    .map(tag => tag.trim())
                    .filter(tag => tag);
                
                console.log('Carte:', card.querySelector('.card-title').textContent);
                console.log('Tags de la carte:', cardTags);
                
                // Vérifier si la carte correspond aux critères de recherche
                const matchesSearch = searchText === '' || 
                    card.querySelector('.card-title').textContent.toLowerCase()
                        .includes(searchText.toLowerCase());
                
                // Vérifier si la carte a tous les tags actifs
                const hasAllActiveTags = this.activeTags.size === 0 || 
                    [...this.activeTags].every(tag => cardTags.includes(tag));
                
                console.log('Correspond à la recherche:', matchesSearch);
                console.log('A tous les tags actifs:', hasAllActiveTags);
                
                // Afficher ou masquer la carte
                if (matchesSearch && hasAllActiveTags) {
                    card.style.display = '';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });
            
            // Mettre à jour le compteur de résultats
            if (this.searchCount) {
                this.searchCount.textContent = visibleCount > 0 
                    ? `${visibleCount} résultat${visibleCount > 1 ? 's' : ''}`
                    : 'Aucun résultat';
            }
            
            console.log(`✓ Filtrage terminé : ${visibleCount} carte(s) visible(s)`);
        };

        // Mettre à jour le compteur de résultats
        this.updateSearchCount = (count) => {
            const total = this.cards.length;
            if (this.searchInput.value.trim() || this.activeTags.size > 0) {
                this.searchCount.textContent = `${count} sur ${total} cartes`;
            } else {
                this.searchCount.textContent = '';
            }
        };
        
        // Écouter les changements dans la barre de recherche
        this.searchInput.addEventListener('input', debounce((e) => {
            filterCards(e.target.value);
        }, 300));
        
        // Mettre à jour les tags quand une carte est modifiée
        const updateTagCloud = debounce(() => {
            console.log('Mise à jour du nuage de tags...');
            
            // Réinitialiser le conteneur de tags
            this.tagCloud.innerHTML = '';
            
            // Créer les conteneurs pour les deux lignes de tags
            const upperRow = document.createElement('div');
            upperRow.className = 'tag-row';
            
            const lowerRow = document.createElement('div');
            lowerRow.className = 'tag-row';
            
            // Compter les occurrences de chaque tag
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
            
            // Séparer les tags en deux groupes
            const upperTags = [];
            const lowerTags = [];
            
            tagCount.forEach((count, tag) => {
                if (tag && tag[0] === tag[0].toUpperCase()) {
                    upperTags.push([tag, count]);
                } else {
                    lowerTags.push([tag, count]);
                }
            });
            
            // Fonction pour créer un élément tag
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
            
            // Ajouter les tags dans l'ordre alphabétique
            upperTags.sort((a, b) => a[0].localeCompare(b[0]))
                .forEach(([tag, count]) => {
                    upperRow.appendChild(createTagElement(tag, count));
                });
            
            lowerTags.sort((a, b) => a[0].localeCompare(b[0]))
                .forEach(([tag, count]) => {
                    lowerRow.appendChild(createTagElement(tag, count));
                });
            
            // Ajouter les lignes seulement si elles contiennent des tags
            if (upperTags.length > 0) {
                this.tagCloud.appendChild(upperRow);
            }
            if (lowerTags.length > 0) {
                this.tagCloud.appendChild(lowerRow);
            }
            
            console.log('✓ Nuage de tags mis à jour');
        }, 300);
        
        // Observer les changements dans les tags
        const observer = new MutationObserver(() => {
            updateTagCloud();
        });
        
        observer.observe(this.container, { 
            childList: true,
            subtree: true,
            characterData: true
        });
        
        // Mettre à jour initialement
        updateTagCloud();
        
        console.log('✓ Recherche configurée');
    }

    setupSettingsModal() {
        console.log('Configuration de la modale des paramètres...');
        
        // Ouvrir la modale
        this.settingsButton.addEventListener('click', () => {
            console.log('Ouverture de la modale des paramètres');
            this.settingsModal.classList.add('active');
            this.updatePlaceholdersList();
        });
        
        // Fermer la modale
        this.modalClose.addEventListener('click', () => {
            console.log('Fermeture de la modale des paramètres');
            this.settingsModal.classList.remove('active');
        });
        
        // Fermer la modale en cliquant en dehors
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                console.log('Fermeture de la modale (clic en dehors)');
                this.settingsModal.classList.remove('active');
            }
        });
        
        console.log('✓ Modale des paramètres configurée');
    }

    updatePlaceholdersList() {
        console.log('Mise à jour de la liste des placeholders...');
        
        const placeholdersList = document.getElementById('placeholdersList');
        if (!placeholdersList) return;
        
        placeholdersList.innerHTML = `
            <div class="placeholder-item">
                <div class="placeholder-name">{YYYY-MM-DD_HH-mm-SS}</div>
                <div class="placeholder-description">Date et heure actuelles au format YYYY-MM-DD_HH-mm-SS</div>
                <div class="placeholder-example">Exemple : 2025-02-19_15-39-05</div>
            </div>
            <div class="placeholder-item">
                <div class="placeholder-name">{clipboard}</div>
                <div class="placeholder-description">Contenu actuel du presse-papier</div>
                <div class="placeholder-example">Exemple : Texte copié...</div>
            </div>
        `;
        
        console.log('✓ Liste des placeholders mise à jour');
    }

    loadCards() {
        try {
            const savedCards = localStorage.getItem('cards');
            if (savedCards) {
                const cardData = JSON.parse(savedCards);
                cardData.forEach(data => {
                    // Adapter les anciennes données au nouveau format
                    const adaptedData = {
                        title: data.title || '',
                        url: data.url || data.link || '', // Supporter les deux formats
                        copyText: data.copyText || data.copytext || '', // Supporter les deux formats
                        tags: Array.isArray(data.tags) ? data.tags : 
                              data.tags ? data.tags.split(',').map(tag => tag.trim()) : []
                    };
                    this.addCard(adaptedData);
                });
            }
        } catch (error) {
            console.error('Erreur lors du chargement des cartes:', error);
            this.showNotification('Erreur lors du chargement des cartes', 'error');
        }
    }

    addCard(data = null) {
        console.log('Ajout d\'une nouvelle carte...');
        
        // Cloner le template
        const card = this.template.content.cloneNode(true).querySelector('.card');
        this.container.appendChild(card);
        this.cards.push(card);
        
        if (data) {
            console.log('Initialisation avec les données:', data);
            const elements = {
                title: card.querySelector('.card-title'),
                titleEdit: card.querySelector('.card-title-edit'),
                urlTextArea: card.querySelector('.card-url'),
                copyTextArea: card.querySelector('.card-copytext'),
                tagsInput: card.querySelector('.card-tags')
            };

            // Initialiser les valeurs
            if (elements.title) elements.title.textContent = data.title || 'Nouveau titre';
            if (elements.titleEdit) elements.titleEdit.value = data.title || 'Nouveau titre';
            if (elements.urlTextArea) elements.urlTextArea.value = data.url || '';
            if (elements.copyTextArea) elements.copyTextArea.value = data.copyText || '';
            if (elements.tagsInput) elements.tagsInput.value = data.tags ? data.tags.join(', ') : '';
        }

        // Configurer les événements
        this.setupCardEvents(card);
        
        return card;
    }

    async copyCardText(card) {
        console.log('Copie du texte de la carte...');
        
        try {
            // Récupérer le texte à copier depuis le textarea
            const copyTextArea = card.querySelector('.card-copytext');
            const textToCopy = copyTextArea.value;
            console.log('Texte original à copier:', textToCopy);
            
            // Remplacer les placeholders
            const processedText = await this.replacePlaceholders(textToCopy);
            console.log('Texte après remplacement des placeholders:', processedText);
            
            // Copier le texte traité
            await navigator.clipboard.writeText(processedText);
            console.log('✓ Texte copié dans le presse-papier');
            
            // Afficher une notification de succès
            this.showNotification('Texte copié !', 'success');
            
            return true;
        } catch (err) {
            console.error('Erreur lors de la copie du texte:', err);
            this.showNotification('Erreur lors de la copie du texte', 'error');
            return false;
        }
    }

    openCardUrls(card) {
        console.log('Ouverture des URLs de la carte...');
        
        // Récupérer les URLs depuis le textarea
        const urlTextArea = card.querySelector('.card-url');
        const urls = urlTextArea.value.split('\n').filter(url => url.trim());
        
        if (urls.length > 0) {
            // Si plusieurs URLs, afficher une notification d'avertissement
            if (urls.length > 1) {
                this.showNotification(
                    'Plusieurs liens vont être ouverts. Si certains liens ne s\'ouvrent pas, veuillez vérifier que les popups ne sont pas bloqués par votre navigateur.',
                    'warning'
                );
            }
            
            urls.forEach((url, index) => {
                if (url.trim()) {
                    console.log('Ouverture de l\'URL:', url);
                    try {
                        const newWindow = window.open(url.trim(), '_blank');
                        if (newWindow === null) {
                            // Si window.open retourne null, c'est que le popup a été bloqué
                            this.showNotification(
                                'Le navigateur a bloqué l\'ouverture des liens. Veuillez autoriser les popups pour ce site dans les paramètres de votre navigateur.',
                                'error'
                            );
                            return false;
                        }
                    } catch (error) {
                        console.error('Erreur lors de l\'ouverture de l\'URL:', error);
                        this.showNotification(
                            'Une erreur est survenue lors de l\'ouverture des liens.',
                            'error'
                        );
                        return false;
                    }
                }
            });
            return true;
        } else {
            console.log('Aucune URL à ouvrir');
            return false;
        }
    }

    setupCardEvents(card) {
        console.log('Configuration des événements de la carte...');
        
        // Récupérer les éléments de la carte
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

        // Fonction pour mettre à jour les icônes d'action
        const updateActionIcons = () => {
            const hasUrls = elements.urlTextArea.value.trim() !== '';
            const hasText = elements.copyTextArea.value.trim() !== '';
            
            elements.actionsIcons.innerHTML = '';
            const icons = [];
            if (hasUrls) icons.push('🔗');
            if (hasText) icons.push('📋');
            elements.actionsIcons.textContent = icons.join(' ');
        };

        // Mettre à jour les icônes initialement
        updateActionIcons();

        // Mettre à jour les icônes quand le contenu change
        elements.urlTextArea.addEventListener('input', updateActionIcons);
        elements.copyTextArea.addEventListener('input', updateActionIcons);

        // Gestion du clic sur le titre
        elements.title.addEventListener('click', async () => {
            const copySuccess = await this.copyCardText(card);
            const urls = elements.urlTextArea.value.split('\n').filter(url => url.trim());
            if (urls.length > 0) {
                this.openCardUrls(card);
            }
        });

        // Gestion de l'expansion
        elements.expandBtn.addEventListener('click', () => {
            card.classList.toggle('expanded');
            elements.expandBtn.style.transform = card.classList.contains('expanded') ? 'rotate(180deg)' : '';
        });

        // Gestion de la sauvegarde
        elements.saveBtn.addEventListener('click', () => {
            elements.title.textContent = elements.titleEdit.value;
            updateActionIcons();
            this.saveAndExport();
            card.classList.remove('expanded');
            elements.expandBtn.style.transform = '';
        });

        // Gestion de la suppression
        elements.deleteBtn.addEventListener('click', () => {
            if (confirm('Êtes-vous sûr de vouloir supprimer cette carte ?')) {
                card.remove();
                this.cards = this.cards.filter(c => c !== card);
                this.saveAndExport();
            }
        });

        // Synchronisation du titre
        elements.titleEdit.addEventListener('input', () => {
            elements.title.textContent = elements.titleEdit.value;
        });

        console.log('✓ Événements de la carte configurés');
    }

    createCard(title, link, copyText, tags = []) {
        console.log('Création d\'une nouvelle carte...');
        
        const card = this.template.content.cloneNode(true);
        const cardElement = card.querySelector('.card');
        
        // Remplir les champs
        cardElement.querySelector('.card-title-edit').value = title;
        cardElement.querySelector('.card-url').value = link;
        cardElement.querySelector('.card-copytext').value = copyText;
        cardElement.querySelector('.card-tags').value = tags.join(', ');
        
        // Configurer les événements
        this.setupCardEvents(cardElement);
        
        console.log('✓ Carte créée avec succès');
        return card;
    }

    // Fonction pour remplacer les placeholders dans un texte
    async replacePlaceholders(text) {
        console.log('Remplacement des placeholders dans le texte...');
        let result = text;
        
        for (const [key, info] of Object.entries(this.placeholders)) {
            const placeholder = `{${key}}`;
            if (result.includes(placeholder)) {
                try {
                    console.log(`Traitement du placeholder : ${placeholder}`);
                    const value = await info.getValue();
                    result = result.replaceAll(placeholder, value);
                    console.log(`✓ Placeholder ${placeholder} remplacé avec succès`);
                } catch (err) {
                    console.error(`Erreur lors du remplacement du placeholder ${key}:`, err);
                }
            }
        }
        
        return result;
    }

    saveAndExport() {
        console.log('Sauvegarde des cartes...');
        
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
        console.log('✓ Cartes sauvegardées');
        
        // Télécharger le fichier JSON
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
                this.showNotification('Import effectué avec succès !');
            } catch (error) {
                console.error('Erreur lors de l\'import:', error);
                this.showNotification('Erreur lors de l\'import', 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    showNotification(message, type = 'success', event = null) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Positionner près du curseur si l'événement est fourni
        if (event) {
            const x = event.clientX;
            const y = event.clientY;
            
            // Ajuster la position pour éviter que la notification ne sorte de l'écran
            const notificationWidth = 200; // Largeur approximative
            const notificationHeight = 40; // Hauteur approximative
            
            let posX = x + 10; // 10px à droite du curseur
            let posY = y + 10; // 10px en dessous du curseur
            
            // Ajuster si trop près du bord droit
            if (posX + notificationWidth > window.innerWidth) {
                posX = x - notificationWidth - 10;
            }
            
            // Ajuster si trop près du bas
            if (posY + notificationHeight > window.innerHeight) {
                posY = y - notificationHeight - 10;
            }
            
            notification.style.position = 'fixed';
            notification.style.left = `${posX}px`;
            notification.style.top = `${posY}px`;
        }
        
        this.notificationContainer.appendChild(notification);
        
        // Afficher avec animation
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Supprimer après 2 secondes
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }
}

// Initialiser l'application
document.addEventListener('DOMContentLoaded', () => {
    new CardManager();
});

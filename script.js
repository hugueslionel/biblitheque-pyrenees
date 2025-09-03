// Import correct des APIs Tauri v1.5
import { invoke } from '@tauri-apps/api/tauri';
import { save, open } from '@tauri-apps/api/dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/api/fs';

// Structure pour stocker les données de la bibliothèque
let bookLibrary = [];
let nextId = 1;
let currentLibraryName = '';

// CORRECTION FOCUS: Fonction pour corriger le problème de focus après suppression
function fixFocusIssue() {
    const body = document.body;
    const table = document.getElementById('bookTable');
    
    // Forcer le repaint avec plusieurs techniques
    body.style.display = 'none';
    body.offsetHeight;
    body.style.display = 'block';
    
    table.style.transform = 'translateZ(0)';
    table.offsetHeight;
    table.style.transform = '';
    
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 10);
    
    setTimeout(() => {
        const editables = document.querySelectorAll('.editable');
        editables.forEach((element, index) => {
            const content = element.textContent;
            const parent = element.parentNode;
            
            const newElement = document.createElement('div');
            newElement.className = 'editable';
            newElement.contentEditable = true;
            newElement.textContent = content;
            
            if (element.parentNode.cellIndex === 1) {
                newElement.addEventListener('blur', async function() {
                    const rowIndex = Array.from(element.closest('tbody').children).indexOf(element.closest('tr'));
                    bookLibrary[rowIndex].author = this.textContent;
                    await saveCurrentLibrary();
                });
            } else if (element.parentNode.cellIndex === 2) {
                newElement.addEventListener('blur', async function() {
                    const rowIndex = Array.from(element.closest('tbody').children).indexOf(element.closest('tr'));
                    bookLibrary[rowIndex].title = this.textContent;
                    await saveCurrentLibrary();
                });
            } else if (element.parentNode.cellIndex === 3) {
                newElement.addEventListener('blur', async function() {
                    const rowIndex = Array.from(element.closest('tbody').children).indexOf(element.closest('tr'));
                    bookLibrary[rowIndex].description = this.textContent;
                    await saveCurrentLibrary();
                });
            } else if (element.parentNode.cellIndex === 4) {
                newElement.addEventListener('blur', async function() {
                    const rowIndex = Array.from(element.closest('tbody').children).indexOf(element.closest('tr'));
                    bookLibrary[rowIndex].comments = this.textContent;
                    await saveCurrentLibrary();
                });
            }
            
            parent.replaceChild(newElement, element);
        });
    }, 100);
    
    setTimeout(() => {
        const tempInput = document.createElement('input');
        tempInput.style.position = 'absolute';
        tempInput.style.left = '-9999px';
        document.body.appendChild(tempInput);
        tempInput.focus();
        tempInput.blur();
        document.body.removeChild(tempInput);
    }, 150);
}

// Fonction pour mettre à jour l'état de l'interface selon la bibliothèque sélectionnée
function updateInterfaceState() {
    const hasLibrary = currentLibraryName !== '';
    const mainControls = document.getElementById('mainControls');
    const searchInput = document.getElementById('searchInput');
    const renameBtn = document.getElementById('renameLibraryBtn');
    const deleteBtn = document.getElementById('deleteLibraryBtn');
    
    if (hasLibrary) {
        mainControls.classList.remove('controls-disabled');
        searchInput.disabled = false;
        renameBtn.disabled = false;
        deleteBtn.disabled = false;
    } else {
        mainControls.classList.add('controls-disabled');
        searchInput.disabled = true;
        renameBtn.disabled = true;
        deleteBtn.disabled = true;
    }
}

// Charger les données au démarrage
document.addEventListener('DOMContentLoaded', function() {
   initializeApp();
});

// Initialiser l'application
async function initializeApp() {
    console.log('Initialisation de l\'application...');
    try {
        await loadLibrariesList();
        setupLibraryControls();
        updateInterfaceState();
        renderTable();
        console.log('Application initialisée avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        showStatusMessage('Erreur lors de l\'initialisation', true);
    }
}

// Charger la liste des bibliothèques
async function loadLibrariesList() {
    try {
        console.log('Chargement de la liste des bibliothèques...');
        const libraries = await invoke('get_libraries_list');
        console.log('Bibliothèques trouvées:', libraries);
        
        const select = document.getElementById('librarySelect');
        select.innerHTML = '<option value="">-- Choisir une bibliothèque --</option>';
        
        libraries.forEach(library => {
            const option = document.createElement('option');
            option.value = library;
            option.textContent = library;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erreur lors du chargement des bibliothèques:', error);
        showStatusMessage('Erreur lors du chargement des bibliothèques', true);
    }
}

// Sauvegarder la bibliothèque actuelle
async function saveCurrentLibrary() {
    if (currentLibraryName) {
        try {
            console.log('Sauvegarde de la bibliothèque:', currentLibraryName);
            await invoke('save_library', { libraryName: currentLibraryName, data: bookLibrary });
            console.log('Bibliothèque sauvegardée avec succès');
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            showStatusMessage('Erreur lors de la sauvegarde', true);
        }
    }
}

// Charger une bibliothèque
async function loadLibrary(libraryName) {
    try {
        console.log('Chargement de la bibliothèque:', libraryName);
        const data = await invoke('load_library', { libraryName });
        
        if (data) {
            bookLibrary = data;
            currentLibraryName = libraryName;
            document.getElementById('currentLibraryName').textContent = libraryName;
            document.getElementById('librarySelect').value = libraryName;
            
            // Recalculer nextId
            if (bookLibrary.length > 0) {
                nextId = Math.max(...bookLibrary.map(book => book.id)) + 1;
            } else {
                nextId = 1;
            }
            
            updateInterfaceState();
            renderTable();
            showStatusMessage(`Bibliothèque "${libraryName}" chargée`);
            console.log('Bibliothèque chargée avec succès, nombre d\'entrées:', bookLibrary.length);
        }
    } catch (error) {
        console.error('Erreur lors du chargement:', error);
        showStatusMessage('Erreur lors du chargement de la bibliothèque', true);
    }
}

// Fonction pour réinitialiser l'interface (pas de bibliothèque sélectionnée)
function resetInterface() {
    bookLibrary = [];
    nextId = 1;
    currentLibraryName = '';
    document.getElementById('currentLibraryName').textContent = 'Aucune';
    document.getElementById('librarySelect').value = '';
    updateInterfaceState();
    renderTable();
}

// Configurer les contrôles des bibliothèques
async function setupLibraryControls() {
    console.log('Configuration des contrôles...');
    
    // Sélection d'une bibliothèque
    document.getElementById('librarySelect').addEventListener('change', function() {
        console.log('Changement de bibliothèque:', this.value);
        if (this.value) {
            loadLibrary(this.value);
        } else {
            resetInterface();
        }
    });

    // Nouvelle bibliothèque
    document.getElementById('newLibraryBtn').addEventListener('click', async function() {
        console.log('Création d\'une nouvelle bibliothèque');
        const name = await showDialog('Nom de la nouvelle bibliothèque :');
        if (name) {
            bookLibrary = [];
            nextId = 1;
            currentLibraryName = name;
            
            await saveCurrentLibrary();
            await loadLibrariesList();
            
            document.getElementById('currentLibraryName').textContent = name;
            document.getElementById('librarySelect').value = name;
            updateInterfaceState();
            renderTable();
            showStatusMessage(`Bibliothèque "${name}" créée`);
        }
    });

    // Renommer bibliothèque
    document.getElementById('renameLibraryBtn').addEventListener('click', async function() {
        if (!currentLibraryName) {
            showStatusMessage('Aucune bibliothèque sélectionnée', true);
            return;
        }
        
        const newName = await showDialog('Nouveau nom :', currentLibraryName);
        if (newName && newName !== currentLibraryName) {
            try {
                await invoke('delete_library', { libraryName: currentLibraryName });
                currentLibraryName = newName;
                await saveCurrentLibrary();
                await loadLibrariesList();
                
                document.getElementById('currentLibraryName').textContent = newName;
                document.getElementById('librarySelect').value = newName;
                showStatusMessage(`Bibliothèque renommée en "${newName}"`);
            } catch (error) {
                console.error('Erreur lors du renommage:', error);
                showStatusMessage('Erreur lors du renommage', true);
            }
        }
    });

    // Supprimer bibliothèque
    document.getElementById('deleteLibraryBtn').addEventListener('click', async function() {
        if (!currentLibraryName) {
            showStatusMessage('Aucune bibliothèque sélectionnée', true);
            return;
        }
        
        if (confirm(`Êtes-vous sûr de vouloir supprimer la bibliothèque "${currentLibraryName}" ?`)) {
            try {
                await invoke('delete_library', { libraryName: currentLibraryName });
                await loadLibrariesList();
                
                resetInterface();
                showStatusMessage('Bibliothèque supprimée');
                
                setTimeout(() => {
                    fixFocusIssue();
                }, 200);
            } catch (error) {
                console.error('Erreur lors de la suppression:', error);
                showStatusMessage('Erreur lors de la suppression', true);
            }
        }
    });

    // Ajouter une nouvelle entrée
    document.getElementById('addEntryBtn').addEventListener('click', async function() {
        console.log('Ajout d\'une nouvelle entrée');
        if (!currentLibraryName) {
            showStatusMessage('Aucune bibliothèque sélectionnée', true);
            return;
        }

        bookLibrary.unshift({
            id: nextId++,
            author: '',
            title: '',
            description: '',
            comments: '',
            image: ''
        });
        
        await reindexEntries();
        renderTable();
        showStatusMessage('Nouvelle entrée ajoutée');
    });

    // Exporter les données
    document.getElementById('exportBtn').addEventListener('click', async function() {
        console.log('Export des données');
        if (!currentLibraryName) {
            showStatusMessage('Aucune bibliothèque sélectionnée', true);
            return;
        }

        try {
            const filePath = await save({
                defaultPath: `${currentLibraryName}_${new Date().toISOString().split('T')[0]}.json`,
                filters: [{
                    name: 'JSON',
                    extensions: ['json']
                }]
            });

            if (filePath) {
                const dataStr = JSON.stringify(bookLibrary, null, 2);
                await writeTextFile(filePath, dataStr);
                showStatusMessage(`Bibliothèque "${currentLibraryName}" exportée`);
            }
        } catch (error) {
            console.error('Erreur lors de l\'exportation:', error);
            showStatusMessage('Erreur lors de l\'exportation', true);
        }
    });

    // Importer les données
    document.getElementById('importBtn').addEventListener('click', async function() {
        console.log('Import des données');
        if (!currentLibraryName) {
            showStatusMessage('Aucune bibliothèque sélectionnée', true);
            return;
        }

        try {
            const selected = await open({
                multiple: false,
                filters: [{
                    name: 'JSON',
                    extensions: ['json']
                }]
            });

            if (selected) {
                const fileContent = await readTextFile(selected);
                const importedData = JSON.parse(fileContent);
                
                if (Array.isArray(importedData)) {
                    if (confirm(`Cette action remplacera la bibliothèque "${currentLibraryName}". Continuer ?`)) {
                        bookLibrary = importedData;
                        await reindexEntries();
                        renderTable();
                        showStatusMessage('Données importées avec succès');
                    }
                } else {
                    showStatusMessage('Format de fichier invalide', true);
                }
            }
        } catch (error) {
            console.error('Erreur lors de l\'importation:', error);
            showStatusMessage('Erreur lors de l\'importation', true);
        }
    });

    console.log('Contrôles configurés');
}

// Fonction pour réindexer les entrées de manière séquentielle
async function reindexEntries() {
    for (let i = 0; i < bookLibrary.length; i++) {
        bookLibrary[i].id = i + 1;
    }
    nextId = bookLibrary.length + 1;
    await saveCurrentLibrary();
}

// Fonction pour afficher un dialogue de saisie personnalisé
function showDialog(title, defaultValue = '') {
    return new Promise((resolve) => {
        const modal = document.getElementById('dialogModal');
        const titleElement = document.getElementById('dialogTitle');
        const input = document.getElementById('dialogInput');
        const okBtn = document.getElementById('dialogOk');
        const cancelBtn = document.getElementById('dialogCancel');
        
        titleElement.textContent = title;
        input.value = defaultValue;
        modal.style.display = 'block';
        
        setTimeout(() => {
            input.focus();
            input.select();
        }, 100);
        
        function cleanup() {
            modal.style.display = 'none';
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            input.removeEventListener('keydown', handleKeydown);
        }
        
        function handleOk() {
            const value = input.value.trim();
            cleanup();
            resolve(value || null);
        }
        
        function handleCancel() {
            cleanup();
            resolve(null);
        }
        
        function handleKeydown(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleOk();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
            }
        }
        
        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);
        input.addEventListener('keydown', handleKeydown);
    });
}

// Fonction pour afficher un message de statut
function showStatusMessage(message, isError = false) {
    const statusElement = document.getElementById('statusMessage');
    statusElement.textContent = message;
    statusElement.style.color = isError ? '#e74c3c' : '#27ae60';
    
    setTimeout(() => {
        statusElement.textContent = '';
    }, 3000);
}

// Fonction pour rendre le tableau avec les données actuelles
async function renderTable() {
    const tableBody = document.getElementById('bookTableBody');
    tableBody.innerHTML = '';
    
    if (!currentLibraryName) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 7;
        cell.textContent = 'Aucune bibliothèque sélectionnée. Choisissez ou créez une bibliothèque.';
        cell.style.textAlign = 'center';
        cell.style.fontStyle = 'italic';
        cell.style.color = '#7f8c8d';
        cell.style.padding = '30px';
        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
    }
    
    bookLibrary.forEach((book, index) => {
        const row = document.createElement('tr');
        
        // N° d'entrée (non éditable)
        const idCell = document.createElement('td');
        idCell.textContent = book.id;
        row.appendChild(idCell);
        
        // Auteur (éditable)
        const authorCell = document.createElement('td');
        const authorDiv = document.createElement('div');
        authorDiv.className = 'editable';
        authorDiv.contentEditable = true;
        authorDiv.textContent = book.author;
        authorDiv.addEventListener('blur', async function() {
            book.author = this.textContent;
            await saveCurrentLibrary();
        });
        authorDiv.addEventListener('focus', function() {
            this.contentEditable = true;
        });
        authorCell.appendChild(authorDiv);
        row.appendChild(authorCell);
        
        // Titre (éditable)
        const titleCell = document.createElement('td');
        const titleDiv = document.createElement('div');
        titleDiv.className = 'editable';
        titleDiv.contentEditable = true;
        titleDiv.textContent = book.title;
        titleDiv.addEventListener('blur', async function() {
            book.title = this.textContent;
            await saveCurrentLibrary();
        });
        titleDiv.addEventListener('focus', function() {
            this.contentEditable = true;
        });
        titleCell.appendChild(titleDiv);
        row.appendChild(titleCell);
        
        // Description (éditable)
        const descCell = document.createElement('td');
        const descDiv = document.createElement('div');
        descDiv.className = 'editable';
        descDiv.contentEditable = true;
        descDiv.textContent = book.description;
        descDiv.addEventListener('blur', async function() {
            book.description = this.textContent;
            await saveCurrentLibrary();
        });
        descDiv.addEventListener('focus', function() {
            this.contentEditable = true;
        });
        descCell.appendChild(descDiv);
        row.appendChild(descCell);
        
        // Commentaires (éditable)
        const commentsCell = document.createElement('td');
        const commentsDiv = document.createElement('div');
        commentsDiv.className = 'editable';
        commentsDiv.contentEditable = true;
        commentsDiv.textContent = book.comments;
        commentsDiv.addEventListener('blur', async function() {
            book.comments = this.textContent;
            await saveCurrentLibrary();
        });
        commentsDiv.addEventListener('focus', function() {
            this.contentEditable = true;
        });
        commentsCell.appendChild(commentsDiv);
        row.appendChild(commentsCell);
        
        // Photo
        const photoCell = document.createElement('td');
        
        if (book.image) {
            const thumbnail = document.createElement('img');
            thumbnail.src = book.image;
            thumbnail.className = 'thumbnail';
            thumbnail.addEventListener('click', function() {
                document.getElementById('expandedImg').src = this.src;
                document.getElementById('imageModal').style.display = 'block';
            });
            photoCell.appendChild(thumbnail);
        } else {
            const fileLabel = document.createElement('label');
            fileLabel.className = 'file-label';
            fileLabel.textContent = 'Choisir image';
            
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.className = 'file-input';
            fileInput.addEventListener('change', function(e) {
                if (e.target.files && e.target.files[0]) {
                    const reader = new FileReader();
                    reader.onload = async function(event) {
                        book.image = event.target.result;
                        await saveCurrentLibrary();
                        renderTable();
                        showStatusMessage('Image ajoutée avec succès');
                    };
                    reader.readAsDataURL(e.target.files[0]);
                }
            });
            
            document.body.appendChild(fileInput);
            
            fileLabel.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                fileInput.click();
            });
            
            photoCell.appendChild(fileLabel);
        }
        row.appendChild(photoCell);
        
        // Supprimer (bouton ×)
        const actionsCell = document.createElement('td');
        actionsCell.className = 'supprimer-column';
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '×';
        deleteBtn.title = 'Supprimer cette entrée';
        deleteBtn.addEventListener('click', async function(e) {
            e.stopPropagation();
            if (confirm(`Êtes-vous sûr de vouloir supprimer l'entrée n°${book.id} ?`)) {
                bookLibrary.splice(index, 1);
                await reindexEntries();
                renderTable();
                showStatusMessage('Entrée supprimée');
                
                setTimeout(() => {
                    fixFocusIssue();
                }, 50);
            }
        });
        actionsCell.appendChild(deleteBtn);
        row.appendChild(actionsCell);
        
        tableBody.appendChild(row);
    });
    
    setTimeout(() => {
        const table = document.getElementById('bookTable');
        const originalDisplay = table.style.display;
        table.style.display = 'none';
        table.offsetHeight;
        table.style.display = originalDisplay || 'table';
        
        const editables = document.querySelectorAll('.editable');
        editables.forEach(element => {
            element.setAttribute('contenteditable', 'false');
            element.setAttribute('contenteditable', 'true');
            
            element.addEventListener('mousedown', function() {
                setTimeout(() => {
                    if (this.contentEditable !== 'true') {
                        this.contentEditable = 'true';
                    }
                }, 1);
            });
        });
        
        window.dispatchEvent(new Event('resize'));
    }, 100);
}

// Recherche
document.getElementById('searchInput').addEventListener('input', function() {
    if (!currentLibraryName) return;
    
    const searchValue = this.value.toLowerCase();
    const rows = document.getElementById('bookTableBody').getElementsByTagName('tr');
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.getElementsByTagName('td');
        let found = false;
        
        for (let j = 1; j < cells.length - 1; j++) {
            const cellText = cells[j].textContent.toLowerCase();
            if (cellText.includes(searchValue)) {
                found = true;
                break;
            }
        }
        
        row.style.display = found ? '' : 'none';
    }
});

// Fermer la modale d'image
document.querySelector('.close').addEventListener('click', function() {
    document.getElementById('imageModal').style.display = 'none';
});

// Fermer la modale si on clique en dehors de l'image
window.addEventListener('click', function(event) {
    const imageModal = document.getElementById('imageModal');
    const dialogModal = document.getElementById('dialogModal');
    
    if (event.target === imageModal) {
        imageModal.style.display = 'none';
    }
    
    if (event.target === dialogModal) {
        dialogModal.style.display = 'none';
    }
});

// --- Global Data Storage (for simplicity, using arrays in JS) ---
// In a real application, you'd fetch/store this data from a backend (database/API)
let maisons = [];
let locataires = [];
let paiements = [];
let avisPaiement = [];

// --- Utility Functions (Keep these as they are likely already in your file) ---
function updateDateTime() {
    const now = new Date();
    document.getElementById('currentDate').textContent = now.toLocaleDateString('fr-FR');
    document.getElementById('currentTime').textContent = now.toLocaleTimeString('fr-FR');
}

function showSection(sectionId) {
    document.querySelectorAll('.main-content section').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById(sectionId).classList.remove('hidden');
}

// Function to update the responsible name in hidden fields
function updateResponsibleName() {
    const responsableName = document.getElementById('responsableInput').value;
    document.getElementById('nm_responsable').value = responsableName;
    document.getElementById('nl_responsable').value = responsableName;
    document.getElementById('paie_responsable').value = responsableName;
    document.getElementById('avis_responsable').value = responsableName;
}

// --- INITIAL LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    updateDateTime();
    setInterval(updateDateTime, 1000); // Update time every second

    // Show dashboard by default
    showSection('dashboard');

    // Navigation logic
    document.querySelectorAll('.sidebar nav ul li a').forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const sectionId = this.dataset.section;
            showSection(sectionId);
            updateResponsibleName(); // Update responsible name when navigating
            // Specific updates when sections are shown
            if (sectionId === 'maisonsLibres') {
                displayMaisonsLibres();
            } else if (sectionId === 'nouvelLocataire') {
                populateMaisonSelectForLocataire();
            } else if (sectionId === 'paiements') {
                populateMaisonSelectForPaiement();
            } else if (sectionId === 'maisonsImpayees') {
                displayMaisonsImpayees();
            } else if (sectionId === 'avisPaiement') {
                // Clear and disable elements on section entry
                document.getElementById('avis_dateSelection').value = '';
                document.getElementById('avis_codeMaison').innerHTML = '<option value="">-- Sélectionnez une maison impayée --</option>';
                document.getElementById('avis_codeMaison').disabled = true;
                document.getElementById('avis_moisAutomatique').value = '';
                document.getElementById('btnGenererAvis').disabled = true;
                document.getElementById('btnEnregistrerImpaye').disabled = true;
                document.getElementById('avisDePaiementContent').classList.add('hidden');
                document.getElementById('btnPrintAvis').classList.add('hidden');
                displayAvisPaiementHistory(); // Display existing avis history
            } else if (sectionId === 'finContrat') {
                displayFinContrat();
            }
        });
    });

    // Populate initial tables if data exists in localStorage
    loadDataFromLocalStorage();
    displayMaisons();
    displayLocataires();
    displayPaiements();
    displayMaisonsLibres(); // Ensure this is called to update dashboard count initially
    displayMaisonsImpayees(); // Initial display for dashboard count
    updateDashboardCounts();
});

// Function to save data to localStorage
function saveDataToLocalStorage() {
    localStorage.setItem('maisons', JSON.stringify(maisons));
    localStorage.setItem('locataires', JSON.stringify(locataires));
    localStorage.setItem('paiements', JSON.stringify(paiements));
    localStorage.setItem('avisPaiement', JSON.stringify(avisPaiement));
}

// Function to load data from localStorage
function loadDataFromLocalStorage() {
    const storedMaisons = localStorage.getItem('maisons');
    const storedLocataires = localStorage.getItem('locataires');
    const storedPaiements = localStorage.getItem('paiements');
    const storedAvisPaiement = localStorage.getItem('avisPaiement');

    if (storedMaisons) {
        maisons = JSON.parse(storedMaisons);
    }
    if (storedLocataires) {
        locataires = JSON.parse(storedLocataires);
    }
    if (storedPaiements) {
        paiements = JSON.parse(storedPaiements);
    }
    if (storedAvisPaiement) {
        avisPaiement = JSON.parse(storedAvisPaiement);
    }
}

// --- DASHBOARD FUNCTIONS ---
function updateDashboardCounts() {
    document.getElementById('totalMaisons').textContent = maisons.length;
    const maisonsOccupeesCount = maisons.filter(m => m.disponibilite === 'Occupé').length;
    document.getElementById('maisonsOccupees').textContent = maisonsOccupeesCount;
    const maisonsLibresCount = maisons.filter(m => m.disponibilite === 'Libre').length;
    document.getElementById('maisonsLibresCount').textContent = maisonsLibresCount;

    const loyerAttenduTotal = maisons.reduce((sum, maison) => sum + parseFloat(maison.prixLouer), 0);
    document.getElementById('loyerAttenduTotal').textContent = `${loyerAttenduTotal.toFixed(2)} €`;

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const paiementsMois = paiements.filter(p => p.moisPaye === currentMonth)
                                   .reduce((sum, p) => sum + parseFloat(p.montant), 0);
    document.getElementById('paiementsMois').textContent = `${paiementsMois.toFixed(2)} €`;

    // Update impayées count for dashboard
    const occupiedHouses = maisons.filter(m => m.disponibilite === 'Occupé');
    const currentUnpaidHouses = [];

    occupiedHouses.forEach(maison => {
        const hasPaidForCurrentMonth = paiements.some(p =>
            p.codeMaison === maison.codeMaison && p.moisPaye === currentMonth
        );
        if (!hasPaidForCurrentMonth) {
            currentUnpaidHouses.push(maison);
        }
    });
    document.getElementById('maisonsImpayeesCount').textContent = currentUnpaidHouses.length;

    // Update charts (you'd need to define these functions if not already present)
    // updatePaiementsMensuelsChart();
    // updateDisponibiliteMaisonsChart();
    // updateMaisonsParQuartierChart();
}


// --- NOUVELLE MAISON SECTION ---
document.getElementById('formNouvelleMaison').addEventListener('submit', function(event) {
    event.preventDefault();
    const isUpdate = this.dataset.editingId; // Check if we are in editing mode

    const nouvelleMaison = {
        idRapport: isUpdate ? this.dataset.editingId : Date.now(), // Use existing ID or generate new
        codeMaison: document.getElementById('nm_codeMaison').value,
        prixLouer: parseFloat(document.getElementById('nm_prixLouer').value),
        quartier: document.getElementById('nm_quartier').value,
        adresse: document.getElementById('nm_adresse').value,
        nombrePieces: parseInt(document.getElementById('nm_nombrePieces').value),
        date: document.getElementById('nm_date').value,
        description: document.getElementById('nm_description').value,
        disponibilite: document.getElementById('nm_disponibilite').value,
        responsable: document.getElementById('nm_responsable').value
    };

    if (isUpdate) {
        // Update existing maison
        maisons = maisons.map(m => m.idRapport == nouvelleMaison.idRapport ? nouvelleMaison : m);
        alert('Maison mise à jour avec succès !');
        this.dataset.editingId = ''; // Clear editing state
        document.querySelector('#formNouvelleMaison button[type="submit"]').textContent = 'Enregistrer Maison'; // Reset button text
    } else {
        // Add new maison
        maisons.push(nouvelleMaison);
        alert('Maison enregistrée avec succès !');
    }

    saveDataToLocalStorage();
    displayMaisons();
    updateDashboardCounts();
    this.reset(); // Clear the form
});

function displayMaisons() {
    const tableBody = document.getElementById('tableNouvelleMaisonBody');
    tableBody.innerHTML = '';
    maisons.forEach(maison => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = maison.idRapport;
        row.insertCell().textContent = maison.codeMaison;
        row.insertCell().textContent = maison.prixLouer.toFixed(2) + ' €';
        row.insertCell().textContent = maison.quartier;
        row.insertCell().textContent = maison.adresse;
        row.insertCell().textContent = maison.nombrePieces;
        row.insertCell().textContent = maison.date;
        row.insertCell().textContent = maison.description;
        row.insertCell().textContent = maison.disponibilite;
        row.insertCell().textContent = maison.responsable;

        const actionsCell = row.insertCell();
        const editButton = document.createElement('button');
        editButton.textContent = 'Modifier';
        editButton.classList.add('btn-edit');
        editButton.addEventListener('click', () => editMaison(maison.idRapport));
        actionsCell.appendChild(editButton);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Supprimer';
        deleteButton.classList.add('btn-delete');
        deleteButton.addEventListener('click', () => deleteMaison(maison.idRapport));
        actionsCell.appendChild(deleteButton);
    });
}

function editMaison(idRapport) {
    const maisonToEdit = maisons.find(m => m.idRapport === idRapport);
    if (maisonToEdit) {
        // Show the Nouvelle Maison form section
        showSection('nouvelleMaison');

        // Populate the form fields
        document.getElementById('nm_codeMaison').value = maisonToEdit.codeMaison;
        document.getElementById('nm_prixLouer').value = maisonToEdit.prixLouer;
        document.getElementById('nm_quartier').value = maisonToEdit.quartier;
        document.getElementById('nm_adresse').value = maisonToEdit.adresse;
        document.getElementById('nm_nombrePieces').value = maisonToEdit.nombrePieces;
        document.getElementById('nm_date').value = maisonToEdit.date;
        document.getElementById('nm_description').value = maisonToEdit.description;
        document.getElementById('nm_disponibilite').value = maisonToEdit.disponibilite;
        document.getElementById('nm_responsable').value = maisonToEdit.responsable;

        // Set a data attribute on the form to indicate we are in editing mode
        const form = document.getElementById('formNouvelleMaison');
        form.dataset.editingId = idRapport;

        // Change the submit button text to "Mettre à jour Maison"
        document.querySelector('#formNouvelleMaison button[type="submit"]').textContent = 'Mettre à jour Maison';
    }
}

function deleteMaison(idRapport) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette maison ?')) {
        maisons = maisons.filter(m => m.idRapport !== idRapport);
        saveDataToLocalStorage();
        displayMaisons();
        updateDashboardCounts();
        alert('Maison supprimée avec succès.');
    }
}

document.getElementById('btnPrintNouvelleMaisonTable').addEventListener('click', () => {
    printTable('tableNouvelleMaison-container', 'Liste des Maisons Enregistrées');
});

// --- MAISONS LIBRES SECTION ---
function displayMaisonsLibres() {
    const tableBody = document.getElementById('tableMaisonsLibresBody');
    tableBody.innerHTML = '';
    const maisonsLibres = maisons.filter(maison => maison.disponibilite === 'Libre');

    maisonsLibres.forEach(maison => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = maison.idRapport;
        row.insertCell().textContent = maison.codeMaison;
        row.insertCell().textContent = maison.prixLouer.toFixed(2) + ' €';
        row.insertCell().textContent = maison.quartier;
        row.insertCell().textContent = maison.nombrePieces;
        row.insertCell().textContent = maison.date;
        row.insertCell().textContent = maison.responsable;

        const actionsCell = row.insertCell();
        const occupyButton = document.createElement('button');
        occupyButton.textContent = 'Occuper';
        occupyButton.classList.add('btn-occupy');
        occupyButton.addEventListener('click', () => occupyMaison(maison.idRapport));
        actionsCell.appendChild(occupyButton);
    });
}

function occupyMaison(idRapport) {
    const maisonIndex = maisons.findIndex(m => m.idRapport === idRapport);
    if (maisonIndex !== -1) {
        maisons[maisonIndex].disponibilite = 'Occupé';
        saveDataToLocalStorage();
        alert(`Maison ${maisons[maisonIndex].codeMaison} marquée comme occupée.`);
        displayMaisonsLibres(); // Refresh the list
        displayMaisons(); // Refresh the main houses list
        updateDashboardCounts(); // Update dashboard
    }
}

document.getElementById('btnPrintMaisonsLibres').addEventListener('click', () => {
    printTable('maisons-libres-table', 'Liste des Maisons Libres');
});

document.getElementById('btnRechercheLibreMaison').addEventListener('click', () => {
    const searchTerm = document.getElementById('searchLibreMaison').value.toLowerCase();
    const filteredMaisonsLibres = maisons.filter(maison =>
        maison.disponibilite === 'Libre' &&
        (maison.codeMaison.toLowerCase().includes(searchTerm) ||
         maison.quartier.toLowerCase().includes(searchTerm) ||
         maison.adresse.toLowerCase().includes(searchTerm))
    );
    // Display filtered results (you might need a separate function or modify displayMaisonsLibres)
    // For now, let's just log it:
    console.log("Filtered Maisons Libres:", filteredMaisonsLibres);
    // You would typically re-render the table with these filtered results.
    // For simplicity, this example just logs. You can adapt the displayMaisonsLibres function
    // to accept an array of houses to display.
});

// --- NOUVEL LOCATAIRE SECTION ---
function populateMaisonSelectForLocataire() {
    const selectElement = document.getElementById('nl_codeMaison');
    selectElement.innerHTML = '<option value="">-- Sélectionnez une maison --</option>'; // Clear existing options
    const maisonsLibresOrOccupied = maisons.filter(m => m.disponibilite === 'Libre' || m.disponibilite === 'Occupé'); // Allow selecting occupied for potential re-assignment or error correction

    maisonsLibresOrOccupied.forEach(maison => {
        const option = document.createElement('option');
        option.value = maison.codeMaison;
        option.textContent = `${maison.codeMaison} (${maison.quartier} - ${maison.prixLouer}€)`;
        selectElement.appendChild(option);
    });
}

document.getElementById('nl_codeMaison').addEventListener('change', function() {
    const selectedCode = this.value;
    const selectedMaison = maisons.find(m => m.codeMaison === selectedCode);
    if (selectedMaison) {
        document.getElementById('nl_prixLouer').value = selectedMaison.prixLouer;
        document.getElementById('nl_adresse').value = selectedMaison.adresse;
        document.getElementById('nl_quartier').value = selectedMaison.quartier;
    } else {
        document.getElementById('nl_prixLouer').value = '';
        document.getElementById('nl_adresse').value = '';
        document.getElementById('nl_quartier').value = '';
    }
});

document.getElementById('formNouvelLocataire').addEventListener('submit', function(event) {
    event.preventDefault();
    const isUpdate = this.dataset.editingId;

    const codeMaison = document.getElementById('nl_codeMaison').value;
    const nomPrenom = document.getElementById('nl_nomPrenom').value;
    const prixLouer = parseFloat(document.getElementById('nl_prixLouer').value);
    const adresse = document.getElementById('nl_adresse').value;
    const quartier = document.getElementById('nl_quartier').value;
    const telephone = document.getElementById('nl_telephone').value;
    const quotient = document.getElementById('nl_quotient').value;
    const dateContrat = document.getElementById('nl_date').value;
    const responsable = document.getElementById('nl_responsable').value;

    let photoBase64 = '';
    const photoInput = document.getElementById('nl_photo');
    if (photoInput.files.length > 0) {
        const reader = new FileReader();
        reader.onload = function(e) {
            photoBase64 = e.target.result;
            saveLocataire(isUpdate, codeMaison, nomPrenom, prixLouer, adresse, quartier, telephone, quotient, photoBase64, dateContrat, responsable);
        };
        reader.readAsDataURL(photoInput.files[0]);
    } else {
        saveLocataire(isUpdate, codeMaison, nomPrenom, prixLouer, adresse, quartier, telephone, quotient, '', dateContrat, responsable);
    }
});

function saveLocataire(isUpdate, codeMaison, nomPrenom, prixLouer, adresse, quartier, telephone, quotient, photoBase64, dateContrat, responsable) {
    const nouvelLocataire = {
        idRapport: isUpdate ? parseInt(document.getElementById('formNouvelLocataire').dataset.editingId) : Date.now(),
        codeMaison: codeMaison,
        nomPrenom: nomPrenom,
        prixLouer: prixLouer,
        adresse: adresse,
        quartier: quartier,
        telephone: telephone,
        quotient: quotient,
        photo: photoBase64,
        dateContrat: dateContrat,
        responsable: responsable
    };

    if (isUpdate) {
        locataires = locataires.map(l => l.idRapport === nouvelLocataire.idRapport ? nouvelLocataire : l);
        alert('Locataire mis à jour avec succès !');
        document.getElementById('formNouvelLocataire').dataset.editingId = '';
        document.querySelector('#formNouvelLocataire button[type="submit"]').textContent = 'Enregistrer Locataire';
    } else {
        locataires.push(nouvelLocataire);
        // Also update the maison's availability to "Occupé" if it was "Libre"
        const maisonIndex = maisons.findIndex(m => m.codeMaison === codeMaison);
        if (maisonIndex !== -1 && maisons[maisonIndex].disponibilite === 'Libre') {
            maisons[maisonIndex].disponibilite = 'Occupé';
        }
        alert('Locataire enregistré avec succès !');
    }

    saveDataToLocalStorage();
    displayLocataires();
    displayMaisons(); // Refresh maisons display to reflect availability changes
    displayMaisonsLibres(); // Refresh maisons libres list
    updateDashboardCounts(); // Update dashboard
    document.getElementById('formNouvelLocataire').reset(); // Clear the form
}


function displayLocataires() {
    const tableBody = document.getElementById('tableNouvelLocataireBody');
    tableBody.innerHTML = '';
    locataires.forEach(locataire => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = locataire.idRapport;
        row.insertCell().textContent = locataire.codeMaison;
        row.insertCell().textContent = locataire.nomPrenom;
        row.insertCell().textContent = locataire.prixLouer.toFixed(2) + ' €';
        row.insertCell().textContent = locataire.telephone;
        row.insertCell().textContent = locataire.quotient;
        const photoCell = row.insertCell();
        if (locataire.photo) {
            const img = document.createElement('img');
            img.src = locataire.photo;
            img.style.width = '50px';
            img.style.height = '50px';
            img.style.objectFit = 'cover';
            photoCell.appendChild(img);
        } else {
            photoCell.textContent = 'N/A';
        }
        row.insertCell().textContent = locataire.dateContrat;
        row.insertCell().textContent = locataire.responsable;

        const actionsCell = row.insertCell();
        const editButton = document.createElement('button');
        editButton.textContent = 'Modifier';
        editButton.classList.add('btn-edit');
        editButton.addEventListener('click', () => editLocataire(locataire.idRapport));
        actionsCell.appendChild(editButton);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Supprimer';
        deleteButton.classList.add('btn-delete');
        deleteButton.addEventListener('click', () => deleteLocataire(locataire.idRapport));
        actionsCell.appendChild(deleteButton);
    });
}

function editLocataire(idRapport) {
    const locataireToEdit = locataires.find(l => l.idRapport === idRapport);
    if (locataireToEdit) {
        showSection('nouvelLocataire');

        document.getElementById('nl_codeMaison').value = locataireToEdit.codeMaison;
        // Trigger change event to auto-populate related fields
        document.getElementById('nl_codeMaison').dispatchEvent(new Event('change'));

        document.getElementById('nl_nomPrenom').value = locataireToEdit.nomPrenom;
        document.getElementById('nl_prixLouer').value = locataireToEdit.prixLouer;
        document.getElementById('nl_adresse').value = locataireToEdit.adresse;
        document.getElementById('nl_quartier').value = locataireToEdit.quartier;
        document.getElementById('nl_telephone').value = locataireToEdit.telephone;
        document.getElementById('nl_quotient').value = locataireToEdit.quotient;
        // Photo input cannot be pre-filled for security reasons, user has to re-select
        document.getElementById('nl_date').value = locataireToEdit.dateContrat;
        document.getElementById('nl_responsable').value = locataireToEdit.responsable;

        const form = document.getElementById('formNouvelLocataire');
        form.dataset.editingId = idRapport;
        document.querySelector('#formNouvelLocataire button[type="submit"]').textContent = 'Mettre à jour Locataire';
    }
}

function deleteLocataire(idRapport) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce locataire ?')) {
        const locataireToDelete = locataires.find(l => l.idRapport === idRapport);
        if (locataireToDelete) {
            // Change the availability of the associated house to "Libre"
            const maisonIndex = maisons.findIndex(m => m.codeMaison === locataireToDelete.codeMaison);
            if (maisonIndex !== -1) {
                maisons[maisonIndex].disponibilite = 'Libre';
            }
        }
        locataires = locataires.filter(l => l.idRapport !== idRapport);
        saveDataToLocalStorage();
        displayLocataires();
        displayMaisons(); // Refresh maisons display to reflect availability changes
        displayMaisonsLibres(); // Refresh maisons libres list
        updateDashboardCounts(); // Update dashboard
        alert('Locataire supprimé avec succès.');
    }
}

document.getElementById('btnPrintNouvelLocataireTable').addEventListener('click', () => {
    printTable('tableNouvelLocataire-container', 'Liste des Locataires Enregistrés');
});

// --- PAIEMENTS SECTION ---
function populateMaisonSelectForPaiement() {
    const selectElement = document.getElementById('paie_codeMaison');
    selectElement.innerHTML = '<option value="">-- Sélectionnez une maison --</option>';
    // Only show occupied houses for payment
    const occupiedMaisons = maisons.filter(m => m.disponibilite === 'Occupé');

    occupiedMaisons.forEach(maison => {
        const option = document.createElement('option');
        option.value = maison.codeMaison;
        option.textContent = `${maison.codeMaison} (${maison.quartier})`;
        selectElement.appendChild(option);
    });
}

document.getElementById('paie_codeMaison').addEventListener('change', function() {
    const selectedCode = this.value;
    const associatedLocataire = locataires.find(l => l.codeMaison === selectedCode);
    const associatedMaison = maisons.find(m => m.codeMaison === selectedCode);

    if (associatedLocataire && associatedMaison) {
        document.getElementById('paie_nomPrenom').value = associatedLocataire.nomPrenom;
        document.getElementById('paie_prixLouer').value = associatedMaison.prixLouer;
        document.getElementById('paie_adresse').value = associatedMaison.adresse;
        document.getElementById('paie_quartier').value = associatedMaison.quartier;
    } else {
        document.getElementById('paie_nomPrenom').value = '';
        document.getElementById('paie_prixLouer').value = '';
        document.getElementById('paie_adresse').value = '';
        document.getElementById('paie_quartier').value = '';
    }
});

document.getElementById('formPaiement').addEventListener('submit', function(event) {
    event.preventDefault();
    const isUpdate = this.dataset.editingId;

    const paiementData = {
        idPaiement: isUpdate ? parseInt(this.dataset.editingId) : Date.now(),
        codeMaison: document.getElementById('paie_codeMaison').value,
        nomLocataire: document.getElementById('paie_nomPrenom').value,
        montant: parseFloat(document.getElementById('paie_prixLouer').value),
        moisPaye: document.getElementById('paie_mois').value,
        datePaiement: document.getElementById('paie_date').value,
        responsable: document.getElementById('paie_responsable').value
    };

    if (isUpdate) {
        paiements = paiements.map(p => p.idPaiement === paiementData.idPaiement ? paiementData : p);
        alert('Paiement mis à jour avec succès !');
        this.dataset.editingId = '';
        document.querySelector('#formPaiement button[type="submit"]').textContent = 'Enregistrer Paiement';
    } else {
        paiements.push(paiementData);
        alert('Paiement enregistré avec succès !');
    }

    saveDataToLocalStorage();
    displayPaiements();
    updateDashboardCounts();
    generateRecu(paiementData);
    this.reset();
});

function displayPaiements() {
    const tableBody = document.getElementById('tablePaiementBody');
    tableBody.innerHTML = '';
    paiements.forEach(paiement => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = paiement.idPaiement;
        row.insertCell().textContent = paiement.codeMaison;
        row.insertCell().textContent = paiement.nomLocataire;
        row.insertCell().textContent = paiement.montant.toFixed(2) + ' €';
        row.insertCell().textContent = paiement.moisPaye;
        row.insertCell().textContent = paiement.datePaiement;
        row.insertCell().textContent = paiement.responsable;

        const actionsCell = row.insertCell();
        const editButton = document.createElement('button');
        editButton.textContent = 'Modifier';
        editButton.classList.add('btn-edit');
        editButton.addEventListener('click', () => editPaiement(paiement.idPaiement));
        actionsCell.appendChild(editButton);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Supprimer';
        deleteButton.classList.add('btn-delete');
        deleteButton.addEventListener('click', () => deletePaiement(paiement.idPaiement));
        actionsCell.appendChild(deleteButton);
    });
}

function editPaiement(idPaiement) {
    const paiementToEdit = paiements.find(p => p.idPaiement === idPaiement);
    if (paiementToEdit) {
        showSection('paiements');

        document.getElementById('paie_codeMaison').value = paiementToEdit.codeMaison;
        document.getElementById('paie_codeMaison').dispatchEvent(new Event('change')); // Trigger to fill related fields

        document.getElementById('paie_nomPrenom').value = paiementToEdit.nomLocataire;
        document.getElementById('paie_prixLouer').value = paiementToEdit.montant;
        document.getElementById('paie_mois').value = paiementToEdit.moisPaye;
        document.getElementById('paie_date').value = paiementToEdit.datePaiement;
        document.getElementById('paie_responsable').value = paiementToEdit.responsable;

        const form = document.getElementById('formPaiement');
        form.dataset.editingId = idPaiement;
        document.querySelector('#formPaiement button[type="submit"]').textContent = 'Mettre à jour Paiement';
    }
}

function deletePaiement(idPaiement) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce paiement ?')) {
        paiements = paiements.filter(p => p.idPaiement !== idPaiement);
        saveDataToLocalStorage();
        displayPaiements();
        updateDashboardCounts();
        alert('Paiement supprimé avec succès.');
    }
}

function generateRecu(paiementData) {
    const recuContentDiv = document.querySelector('#recuPaiementContent .recu-body');
    recuContentDiv.innerHTML = `
        <p>Code Maison: <strong>${paiementData.codeMaison}</strong></p>
        <p>Locataire: <strong>${paiementData.nomLocataire}</strong></p>
        <p>Montant Payé: <strong>${paiementData.montant.toFixed(2)} €</strong></p>
        <p>Mois Payé: <strong>${paiementData.moisPaye}</strong></p>
        <p>Date de Paiement: <strong>${paiementData.datePaiement}</strong></p>
    `;
    document.getElementById('recuPaiementDate').textContent = new Date().toLocaleDateString('fr-FR');
    document.getElementById('recuPaiementTime').textContent = new Date().toLocaleTimeString('fr-FR');
    document.getElementById('recuPaiementResponsable').textContent = paiementData.responsable;

    document.getElementById('recuPaiementContent').classList.remove('hidden');
    document.getElementById('btnPrintRecu').classList.remove('hidden');
}

document.getElementById('btnPrintRecu').addEventListener('click', () => {
    printElement('recuPaiementContent', 'Reçu de Paiement');
});

document.getElementById('btnPrintPaiementTable').addEventListener('click', () => {
    printTable('tablePaiement-container', 'Historique des Paiements');
});


// --- MAISONS IMPAYEES SECTION ---
function displayMaisonsImpayees() {
    const tableBody = document.getElementById('tableMaisonsImpayeesBody');
    tableBody.innerHTML = '';
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const unpaidHousesList = [];

    // Iterate through all occupied houses
    locataires.forEach(locataire => {
        const maison = maisons.find(m => m.codeMaison === locataire.codeMaison && m.disponibilite === 'Occupé');
        if (maison) {
            const hasPaidForCurrentMonth = paiements.some(p =>
                p.codeMaison === maison.codeMaison && p.moisPaye === currentMonth
            );
            if (!hasPaidForCurrentMonth) {
                unpaidHousesList.push({
                    codeMaison: maison.codeMaison,
                    nomLocataire: locataire.nomPrenom,
                    telephoneLocataire: locataire.telephone,
                    loyerAttendu: maison.prixLouer,
                    moisImpaye: currentMonth
                });
            }
        }
    });

    unpaidHousesList.forEach(item => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = item.codeMaison;
        row.insertCell().textContent = item.nomLocataire;
        row.insertCell().textContent = item.telephoneLocataire;
        row.insertCell().textContent = item.loyerAttendu.toFixed(2) + ' €';
        row.insertCell().textContent = item.moisImpaye;

        const actionsCell = row.insertCell();
        const payButton = document.createElement('button');
        payButton.textContent = 'Enregistrer Paiement';
        payButton.classList.add('btn-pay');
        payButton.addEventListener('click', () => {
            // Pre-fill payment form with this house's data
            showSection('paiements');
            document.getElementById('paie_codeMaison').value = item.codeMaison;
            document.getElementById('paie_codeMaison').dispatchEvent(new Event('change')); // Trigger change to populate locataire/loyer
            document.getElementById('paie_mois').value = item.moisImpaye; // Pre-fill current month
            document.getElementById('paie_date').valueAsDate = new Date(); // Pre-fill current date
        });
        actionsCell.appendChild(payButton);
    });
    updateDashboardCounts(); // To update the count on the dashboard
}

document.getElementById('btnPrintMaisonsImpayees').addEventListener('click', () => {
    printTable('maisons-impayees-table', 'Liste des Maisons Impayées');
});

// --- AVIS DE PAIEMENT SECTION ---
document.getElementById('btnChargerMaisonsImpayees').addEventListener('click', () => {
    const dateSelection = document.getElementById('avis_dateSelection').value;
    if (!dateSelection) {
        alert("Veuillez sélectionner une date de référence.");
        return;
    }
    const selectedMonth = new Date(dateSelection).toISOString().slice(0, 7); // YYYY-MM

    const selectElement = document.getElementById('avis_codeMaison');
    selectElement.innerHTML = '<option value="">-- Sélectionnez une maison impayée --</option>'; // Clear existing options
    selectElement.disabled = true;
    document.getElementById('avis_moisAutomatique').value = '';
    document.getElementById('btnGenererAvis').disabled = true;
    document.getElementById('btnEnregistrerImpaye').disabled = true;

    const unpaidForSelectedMonth = [];

    locataires.forEach(locataire => {
        const maison = maisons.find(m => m.codeMaison === locataire.codeMaison && m.disponibilite === 'Occupé');
        if (maison) {
            const hasPaid = paiements.some(p =>
                p.codeMaison === maison.codeMaison && p.moisPaye === selectedMonth
            );
            if (!hasPaid) {
                unpaidForSelectedMonth.push({
                    codeMaison: maison.codeMaison,
                    nomLocataire: locataire.nomPrenom,
                    telephoneLocataire: locataire.telephone,
                    loyerAttendu: maison.prixLouer,
                    moisImpaye: selectedMonth
                });
            }
        }
    });

    if (unpaidForSelectedMonth.length > 0) {
        unpaidForSelectedMonth.forEach(item => {
            const option = document.createElement('option');
            option.value = item.codeMaison;
            option.textContent = `${item.codeMaison} - ${item.nomLocataire} (${item.loyerAttendu}€ pour ${item.moisImpaye})`;
            selectElement.appendChild(option);
        });
        selectElement.disabled = false;
        alert(`Chargement de ${unpaidForSelectedMonth.length} maison(s) impayée(s) pour le mois de ${selectedMonth}.`);
    } else {
        alert(`Aucune maison impayée trouvée pour le mois de ${selectedMonth}.`);
    }
});

document.getElementById('avis_codeMaison').addEventListener('change', function() {
    const selectedCode = this.value;
    const dateSelection = document.getElementById('avis_dateSelection').value;
    const selectedMonth = new Date(dateSelection).toISOString().slice(0, 7);

    if (selectedCode) {
        document.getElementById('avis_moisAutomatique').value = selectedMonth;
        document.getElementById('btnGenererAvis').disabled = false;
        document.getElementById('btnEnregistrerImpaye').disabled = false; // Enable "Enregistrer comme Impayé Actuel"
    } else {
        document.getElementById('avis_moisAutomatique').value = '';
        document.getElementById('btnGenererAvis').disabled = true;
        document.getElementById('btnEnregistrerImpaye').disabled = true;
    }
});

document.getElementById('btnGenererAvis').addEventListener('click', () => {
    const codeMaison = document.getElementById('avis_codeMaison').value;
    const moisImpaye = document.getElementById('avis_moisAutomatique').value;
    const responsable = document.getElementById('avis_responsable').value;

    if (!codeMaison || !moisImpaye) {
        alert("Veuillez sélectionner une maison impayée et un mois.");
        return;
    }

    const locataire = locataires.find(l => l.codeMaison === codeMaison);
    const maison = maisons.find(m => m.codeMaison === codeMaison);

    if (locataire && maison) {
        const avisData = {
            idAvis: Date.now(),
            codeMaison: codeMaison,
            nomLocataire: locataire.nomPrenom,
            adresseMaison: maison.adresse,
            quartierMaison: maison.quartier,
            loyerAttendu: maison.prixLouer,
            moisImpaye: moisImpaye,
            dateGeneration: new Date().toISOString().slice(0, 10),
            responsable: responsable
        };
        avisPaiement.push(avisData);
        saveDataToLocalStorage();
        alert('Avis de paiement généré et enregistré !');
        displayAvisPaiementHistory(); // Update the history table
        generateAvisContent(avisData);
    } else {
        alert("Erreur: Impossible de trouver les informations pour la maison ou le locataire sélectionné.");
    }
});

document.getElementById('btnEnregistrerImpaye').addEventListener('click', () => {
    const codeMaison = document.getElementById('avis_codeMaison').value;
    const moisImpaye = document.getElementById('avis_moisAutomatique').value;

    if (!codeMaison || !moisImpaye) {
        alert("Veuillez sélectionner une maison impayée et un mois.");
        return;
    }

    // This button implies marking it as officially "impayé" for the current month
    // The `maisonsImpayees` section already calculates this dynamically.
    // If you need a persistent "marked as impayé" status, you'd add a property to the maison object
    // or a separate "impayes" array with status.
    // For now, this button can just act as a confirmation or trigger an action.
    alert(`Maison ${codeMaison} est maintenant enregistrée comme impayée pour le mois de ${moisImpaye}. Cette action est pour le suivi.`);
    // You might want to update the dashboard count here again if this button modifies a specific state.
    updateDashboardCounts();
});


function generateAvisContent(avisData) {
    const avisContentDiv = document.querySelector('#avisDePaiementContent .avis-body');
    avisContentDiv.innerHTML = `
        <p>Cher(e) Locataire <strong>${avisData.nomLocataire}</strong>,</p>
        <p>Nous vous rappelons que le paiement de votre loyer pour la maison située à <strong>${avisData.adresseMaison}, ${avisData.quartierMaison} (Code: ${avisData.codeMaison})</strong> d'un montant de <strong>${avisData.loyerAttendu.toFixed(2)} €</strong> pour le mois de <strong>${avisData.moisImpaye}</strong> est impayé.</p>
        <p>Nous vous prions de bien vouloir régulariser votre situation dans les plus brefs délais.</p>
        <p>Cordialement,</p>
        <p>L'équipe GaliBusiness Immobilier</p>
    `;
    document.getElementById('avisPaiementDate').textContent = new Date().toLocaleDateString('fr-FR');
    document.getElementById('avisPaiementTime').textContent = new Date().toLocaleTimeString('fr-FR');
    document.getElementById('avisPaiementResponsable').textContent = avisData.responsable;

    document.getElementById('avisDePaiementContent').classList.remove('hidden');
    document.getElementById('btnPrintAvis').classList.remove('hidden');
}

function displayAvisPaiementHistory() {
    const tableBody = document.getElementById('tableAvisPaiementBody');
    tableBody.innerHTML = '';
    avisPaiement.forEach(avis => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = avis.idAvis;
        row.insertCell().textContent = avis.codeMaison;
        row.insertCell().textContent = avis.nomLocataire;
        row.insertCell().textContent = avis.moisImpaye;
        row.insertCell().textContent = avis.dateGeneration;
        row.insertCell().textContent = avis.responsable;

        const actionsCell = row.insertCell();
        const viewButton = document.createElement('button');
        viewButton.textContent = 'Voir Avis';
        viewButton.classList.add('btn-view');
        viewButton.addEventListener('click', () => generateAvisContent(avis)); // Re-generate/display the notice
        actionsCell.appendChild(viewButton);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Supprimer';
        deleteButton.classList.add('btn-delete');
        deleteButton.addEventListener('click', () => deleteAvis(avis.idAvis));
        actionsCell.appendChild(deleteButton);
    });
}

function deleteAvis(idAvis) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet avis de paiement ?')) {
        avisPaiement = avisPaiement.filter(a => a.idAvis !== idAvis);
        saveDataToLocalStorage();
        displayAvisPaiementHistory();
        alert('Avis de paiement supprimé avec succès.');
    }
}

document.getElementById('btnPrintAvis').addEventListener('click', () => {
    printElement('avisDePaiementContent', 'Avis de Paiement');
});

document.getElementById('btnPrintAvisPaiementTable').addEventListener('click', () => {
    printTable('tableAvisPaiement-container', 'Historique des Avis de Paiement');
});

// --- FIN DE CONTRAT SECTION ---
function displayFinContrat() {
    const tableBody = document.getElementById('tableFinContratBody');
    tableBody.innerHTML = '';
    const today = new Date();
    const contractsEndingSoon = []; // Or all active contracts

    locataires.forEach(locataire => {
        // Assuming contracts are 1 year long from 'dateContrat' for simplicity
        const contractStartDate = new Date(locataire.dateContrat);
        const contractEndDate = new Date(contractStartDate);
        contractEndDate.setFullYear(contractEndDate.getFullYear() + 1); // 1 year contract

        // You might want to filter for contracts ending in the next X months
        // For now, let's just list all active contracts
        if (contractEndDate > today) { // Still active
            contractsEndingSoon.push({
                codeMaison: locataire.codeMaison,
                nomLocataire: locataire.nomPrenom,
                dateDebutContrat: locataire.dateContrat,
                dateFinPrevue: contractEndDate.toISOString().slice(0, 10)
            });
        }
    });

    contractsEndingSoon.forEach(contract => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = contract.codeMaison;
        row.insertCell().textContent = contract.nomLocataire;
        row.insertCell().textContent = contract.dateDebutContrat;
        row.insertCell().textContent = contract.dateFinPrevue;

        const actionsCell = row.insertCell();
        const renewButton = document.createElement('button');
        renewButton.textContent = 'Renouveler';
        renewButton.classList.add('btn-renew');
        renewButton.addEventListener('click', () => renewContract(contract.codeMaison));
        actionsCell.appendChild(renewButton);

        const endButton = document.createElement('button');
        endButton.textContent = 'Mettre fin';
        endButton.classList.add('btn-end');
        endButton.addEventListener('click', () => endContract(contract.codeMaison));
        actionsCell.appendChild(endButton);
    });
}

function renewContract(codeMaison) {
    if (confirm(`Voulez-vous renouveler le contrat pour la maison ${codeMaison}?`)) {
        const locataireIndex = locataires.findIndex(l => l.codeMaison === codeMaison);
        if (locataireIndex !== -1) {
            // Update the contract date to today for renewal
            locataires[locataireIndex].dateContrat = new Date().toISOString().slice(0, 10);
            saveDataToLocalStorage();
            alert(`Contrat pour la maison ${codeMaison} renouvelé.`);
            displayFinContrat(); // Refresh the table
        }
    }
}

function endContract(codeMaison) {
    if (confirm(`Voulez-vous mettre fin au contrat et libérer la maison ${codeMaison}? Cela supprimera le locataire associé.`)) {
        // Find locataire and then remove
        locataires = locataires.filter(l => l.codeMaison !== codeMaison);
        // Mark maison as Libre
        const maisonIndex = maisons.findIndex(m => m.codeMaison === codeMaison);
        if (maisonIndex !== -1) {
            maisons[maisonIndex].disponibilite = 'Libre';
        }
        saveDataToLocalStorage();
        alert(`Contrat pour la maison ${codeMaison} terminé et maison marquée comme libre.`);
        displayFinContrat();
        displayMaisons(); // Update main houses table
        displayMaisonsLibres(); // Update libre houses table
        updateDashboardCounts(); // Update dashboard
    }
}


// --- BILAN GLOBAL SECTION ---
let currentBilanType = ''; // To keep track of which bilan is being generated

document.getElementById('bilanQuotientBtn').addEventListener('click', () => {
    currentBilanType = 'quotient';
    document.getElementById('bilanTotalQuotient').classList.remove('hidden');
    document.getElementById('bilanTotalMoisPayes').classList.add('hidden');
    document.getElementById('bilanTotalMoisImpayes').classList.add('hidden');
    alert('Bilan par Quotient Familial sélectionné. Spécifiez les dates et cliquez "Générer Bilan".');
});

document.getElementById('bilanMaisonsImpayeesBtn').addEventListener('click', () => {
    currentBilanType = 'impayees';
    document.getElementById('bilanTotalQuotient').classList.add('hidden');
    document.getElementById('bilanTotalMoisPayes').classList.add('hidden');
    document.getElementById('bilanTotalMoisImpayes').classList.remove('hidden');
    alert('Bilan Maisons Impayées sélectionné. Spécifiez les dates et cliquez "Générer Bilan".');
});

document.getElementById('bilanMaisonsPayeesBtn').addEventListener('click', () => {
    currentBilanType = 'payees';
    document.getElementById('bilanTotalQuotient').classList.add('hidden');
    document.getElementById('bilanTotalMoisPayes').classList.remove('hidden');
    document.getElementById('bilanTotalMoisImpayes').classList.add('hidden');
    alert('Bilan Maisons Payées sélectionné. Spécifiez les dates et cliquez "Générer Bilan".');
});

document.getElementById('genererBilanBtn').addEventListener('click', () => {
    const month = document.getElementById('bilanDateMonth').value;
    const day = document.getElementById('bilanDateDay').value;
    const year = document.getElementById('bilanDateYear').value;

    let startDate = null;
    let endDate = null;

    if (month && year) {
        startDate = new Date(month + '-01');
        endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0); // Last day of the month
        if (day) {
            startDate = new Date(year, startDate.getMonth(), day);
            endDate = new Date(year, startDate.getMonth(), day);
        }
    } else if (year) {
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31);
    } else {
        alert("Veuillez sélectionner au moins une année pour générer le bilan.");
        return;
    }

    if (currentBilanType === 'quotient') {
        generateBilanQuotient(startDate, endDate);
    } else if (currentBilanType === 'impayees') {
        generateBilanImpayees(startDate, endDate);
    } else if (currentBilanType === 'payees') {
        generateBilanPayees(startDate, endDate);
    } else {
        alert("Veuillez d'abord sélectionner un type de bilan.");
    }

    document.getElementById('btnPrintBilan').classList.remove('hidden'); // Show print button after generating
});

function generateBilanQuotient(startDate, endDate) {
    let totalQuotient = 0;
    const filteredLocataires = locataires.filter(locataire => {
        const contractDate = new Date(locataire.dateContrat);
        return contractDate >= startDate && contractDate <= endDate;
    });

    filteredLocataires.forEach(locataire => {
        const quotientValue = parseFloat(locataire.quotient);
        if (!isNaN(quotientValue)) {
            totalQuotient += quotientValue;
        }
    });
    document.getElementById('bilanTotalQuotient').textContent = `Total Quotient Familial: ${totalQuotient}`;
    document.getElementById('bilanResultats').innerHTML = `
        <h3>Résultats du Bilan par Quotient Familial (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})</h3>
        <p>Total Quotient Familial: <strong>${totalQuotient}</strong></p>
        <p>Liste des Locataires avec Quotient dans la période:</p>
        <table>
            <thead>
                <tr>
                    <th>Nom Locataire</th>
                    <th>Quotient Familial</th>
                    <th>Date Contrat</th>
                </tr>
            </thead>
            <tbody>
                ${filteredLocataires.map(l => `
                    <tr>
                        <td>${l.nomPrenom}</td>
                        <td>${l.quotient}</td>
                        <td>${l.dateContrat}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    document.getElementById('bilanTotalQuotient').classList.remove('hidden'); // Ensure this is visible if it was hidden
}

function generateBilanImpayees(startDate, endDate) {
    let totalUnpaidMonths = 0;
    const unpaidHousesInPeriod = [];

    locataires.forEach(locataire => {
        const maison = maisons.find(m => m.codeMaison === locataire.codeMaison && m.disponibilite === 'Occupé');
        if (maison) {
            // Check each month within the date range
            let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
            while (currentDate <= endDate) {
                const monthToCheck = currentDate.toISOString().slice(0, 7);
                const hasPaid = paiements.some(p =>
                    p.codeMaison === maison.codeMaison && p.moisPaye === monthToCheck
                );
                if (!hasPaid) {
                    unpaidHousesInPeriod.push({
                        codeMaison: maison.codeMaison,
                        nomLocataire: locataire.nomPrenom,
                        loyerAttendu: maison.prixLouer,
                        moisImpaye: monthToCheck
                    });
                    totalUnpaidMonths++;
                }
                currentDate.setMonth(currentDate.getMonth() + 1);
            }
        }
    });

    document.getElementById('bilanResultats').innerHTML = `
        <h3>Résultats du Bilan Maisons Impayées (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})</h3>
        <p>Total Mois Impayés: <strong>${totalUnpaidMonths}</strong></p>
        <p>Liste des Maisons Impayées dans la période:</p>
        <table>
            <thead>
                <tr>
                    <th>Code Maison</th>
                    <th>Nom Locataire</th>
                    <th>Loyer Attendu</th>
                    <th>Mois Impayé</th>
                </tr>
            </thead>
            <tbody>
                ${unpaidHousesInPeriod.map(item => `
                    <tr>
                        <td>${item.codeMaison}</td>
                        <td>${item.nomLocataire}</td>
                        <td>${item.loyerAttendu.toFixed(2)} €</td>
                        <td>${item.moisImpaye}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    document.getElementById('bilanTotalMoisImpayes').textContent = `Total Mois Impayés: ${totalUnpaidMonths}`;
    document.getElementById('bilanTotalMoisImpayes').classList.remove('hidden');
}


function generateBilanPayees(startDate, endDate) {
    let totalPaidMonths = 0;
    let totalAmountPaid = 0;
    const paidRecordsInPeriod = [];

    paiements.forEach(paiement => {
        const paiementDate = new Date(paiement.datePaiement);
        if (paiementDate >= startDate && paiementDate <= endDate) {
            paidRecordsInPeriod.push(paiement);
            totalPaidMonths++;
            totalAmountPaid += paiement.montant;
        }
    });

    document.getElementById('bilanResultats').innerHTML = `
        <h3>Résultats du Bilan Maisons Payées (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})</h3>
        <p>Total Mois Payés: <strong>${totalPaidMonths}</strong></p>
        <p>Montant Total Percu: <strong>${totalAmountPaid.toFixed(2)} €</strong></p>
        <p>Liste des Paiements dans la période:</p>
        <table>
            <thead>
                <tr>
                    <th>Code Maison</th>
                    <th>Nom Locataire</th>
                    <th>Montant</th>
                    <th>Mois Payé</th>
                    <th>Date Paiement</th>
                </tr>
            </thead>
            <tbody>
                ${paidRecordsInPeriod.map(p => `
                    <tr>
                        <td>${p.codeMaison}</td>
                        <td>${p.nomLocataire}</td>
                        <td>${p.montant.toFixed(2)} €</td>
                        <td>${p.moisPaye}</td>
                        <td>${p.datePaiement}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    document.getElementById('bilanTotalMoisPayes').textContent = `Total Mois Payés: ${totalPaidMonths} | Montant Total Percu: ${totalAmountPaid.toFixed(2)} €`;
    document.getElementById('bilanTotalMoisPayes').classList.remove('hidden');
}

document.getElementById('btnPrintBilan').addEventListener('click', () => {
    printElement('bilanResultats', 'Bilan Global');
});

// --- PRINTING UTILITY ---
function printTable(containerId, title) {
    const printContent = document.getElementById(containerId).outerHTML;
    const originalBody = document.body.innerHTML;

    document.body.innerHTML = `
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h2, h3 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .btn-print { display: none; } /* Hide print button in print view */
            @media print {
                .main-content {
                    width: 100%;
                    padding: 0;
                    margin: 0;
                }
                .hidden {
                    display: none !important;
                }
                .table-container {
                    border: none;
                    box-shadow: none;
                }
            }
        </style>
        <h2>${title}</h2>
        ${printContent}
    `;
    window.print();
    document.body.innerHTML = originalBody; // Restore original content
    location.reload(); // Reload to re-attach event listeners
}

function printElement(elementId, title) {
    const printContent = document.getElementById(elementId).outerHTML;
    const originalBody = document.body.innerHTML;

    document.body.innerHTML = `
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h2, h3 { text-align: center; }
            .recu-container, .avis-content-container {
                border: 1px solid #ccc;
                padding: 20px;
                margin: 20px auto;
                width: 80%;
                max-width: 600px;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            .recu-header, .avis-header {
                text-align: center;
                margin-bottom: 20px;
            }
            .recu-body, .avis-body {
                line-height: 1.6;
            }
            strong { font-weight: bold; }
            .btn-print { display: none; } /* Hide print button in print view */
            @media print {
                .main-content {
                    width: 100%;
                    padding: 0;
                    margin: 0;
                }
                .hidden {
                    display: none !important;
                }
            }
        </style>
        <h2>${title}</h2>
        ${printContent}
    `;
    window.print();
    document.body.innerHTML = originalBody; // Restore original content
    location.reload(); // Reload to re-attach event listeners
}


// --- CHART INITIALIZATION (Placeholder - you'll fill these with actual data logic) ---
// These functions would be called by updateDashboardCounts()
let paiementsChart;
let disponibiliteChart;
let quartiersChart;
let ancienneteChart;
let occupationRateChart;
let loyersPercusChart;
let loyerComparisonChart;

function updatePaiementsMensuelsChart() {
    const ctx = document.getElementById('paiementsMensuelsChart').getContext('2d');
    if (paiementsChart) paiementsChart.destroy(); // Destroy previous chart instance

    // Example data (you'd generate this from your 'paiements' data)
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const monthlyPayments = new Array(12).fill(0); // For current year

    paiements.forEach(p => {
        const paymentDate = new Date(p.datePaiement);
        if (paymentDate.getFullYear() === new Date().getFullYear()) {
            const monthIndex = paymentDate.getMonth();
            monthlyPayments[monthIndex] += p.montant;
        }
    });

    paiementsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Loyers Percus Mensuels (€)',
                data: monthlyPayments,
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.2)',
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function updateDisponibiliteMaisonsChart() {
    const ctx = document.getElementById('disponibiliteMaisonsChart').getContext('2d');
    if (disponibiliteChart) disponibiliteChart.destroy();

    const maisonsLibresCount = maisons.filter(m => m.disponibilite === 'Libre').length;
    const maisonsOccupeesCount = maisons.filter(m => m.disponibilite === 'Occupé').length;

    disponibiliteChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Libres', 'Occupées'],
            datasets: [{
                data: [maisonsLibresCount, maisonsOccupeesCount],
                backgroundColor: ['#36A2EB', '#FF6384'],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Disponibilité des Maisons'
                }
            }
        }
    });
}

function updateMaisonsParQuartierChart() {
    const ctx = document.getElementById('maisonsParQuartierChart').getContext('2d');
    if (quartiersChart) quartiersChart.destroy();

    const quartiers = {};
    maisons.forEach(maison => {
        quartiers[maison.quartier] = (quartiers[maison.quartier] || 0) + 1;
    });

    const labels = Object.keys(quartiers);
    const data = Object.values(quartiers);

    quartiersChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Nombre de Maisons',
                data: data,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function updateLocatairesAncienneteChart() {
    const ctx = document.getElementById('locatairesAncienneteChart').getContext('2d');
    if (ancienneteChart) ancienneteChart.destroy();

    const categories = {
        '0-6 mois': 0,
        '6-12 mois': 0,
        '1-2 ans': 0,
        '2+ ans': 0
    };
    const today = new Date();

    locataires.forEach(locataire => {
        const contractDate = new Date(locataire.dateContrat);
        const diffTime = Math.abs(today - contractDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 180) { // 6 months
            categories['0-6 mois']++;
        } else if (diffDays <= 365) { // 12 months
            categories['6-12 mois']++;
        } else if (diffDays <= 730) { // 2 years
            categories['1-2 ans']++;
        } else {
            categories['2+ ans']++;
        }
    });

    ancienneteChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: ['#FF9900', '#FFCC00', '#66CCFF', '#3366CC'],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Répartition des Locataires par Ancienneté'
                }
            }
        }
    });
}

function updateOccupationRateChart() {
    const ctx = document.getElementById('occupationRateChart').getContext('2d');
    if (occupationRateChart) occupationRateChart.destroy();

    // This is a more complex chart requiring historical data or simulation.
    // For a basic setup, we can show current rate.
    // To show "by period", you'd need to log occupation status over time.
    const totalMaisons = maisons.length;
    const occupiedMaisons = maisons.filter(m => m.disponibilite === 'Occupé').length;
    const occupationRate = totalMaisons > 0 ? (occupiedMaisons / totalMaisons) * 100 : 0;
    const freeRate = 100 - occupationRate;

    occupationRateChart = new Chart(ctx, {
        type: 'bar', // A simple bar for current view
        data: {
            labels: ['Taux d\'Occupation', 'Taux de Maisons Libres'],
            datasets: [{
                label: 'Pourcentage (%)',
                data: [occupationRate.toFixed(2), freeRate.toFixed(2)],
                backgroundColor: ['#4BC0C0', '#FFCD56'],
                borderColor: ['#4BC0C0', '#FFCD56'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            indexAxis: 'y', // Horizontal bars
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Taux d\'Occupation Actuel'
                }
            }
        }
    });
}

function updateLoyersPercusAnnuelChart() {
    const ctx = document.getElementById('loyersPercusAnnuelChart').getContext('2d');
    if (loyersPercusChart) loyersPercusChart.destroy();

    // Example for last 5 years, adjust as needed
    const years = Array.from({
        length: 5
    }, (v, i) => new Date().getFullYear() - 4 + i);
    const yearlyPayments = new Array(5).fill(0);

    paiements.forEach(p => {
        const paymentYear = new Date(p.datePaiement).getFullYear();
        const yearIndex = years.indexOf(paymentYear);
        if (yearIndex !== -1) {
            yearlyPayments[yearIndex] += p.montant;
        }
    });

    loyersPercusChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: [{
                label: 'Loyers Percus (€)',
                data: yearlyPayments,
                backgroundColor: '#9966FF',
                borderColor: '#9966FF',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function updateLoyerComparisonChart() {
    const ctx = document.getElementById('loyerComparisonChart').getContext('2d');
    if (loyerComparisonChart) loyerComparisonChart.destroy();

    // This needs a clearer definition of "expected vs received" over time.
    // For simplicity, let's compare current month.
    const currentMonth = new Date().toISOString().slice(0, 7);
    let totalExpectedLoyer = 0;
    locataires.forEach(locataire => {
        const maison = maisons.find(m => m.codeMaison === locataire.codeMaison && m.disponibilite === 'Occupé');
        if (maison) {
            totalExpectedLoyer += maison.prixLouer;
        }
    });

    const totalReceivedLoyer = paiements.filter(p => p.moisPaye === currentMonth)
        .reduce((sum, p) => sum + p.montant, 0);

    loyerComparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Loyer Attendu (Ce Mois)', 'Loyer Percu (Ce Mois)'],
            datasets: [{
                data: [totalExpectedLoyer.toFixed(2), totalReceivedLoyer.toFixed(2)],
                backgroundColor: ['#FF6384', '#36A2EB'],
                borderColor: ['#FF6384', '#36A2EB'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Call chart update functions when relevant sections are shown or data changes
// You should call these inside updateDashboardCounts or specific section loads.
// For demonstration, let's call them after initial data load:
document.addEventListener('DOMContentLoaded', () => {
    // ... existing DOmContentLoaded code ...
    updatePaiementsMensuelsChart();
    updateDisponibiliteMaisonsChart();
    updateMaisonsParQuartierChart();
    updateLocatairesAncienneteChart();
    updateOccupationRateChart();
    updateLoyersPercusAnnuelChart();
    updateLoyerComparisonChart();
});





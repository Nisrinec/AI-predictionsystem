// ========== PROFILE MODULE ==========
console.log('profile.js loading...');

// Ensure currentUser exists globally
if (typeof window.currentUser === 'undefined') {
    window.currentUser = {
        fullName: "Chargement...",
        role: "Chargement...",
        email: "",
        phone: "",
        userId: null,
        passwordHash: ""
    };
}

// Load user profile from database and update header
async function loadUserProfileFromDatabase() {
    console.log('Loading user profile from database...');
    
    try {
        const token = localStorage.getItem('ipredict_token');
        if (!token) {
            console.warn('No token found, checking localStorage');
            // Try to load from localStorage as fallback
            const stored = localStorage.getItem('ipredict_user');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    window.currentUser.fullName = parsed.fullName || window.currentUser.fullName;
                    window.currentUser.role = parsed.role || window.currentUser.role;
                    window.currentUser.email = parsed.email || '';
                    window.currentUser.phone = parsed.phone || '';
                    window.currentUser.userId = parsed.userId;
                    console.log('Loaded user from localStorage fallback');
                } catch(e) {}
            }
            updateHeaderUI();
            return;
        }
        
        const response = await fetch(`${API_URL}/users/profile/me`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load profile from database');
        }
        
        const userData = await response.json();
        console.log('Profile loaded from database:', userData);
        
        // Update currentUser with database data
        window.currentUser.fullName = userData.full_name || userData.fullName || 'Utilisateur';
        window.currentUser.email = userData.email || '';
        window.currentUser.phone = userData.phone_number || userData.phone || '';
        window.currentUser.role = userData.role || 'Utilisateur';
        window.currentUser.userId = userData.user_id || userData.id;
        
        // Save to localStorage as backup
        localStorage.setItem('ipredict_user', JSON.stringify({
            fullName: window.currentUser.fullName,
            role: window.currentUser.role,
            email: window.currentUser.email,
            phone: window.currentUser.phone,
            userId: window.currentUser.userId
        }));
        
        // Update the session storage
        const session = localStorage.getItem('ipredict_session');
        if (session) {
            try {
                const sessionData = JSON.parse(session);
                sessionData.fullName = window.currentUser.fullName;
                sessionData.role = window.currentUser.role;
                sessionData.email = window.currentUser.email;
                localStorage.setItem('ipredict_session', JSON.stringify(sessionData));
            } catch(e) {}
        }
        
        // Update header UI
        updateHeaderUI();
        
        return userData;
        
    } catch (error) {
        console.error('Error loading profile from database:', error);
        // Try localStorage as fallback
        const stored = localStorage.getItem('ipredict_user');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                window.currentUser.fullName = parsed.fullName || window.currentUser.fullName;
                window.currentUser.role = parsed.role || window.currentUser.role;
                window.currentUser.email = parsed.email || '';
                window.currentUser.phone = parsed.phone || '';
            } catch(e) {}
        }
        updateHeaderUI();
    }
}

// Update header UI with current user info
function updateHeaderUI() {
    console.log('Updating header UI with:', window.currentUser.fullName, window.currentUser.role);
    
    const nameSpan = document.getElementById("headerUserName");
    const roleSpan = document.getElementById("headerUserRole");
    const avatarDiv = document.getElementById("headerAvatar");
    
    if (nameSpan) {
        nameSpan.innerText = window.currentUser.fullName || "Utilisateur";
        console.log('Set name to:', nameSpan.innerText);
    }
    
    if (roleSpan) {
        roleSpan.innerText = window.currentUser.role || "Rôle";
        console.log('Set role to:', roleSpan.innerText);
    }
    
    if (avatarDiv && window.currentUser.fullName) {
        const nameParts = window.currentUser.fullName.split(' ');
        let initials = nameParts[0].charAt(0).toUpperCase();
        if (nameParts.length > 1) {
            initials += nameParts[1].charAt(0).toUpperCase();
        }
        avatarDiv.innerText = initials;
        console.log('Set avatar to:', initials);
    }
}

// Save user to storage (backup)
function saveUserToStorage() {
    if (window.currentUser) {
        localStorage.setItem("ipredict_user", JSON.stringify({ 
            fullName: window.currentUser.fullName, 
            role: window.currentUser.role, 
            email: window.currentUser.email, 
            phone: window.currentUser.phone,
            userId: window.currentUser.userId,
            passwordHash: window.currentUser.passwordHash 
        }));
        console.log('User saved to storage:', window.currentUser.fullName);
    }
}

// Load user from storage (fallback)
function loadUserFromStorage() {
    const stored = localStorage.getItem("ipredict_user");
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            window.currentUser.fullName = parsed.fullName || window.currentUser.fullName;
            window.currentUser.email = parsed.email || window.currentUser.email;
            window.currentUser.phone = parsed.phone || window.currentUser.phone;
            window.currentUser.role = parsed.role || window.currentUser.role;
            window.currentUser.userId = parsed.userId;
            window.currentUser.passwordHash = parsed.passwordHash || window.currentUser.passwordHash;
            console.log('Loaded user from storage:', window.currentUser.fullName);
        } catch(e) {
            console.error('Error loading user from storage:', e);
        }
    }
    updateHeaderUI();
}

// Update profile in database
async function updateProfileInDatabase(fullName, email, phone) {
    console.log('Updating profile in database...');
    
    try {
        const token = localStorage.getItem('ipredict_token');
        if (!token) {
            throw new Error('No authentication token found');
        }
        
        const response = await fetch(`${API_URL}/users/profile/me`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                full_name: fullName,
                email: email,
                phone_number: phone
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update profile');
        }
        
        const result = await response.json();
        console.log('Profile updated in database:', result);
        
        // Update local user object
        if (result.user) {
            window.currentUser.fullName = result.user.full_name;
            window.currentUser.email = result.user.email;
            window.currentUser.phone = result.user.phone_number || '';
            window.currentUser.role = result.user.role;
        } else if (result.full_name) {
            window.currentUser.fullName = result.full_name;
            window.currentUser.email = result.email;
            window.currentUser.phone = result.phone_number || '';
            window.currentUser.role = result.role;
        }
        
        // Update localStorage backup
        saveUserToStorage();
        
        // Update session storage
        const session = localStorage.getItem('ipredict_session');
        if (session) {
            try {
                const sessionData = JSON.parse(session);
                sessionData.fullName = fullName;
                sessionData.email = email;
                localStorage.setItem('ipredict_session', JSON.stringify(sessionData));
            } catch(e) {}
        }
        
        // Update header UI
        updateHeaderUI();
        
        return { success: true, data: result };
        
    } catch (error) {
        console.error('Error updating profile in database:', error);
        throw error;
    }
}

// Update password in database
async function updatePasswordInDatabase(currentPassword, newPassword) {
    console.log('Updating password in database...');
    
    try {
        const token = localStorage.getItem('ipredict_token');
        if (!token) {
            throw new Error('No authentication token found');
        }
        
        const response = await fetch(`${API_URL}/users/profile/me/password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update password');
        }
        
        const result = await response.json();
        console.log('Password updated in database');
        
        return { success: true, data: result };
        
    } catch (error) {
        console.error('Error updating password:', error);
        throw error;
    }
}

// Render profile page
function renderProfilePage() {
    console.log('renderProfilePage called');
    
    // Hide the dashboard header
    const dashboardHeader = document.querySelector('.dashboard-header');
    if (dashboardHeader) {
        dashboardHeader.style.display = 'none';
    }
    
    renderProfileForm();
}

function renderProfileForm() {
    const profileHtml = `
        <div class="profile-container">
            <div class="profile-horizontal-card">
                <div class="profile-cover">
                    <div class="profile-avatar-large" id="profileAvatarLarge">${(window.currentUser.fullName || 'U').charAt(0).toUpperCase()}</div>
                    <div class="profile-titles">
                        <h2>Mon profil</h2>
                        <p>Gérez vos informations personnelles et votre mot de passe</p>
                    </div>
                </div>
                <div class="profile-fields">
                    <div class="field-group">
                        <label>Nom complet</label>
                        <input type="text" id="editFullName" value="${escapeHtml(window.currentUser.fullName || '')}">
                    </div>
                    <div class="field-group">
                        <label>Email</label>
                        <input type="email" id="editEmail" value="${escapeHtml(window.currentUser.email || '')}">
                    </div>
                    <div class="field-group">
                        <label>Rôle</label>
                        <input type="text" id="editRole" value="${escapeHtml(window.currentUser.role || '')}" readonly disabled style="background:#f8fafc">
                    </div>
                    <div class="field-group">
                        <label>Téléphone</label>
                        <input type="text" id="editPhone" value="${escapeHtml(window.currentUser.phone || '')}">
                    </div>
                </div>
                <div class="password-section">
                    <h3><i class="fas fa-lock"></i> Modifier le mot de passe</h3>
                    <div class="password-row">
                        <div class="field-group">
                            <label>Mot de passe actuel</label>
                            <input type="password" id="oldPassword" placeholder="••••••••">
                        </div>
                        <div class="field-group">
                            <label>Nouveau mot de passe</label>
                            <input type="password" id="newPassword" placeholder="••••••••">
                        </div>
                        <div class="field-group">
                            <label>Confirmer</label>
                            <input type="password" id="confirmPassword" placeholder="••••••••">
                        </div>
                    </div>
                </div>
                <div class="profile-actions">
                    <button class="btn-primary" id="saveProfileBtn">Enregistrer les modifications</button>
                    <button class="btn-secondary" id="cancelProfileBtn">Annuler</button>
                </div>
                <div id="profileFormMessage" style="padding:0 40px 40px 40px;"></div>
            </div>
        </div>
    `;
    
    const dashboardContent = document.getElementById('dashboardContent');
    if (dashboardContent) {
        dashboardContent.innerHTML = profileHtml;
    }
    
    // Attach save button handler
    const saveBtn = document.getElementById('saveProfileBtn');
    if (saveBtn) {
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        
        newSaveBtn.addEventListener('click', async () => {
            const newName = document.getElementById('editFullName')?.value.trim();
            const newEmail = document.getElementById('editEmail')?.value.trim();
            const newPhone = document.getElementById('editPhone')?.value.trim();
            const oldPwd = document.getElementById('oldPassword')?.value;
            const newPwd = document.getElementById('newPassword')?.value;
            const confirmPwd = document.getElementById('confirmPassword')?.value;
            
            if (!newName || !newEmail) { 
                showProfileMsg("Veuillez remplir tous les champs", "error"); 
                return; 
            }
            
            newSaveBtn.disabled = true;
            newSaveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';
            
            try {
                // Update profile in database
                await updateProfileInDatabase(newName, newEmail, newPhone);
                showProfileMsg("✅ Profil mis à jour avec succès!", "success");
                
                // Update avatar
                const avatarLarge = document.getElementById('profileAvatarLarge');
                if (avatarLarge && newName) {
                    avatarLarge.innerText = newName.charAt(0).toUpperCase();
                }
                
                // Update header
                updateHeaderUI();
                
                // Update password if provided
                if (oldPwd && newPwd && confirmPwd) {
                    if (newPwd !== confirmPwd) {
                        showProfileMsg("Les nouveaux mots de passe ne correspondent pas", "error");
                        return;
                    }
                    if (newPwd.length < 4) {
                        showProfileMsg("Le mot de passe doit contenir au moins 4 caractères", "error");
                        return;
                    }
                    
                    try {
                        await updatePasswordInDatabase(oldPwd, newPwd);
                        showProfileMsg("🔐 Mot de passe mis à jour avec succès!", "success");
                        
                        // Clear password fields
                        document.getElementById('oldPassword').value = '';
                        document.getElementById('newPassword').value = '';
                        document.getElementById('confirmPassword').value = '';
                    } catch (pwdError) {
                        showProfileMsg("❌ " + pwdError.message, "error");
                    }
                }
                
            } catch (error) {
                console.error('Save error:', error);
                showProfileMsg("❌ " + (error.message || "Erreur lors de la mise à jour"), "error");
            } finally {
                newSaveBtn.disabled = false;
                newSaveBtn.innerHTML = 'Enregistrer les modifications';
            }
        });
    }
    
    // Attach cancel button handler
    const cancelBtn = document.getElementById('cancelProfileBtn');
    if (cancelBtn) {
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        
        newCancelBtn.addEventListener('click', () => {
            const dashboardHeader = document.querySelector('.dashboard-header');
            if (dashboardHeader) {
                dashboardHeader.style.display = 'flex';
            }
            if (typeof renderOverallDashboard === 'function') {
                renderOverallDashboard();
            } else {
                location.reload();
            }
        });
    }
}

// Helper functions
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function showProfileMsg(msg, type) {
    const container = document.getElementById('profileFormMessage');
    if(container) {
        container.innerHTML = `<div class="form-message ${type === 'success' ? 'success-message' : 'error-message'}">${msg}</div>`;
        setTimeout(() => { 
            if(container) container.innerHTML = ''; 
        }, 4000);
    }
}

// Make functions globally available
window.loadUserProfileFromDatabase = loadUserProfileFromDatabase;
window.updateHeaderUI = updateHeaderUI;
window.saveUserToStorage = saveUserToStorage;
window.loadUserFromStorage = loadUserFromStorage;
window.renderProfilePage = renderProfilePage;
window.updateProfileInDatabase = updateProfileInDatabase;
window.updatePasswordInDatabase = updatePasswordInDatabase;

console.log('profile.js loaded successfully');
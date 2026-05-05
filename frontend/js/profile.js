function renderProfilePage() {
    // Hide the dashboard header
    const dashboardHeader = document.querySelector('.dashboard-header');
    if (dashboardHeader) {
        dashboardHeader.style.display = 'none';
    }
    
    const profileHtml = `
        <div class="profile-container">
            <div class="profile-horizontal-card">
                <div class="profile-cover">
                    <div class="profile-avatar-large" id="profileAvatarLarge">${currentUser.fullName.charAt(0).toUpperCase()}</div>
                    <div class="profile-titles">
                        <h2>Mon profil</h2>
                        <p>Gérez vos informations personnelles et votre mot de passe</p>
                    </div>
                </div>
                <div class="profile-fields">
                    <div class="field-group"><label>Nom complet</label><input type="text" id="editFullName" value="${escapeHtml(currentUser.fullName)}"></div>
                    <div class="field-group"><label>Email</label><input type="email" id="editEmail" value="${escapeHtml(currentUser.email)}"></div>
                    <div class="field-group"><label>Rôle</label><input type="text" id="editRole" value="${escapeHtml(currentUser.role)}" readonly disabled style="background:#f8fafc"></div>
                    <div class="field-group"><label>Téléphone</label><input type="text" id="editPhone" value="${escapeHtml(currentUser.phone || '+212 6 12 34 56 78')}"></div>
                </div>
                <div class="password-section">
                    <h3><i class="fas fa-lock"></i> Modifier le mot de passe</h3>
                    <div class="password-row">
                        <div class="field-group"><label>Mot de passe actuel</label><input type="password" id="oldPassword" placeholder="••••••••"></div>
                        <div class="field-group"><label>Nouveau mot de passe</label><input type="password" id="newPassword" placeholder="••••••••"></div>
                        <div class="field-group"><label>Confirmer</label><input type="password" id="confirmPassword" placeholder="••••••••"></div>
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
    document.getElementById('dashboardContent').innerHTML = profileHtml;
    
    // Save button handler
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
                // 1. Update profile in database
                await updateMyProfileInDatabase(newName, newEmail, newPhone);
                
                // 2. Update password if provided
                if (oldPwd && newPwd && confirmPwd) {
                    if (newPwd !== confirmPwd) {
                        showProfileMsg("Les nouveaux mots de passe ne correspondent pas", "error");
                        return;
                    }
                    if (newPwd.length < 4) {
                        showProfileMsg("Le mot de passe doit contenir au moins 4 caractères", "error");
                        return;
                    }
                    await updateMyPasswordInDatabase(oldPwd, newPwd);
                    
                    // Clear password fields
                    document.getElementById('oldPassword').value = '';
                    document.getElementById('newPassword').value = '';
                    document.getElementById('confirmPassword').value = '';
                }
                
                showProfileMsg("✅ Profil mis à jour avec succès dans la base de données!", "success");
                
                // Update avatar
                const avatarLarge = document.getElementById('profileAvatarLarge');
                if (avatarLarge) {
                    avatarLarge.innerText = newName.charAt(0).toUpperCase();
                }
                
                // Reload user data from database
                await loadUserProfileFromDatabase();
                
            } catch (error) {
                showProfileMsg("❌ " + error.message, "error");
            } finally {
                newSaveBtn.disabled = false;
                newSaveBtn.innerHTML = 'Enregistrer les modifications';
            }
        });
    }
    
    // Cancel button handler
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
function loadUserFromStorage() {
    // First try to get from session (from login)
    const session = localStorage.getItem('ipredict_session');
    if (session) {
        try {
            const sessionData = JSON.parse(session);
            currentUser.fullName = sessionData.fullName || currentUser.fullName;
            currentUser.email = sessionData.email || currentUser.email;
            currentUser.role = sessionData.role || currentUser.role;
            currentUser.userId = sessionData.userId;
            console.log('Loaded user from session:', currentUser.fullName, currentUser.role);
        } catch(e) {
            console.error('Error parsing session:', e);
        }
    }
    
    // Then override with stored user data if exists (from profile edits)
    const stored = localStorage.getItem("ipredict_user");
    if(stored) {
        try {
            const parsed = JSON.parse(stored);
            currentUser = { ...currentUser, ...parsed };
            console.log('Loaded user from storage:', currentUser.fullName);
            console.log('Stored password hash:', currentUser.passwordHash);
        } catch(e) {}
    }
    
    // If password hash is still the default and not base64 encoded, encode it
    if (currentUser.passwordHash && currentUser.passwordHash.length < 10 && currentUser.passwordHash !== btoa(currentUser.passwordHash)) {
        // This seems to be plain text, but don't auto-encode to avoid breaking
        console.log('Password appears to be plain text:', currentUser.passwordHash);
    }
    
    updateHeaderUI();
}
function updateHeaderUI() {
    const nameSpan = document.getElementById("headerUserName");
    const roleSpan = document.getElementById("headerUserRole");
    const avatarDiv = document.getElementById("headerAvatar");
    
    if(nameSpan) {
        nameSpan.innerText = currentUser.fullName;
        console.log('Updated header name to:', currentUser.fullName);
    }
    if(roleSpan) {
        roleSpan.innerText = currentUser.role;
        console.log('Updated header role to:', currentUser.role);
    }
    if(avatarDiv) {
        // Get initials from full name
        const nameParts = currentUser.fullName.split(' ');
        let initials = nameParts[0].charAt(0).toUpperCase();
        if (nameParts.length > 1) {
            initials += nameParts[1].charAt(0).toUpperCase();
        }
        avatarDiv.innerText = initials;
        console.log('Updated avatar to:', initials);
    }
}
function logout() {
    // Clear all session data
    localStorage.removeItem('ipredict_session');
    localStorage.removeItem('ipredict_user');
    sessionStorage.removeItem('ipredict_logged_in');
    sessionStorage.removeItem('user_role');
    
    // Optional: Call backend logout API if you have one
    fetch('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }).catch(err => console.log('Logout API error:', err));
    
    // Show logout message
    showNotification('Déconnexion réussie', 'success');
    
    // Redirect to login page
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 500);
}
let currentUser = {
    fullName: "Sara alaoui",
    role: "Responsable maintenance",
    email: "sara.alaoui@ipredict.com",
    phone: "+212 6 12 34 56 78",
    userId: null,
    passwordHash: btoa("sara@2024")
};


function saveUserToStorage() {
    localStorage.setItem("ipredict_user", JSON.stringify({ 
        fullName: currentUser.fullName, 
        role: currentUser.role, 
        email: currentUser.email, 
        phone: currentUser.phone,
        userId: currentUser.userId,
        passwordHash: currentUser.passwordHash 
    }));
    console.log('User saved to storage:', currentUser.fullName);
}

const profileMenuItem = document.getElementById('profileMenuItem');
if(profileMenuItem) {
    profileMenuItem.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown?.classList.remove('show');
        renderProfilePage();
    });
}

const logoutBtn = document.getElementById('logoutBtn');
if(logoutBtn) {
    // Remove any existing listeners by cloning and replacing
    const newLogoutBtn = logoutBtn.cloneNode(true);
    logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
    
    newLogoutBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        logout();
    });
}

async function getMyProfile() {
    try {
        const token = localStorage.getItem('ipredict_token');
        const response = await fetch(`${API_URL}/users/profile/me`, {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error fetching profile');
        }
        const userData = await response.json();
        
        // Update current user object
        currentUser.fullName = userData.full_name;
        currentUser.email = userData.email;
        currentUser.phone = userData.phone_number || '';
        currentUser.role = userData.role;
        currentUser.userId = userData.user_id;
        
        saveUserToStorage();
        updateHeaderUI();
        
        return userData;
    } catch (error) {
        console.error('Error loading profile:', error);
        showNotification(error.message, 'error');
    }
}

// Update current user profile (similar to your updateUser)
// Simple function like your createUser/updateUser
async function updateMyProfile(userData) {
    try {
        const token = localStorage.getItem('ipredict_token');
        const response = await fetch(`${API_URL}/users/profile/me`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error updating profile');
        }
        
        const result = await response.json();
        showNotification('Profil mis à jour avec succès', 'success');
        
        // Refresh user data in localStorage
        await loadUserProfile();
        
        return result;
    } catch (error) {
        showNotification(error.message, 'error');
        throw error;
    }
}
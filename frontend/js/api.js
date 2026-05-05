const API_URL = 'http://localhost:3000/api';

async function getAuthToken() {
    return localStorage.getItem('ipredict_token');
}

async function apiCall(endpoint, method, data = null) {
    const token = await getAuthToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const response = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers,
        body: data ? JSON.stringify(data) : null
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API call failed');
    }
    return await response.json();
}
// ========== DYNAMIC SIDEBAR FROM DATABASE ==========
let departmentsFromDB = [];
let machinesFromDB = [];

// Fetch departments from database
async function loadDepartmentsAndMachines() {
    try {
        const token = localStorage.getItem('ipredict_token');
        
        // Fetch departments
        const deptResponse = await fetch(`${API_URL}/departments`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (deptResponse.ok) {
            departmentsFromDB = await deptResponse.json();
            console.log('Departments loaded:', departmentsFromDB);
        }
        
        // Fetch machines
        const machineResponse = await fetch(`${API_URL}/machines`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (machineResponse.ok) {
            machinesFromDB = await machineResponse.json();
            console.log('Machines loaded:', machinesFromDB);
        }
        
        // Render the sidebar with database data
        renderSidebarFromDatabase();
        
    } catch (error) {
        console.error('Error loading departments/machines:', error);
        // Fallback to static data
        renderStaticSidebar();
    }
}
async function updateMyProfileInDatabase(fullName, email, phone) {
    try {
        const token = localStorage.getItem('ipredict_token') || sessionStorage.getItem('ipredict_token');
        
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
            throw new Error(error.error || 'Erreur lors de la mise à jour du profil');
        }
        
        const result = await response.json();
        
        // Update currentUser with new data
        if (result.user) {
            currentUser.fullName = result.user.full_name;
            currentUser.email = result.user.email;
            currentUser.phone = result.user.phone_number || '';
            currentUser.role = result.user.role;
        } else if (result.full_name) {
            currentUser.fullName = result.full_name;
            currentUser.email = result.email;
            currentUser.phone = result.phone_number || '';
            currentUser.role = result.role;
        }
        
        // Update localStorage backup
        saveUserToStorage();
        updateHeaderUI();
        
        console.log('✅ Profile saved to database');
        return result;
    } catch (error) {
        console.error('Database error:', error);
        throw error;
    }
}
async function loadPumpFromDatabase(pumpId) {
    try {
        const token = localStorage.getItem('ipredict_token');
        const response = await fetch(`${API_URL}/machines/${pumpId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (response.ok) {
            const machineData = await response.json();
            console.log('Machine data:', machineData);
            // Display pump dashboard with database data
            displayPumpDashboardFromDB(machineData);
        }
    } catch (error) {
        console.error('Error loading pump:', error);
    }
}
async function loadAndDisplayMachine(machineId) {
    try {
        const token = localStorage.getItem('ipredict_token');
        const response = await fetch(`${API_URL}/machines/${machineId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Machine not found');
        
        const machine = await response.json();
        
        // Get department name
        let departmentName = 'N/A';
        if (machine.department_id) {
            const deptResponse = await fetch(`${API_URL}/departments/${machine.department_id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (deptResponse.ok) {
                const dept = await deptResponse.json();
                departmentName = dept.department_name;
            }
        }
        
        // Create a dynamic key for this machine
        const dynamicKey = `machine_${machine.machine_id}`;
        
        // Add to allPumpsData dynamically
        allPumpsData[dynamicKey] = {
            id: dynamicKey,
            name: machine.machine_name,
            dept: departmentName,
            status: machine.status || 'En ligne',
            metrics: {
                motor: { 
                    acc: 2.5, temp: 75, vib: 1.8, risk: "Moyen", 
                    predVib: 2.2, rul: 350, futureRisk: "Moyen" 
                },
                coupling: { 
                    acc: 3.2, temp: 70, vib: 2.2, align: 0.35, risk: "Moyen", 
                    predVib: 2.8, rul: 200, futureRisk: "Moyen" 
                },
                pump: { 
                    acc: 1.3, temp: 65, vib: 1.0, flow: 250, risk: "Faible", 
                    predVib: 1.2, rul: 900, futureRisk: "Faible" 
                }
            }
        };
        
        // Call the existing renderPumpDashboard function
        renderPumpDashboard(dynamicKey);
        
    } catch (error) {
        console.error('Error loading machine:', error);
        document.getElementById('dashboardContent').innerHTML = `
            <div class="machine-title">
                <div class="machine-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <div class="machine-info">
                    <h1>Machine #${machineId}</h1>
                    <p>Erreur de chargement: ${error.message}</p>
                </div>
            </div>
        `;
    }
}
async function sendPredictionEmail(machineName, machineId) {
    try {
        const token = localStorage.getItem('ipredict_token');
        
        if (!token) {
            showNotification('❌ Veuillez vous reconnecter', 'error');
            return false;
        }
        
        const response = await fetch(`${API_URL}/email/send-prediction-alert`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                machineName: machineName,
                machineId: machineId,
                hoursToFailure: 12
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (result.mock) {
                showNotification(`📧 [TEST] Email simulé - Vérifiez la console`, 'info');
            } else {
                showNotification(`✅ Alerte envoyée par email!`, 'success');
            }
            return true;
        } else {
            showNotification(`❌ Erreur: ${result.error}`, 'error');
            return false;
        }
    } catch (error) {
        console.error('Send email error:', error);
        showNotification('❌ Erreur de connexion', 'error');
        return false;
    }
}
async function updateProfileInDatabase(fullName, email, phone) {
    try {
        const result = await apiCall('/users/profile/me', 'PUT', {
            full_name: fullName,
            email: email,
            phone_number: phone
        });
        
        if (result.success) {
            // Update local storage
            currentUser.fullName = result.user.full_name;
            currentUser.email = result.user.email;
            currentUser.phone = result.user.phone_number;
            currentUser.role = result.user.role;
            saveUserToStorage();
            updateHeaderUI();
            
            showNotification('Profil mis à jour avec succès', 'success');
            return true;
        }
        return false;
    } catch (error) {
        showNotification(error.message, 'error');
        return false;
    }
}

// Update password in database
async function updatePasswordInDatabase(currentPassword, newPassword) {
    try {
        const result = await apiCall('/users/profile/me/password', 'PUT', {
            current_password: currentPassword,
            new_password: newPassword
        });
        
        if (result.success) {
            showNotification('Mot de passe mis à jour avec succès', 'success');
            return true;
        }
        return false;
    } catch (error) {
        showNotification(error.message, 'error');
        return false;
    }
}

// Load user profile from database
async function loadUserProfile() {
    try {
        const userData = await apiCall('/users/profile/me', 'GET');
        currentUser.fullName = userData.full_name;
        currentUser.email = userData.email;
        currentUser.phone = userData.phone_number || '';
        currentUser.role = userData.role;
        currentUser.userId = userData.user_id;
        saveUserToStorage();
        updateHeaderUI();
        return true;
    } catch (error) {
        console.error('Failed to load profile:', error);
        return false;
    }
}
async function loadUserProfile() {
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
            throw new Error('Error loading profile');
        }
        
        const userData = await response.json();
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
        // Fallback to localStorage
        loadUserFromStorage();
    }
}
async function updateMyPassword(passwordData) {
    try {
        const token = localStorage.getItem('ipredict_token');
        const response = await fetch(`${API_URL}/users/profile/me/password`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(passwordData)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error updating password');
        }
        const result = await response.json();
        
        // Update local password hash
        if (passwordData.new_password) {
            currentUser.passwordHash = btoa(passwordData.new_password);
            saveUserToStorage();
        }
        
        showNotification('Mot de passe mis à jour avec succès', 'success');
        return result;
    } catch (error) {
        showNotification(error.message, 'error');
        throw error;
    }
}
async function updateMyPasswordInDatabase(currentPassword, newPassword) {
    try {
        const token = localStorage.getItem('ipredict_token') || sessionStorage.getItem('ipredict_token');
        
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
            throw new Error(error.error || 'Mot de passe actuel incorrect');
        }
        
        const result = await response.json();
        
        // Update local password hash
        currentUser.passwordHash = btoa(newPassword);
        saveUserToStorage();
        
        console.log('✅ Password updated in database');
        return result;
    } catch (error) {
        console.error('Password error:', error);
        throw error;
    }
}

// Load user profile from database
async function loadUserProfileFromDatabase() {
    try {
        const token = localStorage.getItem('ipredict_token') || sessionStorage.getItem('ipredict_token');
        
        if (!token) {
            console.log('No token found, using localStorage');
            loadUserFromStorage();
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
            throw new Error('Error loading profile from database');
        }
        
        const userData = await response.json();
        
        // Update currentUser
        currentUser.fullName = userData.full_name;
        currentUser.email = userData.email;
        currentUser.phone = userData.phone_number || '';
        currentUser.role = userData.role;
        currentUser.userId = userData.user_id;
        
        // Save to localStorage as backup
        saveUserToStorage();
        updateHeaderUI();
        
        console.log('✅ Profile loaded from database');
        return userData;
    } catch (error) {
        console.error('Database load error:', error);
        // Fallback to localStorage
        loadUserFromStorage();
    }
}
async function saveUserToDatabase(userData) {
    try {
        const token = localStorage.getItem('ipredict_token');
        const response = await fetch(`${API_URL}/users/profile/me`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                full_name: userData.fullName,
                email: userData.email,
                phone_number: userData.phone
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error saving to database');
        }
        
        const result = await response.json();
        console.log('✅ User saved to DATABASE:', result.user);
        
        // Also update localStorage as backup
        saveUserToStorage();
        
        return result;
    } catch (error) {
        console.error('❌ Database save error:', error);
        showNotification('Erreur base de données: ' + error.message, 'error');
        throw error;
    }
}

// LOAD FROM DATABASE (not localStorage)
async function loadUserFromDatabase() {
    try {
        const token = localStorage.getItem('ipredict_token');
        if (!token) {
            console.log('No token found, using localStorage');
            loadUserFromStorage();
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
            throw new Error('Error loading from database');
        }
        
        const userData = await response.json();
        
        // Update currentUser from DATABASE
        currentUser.fullName = userData.full_name;
        currentUser.email = userData.email;
        currentUser.phone = userData.phone_number || '';
        currentUser.role = userData.role;
        currentUser.userId = userData.user_id;
        
        // Also save to localStorage as backup
        saveUserToStorage();
        updateHeaderUI();
        
        console.log('✅ User loaded from DATABASE:', currentUser.fullName);
        return userData;
    } catch (error) {
        console.error('❌ Database load error:', error);
        // Fallback to localStorage
        loadUserFromStorage();
    }
}
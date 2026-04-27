// session-check.js - Place this in your frontend/js/ folder
// Include this script in all protected pages (admin_dashboard.html and index.html)

(function() {
    const session = localStorage.getItem('ipredict_session');
    const isLoggedIn = sessionStorage.getItem('ipredict_logged_in');
    
    // Check if user is logged in
    if (!session || !isLoggedIn) {
        console.log('No session found, redirecting to login...');
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const userData = JSON.parse(session);
        const currentPage = window.location.pathname;
        const currentPageName = currentPage.split('/').pop();
        
        console.log('Session check - User:', userData.full_name, 'Role:', userData.role);
        console.log('Current page:', currentPageName);
        
        // Check if user has access to current page
        if (currentPageName === 'admin_dashboard.html' && userData.role !== 'Admin') {
            console.log('Non-admin trying to access admin page, redirecting...');
            window.location.href = 'index.html';
            return;
        }
        
        // Optional: Display user info in header (add these elements to your HTML)
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = userData.fullName;
        }
        
        const userRoleElement = document.getElementById('userRole');
        if (userRoleElement) {
            userRoleElement.textContent = userData.role;
        }
        
        // Check session expiry (24 hours)
        const loginTime = new Date(userData.loginTime);
        const now = new Date();
        const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
        
        if (hoursDiff > 24) {
            console.log('Session expired (more than 24 hours), logging out...');
            logout();
        }
        
    } catch (e) {
        console.error('Session parsing error:', e);
        window.location.href = 'login.html';
    }
})();

// Global logout function (can be called from anywhere)
window.logout = function() {
    console.log('Logging out...');
    localStorage.removeItem('ipredict_session');
    sessionStorage.removeItem('ipredict_logged_in');
    sessionStorage.removeItem('user_role');
    window.location.href = 'login.html';
};
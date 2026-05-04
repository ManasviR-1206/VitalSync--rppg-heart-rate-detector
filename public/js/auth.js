/* 
   VitalSync Auth & Logic Handler
*/

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const errorMsg = document.getElementById('errorMsg');

    // Check session on load
    checkSession();

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok) {
                    window.location.href = 'dashboard.html';
                } else {
                    errorMsg.textContent = data.error || 'Login failed';
                    errorMsg.style.display = 'block';
                }
            } catch (err) {
                errorMsg.textContent = 'Server connection error';
                errorMsg.style.display = 'block';
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = 'index.html';
        });
    }

    async function checkSession() {
        // Simple way to protect dash board
        if (window.location.pathname.includes('dashboard.html')) {
            try {
                const res = await fetch('/api/auth/session');
                if (!res.ok) {
                    window.location.href = 'auth.html';
                } else {
                    const data = await res.json();
                    const userNameEl = document.getElementById('userName');
                    if (userNameEl) userNameEl.textContent = `Dr. ${data.user.username}`;
                }
            } catch (err) {
                window.location.href = 'auth.html';
            }
        }
    }
});

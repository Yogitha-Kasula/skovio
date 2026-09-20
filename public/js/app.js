const API_URL = '/api';

function showAlert(message, type = 'error') {
    const alertBox = document.getElementById('alert');
    if (alertBox) {
        alertBox.textContent = message;
        alertBox.className = `alert ${type}`;
    }
}

function hideAlert() {
    const alertBox = document.getElementById('alert');
    if (alertBox) {
        alertBox.className = 'alert';
    }
}

function setLoading(btnId, isLoading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (isLoading) {
        btn.classList.add('loading');
        btn.disabled = true;
    } else {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();
        setLoading('btn-register', true);
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            
            if (response.ok) {
                localStorage.setItem('pendingVerificationEmail', email);
                window.location.href = '/verify.html';
            } else {
                showAlert(data.error || 'Registration failed');
            }
        } catch (err) {
            showAlert('Network error occurred');
        } finally {
            setLoading('btn-register', false);
        }
    });
}

const verifyForm = document.getElementById('verify-form');
if (verifyForm) {
    const emailToVerify = localStorage.getItem('pendingVerificationEmail');
    if (!emailToVerify) {
        window.location.href = '/register.html';
    } else {
        const displayElem = document.getElementById('verify-email-display');
        if (displayElem) displayElem.textContent = emailToVerify;
    }

    verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();
        setLoading('btn-verify', true);
        
        const otp = document.getElementById('otp').value;

        try {
            const response = await fetch(`${API_URL}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailToVerify, otp })
            });
            const data = await response.json();
            
            if (response.ok) {
                showAlert(data.message, 'success');
                setTimeout(() => {
                    localStorage.removeItem('pendingVerificationEmail');
                    window.location.href = '/index.html';
                }, 1500);
            } else {
                showAlert(data.error || 'Verification failed');
            }
        } catch (err) {
            showAlert('Network error occurred');
        } finally {
            setLoading('btn-verify', false);
        }
    });

    const resendBtn = document.getElementById('btn-resend');
    if (resendBtn) {
        resendBtn.addEventListener('click', async () => {
            hideAlert();
            resendBtn.disabled = true;
            resendBtn.textContent = 'Sending...';

            try {
                const response = await fetch(`${API_URL}/resend-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: emailToVerify })
                });
                const data = await response.json();
                
                if (response.ok) {
                    showAlert('New OTP sent to your email', 'success');
                } else {
                    showAlert(data.error || 'Failed to resend OTP');
                }
            } catch (err) {
                showAlert('Network error occurred');
            } finally {
                resendBtn.disabled = false;
                resendBtn.textContent = 'Resend OTP';
            }
        });
    }
}

const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();
        setLoading('btn-login', true);
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            
            if (response.ok) {
                localStorage.setItem('token', data.token);
                window.location.href = '/dashboard.html';
            } else {
                if (data.requiresVerification) {
                    localStorage.setItem('pendingVerificationEmail', email);
                    showAlert('Email not verified. Redirecting...');
                    setTimeout(() => window.location.href = '/verify.html', 1500);
                } else {
                    showAlert(data.error || 'Login failed');
                }
            }
        } catch (err) {
            showAlert('Network error occurred');
        } finally {
            setLoading('btn-login', false);
        }
    });
}

if (window.location.pathname.endsWith('dashboard.html')) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
    } else {
        fetch(`${API_URL}/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                localStorage.removeItem('token');
                window.location.href = '/index.html';
            } else {
                document.getElementById('user-email').textContent = data.user.email;
                document.getElementById('user-initial').textContent = data.user.email.charAt(0).toUpperCase();
            }
        })
        .catch(() => {
            localStorage.removeItem('token');
            window.location.href = '/index.html';
        });

        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('token');
                window.location.href = '/index.html';
            });
        }
    }
}

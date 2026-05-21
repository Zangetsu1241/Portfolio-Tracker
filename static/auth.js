document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('authForm');
    const authTitle = document.getElementById('authTitle');
    const authToggleText = document.getElementById('authToggleText');
    const authToggleLink = document.getElementById('authToggleLink');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const errorMsg = document.getElementById('errorMsg');
    
    let isLogin = true;

    authToggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        isLogin = !isLogin;
        
        if (isLogin) {
            authTitle.textContent = "Welcome Back";
            authSubmitBtn.textContent = "Log In";
            authToggleText.textContent = "Don't have an account? ";
            authToggleLink.textContent = "Sign Up";
        } else {
            authTitle.textContent = "Create Account";
            authSubmitBtn.textContent = "Sign Up";
            authToggleText.textContent = "Already have an account? ";
            authToggleLink.textContent = "Log In";
        }
        
        errorMsg.style.display = 'none';
        authForm.reset();
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        const endpoint = isLogin ? '/api/login' : '/api/register';
        
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                window.location.href = '/';
            } else {
                errorMsg.textContent = data.error || "Authentication failed.";
                errorMsg.style.display = 'block';
            }
        } catch (err) {
            errorMsg.textContent = "Network error. Please try again.";
            errorMsg.style.display = 'block';
        }
    });
});

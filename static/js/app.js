// app.js - Frontend JavaScript for modals, auth, and recommendations
// Uses Fetch API for backend calls. Reloads page on auth changes for simplicity.
// Updated: Recommendation form opens detailed view in new tab with AI chat refinement.
// Includes post-login training animation with Kaggle dataset stats.

document.addEventListener('DOMContentLoaded', function () {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const recommendForm = document.getElementById('recommendForm');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginError = document.getElementById('loginError');
    const regError = document.getElementById('regError');
    const resultsDiv = document.getElementById('results');

    // Modal open/close functions
    function openModal(modal) {
        modal.style.display = 'block';
    }

    function closeModal(modal) {
        modal.style.display = 'none';
    }

    // Close modals on outside click or X
    window.onclick = function (event) {
        if (event.target.classList.contains('modal')) {
            closeModal(event.target);
        }
    };

    // Close on X click
    document.querySelectorAll('.close').forEach(close => {
        close.onclick = function () {
            closeModal(this.parentElement.parentElement);
        };
    });

    // Login button
    if (loginBtn) {
        loginBtn.onclick = function () {
            openModal(loginModal);
            if (loginError) loginError.textContent = '';  // Clear errors
        };
    }

    // Register button
    if (registerBtn) {
        registerBtn.onclick = function () {
            openModal(registerModal);
            if (regError) regError.textContent = '';  // Clear errors
        };
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.onclick = async function () {
            try {
                const response = await fetch('/logout', { method: 'POST' });
                const data = await response.json();
                if (data.success) {
                    location.reload();  // Reload to show login page
                } else {
                    alert('Logout failed');
                }
            } catch (error) {
                console.error('Logout error:', error);
                alert('Network error');
            }
        };
    }

    // Register form submit
    if (registerForm) {
        registerForm.onsubmit = async function (e) {
            e.preventDefault();
            const username = document.getElementById('regUsername').value.trim();
            const password = document.getElementById('regPassword').value;

            if (!username || !password) {
                if (regError) regError.textContent = 'Username and password required.';
                return;
            }

            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await response.json();

                if (data.success) {
                    alert(data.message);
                    closeModal(registerModal);
                    location.reload();  // Reload to enable login
                } else {
                    if (regError) regError.textContent = data.error || 'Registration failed.';
                }
            } catch (error) {
                console.error('Register error:', error);
                if (regError) regError.textContent = 'Network error. Try again.';
            }
        };
    }

    // Login form submit
    if (loginForm) {
        loginForm.onsubmit = async function (e) {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;

            if (!username || !password) {
                if (loginError) loginError.textContent = 'Username and password required.';
                return;
            }

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await response.json();

                if (data.success) {
                    alert(data.message);
                    closeModal(loginModal);

                    // Show training animation before full reload
                    showTrainingAnimation();

                    // After animation, reload to show recommendation form
                    setTimeout(() => {
                        location.reload();
                    }, 4000);  // 4 seconds total (3s anim + fade)

                } else {
                    if (loginError) loginError.textContent = data.error || 'Invalid credentials.';
                }
            } catch (error) {
                console.error('Login error:', error);
                if (loginError) loginError.textContent = 'Network error. Try again.';
            }
        };
    }

    // Recommendation form submit (only if logged in) - Updated for new tab with details
    if (recommendForm) {
        recommendForm.onsubmit = async function (e) {
            e.preventDefault();
            const formData = {
                N: parseFloat(document.getElementById('N').value),
                P: parseFloat(document.getElementById('P').value),
                K: parseFloat(document.getElementById('K').value),
                temperature: parseFloat(document.getElementById('temperature').value),
                humidity: parseFloat(document.getElementById('humidity').value),
                ph: parseFloat(document.getElementById('ph').value),
                rainfall: parseFloat(document.getElementById('rainfall').value),
                season: document.getElementById('season').value
            };

            // Basic client-side validation
            const numericFields = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall'];
            if (numericFields.some(field => isNaN(formData[field]) || formData[field] <= 0)) {
                alert('Please enter valid positive values for all numeric fields.');
                return;
            }

            try {
                if (resultsDiv) resultsDiv.innerHTML = '<p>Generating detailed recommendations...</p>';

                // Call detailed endpoint for expanded data
                const response = await fetch('/api/detailed-recommend', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                const data = await response.json();

                // Inside recommendForm.onsubmit, after const data = await response.json(); if (data.success) { ... }
                if (data.success) {
                    // Prepare payload and URL (as before)
                    const payload = { recommendations: data.recommendations, user_inputs: formData };
                    const encodedData = encodeURIComponent(JSON.stringify(payload));
                    const newTabUrl = `/detailed-recommendations?data=${encodedData}`;

                    // Open new tab
                    window.open(newTabUrl, '_blank', 'width=1000,height=700,scrollbars=yes,resizable=yes');

                    // Show summary with button on original page
                    let html = '<h3>Detailed analysis opening in new tab...</h3><ul>';
                    data.recommendations.slice(0, 3).forEach(rec => {
                        html += `<li><strong>${rec.crop}</strong> (Score: ${rec.score}) - ${rec.description.substring(0, 50)}...</li>`;
                    });
                    html += '</ul>';
                    html += `<p><button onclick="window.open('${newTabUrl}', '_blank')" class="view-details-btn">View Full Details</button></p>`;
                    if (resultsDiv) resultsDiv.innerHTML = html;
                }
            } catch (error) {
                console.error('Recommendation error:', error);
                if (resultsDiv) resultsDiv.innerHTML = '<p class="error">Network error. Try again.</p>';
            }
        };
    }

    // Training Animation Function (Post-Login)
    function showTrainingAnimation() {
        const overlay = document.getElementById('training-overlay');
        if (!overlay) return;  // Skip if no overlay element

        const progressFill = overlay.querySelector('.progress-fill');
        const progressLabel = document.getElementById('progress-label');
        const trainingText = document.getElementById('training-text');
        const statsDisplay = document.getElementById('stats-display');

        if (!progressFill || !progressLabel || !trainingText || !statsDisplay) return;

        overlay.classList.remove('hidden');
        overlay.classList.add('overlay');  // Show overlay

        // Fetch real dataset stats
        fetch('/api/dataset-info')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const stats = data.stats;
                    statsDisplay.innerHTML = `
                        <p>📈 Loading ${stats.num_samples} samples from ${stats.source}</p>
                        <p>🌱 Training on ${stats.num_crops} crops (e.g., ${stats.example_crops.join(', ')}...)</p>
                        <p>🧠 Analyzing soil N/P/K, climate, and seasons...</p>
                    `;
                } else {
                    statsDisplay.innerHTML = '<p>Dataset ready! (Kaggle-powered)</p>';
                }
            })
            .catch(() => {
                statsDisplay.innerHTML = '<p>Dataset ready! (2,200+ samples)</p>';
            });

        // Animate progress bar
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            if (progressFill) progressFill.style.width = progress + '%';
            if (progressLabel) progressLabel.textContent = progress + '%';

            if (trainingText) {
                trainingText.textContent = progress === 50 ? 'Building decision tree...' :
                    progress === 100 ? 'Model trained! Ready for recommendations.' :
                        'Processing climate data...';
            }

            if (progress >= 100) {
                clearInterval(interval);
                // Fade out
                setTimeout(() => {
                    overlay.classList.add('fade-out');
                    setTimeout(() => {
                        overlay.classList.add('hidden');
                        overlay.classList.remove('overlay', 'fade-out');
                    }, 500);
                }, 500);
            }
        }, 200);  // 200ms intervals = ~2s to 100%
    }
});
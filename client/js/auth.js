/* ═══════════════════════════════════════════════════════
   Auth Module — Mock auth with localStorage
   Swap for Firebase Auth later
   ═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // If already authenticated, redirect to dashboard
  const user = localStorage.getItem('pulsenet_user');
  if (user && window.location.pathname.endsWith('index.html') || user && window.location.pathname === '/') {
    window.location.href = 'dashboard.html';
    return;
  }

  const form = document.getElementById('auth-form');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const name = document.getElementById('auth-name').value.trim();
    const phone = document.getElementById('auth-phone').value.trim();
    const email = document.getElementById('auth-email').value.trim();

    if (!name) {
      alert('Please enter your name');
      return;
    }

    // Generate a unique user ID
    const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    const userData = {
      id: userId,
      displayName: name,
      phone: phone || '',
      email: email || '',
      createdAt: Date.now(),
    };

    localStorage.setItem('pulsenet_user', JSON.stringify(userData));

    // Redirect to dashboard
    window.location.href = 'dashboard.html';
  });
})();

/* ═══════════════════════════════════════════════════════
   Profile / Settings Module
   ═══════════════════════════════════════════════════════ */

const PulseProfile = (function () {
  'use strict';

  function init() {
    loadProfile();
    loadEmergencyContacts();

    // Add contact button
    const addBtn = document.getElementById('add-contact-btn');
    if (addBtn) addBtn.addEventListener('click', addEmergencyContact);

    // Logout
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    // Volunteer toggle
    const volunteerToggle = document.getElementById('toggle-volunteer');
    if (volunteerToggle) {
      const isVolunteer = localStorage.getItem('pulsenet_volunteer') === 'true';
      volunteerToggle.checked = isVolunteer;
      volunteerToggle.addEventListener('change', (e) => {
        localStorage.setItem('pulsenet_volunteer', e.target.checked);
      });
    }
  }

  function loadProfile() {
    const user = PulseSocket.getUser();
    if (!user) return;

    const avatar = document.getElementById('profile-avatar');
    const name = document.getElementById('profile-name');
    const email = document.getElementById('profile-email');
    const nameValue = document.getElementById('setting-name-value');
    const phoneValue = document.getElementById('setting-phone-value');
    const ratingElement = document.getElementById('profile-rating');

    if (avatar) avatar.textContent = user.displayName.charAt(0).toUpperCase();
    if (name) name.textContent = user.displayName;
    if (email) email.textContent = user.email || user.phone || 'Prototype user';
    if (nameValue) nameValue.textContent = user.displayName;
    if (phoneValue) phoneValue.textContent = user.phone || 'Not set';
    
    // Default to 5.0 rating for the prototype if undefined
    if (ratingElement) ratingElement.textContent = `⭐️ ${user.trustRating || '5.0'} (Trust Score)`;
  }

  function loadEmergencyContacts() {
    const contacts = JSON.parse(localStorage.getItem('pulsenet_contacts') || '[]');
    renderContacts(contacts);
  }

  function renderContacts(contacts) {
    const list = document.getElementById('emergency-contacts-list');
    if (!list) return;

    if (contacts.length === 0) {
      list.innerHTML = `
        <li class="contact-item" style="justify-content:center; color: var(--text-muted); font-size:13px; padding: 20px;">
          No emergency contacts added yet
        </li>`;
      return;
    }

    list.innerHTML = contacts.map((contact, index) => `
      <li class="contact-item">
        <div class="contact-info">
          <div class="contact-avatar">${contact.name.charAt(0).toUpperCase()}</div>
          <div>
            <div class="contact-name">${contact.name}</div>
            <div class="contact-phone">${contact.phone} · ${contact.relationship}</div>
          </div>
        </div>
        <button class="btn btn-ghost" onclick="PulseProfile.removeContact(${index})" style="font-size:18px;color:var(--danger);">✕</button>
      </li>
    `).join('');
  }

  function addEmergencyContact() {
    const modal = document.getElementById('contact-modal-overlay');
    const nameInput = document.getElementById('contact-name-input');
    const phoneInput = document.getElementById('contact-phone-input');
    const relInput = document.getElementById('contact-rel-input');
    
    if (!modal) return;
    
    // Clear previous inputs
    nameInput.value = '';
    phoneInput.value = '';
    relInput.value = '';
    
    modal.classList.add('show');
    
    const cancelBtn = document.getElementById('contact-modal-cancel');
    const saveBtn = document.getElementById('contact-modal-save');
    
    saveBtn.onclick = function() {
      const name = nameInput.value.trim();
      const phone = phoneInput.value.trim();
      const relationship = relInput.value.trim() || 'Other';
      
      if (!name || !phone) {
        alert('Please provide both a name and phone number.');
        return;
      }
      
      const contacts = JSON.parse(localStorage.getItem('pulsenet_contacts') || '[]');
      contacts.push({ name, phone, relationship });
      localStorage.setItem('pulsenet_contacts', JSON.stringify(contacts));
      
      renderContacts(contacts);
      modal.classList.remove('show');
    };
    
    cancelBtn.onclick = function() {
      modal.classList.remove('show');
    };
  }

  function removeContact(index) {
    const contacts = JSON.parse(localStorage.getItem('pulsenet_contacts') || '[]');
    contacts.splice(index, 1);
    localStorage.setItem('pulsenet_contacts', JSON.stringify(contacts));
    renderContacts(contacts);
  }

  function logout() {
    if (confirm('Sign out of PulseNet?')) {
      PulseSocket.disconnect();
      PulseLocation.stop();
      localStorage.removeItem('pulsenet_user');
      window.location.href = 'index.html';
    }
  }

  return {
    init,
    removeContact,
  };
})();

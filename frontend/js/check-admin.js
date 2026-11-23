// Hidden entry to the admin page: click the logo on the home page.
// The password is checked by the server, it is not stored in the site code.
import { getToken, login } from './admin-auth.js';

document.addEventListener('click', async (e) => {
  const logo = e.target.closest('.logo-click');
  if (!logo) return;

  e.preventDefault();
  const adminUrl = logo.dataset.adminUrl || 'admin.html';

  if (getToken()) {
    window.location.href = adminUrl;
    return;
  }

  const password = prompt('Введіть пароль адміністратора:');
  if (password === null || password === '') return;

  const result = await login(password);
  if (result.ok) {
    window.location.href = adminUrl;
  } else {
    alert(result.message);
  }
});

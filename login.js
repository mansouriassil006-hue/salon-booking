const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');
const loginMessage = document.getElementById('loginMessage');

checkExistingSession();

async function checkExistingSession() {
  const { data } = await supabaseClient.auth.getSession();
  if (data && data.session) {
    window.location.href = 'dashboard.html';
  }
}

loginBtn.addEventListener('click', doLogin);

passwordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') doLogin();
});

async function doLogin() {
  hideBox(loginMessage);

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email) return showBox(loginMessage, 'الرجاء إدخال البريد الإلكتروني', true);
  if (!password) return showBox(loginMessage, 'الرجاء إدخال كلمة المرور', true);

  loginBtn.disabled = true;
  loginBtn.textContent = 'جاري تسجيل الدخول...';

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password
  });

  loginBtn.disabled = false;
  loginBtn.textContent = 'تسجيل الدخول';

  if (error) {
    return showBox(loginMessage, 'البريد الإلكتروني أو كلمة المرور غير صحيحة.', true);
  }

  window.location.href = 'dashboard.html';
}

function showBox(el, text, isError) {
  el.textContent = text;
  el.className = 'message-box ' + (isError ? 'error' : 'success');
}

function hideBox(el) {
  el.textContent = '';
  el.className = 'message-box';
}

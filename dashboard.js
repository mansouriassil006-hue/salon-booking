let myRole = null;
let myCoiffeurId = null;
let isAdminUser = false;

const welcomeTitle = document.getElementById('welcomeTitle');
const welcomeSubtitle = document.getElementById('welcomeSubtitle');
const logoutBtn = document.getElementById('logoutBtn');
const dayoffStatus = document.getElementById('dayoffStatus');
const toggleDayoffBtn = document.getElementById('toggleDayoffBtn');
const dayoffMessage = document.getElementById('dayoffMessage');
const bookingsContainer = document.getElementById('bookingsContainer');
const refreshBtn = document.getElementById('refreshBtn');

init();

async function init() {
  const { data: sessionData } = await supabaseClient.auth.getSession();

  if (!sessionData || !sessionData.session) {
    window.location.href = 'login.html';
    return;
  }

  const { data: roleData, error: roleError } = await supabaseClient.rpc('get_my_role');

  if (roleError || !roleData || roleData.length === 0) {
    welcomeSubtitle.textContent = 'حدث خطأ أثناء تحميل بيانات الحساب.';
    return;
  }

  const role = roleData[0];
  isAdminUser = role.is_admin;
  myCoiffeurId = role.coiffeur_id;

  if (isAdminUser) {
    welcomeTitle.textContent = 'لوحة تحكم الإدارة';
    welcomeSubtitle.textContent = 'مرحباً بك، تعرض كل الحجوزات';
  } else if (myCoiffeurId) {
    welcomeTitle.textContent = 'لوحة تحكم الحلاق';
    welcomeSubtitle.textContent = 'مرحباً ' + role.coiffeur_name;
  } else {
    welcomeTitle.textContent = 'غير مصرح';
    welcomeSubtitle.textContent = 'حسابك غير مرتبط بأي صلاحية. تواصل مع الإدارة.';
    return;
  }

  await loadDayoffStatus();
  await loadBookings();
}

logoutBtn.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  window.location.href = 'login.html';
});

refreshBtn.addEventListener('click', loadBookings);

async function loadDayoffStatus() {
  if (isAdminUser && !myCoiffeurId) {
    dayoffStatus.textContent = 'إدارة تعطيل الأيام متاحة من قسم خاص (قريباً). كأدمن، يمكنك التركيز على مراقبة الحجوزات.';
    toggleDayoffBtn.style.display = 'none';
    return;
  }

  const { data, error } = await supabaseClient.rpc('get_staff_dayoffs');

  if (error) {
    dayoffStatus.textContent = 'حدث خطأ أثناء تحميل حالة التعطيل.';
    return;
  }

  const todayStr = getTodayLocalDateString();
  const todayOff = data.find(d => d.day_off_date === todayStr);

  if (todayOff) {
    dayoffStatus.innerHTML = '<span class="dayoff-badge">أنت معطل اليوم</span>';
    toggleDayoffBtn.style.display = 'none';

    const cancelDayoffBtn = document.createElement('button');
    cancelDayoffBtn.className = 'btn-cancel-dayoff';
    cancelDayoffBtn.textContent = 'إلغاء التعطيل والعودة للعمل اليوم';
    cancelDayoffBtn.addEventListener('click', async () => {
      const { error: removeError } = await supabaseClient.rpc('remove_my_dayoff', { p_dayoff_id: todayOff.id });
      if (removeError) {
        showBox(dayoffMessage, 'حدث خطأ أثناء إلغاء التعطيل.', true);
        return;
      }
      await loadDayoffStatus();
    });

    dayoffStatus.parentNode.insertBefore(cancelDayoffBtn, dayoffMessage);
  } else {
    dayoffStatus.textContent = 'أنت متاح للعمل اليوم.';
    toggleDayoffBtn.style.display = 'block';
  }
}

toggleDayoffBtn.addEventListener('click', async () => {
  hideBox(dayoffMessage);

  const confirmed = confirm('هل أنت متأكد من تعطيل اليوم؟ لن يتمكن العملاء من الحجز معك اليوم.');
  if (!confirmed) return;

  toggleDayoffBtn.disabled = true;

  const todayStr = getTodayLocalDateString();

  const { error } = await supabaseClient.rpc('add_my_dayoff', {
    p_coiffeur_id: myCoiffeurId,
    p_date: todayStr
  });

  toggleDayoffBtn.disabled = false;

  if (error) {
    if (error.message.includes('DAYOFF_BLOCKED_HAS_BOOKINGS')) {
      showBox(dayoffMessage, 'لا يمكن التعطيل، يوجد حجوزات مؤكدة اليوم. قم بإلغائها أولاً.', true);
    } else {
      showBox(dayoffMessage, 'حدث خطأ أثناء التعطيل.', true);
    }
    return;
  }

  await loadDayoffStatus();
});

async function loadBookings() {
  bookingsContainer.innerHTML = '<p class="note">جاري التحميل...</p>';

  const { data, error } = await supabaseClient.rpc('get_staff_bookings');

  if (error) {
    bookingsContainer.innerHTML = '<p class="note" style="color:#ff6b6b;">حدث خطأ أثناء تحميل الحجوزات.</p>';
    return;
  }

  if (!data || data.length === 0) {
    bookingsContainer.innerHTML = '<p class="note">لا توجد حجوزات اليوم.</p>';
    return;
  }

  bookingsContainer.innerHTML = '';

  data.forEach(b => {
    const item = document.createElement('div');
    item.className = 'booking-item';

    const timeStr = b.start_time.substring(0, 5);

    item.innerHTML = `
      <div class="booking-item-header">
        <span class="booking-time">${timeStr}</span>
        ${isAdminUser ? '<span class="booking-coiffeur-tag">' + escapeHtml(b.coiffeur_name) + '</span>' : ''}
      </div>
      <div class="booking-client">${escapeHtml(b.prenom)} ${escapeHtml(b.nom)}</div>
      <div class="booking-phone">${escapeHtml(b.telephone)}</div>
      <div class="booking-service">${escapeHtml(b.service_name)}</div>
    `;

    const cancelButton = document.createElement('button');
    cancelButton.className = 'btn-cancel-small';
    cancelButton.textContent = 'إلغاء هذا الحجز';
    cancelButton.addEventListener('click', async () => {
      const confirmed = confirm('هل أنت متأكد من إلغاء حجز ' + b.prenom + ' ' + b.nom + '؟');
      if (!confirmed) return;

      cancelButton.disabled = true;
      cancelButton.textContent = 'جاري الإلغاء...';

      const { error: cancelError } = await supabaseClient.rpc('staff_cancel_booking', {
        p_booking_id: b.id
      });

      if (cancelError) {
        alert('حدث خطأ أثناء الإلغاء.');
        cancelButton.disabled = false;
        cancelButton.textContent = 'إلغاء هذا الحجز';
        return;
      }

      await loadBookings();
    });

    item.appendChild(cancelButton);
    bookingsContainer.appendChild(item);
  });
}

function getTodayLocalDateString() {
  const now = new Date();
  const algiersOffsetDate = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Algiers' }));
  const year = algiersOffsetDate.getFullYear();
  const month = String(algiersOffsetDate.getMonth() + 1).padStart(2, '0');
  const day = String(algiersOffsetDate.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showBox(el, text, isError) {
  el.textContent = text;
  el.className = 'message-box ' + (isError ? 'error' : 'success');
}

function hideBox(el) {
  el.textContent = '';
  el.className = 'message-box';
}

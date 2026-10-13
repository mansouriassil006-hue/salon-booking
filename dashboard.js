let myRole = null;
let myCoiffeurId = null;
let isAdminUser = false;

const welcomeTitle = document.getElementById('welcomeTitle');
const welcomeSubtitle = document.getElementById('welcomeSubtitle');
const logoutBtn = document.getElementById('logoutBtn');

const extraHoursCard = document.getElementById('extraHoursCard');
const customSlotTimeInput = document.getElementById('customSlotTimeInput');
const addCustomSlotBtn = document.getElementById('addCustomSlotBtn');
const customSlotMessage = document.getElementById('customSlotMessage');
const customSlotsListContainer = document.getElementById('customSlotsListContainer');

const dayoffCard = document.getElementById('dayoffCard');
const dayoffDateInput = document.getElementById('dayoffDateInput');
const addDayoffBtn = document.getElementById('addDayoffBtn');
const dayoffMessage = document.getElementById('dayoffMessage');
const dayoffListContainer = document.getElementById('dayoffListContainer');

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
    dayoffCard.style.display = 'none';
    extraHoursCard.style.display = 'none';
    return;
  }

  if (isAdminUser && !myCoiffeurId) {
    dayoffCard.innerHTML = '<h2 class="section-title">تعطيل الأيام (Day Off)</h2><p class="note">ميزة تعطيل الأيام متاحة فقط لحساب الحلاق المرتبط بحلاق معين.</p>';
    extraHoursCard.style.display = 'none';
  } else {
    const todayStr = getTodayLocalDateString();
    dayoffDateInput.min = todayStr;
    dayoffDateInput.value = todayStr;
    await loadDayoffList();
    await loadCustomSlotsList();
  }

  await loadBookings();
}

logoutBtn.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  window.location.href = 'login.html';
});

refreshBtn.addEventListener('click', loadBookings);

// ===== EXTRA HOURS (custom slots) =====

addCustomSlotBtn.addEventListener('click', async () => {
  hideBox(customSlotMessage);

  const timeValue = customSlotTimeInput.value;
  if (!timeValue) {
    return showBox(customSlotMessage, 'الرجاء اختيار وقت.', true);
  }

  addCustomSlotBtn.disabled = true;
  addCustomSlotBtn.textContent = 'جاري الإضافة...';

  const { error } = await supabaseClient.rpc('add_my_custom_slot', {
    p_time: timeValue
  });

  addCustomSlotBtn.disabled = false;
  addCustomSlotBtn.textContent = 'إضافة هذا الوقت';

  if (error) {
    if (error.message.includes('duplicate key')) {
      showBox(customSlotMessage, 'هذا الوقت مفتوح مسبقاً.', true);
    } else {
      showBox(customSlotMessage, 'حدث خطأ أثناء الإضافة.', true);
    }
    return;
  }

  showBox(customSlotMessage, 'تم فتح هذا الوقت بنجاح.', false);
  customSlotTimeInput.value = '';
  await loadCustomSlotsList();
});

async function loadCustomSlotsList() {
  customSlotsListContainer.innerHTML = '<p class="note">جاري التحميل...</p>';

  const { data, error } = await supabaseClient.rpc('get_my_custom_slots');

  if (error) {
    customSlotsListContainer.innerHTML = '<p class="note" style="color:#ff6b6b;">حدث خطأ أثناء التحميل.</p>';
    return;
  }

  if (!data || data.length === 0) {
    customSlotsListContainer.innerHTML = '<p class="note">لا توجد أوقات إضافية مفتوحة اليوم.</p>';
    return;
  }

  customSlotsListContainer.innerHTML = '';

  data.forEach(s => {
    const row = document.createElement('div');
    row.className = 'detail-row';

    const timeSpan = document.createElement('span');
    timeSpan.textContent = s.slot_time.substring(0, 5);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-cancel-small';
    removeBtn.style.width = 'auto';
    removeBtn.style.padding = '6px 12px';
    removeBtn.textContent = 'إلغاء';
    removeBtn.addEventListener('click', async () => {
      const { error: removeError } = await supabaseClient.rpc('remove_my_custom_slot', { p_id: s.id });
      if (removeError) {
        alert('حدث خطأ أثناء الإلغاء.');
        return;
      }
      await loadCustomSlotsList();
    });

    row.appendChild(timeSpan);
    row.appendChild(removeBtn);
    customSlotsListContainer.appendChild(row);
  });
}

// ===== DAY OFF =====

addDayoffBtn.addEventListener('click', async () => {
  hideBox(dayoffMessage);

  const selectedDate = dayoffDateInput.value;
  if (!selectedDate) {
    return showBox(dayoffMessage, 'الرجاء اختيار تاريخ.', true);
  }

  const confirmed = confirm('هل أنت متأكد من تعطيل تاريخ ' + selectedDate + '؟');
  if (!confirmed) return;

  addDayoffBtn.disabled = true;
  addDayoffBtn.textContent = 'جاري التعطيل...';

  const { error } = await supabaseClient.rpc('add_my_dayoff', {
    p_coiffeur_id: myCoiffeurId,
    p_date: selectedDate
  });

  addDayoffBtn.disabled = false;
  addDayoffBtn.textContent = 'تعطيل هذا اليوم';

  if (error) {
    if (error.message.includes('DAYOFF_BLOCKED_HAS_BOOKINGS')) {
      showBox(dayoffMessage, 'لا يمكن التعطيل، يوجد حجوزات مؤكدة في هذا التاريخ. قم بإلغائها أولاً.', true);
    } else if (error.message.includes('duplicate key')) {
      showBox(dayoffMessage, 'هذا التاريخ معطل مسبقاً.', true);
    } else {
      showBox(dayoffMessage, 'حدث خطأ أثناء التعطيل.', true);
    }
    return;
  }

  showBox(dayoffMessage, 'تم تعطيل هذا اليوم بنجاح.', false);
  await loadDayoffList();
  await loadBookings();
});

async function loadDayoffList() {
  dayoffListContainer.innerHTML = '<p class="note">جاري التحميل...</p>';

  const { data, error } = await supabaseClient.rpc('get_staff_dayoffs');

  if (error) {
    dayoffListContainer.innerHTML = '<p class="note" style="color:#ff6b6b;">حدث خطأ أثناء تحميل القائمة.</p>';
    return;
  }

  if (!data || data.length === 0) {
    dayoffListContainer.innerHTML = '<p class="note">لا توجد أيام معطلة قادمة.</p>';
    return;
  }

  dayoffListContainer.innerHTML = '';

  data.forEach(d => {
    const row = document.createElement('div');
    row.className = 'detail-row';

    const dateSpan = document.createElement('span');
    dateSpan.textContent = d.day_off_date;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-cancel-small';
    removeBtn.style.width = 'auto';
    removeBtn.style.padding = '6px 12px';
    removeBtn.textContent = 'إلغاء';
    removeBtn.addEventListener('click', async () => {
      const confirmed = confirm('هل تريد إلغاء تعطيل تاريخ ' + d.day_off_date + '؟');
      if (!confirmed) return;

      const { error: removeError } = await supabaseClient.rpc('remove_my_dayoff', { p_dayoff_id: d.id });

      if (removeError) {
        alert('حدث خطأ أثناء الإلغاء.');
        return;
      }

      await loadDayoffList();
      await loadBookings();
    });

    row.appendChild(dateSpan);
    row.appendChild(removeBtn);
    dayoffListContainer.appendChild(row);
  });
}

// ===== BOOKINGS =====

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

let currentTel = null;
let currentCode = null;
let currentBooking = null;
let rescheduleSelectedCoiffeurId = null;
let rescheduleSelectedSlot = null;

const lookupCard = document.getElementById('lookupCard');
const lookupTel = document.getElementById('lookupTel');
const lookupCode = document.getElementById('lookupCode');
const lookupBtn = document.getElementById('lookupBtn');
const lookupMessage = document.getElementById('lookupMessage');

const detailsCard = document.getElementById('detailsCard');
const detCoiffeur = document.getElementById('detCoiffeur');
const detService = document.getElementById('detService');
const detDate = document.getElementById('detDate');
const detTime = document.getElementById('detTime');
const tooLateNotice = document.getElementById('tooLateNotice');
const actionButtons = document.getElementById('actionButtons');
const showRescheduleBtn = document.getElementById('showRescheduleBtn');
const cancelBtn = document.getElementById('cancelBtn');
const actionMessage = document.getElementById('actionMessage');

const rescheduleCard = document.getElementById('rescheduleCard');
const rescheduleCoiffeurSelect = document.getElementById('rescheduleCoiffeurSelect');
const rescheduleSlotsSection = document.getElementById('rescheduleSlotsSection');
const rescheduleSlotsContainer = document.getElementById('rescheduleSlotsContainer');
const confirmRescheduleBtn = document.getElementById('confirmRescheduleBtn');
const backFromRescheduleBtn = document.getElementById('backFromRescheduleBtn');
const rescheduleMessage = document.getElementById('rescheduleMessage');

const successCard = document.getElementById('successCard');
const successTitle = document.getElementById('successTitle');
const successText = document.getElementById('successText');

lookupBtn.addEventListener('click', doLookup);

async function doLookup() {
  hideBox(lookupMessage);

  const tel = lookupTel.value.trim();
  const code = lookupCode.value.trim();

  if (!tel) return showBox(lookupMessage, 'الرجاء إدخال رقم الهاتف', true);
  if (!code) return showBox(lookupMessage, 'الرجاء إدخال كود الحجز', true);

  lookupBtn.disabled = true;
  lookupBtn.textContent = 'جاري البحث...';

  const { data, error } = await supabaseClient.rpc('get_my_booking', {
    p_telephone: tel,
    p_code: code
  });

  lookupBtn.disabled = false;
  lookupBtn.textContent = 'بحث عن حجزي';

  if (error || !data || data.length === 0) {
    return showBox(lookupMessage, 'لم يتم العثور على حجز بهذه المعلومات.', true);
  }

  currentTel = tel;
  currentCode = code;
  currentBooking = data[0];

  showDetails();
}

function showDetails() {
  lookupCard.style.display = 'none';
  detailsCard.style.display = 'block';

  detCoiffeur.textContent = currentBooking.coiffeur_name;
  detService.textContent = currentBooking.service_name;
  detDate.textContent = currentBooking.booking_date;
  detTime.textContent = currentBooking.start_time.substring(0, 5);

  if (currentBooking.can_modify) {
    tooLateNotice.style.display = 'none';
    actionButtons.style.display = 'block';
  } else {
    tooLateNotice.style.display = 'block';
    actionButtons.style.display = 'none';
  }
}

cancelBtn.addEventListener('click', async () => {
  hideBox(actionMessage);

  const confirmed = confirm('هل أنت متأكد من إلغاء هذا الحجز؟');
  if (!confirmed) return;

  cancelBtn.disabled = true;
  cancelBtn.textContent = 'جاري الإلغاء...';

  const { error } = await supabaseClient.rpc('cancel_my_booking', {
    p_telephone: currentTel,
    p_code: currentCode
  });

  cancelBtn.disabled = false;
  cancelBtn.textContent = 'إلغاء الحجز';

  if (error) {
    return showBox(actionMessage, translateError(error.message), true);
  }

  detailsCard.style.display = 'none';
  successCard.style.display = 'block';
  successTitle.textContent = 'تم إلغاء الحجز';
  successText.textContent = 'تم إلغاء حجزك بنجاح. يمكنك الحجز مرة أخرى في أي وقت.';
});

showRescheduleBtn.addEventListener('click', async () => {
  detailsCard.style.display = 'none';
  rescheduleCard.style.display = 'block';
  hideBox(rescheduleMessage);
  rescheduleSelectedCoiffeurId = null;
  rescheduleSelectedSlot = null;
  confirmRescheduleBtn.disabled = true;
  rescheduleSlotsSection.style.display = 'none';

  const { data, error } = await supabaseClient.rpc('get_coiffeurs');
  rescheduleCoiffeurSelect.innerHTML = '<option value="">-- اختر --</option>';

  if (!error && data) {
    data.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      rescheduleCoiffeurSelect.appendChild(opt);
    });
  }
});

backFromRescheduleBtn.addEventListener('click', () => {
  rescheduleCard.style.display = 'none';
  detailsCard.style.display = 'block';
});

rescheduleCoiffeurSelect.addEventListener('change', async () => {
  rescheduleSelectedCoiffeurId = rescheduleCoiffeurSelect.value;
  rescheduleSelectedSlot = null;
  confirmRescheduleBtn.disabled = true;
  hideBox(rescheduleMessage);

  if (!rescheduleSelectedCoiffeurId) {
    rescheduleSlotsSection.style.display = 'none';
    return;
  }

  rescheduleSlotsSection.style.display = 'block';
  rescheduleSlotsContainer.innerHTML = '<p style="color:#b8b8b8;">جاري التحميل...</p>';

  const { data, error } = await supabaseClient.rpc('get_available_slots', {
    p_coiffeur_id: rescheduleSelectedCoiffeurId
  });

  if (error || !data || data.length === 0) {
    rescheduleSlotsContainer.innerHTML = '<p style="color:#b8b8b8;">لا توجد أوقات متاحة لهذا الحلاق اليوم.</p>';
    return;
  }

  rescheduleSlotsContainer.innerHTML = '';
  data.forEach(s => {
    const timeStr = s.slot_time.substring(0, 5);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'slot-btn';
    btn.textContent = timeStr;
    btn.addEventListener('click', () => {
      document.querySelectorAll('#rescheduleSlotsContainer .slot-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      rescheduleSelectedSlot = timeStr;
      confirmRescheduleBtn.disabled = false;
    });
    rescheduleSlotsContainer.appendChild(btn);
  });
});

confirmRescheduleBtn.addEventListener('click', async () => {
  hideBox(rescheduleMessage);

  if (!rescheduleSelectedCoiffeurId || !rescheduleSelectedSlot) {
    return showBox(rescheduleMessage, 'الرجاء اختيار الحلاق والوقت.', true);
  }

  confirmRescheduleBtn.disabled = true;
  confirmRescheduleBtn.textContent = 'جاري التعديل...';

  const { data, error } = await supabaseClient.rpc('reschedule_my_booking', {
    p_telephone: currentTel,
    p_code: currentCode,
    p_new_coiffeur_id: rescheduleSelectedCoiffeurId,
    p_new_start_time: rescheduleSelectedSlot
  });

  confirmRescheduleBtn.disabled = false;
  confirmRescheduleBtn.textContent = 'تأكيد التعديل';

  if (error) {
    return showBox(rescheduleMessage, translateError(error.message), true);
  }

  rescheduleCard.style.display = 'none';
  successCard.style.display = 'block';
  successTitle.textContent = 'تم تعديل الموعد';
  successText.textContent = `تم تعديل موعدك إلى الساعة ${rescheduleSelectedSlot}. كود الحجز الخاص بك لم يتغير: ${currentCode}`;
});

function showBox(el, text, isError) {
  el.textContent = text;
  el.className = 'message-box ' + (isError ? 'error' : 'success');
}

function hideBox(el) {
  el.textContent = '';
  el.className = 'message-box';
}

function translateError(msg) {
  const map = {
    'BOOKING_NOT_FOUND': 'لم يتم العثور على الحجز.',
    'TOO_LATE_TO_MODIFY': 'لا يمكن التعديل أو الإلغاء قبل أقل من ساعة من الموعد.',
    'INVALID_SLOT': 'الوقت المختار غير صالح.',
    'SLOT_IN_PAST': 'هذا الوقت قد فات.',
    'INVALID_COIFFEUR': 'الحلاق المختار غير صالح.',
    'COIFFEUR_DAY_OFF': 'هذا الحلاق غير متاح اليوم.',
    'SLOT_ALREADY_TAKEN': 'هذا الوقت تم حجزه من قبل شخص آخر.'
  };

  for (const key in map) {
    if (msg.includes(key)) return map[key];
  }
  return 'حدث خطأ. الرجاء المحاولة مرة أخرى.';
}

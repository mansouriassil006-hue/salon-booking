let selectedCoiffeurId = null;
let selectedCoiffeurWhatsapp = null;
let selectedSlot = null;

const statusBox = document.getElementById('statusBox');
const bookingForm = document.getElementById('bookingForm');
const coiffeurSelect = document.getElementById('coiffeurSelect');
const slotsSection = document.getElementById('slotsSection');
const slotsContainer = document.getElementById('slotsContainer');
const formFields = document.getElementById('formFields');
const serviceSelect = document.getElementById('serviceSelect');
const nomInput = document.getElementById('nomInput');
const prenomInput = document.getElementById('prenomInput');
const telInput = document.getElementById('telInput');
const submitBtn = document.getElementById('submitBtn');
const messageBox = document.getElementById('messageBox');
const confirmationBox = document.getElementById('confirmationBox');
const codeDisplay = document.getElementById('codeDisplay');
const whatsappBtn = document.getElementById('whatsappBtn');

init();

async function init() {
  const { data, error } = await supabaseClient.rpc('get_booking_status');

  if (error) {
    showStatus('حدث خطأ أثناء التحقق من حالة الحجز. حاول تحديث الصفحة.');
    return;
  }

  const status = data[0];

  if (!status.is_open) {
    showStatus('الحجز يفتح يومياً الساعة 08:00. الرجاء العودة لاحقاً.');
    return;
  }

  statusBox.style.display = 'none';
  bookingForm.style.display = 'block';

  await loadCoiffeurs();
  await loadServices();
}

function showStatus(text) {
  statusBox.innerHTML = `<span>${text}</span>`;
}

async function loadCoiffeurs() {
  const { data, error } = await supabaseClient.rpc('get_coiffeurs');

  if (error || !data || data.length === 0) {
    coiffeurSelect.innerHTML = '<option value="">لا يوجد حلاقون متاحون حالياً</option>';
    return;
  }

  coiffeurSelect.innerHTML = '<option value="">-- اختر الحلاق --</option>';
  data.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    opt.dataset.whatsapp = c.whatsapp_number;
    coiffeurSelect.appendChild(opt);
  });
}

async function loadServices() {
  const { data, error } = await supabaseClient.rpc('get_services');
  if (error || !data) return;

  serviceSelect.innerHTML = '<option value="">-- اختر الخدمة --</option>';
  data.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;

    let priceLabel = '';
    if (s.price_text) {
      priceLabel = ' — ' + s.price_text;
    } else if (s.price !== null && s.price !== undefined) {
      priceLabel = ' — ' + s.price + ' DA';
    }

    opt.textContent = s.name + priceLabel;
    opt.dataset.name = s.name;
    opt.dataset.pricelabel = priceLabel;
    serviceSelect.appendChild(opt);
  });
}

coiffeurSelect.addEventListener('change', async () => {
  selectedCoiffeurId = coiffeurSelect.value;
  selectedSlot = null;
  formFields.style.display = 'none';
  hideMessage();

  if (!selectedCoiffeurId) {
    slotsSection.style.display = 'none';
    return;
  }

  const selectedOption = coiffeurSelect.options[coiffeurSelect.selectedIndex];
  selectedCoiffeurWhatsapp = selectedOption.dataset.whatsapp;

  slotsSection.style.display = 'block';
  slotsContainer.innerHTML = '<p style="color:#b8b8b8;">جاري التحميل...</p>';

  const { data, error } = await supabaseClient.rpc('get_available_slots', {
    p_coiffeur_id: selectedCoiffeurId
  });

  if (error) {
    slotsContainer.innerHTML = '<p style="color:#ff6b6b;">حدث خطأ أثناء تحميل الأوقات.</p>';
    return;
  }

  if (!data || data.length === 0) {
    slotsContainer.innerHTML = '<p style="color:#b8b8b8;">لا توجد أوقات متاحة لهذا الحلاق اليوم.</p>';
    return;
  }

  slotsContainer.innerHTML = '';
  data.forEach(s => {
    const timeStr = s.slot_time.substring(0, 5);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'slot-btn';
    btn.textContent = timeStr;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedSlot = timeStr;
      formFields.style.display = 'block';
    });
    slotsContainer.appendChild(btn);
  });
});

submitBtn.addEventListener('click', async () => {
  hideMessage();

  const nom = nomInput.value.trim();
  const prenom = prenomInput.value.trim();
  const tel = telInput.value.trim();
  const serviceId = serviceSelect.value;

  if (!nom) return showMessage('الرجاء إدخال الاسم العائلي', true);
  if (!prenom) return showMessage('الرجاء إدخال الاسم الشخصي', true);
  if (!tel) return showMessage('الرجاء إدخال رقم الهاتف', true);
  if (!serviceId) return showMessage('الرجاء اختيار الخدمة', true);
  if (!selectedSlot) return showMessage('الرجاء اختيار الوقت', true);
  if (!selectedCoiffeurId) return showMessage('الرجاء اختيار الحلاق', true);

  submitBtn.disabled = true;
  submitBtn.textContent = 'جاري الحجز...';

  const { data, error } = await supabaseClient.rpc('create_booking', {
    p_coiffeur_id: selectedCoiffeurId,
    p_service_id: serviceId,
    p_nom: nom,
    p_prenom: prenom,
    p_telephone: tel,
    p_start_time: selectedSlot
  });

  submitBtn.disabled = false;
  submitBtn.textContent = 'تأكيد الحجز';

  if (error) {
    showMessage(translateError(error.message), true);
    return;
  }

  const result = data[0];
  const selectedServiceOption = serviceSelect.options[serviceSelect.selectedIndex];
  const serviceNameForWhatsapp = selectedServiceOption.dataset.name + selectedServiceOption.dataset.pricelabel;

  showConfirmation(result, nom, prenom, tel, serviceNameForWhatsapp);
});

function showConfirmation(result, nom, prenom, tel, serviceName) {
  bookingForm.style.display = 'none';
  confirmationBox.style.display = 'block';

  codeDisplay.textContent = result.out_reservation_code;

  const normalizedTel = normalizePhoneDisplay(tel);
  const dateStr = result.out_booking_date;
  const timeStr = result.out_start_time.substring(0, 5);

  const message = `Bonjour, je souhaite réserver un rendez-vous.

Nom : ${nom}
Prénom : ${prenom}
Téléphone : ${normalizedTel}
Date : ${dateStr}
Heure : ${timeStr}
Service : ${serviceName}
Code de réservation : ${result.out_reservation_code}`;

  const waNumber = selectedCoiffeurWhatsapp.replace('+', '');
  const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
  whatsappBtn.href = waLink;
}

function normalizePhoneDisplay(tel) {
  let clean = tel.replace(/[^0-9+]/g, '');
  if (clean.startsWith('+213')) return clean;
  if (clean.startsWith('213')) return '+' + clean;
  if (clean.startsWith('0')) return '+213' + clean.substring(1);
  return clean;
}

function showMessage(text, isError) {
  messageBox.textContent = text;
  messageBox.className = 'message-box ' + (isError ? 'error' : 'success');
}

function hideMessage() {
  messageBox.textContent = '';
  messageBox.className = 'message-box';
}

function translateError(msg) {
  const map = {
    'BOOKING_CLOSED': 'الحجز مغلق حالياً. يفتح الحجز الساعة 08:00.',
    'INVALID_SLOT': 'الوقت المختار غير صالح.',
    'SLOT_IN_PAST': 'هذا الوقت قد فات. الرجاء اختيار وقت آخر.',
    'COIFFEUR_DAY_OFF': 'هذا الحلاق غير متاح اليوم.',
    'INVALID_PHONE': 'رقم الهاتف غير صحيح. استخدم صيغة جزائرية صحيحة (مثال: 0551234567).',
    'INVALID_NOM': 'الاسم العائلي غير صحيح.',
    'INVALID_PRENOM': 'الاسم الشخصي غير صحيح.',
    'INVALID_COIFFEUR': 'الحلاق المختار غير صالح.',
    'INVALID_SERVICE': 'الخدمة المختارة غير صالحة.',
    'PHONE_ALREADY_BOOKED_TODAY': 'لديك حجز آخر بنفس رقم الهاتف اليوم.',
    'SLOT_ALREADY_TAKEN': 'هذا الوقت تم حجزه للتو من قبل شخص آخر. الرجاء اختيار وقت آخر.'
  };

  for (const key in map) {
    if (msg.includes(key)) return map[key];
  }
  return 'حدث خطأ. الرجاء المحاولة مرة أخرى.';
}
